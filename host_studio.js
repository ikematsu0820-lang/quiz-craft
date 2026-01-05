/* =========================================================
 * host_studio.js (v52: Robust Button Setup)
 * =======================================================*/

let currentProgramConfig = { finalRanking: true };
let buzzWinnerId = null;
let turnQueue = [];
let taTimer = null;

function startRoom() {
    studioQuestions = [];
    periodPlaylist = [];
    currentQIndex = 0;
    currentPeriodIndex = 0;
    currentConfig = { theme: 'light', scoreUnit: 'point', mode: 'normal' };

    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    window.db.ref(`rooms/${currentRoomId}`).set({
        questions: [],
        status: { step: 'standby', qIndex: 0, currentAnswerer: null, isBuzzActive: false },
        config: currentConfig,
        players: {}
    }).then(() => {
        enterHostMode(currentRoomId);
    });
}

function enterHostMode(roomId) {
    window.showView(window.views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;
    document.getElementById('studio-show-id').textContent = currentShowId;
    
    document.getElementById('studio-program-loader').classList.remove('hidden');
    document.getElementById('studio-timeline-area').classList.add('hidden');
    document.getElementById('control-panel').classList.add('hidden');
    document.getElementById('host-buzz-winner-area').classList.add('hidden');
    document.getElementById('host-manual-judge-area').classList.add('hidden');
    
    updateKanpe(); 
    loadProgramsInStudio();

    window.db.ref(`rooms/${roomId}/players`).on('value', snap => {
        const players = snap.val() || {};
        const total = Object.keys(players).length;
        const alive = Object.values(players).filter(p => p.isAlive).length;
        document.getElementById('host-player-count').textContent = total;
        document.getElementById('host-alive-count').textContent = alive;
        
        if (currentConfig.mode === 'buzz') {
            identifyBuzzWinner(players);
        }
    });

    setupStudioButtons(roomId);
}

function identifyBuzzWinner(players) {
    if (buzzWinnerId) return;

    let candidates = [];
    Object.keys(players).forEach(key => {
        const p = players[key];
        if (p.buzzTime && !p.isLocked && p.lastResult !== 'lose') {
            candidates.push({ id: key, time: p.buzzTime, name: p.name });
        }
    });

    if (candidates.length > 0) {
        candidates.sort((a, b) => a.time - b.time);
        const winner = candidates[0];
        
        buzzWinnerId = winner.id;
        
        window.db.ref(`rooms/${currentRoomId}/status`).update({
            currentAnswerer: winner.id,
            isBuzzActive: false 
        });

        const winArea = document.getElementById('host-buzz-winner-area');
        const winName = document.getElementById('host-buzz-winner-name');
        winName.textContent = winner.name;
        winArea.classList.remove('hidden');
        
        document.getElementById('host-manual-judge-area').classList.remove('hidden');
        const showAnsBtn = document.getElementById('host-show-answer-btn');
        if(showAnsBtn) showAnsBtn.classList.add('hidden');
        
        const passBtn = document.getElementById('host-judge-pass-btn');
        if(passBtn) passBtn.classList.add('hidden');
    }
}

function loadProgramsInStudio() {
    const select = document.getElementById('studio-program-select');
    const btn = document.getElementById('studio-load-program-btn');
    if(!select || !btn) return;

    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;
    
    window.db.ref(`saved_programs/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = `<option value="">${APP_TEXT.Studio.SelectProgDefault}</option>`;
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                opt.value = JSON.stringify(item);
                opt.textContent = item.title;
                select.appendChild(opt);
            });
        }
    });

    btn.onclick = () => {
        const val = select.value;
        if(!val) return;
        const prog = JSON.parse(val);
        if(confirm(APP_TEXT.Studio.MsgConfirmLoad)) {
            periodPlaylist = prog.playlist || [];
            currentProgramConfig.finalRanking = (prog.finalRanking !== false);
            currentPeriodIndex = 0;
            
            document.getElementById('studio-program-loader').classList.add('hidden');
            document.getElementById('studio-timeline-area').classList.remove('hidden');
            
            renderStudioTimeline();
            alert(APP_TEXT.Studio.MsgLoaded);
        }
    };
}

function renderStudioTimeline() {
    const container = document.getElementById('studio-period-timeline');
    container.innerHTML = '';
    if(periodPlaylist.length === 0) return;

    document.getElementById('studio-footer-controls').classList.remove('hidden');

    periodPlaylist.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'timeline-card';
        if (index === currentPeriodIndex) {
            div.classList.add('active');
        }
        
        let statusText = "START";
        if (index > 0) {
            if(item.config.initialStatus === 'continue') statusText = APP_TEXT.Config.StatusContinue;
            else if(item.config.initialStatus === 'ranking') statusText = APP_TEXT.Config.StatusRanking;
            else statusText = APP_TEXT.Config.StatusRevive;
        }
        
        let interText = "";
        if (item.config.intermediateRanking) interText = " <span style='color:blue; font-weight:bold;'>[Ranking]</span>";

        let modeText = item.config.mode ? item.config.mode.toUpperCase() : "NORMAL";

        div.innerHTML = `
            <div>
                <h5 style="margin:0;">No.${index + 1}: ${item.title}${interText}</h5>
                <div class="info" style="margin-top:5px;">
                    <span style="color:#d00; font-weight:bold;">[${modeText}]</span> ${statusText} / ${item.questions.length}Q
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function playCurrentPeriod() {
    if(!periodPlaylist[currentPeriodIndex]) {
        alert(APP_TEXT.Studio.MsgNoPeriod);
        return;
    }
    playPeriod(currentPeriodIndex);
}

window.playPeriod = function(index) {
    if(!periodPlaylist[index]) return;
    const item = periodPlaylist[index];
    
    currentPeriodIndex = index;
    studioQuestions = item.questions;
    currentConfig = item.config;
    currentQIndex = 0;
    turnQueue = [];
    if(taTimer) clearTimeout(taTimer);
    
    document.getElementById('studio-timeline-area').classList.add('hidden');
    document.getElementById('control-panel').classList.remove('hidden');
    
    if (currentConfig.mode === 'time_attack') {
        currentConfig.timeLimit = 5;
    }

    window.db.ref(`rooms/${currentRoomId}/config`).set(currentConfig);
    window.db.ref(`rooms/${currentRoomId}/questions`).set(studioQuestions);
    window.db.ref(`rooms/${currentRoomId}/status`).update({ step: 'standby', qIndex: 0, currentAnswerer: null, isBuzzActive: false });
    
    window.db.ref(`rooms/${currentRoomId}/players`).once('value', snap => {
        let players = [];
        snap.forEach(p => {
            const val = p.val();
            players.push({ key: p.key, isAlive: val.isAlive, score: val.periodScore||0, time: val.periodTime||0, name: val.name });
        });
        
        if (currentConfig.mode === 'time_attack' && players.length > 0) {
            buzzWinnerId = players[0].key; 
            document.getElementById('host-buzz-winner-name').textContent = players[0].name;
            document.getElementById('host-buzz-winner-area').classList.remove('hidden');
        }

        let survivorsKeys = [];
        if (currentConfig.initialStatus === 'ranking') {
            let alivePlayers = players.filter(p => p.isAlive);
            alivePlayers.sort((a,b) => (b.score - a.score) || (a.time - b.time));
            const limit = currentConfig.passCount || 5;
            survivorsKeys = alivePlayers.slice(0, limit).map(p => p.key);
        }

        if (currentConfig.mode === 'turn') {
            let activePlayers = players.filter(p => {
                if (index === 0 || currentConfig.initialStatus === 'revive') return true;
                if (currentConfig.initialStatus === 'ranking') return survivorsKeys.includes(p.key);
                return p.isAlive;
            });
            if (currentConfig.turnOrder === 'random') {
                activePlayers.sort(() => Math.random() - 0.5);
            } else if (currentConfig.turnOrder === 'rank') {
                activePlayers.sort((a,b) => (b.score - a.score));
            } else {
                activePlayers.sort((a,b) => a.key.localeCompare(b.key));
            }
            turnQueue = activePlayers.map(p => p.key);
        }

        snap.forEach(p => {
            let updateData = { periodScore: 0, periodTime: 0, lastTime: 99999, lastResult: null, buzzTime: null, isLocked: false }; 
            let newIsAlive = p.val().isAlive;
            if (index === 0 || currentConfig.initialStatus === 'revive') newIsAlive = true;
            else if (currentConfig.initialStatus === 'ranking') newIsAlive = survivorsKeys.includes(p.key);
            p.ref.update(updateData);
        });
    });

    document.getElementById('current-period-title').textContent = `${item.title}`;
    
    // ボタン表示リセット
    const btnStart = document.getElementById('host-start-btn');
    const btnStartTA = document.getElementById('host-start-ta-btn');
    const btnShowAns = document.getElementById('host-show-answer-btn');
    const btnNext = document.getElementById('host-next-btn');
    const btnRanking = document.getElementById('host-ranking-btn');
    const areaJudge = document.getElementById('host-manual-judge-area');

    if(btnStart) btnStart.classList.add('hidden');
    if(btnStartTA) btnStartTA.classList.add('hidden');
    if(btnShowAns) btnShowAns.classList.add('hidden');
    if(btnNext) btnNext.classList.add('hidden');
    if(btnRanking) btnRanking.classList.remove('hidden');
    if(areaJudge) areaJudge.classList.add('hidden');

    if (currentConfig.mode === 'time_attack') {
        if(btnStartTA) btnStartTA.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = APP_TEXT.Studio.MsgTimeAttackReady;
    } else {
        if(btnStart) btnStart.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = "Ready...";
    }
    
    if(currentConfig.mode !== 'time_attack') {
        buzzWinnerId = null;
        document.getElementById('host-buzz-winner-area').classList.add('hidden');
    }

    updateKanpe();
};

function setupStudioButtons(roomId) {
    const btnMasterPlay = document.getElementById('studio-master-play-btn');
    const btnStart = document.getElementById('host-start-btn');
    const btnStartTA = document.getElementById('host-start-ta-btn');
    const btnShowAns = document.getElementById('host-show-answer-btn');
    const btnNext = document.getElementById('host-next-btn');
    const btnRanking = document.getElementById('host-ranking-btn');
    const btnClose = document.getElementById('host-close-studio-btn');
    const rankingBackBtn = document.getElementById('ranking-back-btn');
    
    const btnCorrect = document.getElementById('host-judge-correct-btn');
    const btnWrong = document.getElementById('host-judge-wrong-btn');
    const btnPass = document.getElementById('host-judge-pass-btn');

    // ★重要: 閉じるボタンを最優先で設定
    if (btnClose) {
        btnClose.onclick = () => {
            periodPlaylist = [];
            currentRoomId = null;
            studioQuestions = [];
            currentQIndex = 0;
            if(taTimer) clearTimeout(taTimer);
            enterDashboard();
        };
    }

    if(btnMasterPlay) btnMasterPlay.onclick = playCurrentPeriod;

    if(btnStartTA) btnStartTA.onclick = () => {
        btnStartTA.classList.add('hidden');
        if(document.getElementById('host-manual-judge-area')) {
            document.getElementById('host-manual-judge-area').classList.remove('hidden');
        }
        startTaLoop(roomId);
    };

    if(btnStart) btnStart.onclick = () => {
        const now = firebase.database.ServerValue.TIMESTAMP;
        let updateData = { step: 'question', qIndex: currentQIndex, startTime: now };
        
        if (currentConfig.mode === 'buzz') {
            updateData.isBuzzActive = true;
            updateData.currentAnswerer = null;
            buzzWinnerId = null; 
            window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
                snap.forEach(p => p.ref.update({ buzzTime: null, lastResult: null }));
            });
        }
        else if (currentConfig.mode === 'turn') {
            if (turnQueue.length > 0) {
                const nextPlayer = turnQueue[0]; 
                updateData.currentAnswerer = nextPlayer;
                buzzWinnerId = nextPlayer; 
                if(document.getElementById('host-manual-judge-area')) {
                    document.getElementById('host-manual-judge-area').classList.remove('hidden');
                }
                window.db.ref(`rooms/${roomId}/players/${nextPlayer}/name`).once('value', snap => {
                    document.getElementById('host-buzz-winner-name').textContent = snap.val();
                    document.getElementById('host-buzz-winner-area').classList.remove('hidden');
                });
                if (currentConfig.turnPass === 'ok' && btnPass) btnPass.classList.remove('hidden');
                else if(btnPass) btnPass.classList.add('hidden');
            } else {
                alert("No active players in queue");
                return;
            }
        }

        window.db.ref(`rooms/${roomId}/status`).update(updateData);
        btnStart.classList.add('hidden');
        
        if (currentConfig.mode === 'buzz' || currentConfig.mode === 'turn') {
            document.getElementById('host-status-area').textContent = "Active...";
        } else {
            if(btnShowAns) btnShowAns.classList.remove('hidden');
            document.getElementById('host-status-area').textContent = APP_TEXT.Studio.MsgThinking;
        }
    };

    if(btnCorrect) btnCorrect.onclick = () => {
        if (currentConfig.mode === 'time_attack') {
            if(buzzWinnerId) {
                window.db.ref(`rooms/${roomId}/players/${buzzWinnerId}`).once('value', snap => {
                    const val = snap.val();
                    snap.ref.update({ periodScore: (val.periodScore||0) + 1 });
                });
            }
            clearTimeout(taTimer);
            nextTaQuestion(roomId);
            return;
        }

        if (!buzzWinnerId) return;
        const q = studioQuestions[currentQIndex];
        const points = parseInt(q.points) || 1;

        window.db.ref(`rooms/${roomId}/players/${buzzWinnerId}`).once('value', snap => {
            const val = snap.val();
            snap.ref.update({ 
                periodScore: (val.periodScore||0) + points,
                lastResult: 'win'
            });
        });

        if (currentConfig.mode === 'turn') {
            const p = turnQueue.shift();
            turnQueue.push(p);
        }

        finishQuestion(roomId);
    };

    if(btnWrong) btnWrong.onclick = () => {
        if (currentConfig.mode === 'time_attack') {
            clearTimeout(taTimer);
            nextTaQuestion(roomId);
            return;
        }

        if (!buzzWinnerId) return;
        const q = studioQuestions[currentQIndex];
        const loss = parseInt(q.loss) || 0;

        window.db.ref(`rooms/${roomId}/players/${buzzWinnerId}`).once('value', snap => {
            const val = snap.val();
            let newScore = (val.periodScore||0);
            if(loss > 0) newScore -= loss;
            
            snap.ref.update({ 
                periodScore: newScore,
                lastResult: 'lose',
                buzzTime: null 
            });
        });

        if (currentConfig.mode === 'turn') {
            const p = turnQueue.shift();
            turnQueue.push(p);
            const nextPlayer = turnQueue[0];
            buzzWinnerId = nextPlayer;
            window.db.ref(`rooms/${roomId}/status`).update({ currentAnswerer: nextPlayer });
            window.db.ref(`rooms/${roomId}/players/${nextPlayer}/name`).once('value', snap => {
                document.getElementById('host-buzz-winner-name').textContent = snap.val();
            });
        } else {
            const action = currentConfig.buzzWrongAction;
            buzzWinnerId = null;
            document.getElementById('host-buzz-winner-area').classList.add('hidden');
            if(document.getElementById('host-manual-judge-area')) {
                document.getElementById('host-manual-judge-area').classList.add('hidden');
            }

            if (action === 'end') {
                finishQuestion(roomId);
            } else if (action === 'reset') {
                window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
                    snap.forEach(p => p.ref.update({ buzzTime: null }));
                });
                window.db.ref(`rooms/${roomId}/status`).update({ currentAnswerer: null, isBuzzActive: true });
            } else {
                window.db.ref(`rooms/${roomId}/status`).update({ currentAnswerer: null, isBuzzActive: true });
            }
        }
    };

    if(btnPass) btnPass.onclick = () => {
        if (currentConfig.mode !== 'turn') return;
        const p = turnQueue.shift();
        turnQueue.push(p);
        const nextPlayer = turnQueue[0];
        buzzWinnerId = nextPlayer;
        window.db.ref(`rooms/${roomId}/status`).update({ currentAnswerer: nextPlayer });
        window.db.ref(`rooms/${roomId}/players/${nextPlayer}/name`).once('value', snap => {
            document.getElementById('host-buzz-winner-name').textContent = snap.val();
        });
    };

    if(btnShowAns) btnShowAns.onclick = () => {
        finishQuestion(roomId);
    };

    function finishQuestion(roomId) {
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer', isBuzzActive: false });
        
        if(btnShowAns) btnShowAns.classList.add('hidden');
        if(document.getElementById('host-manual-judge-area')) {
            document.getElementById('host-manual-judge-area').classList.add('hidden');
        }
        if(currentConfig.mode !== 'time_attack') {
            document.getElementById('host-buzz-winner-area').classList.add('hidden'); 
        }
        
        if(btnNext) btnNext.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = APP_TEXT.Studio.MsgAnswerCheck;

        if (currentQIndex >= studioQuestions.length - 1) {
            if (currentPeriodIndex < periodPlaylist.length - 1) {
                const nextPeriod = periodPlaylist[currentPeriodIndex + 1];
                if (nextPeriod.config.intermediateRanking) {
                    btnNext.textContent = APP_TEXT.Studio.BtnInterRanking;
                    btnNext.className = "btn-success btn-block";
                    btnNext.dataset.action = "ranking"; 
                } else {
                    btnNext.textContent = APP_TEXT.Studio.BtnNextPeriod;
                    btnNext.className = "btn-warning btn-block";
                    btnNext.dataset.action = "next";
                }
            } else {
                if (currentProgramConfig.finalRanking) {
                    btnNext.textContent = APP_TEXT.Studio.BtnFinalRanking;
                    btnNext.className = "btn-danger btn-block";
                    btnNext.dataset.action = "final";
                } else {
                    btnNext.textContent = APP_TEXT.Studio.BtnEnd;
                    btnNext.className = "btn-dark btn-block";
                    btnNext.dataset.action = "end";
                }
            }
        } else {
            btnNext.textContent = APP_TEXT.Studio.BtnNextQ;
            btnNext.className = "btn-info btn-block";
            btnNext.dataset.action = "nextQ";
        }
    }

    if(btnNext) btnNext.onclick = (e) => {
        const action = e.target.dataset.action;
        if (action === "ranking" || action === "final") {
            if(btnRanking) btnRanking.click(); 
            if (action === "ranking") {
                btnNext.textContent = "Continue";
                btnNext.className = "btn-warning btn-block";
                btnNext.dataset.action = "next"; 
            } else {
                btnNext.textContent = APP_TEXT.Studio.BtnEnd;
                btnNext.className = "btn-dark btn-block";
                btnNext.dataset.action = "end";
            }
            return;
        }
        if (action === "next") {
            playPeriod(currentPeriodIndex + 1);
            return;
        }
        if (action === "end") {
            alert(APP_TEXT.Studio.MsgAllEnd);
            btnNext.classList.add('hidden');
            return;
        }

        currentQIndex++;
        buzzWinnerId = null;
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ lastAnswer: null, lastTime: 99999, lastResult: null, buzzTime: null, isLocked: false }));
        });
        updateKanpe();
        if(btnStart) btnStart.classList.remove('hidden');
        btnNext.classList.add('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} Standby...`;
    };

    if(btnRanking) btnRanking.onclick = () => {
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'ranking' });
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let ranking = [];
            snap.forEach(p => {
                const v = p.val();
                ranking.push({ name: v.name, score: v.periodScore, time: v.periodTime, isAlive: v.isAlive });
            });
            ranking.sort((a,b) => (b.score - a.score) || (a.time - b.time));
            renderRankingView(ranking);
            window.showView(window.views.ranking);
        });
    };

    if(rankingBackBtn) rankingBackBtn.onclick = () => {
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'standby' });
        window.showView(window.views.hostControl);
    };
}

function startTaLoop(roomId) {
    currentQIndex = -1; 
    nextTaQuestion(roomId);
}

function nextTaQuestion(roomId) {
    currentQIndex++;
    
    if (currentQIndex >= studioQuestions.length) {
        if(document.getElementById('host-manual-judge-area')) {
            document.getElementById('host-manual-judge-area').classList.add('hidden');
        }
        document.getElementById('host-status-area').textContent = "FINISHED";
        alert(APP_TEXT.Studio.MsgAllEnd);
        return;
    }

    updateKanpe();
    
    const now = firebase.database.ServerValue.TIMESTAMP;
    window.db.ref(`rooms/${roomId}/status`).update({
        step: 'question',
        qIndex: currentQIndex,
        startTime: now,
        isBuzzActive: false,
        currentAnswerer: buzzWinnerId 
    });

    document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} (5s)`;

    taTimer = setTimeout(() => {
        nextTaQuestion(roomId);
    }, 5000);
}

function updateKanpe() {
    const kanpeArea = document.getElementById('host-kanpe-area');
    if(studioQuestions.length === 0) {
        kanpeArea.classList.add('hidden');
        return;
    }
    if(studioQuestions.length > currentQIndex) {
        const q = studioQuestions[currentQIndex];
        kanpeArea.classList.remove('hidden');
        
        let questionHtml = `Q${currentQIndex+1}. ${q.q}`;
        if (q.type === 'choice' || q.type === 'sort') {
            questionHtml += '<div style="margin-top:10px; font-weight:normal; font-size:0.9em; color:#333; background:rgba(255,255,255,0.5); padding:5px; border-radius:4px;">';
            q.c.forEach((choice, i) => {
                const prefix = (q.type === 'choice') ? String.fromCharCode(65 + i) : (i + 1);
                questionHtml += `<div><span style="font-weight:bold; color:#0055ff;">${prefix}.</span> ${choice}</div>`;
            });
            questionHtml += '</div>';
        }
        document.getElementById('kanpe-question').innerHTML = questionHtml; 
        
        let ansText = "";
        if (q.type === 'sort') ansText = `正解順: ${q.c.join(' → ')}`;
        else if (q.type === 'text') ansText = `正解: ${q.correct.join(' / ')}`;
        else {
            const cIdx = (q.correctIndex !== undefined) ? q.correctIndex : q.correct[0];
            const charLabel = String.fromCharCode(65 + cIdx); 
            ansText = `正解: ${charLabel}. ${q.c[cIdx]}`;
        }
        document.getElementById('kanpe-answer').textContent = ansText;
        
        const timeLimit = currentConfig.timeLimit || 0;
        const points = q.points || 1;
        const loss = q.loss || 0;
        document.getElementById('kanpe-point').textContent = `Pt:${points} / Loss:-${loss}`;
        document.getElementById('kanpe-time-limit').textContent = timeLimit ? `${timeLimit}s` : "No Limit";
    } else {
        kanpeArea.classList.add('hidden');
    }
}

function renderRankingView(data) {
    const list = document.getElementById('ranking-list');
    list.innerHTML = '';
    if (data.length === 0) { list.innerHTML = '<p style="padding:20px;">No players</p>'; return; }
    
    data.forEach((r, i) => {
        const rank = i + 1;
        const div = document.createElement('div');
        let rankClass = 'rank-row';
        if (rank === 1) rankClass += ' rank-1';
        else if (rank === 2) rankClass += ' rank-2';
        else if (rank === 3) rankClass += ' rank-3';
        if (!r.isAlive && currentConfig.eliminationRule !== 'none') {
            div.style.opacity = "0.6"; div.style.background = "#eee";
        }
        div.className = rankClass;
        let scoreText = `${r.score}`; 
        
        div.innerHTML = `
            <div style="display:flex; align-items:center;">
                <span class="rank-badge">${rank}</span>
                <span>${r.name}</span>
            </div>
            <div class="rank-score">${scoreText}</div>
        `;
        list.appendChild(div);
    });
}
