{
type: uploaded file
fileName: host_studio.js
fullContent:
/* =========================================================
 * host_studio.js (v67: Safe Fix)
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
    
    const idLabel = document.getElementById('host-room-id');
    if (idLabel) {
        idLabel.textContent = roomId;
        idLabel.style.cursor = "pointer"; 
        idLabel.title = "Click to Copy"; 
        
        idLabel.onclick = () => {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(roomId).then(() => {
                    if(window.showToast) window.showToast("ID Copied: " + roomId);
                    else alert("ID Copied: " + roomId);
                }).catch(err => console.error(err));
            } else {
                alert("Room ID: " + roomId);
            }
        };
    }
    
    const showIdEl = document.getElementById('studio-show-id');
    if(showIdEl) showIdEl.textContent = currentShowId;
    
    document.getElementById('studio-program-loader').classList.remove('hidden');
    document.getElementById('studio-timeline-area').classList.add('hidden');
    document.getElementById('control-panel').classList.add('hidden');
    
    document.getElementById('host-buzz-winner-area').classList.add('hidden');
    document.getElementById('host-manual-judge-area').classList.add('hidden');
    document.getElementById('host-panel-control-area').classList.add('hidden');
    document.getElementById('host-bomb-control-area').classList.add('hidden');
    document.getElementById('host-multi-control-area').classList.add('hidden');
    document.getElementById('host-race-control-area').classList.add('hidden');
    
    updateKanpe(); 
    loadProgramsInStudio();

    window.db.ref(`rooms/${roomId}/players`).on('value', snap => {
        const players = snap.val() || {};
        const total = Object.keys(players).length;
        const alive = Object.values(players).filter(p => p.isAlive).length;
        document.getElementById('host-player-count').textContent = total;
        document.getElementById('host-alive-count').textContent = alive;
        
        if (currentConfig.mode === 'buzz') identifyBuzzWinner(players);
        if (currentConfig.gameType === 'race') updateRaceView(players);
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
        window.db.ref(`rooms/${currentRoomId}/status`).update({ currentAnswerer: winner.id, isBuzzActive: false });
        document.getElementById('host-buzz-winner-name').textContent = winner.name;
        document.getElementById('host-buzz-winner-area').classList.remove('hidden');
        document.getElementById('host-manual-judge-area').classList.remove('hidden');
        
        const ansBtn = document.getElementById('host-show-answer-btn');
        if(ansBtn) ansBtn.classList.add('hidden');
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
        if (index === currentPeriodIndex) div.classList.add('active');
        
        let statusText = "START";
        let interText = "";
        
        if (index > 0) {
            const st = item.config.initialStatus;
            if(st === 'revive') interText = " [Revive All]";
            else if(st === 'continue') interText = " [Continue]";
            else if(st === 'ranking') interText = ` [Top ${item.config.passCount}]`;
        }

        let modeText = item.config.mode ? item.config.mode.toUpperCase() : "NORMAL";
        if (item.config.mode === 'solo' && item.config.soloStyle === 'auto') modeText += " (AUTO)";
        if (item.config.gameType === 'territory') modeText += " (PANEL)";
        if (item.config.gameType === 'race') modeText += " (RACE)";

        div.innerHTML = `
            <div>
                <h5 style="margin:0;">No.${index + 1}: ${item.title}<span style="font-size:0.7em; color:#0055ff;">${interText}</span></h5>
                <div class="info" style="margin-top:5px;">
                    <span style="color:#d00; font-weight:bold;">[${modeText}]</span> ${statusText}
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function playCurrentPeriod() {
    if(!periodPlaylist[currentPeriodIndex]) { alert(APP_TEXT.Studio.MsgNoPeriod); return; }
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
    
    document.getElementById('host-panel-control-area').classList.add('hidden');
    document.getElementById('host-bomb-control-area').classList.add('hidden');
    document.getElementById('host-multi-control-area').classList.add('hidden');
    document.getElementById('host-race-control-area').classList.add('hidden');
    
    if (currentConfig.mode === 'time_attack') currentConfig.timeLimit = currentConfig.timeLimit || 5;
    if (currentConfig.mode === 'solo' && currentConfig.soloStyle === 'auto') {
        currentConfig.timeLimit = currentConfig.timeLimit || 5;
    }

    if (currentConfig.gameType === 'territory') {
        startPanelGame(currentRoomId);
    } else if (currentConfig.gameType === 'race') {
        document.getElementById('host-race-control-area').classList.remove('hidden');
        window.db.ref(`rooms/${currentRoomId}/players`).once('value', snap => {
            updateRaceView(snap.val() || {});
        });
    }
    
    if (currentConfig.mode === 'bomb') {
        startBombGame(currentRoomId);
    } else {
        window.db.ref(`rooms/${currentRoomId}/questions`).set(studioQuestions);
        window.db.ref(`rooms/${currentRoomId}/status`).update({ step: 'standby', qIndex: 0, currentAnswerer: null, isBuzzActive: false, multiState: [] });
        updateKanpe();
    }

    window.db.ref(`rooms/${currentRoomId}/config`).set(currentConfig);
    
    // プレイヤー状態リセット
    window.db.ref(`rooms/${currentRoomId}/players`).once('value', snap => {
        let players = [];
        snap.forEach(p => {
            const val = p.val();
            players.push({ 
                key: p.key, 
                isAlive: val.isAlive, 
                score: val.periodScore||0,
                name: val.name 
            });
        });

        players.sort((a, b) => b.score - a.score);

        const updates = {};
        const passCount = currentConfig.passCount || 5;
        const initStatus = currentConfig.initialStatus || 'revive';

        players.forEach((p, idx) => {
            let nextAlive = true;
            if (initStatus === 'revive') nextAlive = true;
            else if (initStatus === 'continue') nextAlive = p.isAlive;
            else if (initStatus === 'ranking') nextAlive = (idx < passCount);
            
            updates[`${p.key}/isAlive`] = nextAlive;
            updates[`${p.key}/periodScore`] = 0; 
            updates[`${p.key}/periodTime`] = 0;
            updates[`${p.key}/lastTime`] = 99999;
            updates[`${p.key}/lastResult`] = null;
            updates[`${p.key}/buzzTime`] = null;
            updates[`${p.key}/isLocked`] = false;
        });

        if(Object.keys(updates).length > 0) {
            window.db.ref(`rooms/${currentRoomId}/players`).update(updates);
        }
    });

    document.getElementById('current-period-title').textContent = `${item.title}`;
    
    const btnStart = document.getElementById('host-start-btn');
    const btnStartTA = document.getElementById('host-start-ta-btn');
    if(btnStart) btnStart.classList.add('hidden');
    if(btnStartTA) btnStartTA.classList.add('hidden');
    document.getElementById('host-manual-judge-area').classList.add('hidden');

    const isSoloAuto = (currentConfig.mode === 'solo' && currentConfig.soloStyle === 'auto');

    if (currentConfig.mode === 'time_attack' || isSoloAuto) {
        if(btnStartTA) {
            btnStartTA.classList.remove('hidden');
            btnStartTA.textContent = isSoloAuto ? "START Auto Loop" : "START Loop";
        }
        document.getElementById('host-status-area').textContent = `Ready (${currentConfig.timeLimit}s/Q)`;
    } else if (currentConfig.mode !== 'bomb') {
        if(btnStart) btnStart.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = "Ready...";
    }
    
    if(currentConfig.mode !== 'time_attack') {
        buzzWinnerId = null;
        document.getElementById('host-buzz-winner-area').classList.add('hidden');
    }
};

function updateRaceView(players) {
    const container = document.getElementById('host-race-monitor');
    if(!container) return;
    container.innerHTML = '';
    
    const activePlayers = [];
    Object.keys(players).forEach(key => {
        if(players[key].isAlive) activePlayers.push({ name: players[key].name, score: players[key].periodScore || 0 });
    });
    
    activePlayers.sort((a,b) => b.score - a.score);
    
    const goal = currentConfig.passCount || 10;
    
    activePlayers.forEach(p => {
        const row = document.createElement('div');
        row.className = 'race-lane';
        if (p.score >= goal) row.classList.add('goal');
        const percent = Math.min(100, (p.score / goal) * 100);
        row.innerHTML = `
            <div class="race-name">${p.name}</div>
            <div class="race-track"><div class="race-bar" style="width:${percent}%"></div></div>
            <div class="race-score">${p.score}</div>
        `;
        container.appendChild(row);
    });
}

function startPanelGame(roomId) {
    const panels = Array(25).fill(0);
    window.db.ref(`rooms/${roomId}/status`).update({ step: 'panel', panels: panels });
    const grid = document.getElementById('host-panel-grid');
    document.getElementById('host-panel-control-area').classList.remove('hidden');
    grid.innerHTML = '';
    for(let i=0; i<25; i++) {
        const btn = document.createElement('button');
        btn.textContent = i+1;
        btn.style.height = "40px";
        btn.onclick = () => {
            window.db.ref(`rooms/${roomId}/status/panels/${i}`).once('value', snap => {
                let val = snap.val() || 0;
                val = (val + 1) % 5;
                window.db.ref(`rooms/${roomId}/status/panels/${i}`).set(val);
                updateHostPanelColor(btn, val);
            });
        };
        grid.appendChild(btn);
    }
}
function updateHostPanelColor(btn, val) {
    const colors = ['#ddd', '#ffaaaa', '#aaffaa', '#ffffff', '#aaaaff'];
    btn.style.background = colors[val];
}
function startBombGame(roomId) { 
    const count = currentConfig.bombCount || 10;
    const cards = [];
    for(let i=0; i<count; i++) cards.push({ type: 0, open: false });
    const targetIdx = Math.floor(Math.random() * count);
    cards[targetIdx].type = 1; 
    window.db.ref(`rooms/${roomId}/status`).update({ step: 'bomb', cards: cards });
    const grid = document.getElementById('host-bomb-grid');
    document.getElementById('host-bomb-control-area').classList.remove('hidden');
    grid.innerHTML = '';
    for(let i=0; i<count; i++) {
        const btn = document.createElement('button');
        btn.textContent = i+1;
        if(i === targetIdx) btn.textContent += " (★)"; 
        btn.style.height = "40px";
        btn.onclick = () => {
            window.db.ref(`rooms/${roomId}/status/cards/${i}/open`).set(true);
            btn.disabled = true;
            btn.style.background = "#555";
        };
        grid.appendChild(btn);
    }
}

function setupStudioButtons(roomId) {
    const btnClose = document.getElementById('host-close-studio-btn');
    if (btnClose) {
        btnClose.onclick = () => {
            periodPlaylist = [];
            currentRoomId = null;
            if(taTimer) clearTimeout(taTimer);
            enterDashboard();
        };
    }
    
    const btnMasterPlay = document.getElementById('studio-master-play-btn');
    if (btnMasterPlay) {
        btnMasterPlay.onclick = () => {
            playPeriod(currentPeriodIndex);
        };
    }
    
    const btnStart = document.getElementById('host-start-btn');
    if(btnStart) btnStart.onclick = () => {
        const now = firebase.database.ServerValue.TIMESTAMP;
        let updateData = { step: 'question', qIndex: currentQIndex, startTime: now };
        
        // ソロモード（手動）の場合
        if (currentConfig.mode === 'solo' && currentConfig.soloStyle === 'manual') {
            document.getElementById('host-manual-judge-area').classList.remove('hidden');
            const ansBtn = document.getElementById('host-show-answer-btn');
            if(ansBtn) ansBtn.classList.remove('hidden');
        } 
        else if (currentConfig.mode === 'buzz') {
            updateData.isBuzzActive = true;
            updateData.currentAnswerer = null;
            buzzWinnerId = null; 
            window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
                snap.forEach(p => p.ref.update({ buzzTime: null, lastResult: null }));
            });
        }
        
        window.db.ref(`rooms/${roomId}/status`).update(updateData);
        btnStart.classList.add('hidden');
        document.getElementById('host-status-area').textContent = "Active...";
        updateKanpe();
    };

    const btnStartTA = document.getElementById('host-start-ta-btn');
    if(btnStartTA) btnStartTA.onclick = () => {
        btnStartTA.classList.add('hidden');
        if(document.getElementById('host-manual-judge-area')) {
            document.getElementById('host-manual-judge-area').classList.remove('hidden');
        }
        if (currentConfig.mode === 'solo' && currentConfig.soloStyle === 'auto') {
             startSoloLoop(roomId);
        } else {
             startTaLoop(roomId);
        }
    };

    const btnCorrect = document.getElementById('host-judge-correct-btn');
    if(btnCorrect) btnCorrect.onclick = () => {
        if (currentConfig.mode === 'solo' && currentConfig.soloStyle === 'auto') {
            scoreAllAlivePlayers(roomId, 1);
            return;
        }
        if (currentConfig.mode === 'time_attack') {
            if(buzzWinnerId) scorePlayer(roomId, buzzWinnerId, 1);
            clearTimeout(taTimer);
            nextTaQuestion(roomId);
            return;
        }
        if (currentConfig.mode === 'solo') {
             scoreAllAlivePlayers(roomId, 1);
             finishQuestion(roomId);
             return;
        }

        if (!buzzWinnerId) return;
        scorePlayer(roomId, buzzWinnerId, 1);
        finishQuestion(roomId);
    };

    const btnWrong = document.getElementById('host-judge-wrong-btn');
    if(btnWrong) btnWrong.onclick = () => {
        if (currentConfig.mode === 'solo' && currentConfig.soloStyle === 'auto') {
            return;
        }
        if (currentConfig.mode === 'time_attack') {
            clearTimeout(taTimer);
            nextTaQuestion(roomId);
            return;
        }
        if (currentConfig.mode === 'solo') {
             finishQuestion(roomId);
             return;
        }

        if (!buzzWinnerId) return;
        const loss = 0; 
        window.db.ref(`rooms/${roomId}/players/${buzzWinnerId}`).once('value', snap => {
            const val = snap.val();
            let newScore = (val.periodScore||0) - loss;
            let isAlive = val.isAlive;
            if (currentConfig.eliminationRule === 'wrong_only') isAlive = false;
            snap.ref.update({ periodScore: newScore, lastResult: 'lose', buzzTime: null, isAlive: isAlive });
        });
        
        const action = currentConfig.buzzWrongAction;
        buzzWinnerId = null;
        document.getElementById('host-buzz-winner-area').classList.add('hidden');
        if (action === 'end') finishQuestion(roomId);
        else window.db.ref(`rooms/${roomId}/status`).update({ currentAnswerer: null, isBuzzActive: true });
    };

    const btnShowAns = document.getElementById('host-show-answer-btn');
    if(btnShowAns) btnShowAns.onclick = () => finishQuestion(roomId);

    const btnNext = document.getElementById('host-next-btn');
    if(btnNext) btnNext.onclick = (e) => {
        const action = e.target.dataset.action;
        if (action === "next") { playPeriod(currentPeriodIndex + 1); return; }
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
    
    const btnRanking = document.getElementById('host-ranking-btn');
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
    
    const rankingBackBtn = document.getElementById('ranking-back-btn');
    if(rankingBackBtn) rankingBackBtn.onclick = () => {
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'standby' });
        window.showView(window.views.hostControl);
    };
}

function scorePlayer(roomId, playerId, points) {
    window.db.ref(`rooms/${roomId}/players/${playerId}`).once('value', snap => {
        const val = snap.val();
        const newScore = (val.periodScore||0) + points;
        snap.ref.update({ periodScore: newScore, lastResult: 'win' });
    });
}

function scoreAllAlivePlayers(roomId, points) {
    window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
        snap.forEach(p => {
            if(p.val().isAlive) {
                p.ref.update({ 
                    periodScore: (p.val().periodScore||0) + points,
                    lastResult: 'win'
                });
            }
        });
    });
}

function announceWinner(msg, roomId) {
    alert(msg);
    window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer', isBuzzActive: false });
    const btnNext = document.getElementById('host-next-btn');
    if(btnNext) {
        btnNext.classList.remove('hidden');
        btnNext.textContent = APP_TEXT.Studio.BtnNextPeriod; 
        btnNext.dataset.action = "next";
    }
}

function finishQuestion(roomId) {
    window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer', isBuzzActive: false });
    if(document.getElementById('host-show-answer-btn')) document.getElementById('host-show-answer-btn').classList.add('hidden');
    
    if (currentConfig.mode === 'solo' && currentConfig.soloStyle === 'manual') {
        document.getElementById('host-manual-judge-area').classList.add('hidden');
    }
    
    const btnNext = document.getElementById('host-next-btn');
    if(btnNext) {
        btnNext.classList.remove('hidden');
        if (currentQIndex >= studioQuestions.length - 1) {
            btnNext.textContent = APP_TEXT.Studio.BtnNextPeriod; 
            btnNext.dataset.action = "next";
        } else {
            btnNext.textContent = APP_TEXT.Studio.BtnNextQ;
            btnNext.dataset.action = "nextQ";
        }
    }
}

function startTaLoop(roomId) { currentQIndex = -1; nextTaQuestion(roomId); }
function nextTaQuestion(roomId) {
    currentQIndex++;
    if (currentQIndex >= studioQuestions.length) {
        document.getElementById('host-status-area').textContent = "FINISHED";
        return;
    }
    updateKanpe();
    window.db.ref(`rooms/${roomId}/status`).update({ 
        step: 'question', 
        qIndex: currentQIndex, 
        startTime: firebase.database.ServerValue.TIMESTAMP,
        timeLimit: currentConfig.timeLimit 
    });
    document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} (${currentConfig.timeLimit}s)`;
    taTimer = setTimeout(() => { nextTaQuestion(roomId); }, currentConfig.timeLimit * 1000);
}

function startSoloLoop(roomId) { currentQIndex = -1; nextSoloAutoQuestion(roomId); }
function nextSoloAutoQuestion(roomId) {
    currentQIndex++;
    if (currentQIndex >= studioQuestions.length) {
        document.getElementById('host-status-area').textContent = "FINISHED";
        document.getElementById('host-manual-judge-area').classList.add('hidden');
        const btnNext = document.getElementById('host-next-btn');
        if(btnNext) {
            btnNext.classList.remove('hidden');
            btnNext.textContent = "Next Period";
            btnNext.dataset.action = "next";
        }
        return;
    }
    updateKanpe();
    
    const duration = currentConfig.timeLimit || 5; 

    window.db.ref(`rooms/${roomId}/status`).update({ 
        step: 'question', 
        qIndex: currentQIndex, 
        startTime: firebase.database.ServerValue.TIMESTAMP,
        timeLimit: duration
    });
    
    document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} Auto (${duration}s)`;
    
    taTimer = setTimeout(() => { 
        nextSoloAutoQuestion(roomId); 
    }, duration * 1000);
}

function updateKanpe() {
    const kanpeArea = document.getElementById('host-kanpe-area');
    if(studioQuestions.length === 0) { kanpeArea.classList.add('hidden'); return; }
    if(studioQuestions.length > currentQIndex) {
        const q = studioQuestions[currentQIndex];
        kanpeArea.classList.remove('hidden');
        let questionHtml = `Q${currentQIndex+1}. ${q.q}`;
        if (q.type === 'multi') {
            document.getElementById('host-multi-control-area').classList.remove('hidden');
            const mGrid = document.getElementById('host-multi-grid');
            mGrid.innerHTML = '';
            window.db.ref(`rooms/${currentRoomId}/status/multiState`).once('value', snap => {
                const states = snap.val() || Array(q.c.length).fill(false);
                q.c.forEach((ans, i) => {
                    const btn = document.createElement('div');
                    btn.className = 'multi-ans-btn';
                    if(states[i]) btn.classList.add('opened');
                    btn.textContent = ans;
                    btn.onclick = () => {
                        window.db.ref(`rooms/${currentRoomId}/status/multiState/${i}`).set(!states[i]);
                        states[i] = !states[i];
                        if(states[i]) btn.classList.add('opened'); else btn.classList.remove('opened');
                    };
                    mGrid.appendChild(btn);
                });
            });
        } else {
            document.getElementById('host-multi-control-area').classList.add('hidden');
        }
        document.getElementById('kanpe-question').innerHTML = questionHtml; 
        document.getElementById('kanpe-answer').textContent = (q.type === 'multi') ? `全${q.c.length}項目` : `正解: ${q.correct}`;
        
        const timeLimit = (q.timeLimit !== undefined && q.timeLimit > 0) ? q.timeLimit : 0;
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
