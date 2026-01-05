/* =========================================================
 * host_studio.js (v31: Program Delete Support)
 * =======================================================*/

let currentProgramConfig = { finalRanking: true };

function startRoom() {
    if(periodPlaylist.length === 0) {
        if(!confirm(APP_TEXT.Studio.MsgNoPeriod)) return;
    }
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
    const loadBtn = document.getElementById('studio-load-program-btn');
    const delBtn = document.getElementById('studio-delete-program-btn');
    
    if(!select || !loadBtn) return;

    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;
    
    window.db.ref(`saved_programs/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = `<option value="">${APP_TEXT.Studio.SelectProgDefault}</option>`;
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                // IDも一緒に保存しておく (削除用)
                item.id = key;
                opt.value = JSON.stringify(item);
                opt.textContent = item.title;
                select.appendChild(opt);
            });
        }
    });

    loadBtn.onclick = () => {
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

    // ★追加：削除処理
    if(delBtn) {
        delBtn.onclick = () => {
            const val = select.value;
            if(!val) return;
            const prog = JSON.parse(val);
            
            if(confirm(APP_TEXT.Studio.MsgConfirmDeleteProg)) {
                // Firebaseから削除
                window.db.ref(`saved_programs/${currentShowId}/${prog.id}`).remove()
                .then(() => {
                    alert("Deleted.");
                    // リスト再読み込み
                    loadProgramsInStudio();
                })
                .catch(err => alert("Error: " + err.message));
            }
        };
    }
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

    btn
