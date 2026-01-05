/* =========================================================
 * player.js (v26: Result Feedback & Multi-Type Input)
 * =======================================================*/

let myRoomId = null;
let myPlayerId = null;
let currentQuestion = null;
let myName = "";
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const joinBtn = document.getElementById('join-room-btn');
    if(joinBtn) {
        joinBtn.addEventListener('click', joinRoom);
    }
    
    // 選択肢ボタン (Delegation)
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
    
    // 部屋存在確認
    window.db.ref(`rooms/${code}`).once('value', snap => {
        if(!snap.exists()) { alert("部屋が見つかりません"); return; }
        
        // プレイヤー登録
        const playerRef = window.db.ref(`rooms/${code}/players`).push();
        myPlayerId = playerRef.key;
        playerRef.set({
            name: name,
            isAlive: true,
            periodScore: 0,
            lastAnswer: null,
            lastResult: null // 初期化
        }).then(() => {
            window.showView(window.views.playerGame);
            document.getElementById('player-name-disp').textContent = name;
            listenToRoom();
        });
    });
}

function listenToRoom() {
    // 1. ステータス監視
    window.db.ref(`rooms/${myRoomId}/status`).on('value', snap => {
        const status = snap.val();
        if(status) handleStatusChange(status);
    });

    // 2. 自分の状態監視 (生存/脱落/スコア/結果)
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
            // スコア表示
            if(val.periodScore !== undefined) {
                document.getElementById('score-display-area').classList.remove('hidden');
                document.getElementById('current-score-value').textContent = val.periodScore;
            }
        }
    });
}

function handleStatusChange(status) {
    // リセット
    document.getElementById('player-result-overlay').classList.add('hidden');
    
    if(status.step === 'standby') {
        document.getElementById('player-lobby-msg').classList.remove('hidden');
        document.getElementById('player-quiz-area').classList.add('hidden');
        document.getElementById('player-wait-msg').classList.add('hidden');
        document.getElementById('player-lobby-msg').innerHTML = "<h2>Ready?</h2><p>次の問題を待機中...</p>";
    }
    else if(status.step === 'question') {
        // 問題データを取得して表示
        window.db.ref(`rooms/${myRoomId}/questions/${status.qIndex}`).once('value', qSnap => {
            currentQuestion = qSnap.val();
            renderQuestion(currentQuestion);
            
            // タイムリミット表示
            startTimer(status.startTime);
        });
        
        document.getElementById('player-lobby-msg').classList.add('hidden');
        document.getElementById('player-quiz-area').classList.remove('hidden');
        document.getElementById('player-wait-msg').classList.add('hidden');
    }
    else if(status.step === 'answer') {
        document.getElementById('player-quiz-area').classList.add('hidden');
        document.getElementById('player-wait-msg').classList.add('hidden');
        
        // ★結果表示
        showResultOverlay();
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
            // サーバー時刻との差分補正は簡易的に省略
            // ※本来はfirebase.database.ServerValue.TIMESTAMPの差分をとるべき
            const elapsed = (now - startTime) / 1000;
            const remain = Math.max(0, limit - elapsed);
            disp.textContent = remain.toFixed(1) + "s";
            
            if(remain <= 0) {
                clearInterval(timerInterval);
                // タイムアップ処理（入力無効化など）
            }
        }, 100);
    });
}

function renderQuestion(q) {
    const textDiv = document.getElementById('question-text-disp');
    textDiv.textContent = q.q;
    
    const container = document.getElementById('player-input-container');
    container.innerHTML = '';

    if (q.type === 'sort') {
        // 並べ替えUI (簡易版: ボタンを押すと順に登録される)
        const p = document.createElement('p');
        p.textContent = "正しい順にタップしてください";
        container.appendChild(p);
        
        // 選択用リスト
        q.c.forEach((choice, i) => {
            // シャッフルして表示すべきだが、今回は簡易的にそのまま
            const btn = document.createElement('button');
            btn.className = 'answer-btn btn-sort';
            btn.textContent = choice;
            btn.onclick = () => {
                // 選択ロジック（未実装: 今回は選択式メイン）
                // 本格実装には選択済みリストの管理が必要
                alert("並べ替え回答は現在開発中です"); 
            };
            container.appendChild(btn);
        });

    } else if (q.type === 'text') {
        // 自由入力
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
        btn.onclick = () => {
            submitAnswer(inp.value);
        };
        container.appendChild(btn);

    } else {
        // 4択 (Choice)
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
    const timeTaken = Date.now(); // 簡易タイムスタンプ（本来はstartからの差分）
    
    // 送信
    window.db.ref(`rooms/${myRoomId}/players/${myPlayerId}`).update({
        lastAnswer: ans,
        lastTime: timeTaken // サーバー側で計算するならstartTimeを送るか、ここで差分計算
    });
    
    // 待機画面へ
    document.getElementById('player-quiz-area').classList.add('hidden');
    document.getElementById('player-wait-msg').classList.remove('hidden');
}

// ★結果表示
function showResultOverlay() {
    const overlay = document.getElementById('player-result-overlay');
    const icon = document.getElementById('result-icon');
    const text = document.getElementById('result-text');
    
    // 自分の結果を取得
    window.db.ref(`rooms/${myRoomId}/players/${myPlayerId}/lastResult`).once('value', snap => {
        const res = snap.val();
        
        overlay.classList.remove('hidden');
        overlay.className = ''; // クラスリセット
        
        if (res === 'win') {
            overlay.style.background = "rgba(255, 235, 59, 0.95)"; // 黄色っぽい
            icon.textContent = "⭕";
            text.textContent = "正解！";
            text.style.color = "#d00";
        } else if (res === 'lose') {
            overlay.style.background = "rgba(0, 0, 50, 0.9)"; // 暗い青
            icon.textContent = "❌";
            text.textContent = "不正解...";
            text.style.color = "#fff";
        } else {
            // null または判定なし
            overlay.style.background = "#fff";
            icon.textContent = "⏳";
            text.textContent = "集計中...";
            text.style.color = "#666";
        }
    });
}
