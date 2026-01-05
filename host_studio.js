/* =========================================================
 * host_studio.js (v32: Studio UI Adjustments)
 * =======================================================*/

let currentProgramConfig = { finalRanking: true };

function startRoom() {
    // ★修正：ポップアップ削除（いきなりスタジオへ）
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    currentPeriodIndex = 0; 
    
    window.db.ref(`rooms/${currentRoomId}`).set({
        questions: [],
        status: { step: 'standby', qIndex: 0 },
        config: { theme: 'light', scoreUnit: 'point' },
        players: {}
    }).then(() => {
        enterHostMode(currentRoomId);
    });
}

function enterHostMode(roomId) {
    window.showView(window.views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;
    document.getElementById('studio-show-id').textContent = currentShowId;
    
    document.getElementById('studio-timeline-area').classList.remove('hidden');
    document.getElementById('control-panel').classList.add('hidden');
    
    loadProgramsInStudio();
    renderStudioTimeline();

    window.db.ref(`rooms/${roomId}/players`).on('value', snap => {
        const players = snap.val() || {};
        const total = Object.keys(players).length;
        const alive = Object.values(players).filter(p => p.isAlive).length;
        document.getElementById('host-player-count').textContent = total;
        document.getElementById('host-alive-count').textContent = alive;
    });

    setupStudioButtons(roomId);
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
            renderStudioTimeline();
            alert(APP_TEXT.Studio.MsgLoaded);
        }
    };
    // ★修正：削除ボタンの処理は削除
}

function renderStudioTimeline() {
    const container = document.getElementById('studio-period-timeline');
    container.innerHTML = '';
    
    if(periodPlaylist.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; font-size:0.9em;">Please load program</p>';
        document.getElementById('studio-footer-controls').classList.add('hidden');
        return;
    }
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

        div.innerHTML = `
            <div>
                <h5 style="margin:0;">No.${index + 1}: ${item.title}${interText}</h5>
                <div class="info" style="margin-top:5px;">
                    ${statusText} / ${item.questions.length}Q / ${item.config.timeLimit}s
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
    
    document.getElementById('studio-timeline-area').classList.add('hidden');
    document.getElementById('control-panel').classList.remove('hidden');
    document.getElementById('studio-program-loader').classList.add('hidden'); 
    
    window.db.ref(`rooms/${currentRoomId}/questions`).set(studioQuestions);
    window.db.ref(`rooms/${currentRoomId}/config`).set(currentConfig);
    window.db.ref(`rooms/${currentRoomId}/status`).update({ step: 'standby', qIndex: 0 });
    
    window.db.ref(`rooms/${currentRoomId}/players`).once('value', snap => {
        let players = [];
        snap.forEach(p => {
            const val = p.val();
            players.push({ key: p.key, isAlive: val.isAlive, score: val.periodScore||0, time: val.periodTime||0 });
        });
        
        let survivorsKeys = [];
        if (currentConfig.initialStatus === 'ranking') {
            let alivePlayers = players.filter(p => p.isAlive);
            alivePlayers.sort((a,b) => (b.score - a.score) || (a.time - b.time));
            const limit = currentConfig.passCount || 5;
            survivorsKeys = alivePlayers.slice(0, limit).map(p => p.key);
        }

        snap.forEach(p => {
            let updateData = { periodScore: 0, periodTime: 0, lastTime: 99999, lastResult: null };
            let newIsAlive = p.val().isAlive;
            if (index === 0 || currentConfig.initialStatus === 'revive') newIsAlive = true;
            else if (currentConfig.initialStatus === 'ranking') newIsAlive = survivorsKeys.includes(p.key);
            
            updateData.isAlive = newIsAlive;
            p.ref.update(updateData);
        });
    });

    document.getElementById('current-period-title').textContent = `${item.title}`;
    
    document.getElementById('host-start-btn').classList.remove('hidden');
    document.getElementById('host-show-answer-btn').classList.add('hidden');
    document.getElementById('host-next-btn').classList.add('hidden');
    document.getElementById('host-ranking-btn').classList.remove('hidden');
    
    updateKanpe();
};

function setupStudioButtons(roomId) {
    const btnMasterPlay = document.getElementById('studio-master-play-btn');
    const btnStart = document.getElementById('host-start-btn');
    const btnShowAns = document.getElementById('host-show-answer-btn');
    const btnNext = document.getElementById('host-next-btn');
    const btnRanking = document.getElementById('host-ranking-btn');
    const btnClose = document.getElementById('host-close-studio-btn');
    const rankingBackBtn = document.getElementById('ranking-back-btn');
    
    if(btnMasterPlay) btnMasterPlay.onclick = playCurrentPeriod;

    btnStart.onclick = () => {
        const now = firebase.database.ServerValue.TIMESTAMP;
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'question', qIndex: currentQIndex, startTime: now });
        btnStart.classList.add('hidden');
        btnShowAns.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = APP_TEXT.Studio.MsgThinking;
    };

    btnShowAns.onclick = () => {
        const q = studioQuestions[currentQIndex];
        const points = parseInt(q.points) || 1;
        const loss = parseInt(q.loss) || 0;
        
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let slowestId = null;
            let maxTime = -1;
            snap.forEach(p => {
                const val = p.val();
                if(!val.isAlive) return;
                const ans = val.lastAnswer;
                let isCorrect = false;
                if (q.type === 'sort') {
                    if (Array.isArray(ans) && JSON.stringify(ans) === JSON.stringify(q.correct)) isCorrect = true;
                } else if (q.type === 'text') {
                    if (ans && q.correct.some(c => c.trim().toLowerCase() === ans.trim().toLowerCase())) isCorrect = true;
                } else {
                    if (q.correctIndex !== undefined) isCorrect = (ans == q.correctIndex);
                    else if (q.correct) isCorrect = (ans == q.correct[0]); 
                }
                
                if(isCorrect) {
                    const t = val.lastTime || 99999;
                    p.ref.update({ 
                        periodScore: (val.periodScore||0) + points, 
                        periodTime: (val.periodTime||0) + t,
                        lastResult: 'win'
                    });
                    if (currentConfig.eliminationRule === 'wrong_and_slowest') {
                        if (t > maxTime) { maxTime = t; slowestId = p.key; }
                    }
                } else {
                    let newScore = val.periodScore || 0;
                    if (loss > 0) newScore -= loss;
                    else if (currentConfig.lossPoint) {
                        if (currentConfig.lossPoint === 'reset') newScore = 0;
                        else newScore += parseInt(currentConfig.lossPoint);
                    }
                    p.ref.update({ periodScore: newScore, lastResult: 'lose' });
                    if (currentConfig.eliminationRule !== 'none') p.ref.update({ isAlive: false });
                }
            });
            if (currentConfig.eliminationRule === 'wrong_and_slowest' && slowestId) {
                window.db.ref(`rooms/${roomId}/players/${slowestId}`).update({ isAlive: false, lastResult: 'lose' });
            }
        });
        
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });
        btnShowAns.classList.add('hidden');
        btnNext.classList.remove('hidden');
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
    };

    btnNext.onclick = (e) => {
        const action = e.target.dataset.action;

        if (action === "ranking" || action === "final") {
            btnRanking.click(); 
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
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ lastAnswer: null, lastTime: 99999, lastResult: null }));
        });
        updateKanpe();
        btnStart.classList.remove('hidden');
        btnNext.classList.add('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} Standby...`;
    };

    btnRanking.onclick = () => {
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

    rankingBackBtn.onclick = () => {
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'standby' });
        window.showView(window.views.hostControl);
    };
    
    btnClose.onclick = () => {
        if(confirm(APP_TEXT.Studio.MsgConfirmBack)) enterDashboard();
    };
}

function updateKanpe() {
    const kanpeArea = document.getElementById('host-kanpe-area');
    if(studioQuestions.length > currentQIndex) {
        const q = studioQuestions[currentQIndex];
        kanpeArea.classList.remove('hidden');
        document.getElementById('kanpe-question').textContent = `Q${currentQIndex+1}. ${q.q}`;
        
        let ansText = "";
        if (q.type === 'sort') ansText = `正解順: ${q.c.join(' → ')}`;
        else if (q.type === 'text') ansText = `正解: ${q.correct.join(' / ')}`;
        else {
            const labels = (currentConfig.theme === 'dark') ? ["A","B","C","D"] : ["青","赤","緑","黄"];
            const cIdx = (q.correctIndex !== undefined) ? q.correctIndex : q.correct[0];
            ansText = `正解: ${labels[cIdx]} (${q.c[cIdx]})`;
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
    const isCurrency = (currentConfig.scoreUnit === 'currency');
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
        if (isCurrency) scoreText = `¥${r.score.toLocaleString()}`;
        
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
