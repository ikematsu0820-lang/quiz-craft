/* =========================================================
 * player.js (v30: Ranking Sync & Text Config)
 * =======================================================*/

let myRoomId = null;
let myPlayerId = null;
let currentQuestion = null;
let myName = "";
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // ★テキスト適用
    if(window.applyTextConfig) window.applyTextConfig();

    const joinBtn = document.getElementById('join-room-btn');
    if(joinBtn) joinBtn.addEventListener('click', joinRoom);
    
    document.getElementById('player-input-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('answer-btn')) {
            const idx = parseInt(e.target.getAttribute('data-index'));
            submitAnswer(idx);
        }
    });
});

function joinRoom() {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    const name = document.getElementById('player-name-input').value.trim();
    if(!code || !name) { alert("Input Required"); return; }
    
    myRoomId = code;
    myName = name;
    
    window.db.ref(`rooms/${code}`).once('value', snap => {
        if(!snap.exists()) { alert("Room not found"); return; }
        
        const playerRef = window.db.ref(`rooms/${code}/players`).push();
        myPlayerId = playerRef.key;
        playerRef.set({
            name: name,
            isAlive: true,
            periodScore: 0,
            lastAnswer: null,
            lastResult: null
        }).then(() => {
            window.showView(window.views.playerGame);
            document.getElementById('player-name-disp').textContent = name;
            listenToRoom();
        });
    });
}

function listenToRoom() {
    window.db.ref(`rooms/${myRoomId}/status`).on('value', snap => {
        const status = snap.val();
        if(status) handleStatusChange(status);
    });

    window.db.ref(`rooms/${myRoomId}/players/${myPlayerId}`).on('value', snap => {
        const val = snap.val();
        if(val) {
            const badge = document.getElementById('alive-badge');
            if(val.isAlive) {
                badge.textContent = APP_TEXT.Player.BadgeAlive;
                badge.style.background = "#00ff00";
                document.getElementById('player-dead-overlay').classList.add('hidden');
            } else {
                badge.textContent = APP_TEXT.Player.BadgeDead;
                badge.style.background = "#555";
                document.getElementById('player-dead-overlay').classList.remove('hidden');
            }
            if(val.periodScore !== undefined) {
                document.getElementById('score-display-area').classList.remove('hidden');
                document.getElementById('current-score-value').textContent = val.periodScore;
            }
        }
    });
}

function handleStatusChange(status) {
    document.getElementById('player-result-overlay').classList.add('hidden');
    document.getElementById('player-ranking-overlay').classList.add('hidden');
    
    if(status.step === 'standby') {
        document.getElementById('player-lobby-msg').classList.remove('hidden');
        document.getElementById('player-quiz-area').classList.add('hidden');
        document.getElementById('player-wait-msg').classList.add('hidden');
        document.getElementById('player-lobby-msg').innerHTML = `<h2>${APP_TEXT.Player.MsgLobbyHead}</h2><p>${APP_TEXT.Player.MsgLobbyBody}</p>`;
    }
    else if(status.step === 'question') {
        window.db.ref(`rooms/${myRoomId}/questions/${status.qIndex}`).once('value', qSnap => {
            currentQuestion = qSnap.val();
            renderQuestion(currentQuestion);
            startTimer(status.startTime);
        });
        document.getElementById('player-lobby-msg').classList.add('hidden');
        document.getElementById('player-quiz-area').classList.remove('hidden');
        document.getElementById('player-wait-msg').classList.add('hidden');
    }
    else if(status.step === 'answer') {
        document.getElementById('player-quiz-area').classList.add('hidden');
        document.getElementById('player-wait-msg').classList.add('hidden');
        showResultOverlay();
    }
    else if(status.step === 'ranking') {
        showRankingOverlay();
    }
}

function startTimer(startTime) {
    if(timerInterval) clearInterval(timerInterval);
    const disp = document.getElementById('answer-timer-disp');
    
    window.db.ref(`rooms/${myRoomId}/config/timeLimit`).once('value', snap => {
        const limit = snap.val() || 0;
        if(limit === 0) {
            disp.textContent = "No Limit";
            return;
        }
        timerInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const remain = Math.max(0, limit - elapsed);
            disp.textContent = remain.toFixed(1) + "s";
            if(remain <= 0) clearInterval(timerInterval);
        }, 100);
    });
}

function renderQuestion(q) {
    const textDiv = document.getElementById('question-text-disp');
    textDiv.textContent = q.q;
    const container = document.getElementById('player-input-container');
    container.innerHTML = '';

    if (q.type === 'sort') {
        const p = document.createElement('p');
        p.textContent = "Tap in order (Dev)";
        container.appendChild(p);
        q.c.forEach((choice) => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn btn-sort';
            btn.textContent = choice;
            container.appendChild(btn);
        });
    } else if (q.type === 'text') {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.style.fontSize = '1.5em';
        inp.style.padding = '10px';
        inp.style.width = '80%';
        container.appendChild(inp);
        const btn = document.createElement('button');
        btn.textContent = "Send";
        btn.className = 'btn-primary';
        btn.style.marginTop = '10px';
        btn.onclick = () => submitAnswer(inp.value);
        container.appendChild(btn);
    } else {
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '10px';
        q.c.forEach((choice, i) => {
            const btn = document.createElement('button');
            btn.className = `answer-btn ${['btn-blue','btn-red','btn-green','btn-yellow'][i%4]}`;
            btn.textContent = choice;
            btn.setAttribute('data-index', i);
            grid.appendChild(btn);
        });
        container.appendChild(grid);
    }
}

function submitAnswer(ans) {
    const timeTaken = Date.now();
    window.db.ref(`rooms/${myRoomId}/players/${myPlayerId}`).update({
        lastAnswer: ans,
        lastTime: timeTaken 
    });
    document.getElementById('player-quiz-area').classList.add('hidden');
    document.getElementById('player-wait-msg').classList.remove('hidden');
}

function showResultOverlay() {
    const overlay = document.getElementById('player-result-overlay');
    const icon = document.getElementById('result-icon');
    const text = document.getElementById('result-text');
    
    window.db.ref(`rooms/${myRoomId}/players/${myPlayerId}/lastResult`).once('value', snap => {
        const res = snap.val();
        overlay.classList.remove('hidden');
        if (res === 'win') {
            overlay.style.background = "rgba(255, 235, 59, 0.95)";
            icon.textContent = "⭕";
            text.textContent = APP_TEXT.Player.MsgCorrect;
            text.style.color = "#d00";
        } else if (res === 'lose') {
            overlay.style.background = "rgba(0, 0, 50, 0.9)";
            icon.textContent = "❌";
            text.textContent = APP_TEXT.Player.MsgWrong;
            text.style.color = "#fff";
        } else {
            overlay.style.background = "#fff";
            icon.textContent = "⏳";
            text.textContent = APP_TEXT.Player.MsgWait;
            text.style.color = "#666";
        }
    });
}

function showRankingOverlay() {
    const overlay = document.getElementById('player-ranking-overlay');
    const rankEl = document.getElementById('player-my-rank');
    const scoreEl = document.getElementById('player-my-score');
    const listEl = document.getElementById('player-leaderboard');
    
    overlay.classList.remove('hidden');
    rankEl.textContent = "...";
    scoreEl.textContent = "...";
    listEl.innerHTML = "";

    window.db.ref(`rooms/${myRoomId}/players`).once('value', snap => {
        let list = [];
        snap.forEach(p => {
            const v = p.val();
            list.push({ key: p.key, name: v.name, score: v.periodScore || 0, time: v.periodTime || 0 });
        });
        
        list.sort((a,b) => (b.score - a.score) || (a.time - b.time));
        
        // 自分の順位
        const myIndex = list.findIndex(p => p.key === myPlayerId);
        if (myIndex !== -1) {
            const myData = list[myIndex];
            rankEl.textContent = `${myIndex + 1}${APP_TEXT.Player.RankUnit}`;
            scoreEl.textContent = `${myData.score}${APP_TEXT.Player.ScoreUnit}`;
        }

        // 上位5名のリスト表示
        const top5 = list.slice(0, 5);
        top5.forEach((p, i) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.padding = '5px 0';
            row.style.borderBottom = '1px solid #666';
            row.innerHTML = `<span>${i+1}. ${p.name}</span> <span>${p.score}pt</span>`;
            listEl.appendChild(row);
        });
    });
}
