/* =========================================================
 * player.js (v29: Ranking Sync & Display)
 * =======================================================*/

let myRoomId = null;
let myPlayerId = null;
let currentQuestion = null;
let myName = "";
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
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
    if(!code || !name) { alert("入力してください"); return; }
    
    myRoomId = code;
    myName = name;
    
    window.db.ref(`rooms/${code}`).once('value', snap => {
        if(!snap.exists()) { alert("部屋が見つかりません"); return; }
        
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
                badge.textContent = "ALIVE";
                badge.style.background = "#00ff00";
                document.getElementById('player-dead-overlay').classList.add('hidden');
            } else {
                badge.textContent = "DEAD";
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
    document.getElementById('player-ranking-overlay').classList.add('hidden'); // ★隠す
    
    if(status.step === 'standby') {
        document.getElementById('player-lobby-msg').classList.remove('hidden');
        document.getElementById('player-quiz-area').classList.add('hidden');
        document.getElementById('player-wait-msg').classList.add('hidden');
        document.getElementById('player-lobby-msg').innerHTML = "<h2>Ready?</h2><p>次の問題を待機中...</p>";
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
        // ★ランキング発表
        showRankingOverlay();
    }
}

function startTimer(startTime) {
    if(timerInterval) clearInterval(timerInterval);
    const disp = document.getElementById('answer-timer-disp');
    
    window.db.ref(`rooms/${myRoomId}/config/timeLimit`).once('value', snap => {
        const limit = snap.val() || 0;
        if(limit === 0) {
            disp.textContent = "制限なし";
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
        p.textContent = "正しい順にタップしてください（開発中）";
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
        btn.textContent = "送信";
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
            text.textContent = "正解！";
            text.style.color = "#d00";
        } else if (res === 'lose') {
            overlay.style.background = "rgba(0, 0, 50, 0.9)";
            icon.textContent = "❌";
            text.textContent = "不正解...";
            text.style.color = "#fff";
        } else {
            overlay.style.background = "#fff";
            icon.textContent = "⏳";
            text.textContent = "集計中...";
            text.style.color = "#666";
        }
    });
}

// ★追加：ランキング発表表示
function showRankingOverlay() {
    const overlay = document.getElementById('player-ranking-overlay');
    const rankEl = document.getElementById('player-my-rank');
    const scoreEl = document.getElementById('player-my-score');
    
    overlay.classList.remove('hidden');
    rankEl.textContent = "...";
    scoreEl.textContent = "...";

    // 全員データを取得して自分の順位を計算（簡易実装）
    window.db.ref(`rooms/${myRoomId}/players`).once('value', snap => {
        let list = [];
        snap.forEach(p => {
            const v = p.val();
            list.push({ key: p.key, score: v.periodScore || 0, time: v.periodTime || 0 });
        });
        
        // ソート
        list.sort((a,b) => (b.score - a.score) || (a.time - b.time));
        
        // 自分の順位を探す
        const myIndex = list.findIndex(p => p.key === myPlayerId);
        if (myIndex !== -1) {
            const myData = list[myIndex];
            rankEl.textContent = `${myIndex + 1}位`;
            scoreEl.textContent = `${myData.score}点`;
        }
    });
}
