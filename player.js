/* =========================================================
 * player.js (v46: Buzz Mode Support)
 * =======================================================*/

let myRoomId = null;
let myPlayerId = null;
let myName = "NoName";

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('join-room-btn');
    if(btn) btn.addEventListener('click', joinRoom);
});

function joinRoom() {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    const name = document.getElementById('player-name-input').value.trim();
    if(!code || !name) return;
    
    myRoomId = code;
    myName = name;
    
    const playersRef = window.db.ref(`rooms/${code}/players`);
    const newPlayerRef = playersRef.push();
    myPlayerId = newPlayerRef.key;
    
    newPlayerRef.set({
        name: name,
        isAlive: true,
        periodScore: 0,
        periodTime: 0
    }).then(() => {
        window.showView(window.views.playerGame);
        document.getElementById('player-name-disp').textContent = name;
        startPlayerListener(code, myPlayerId);
    }).catch(e => alert("Error: " + e.message));
}

function startPlayerListener(roomId, playerId) {
    const statusRef = window.db.ref(`rooms/${roomId}/status`);
    const myRef = window.db.ref(`rooms/${roomId}/players/${playerId}`);
    const roomConfigRef = window.db.ref(`rooms/${roomId}/config`); // モード確認用

    // 自分の状態監視 (生存/脱落/スコア)
    myRef.on('value', snap => {
        const val = snap.val();
        if(!val) return;
        
        const badge = document.getElementById('alive-badge');
        if (val.isAlive) {
            badge.textContent = "ALIVE";
            badge.style.background = "#00ff00";
            document.getElementById('player-dead-overlay').classList.add('hidden');
        } else {
            badge.textContent = "DEAD";
            badge.style.background = "#d00";
            document.getElementById('player-dead-overlay').classList.remove('hidden');
        }
        
        if (val.periodScore !== undefined) {
            document.getElementById('score-display-area').classList.remove('hidden');
            document.getElementById('current-score-value').textContent = val.periodScore;
        }
        
        // 勝敗結果表示
        if (val.lastResult) {
            showResultOverlay(val.lastResult);
        } else {
            document.getElementById('player-result-overlay').classList.add('hidden');
        }
    });

    // 部屋の設定監視 (モード切り替え)
    let currentMode = 'normal';
    roomConfigRef.on('value', snap => {
        const config = snap.val();
        if(config && config.mode) {
            currentMode = config.mode;
        }
    });

    // 進行状況監視
    statusRef.on('value', snap => {
        const st = snap.val();
        if(!st) return;

        // 画面初期化
        document.getElementById('player-lobby-msg').innerHTML = "";
        document.getElementById('player-quiz-area').classList.add('hidden');
        document.getElementById('player-wait-msg').classList.add('hidden');
        document.getElementById('player-ranking-overlay').classList.add('hidden');
        document.getElementById('player-buzz-area').classList.add('hidden'); // Buzzエリア隠す

        // ステップ分岐
        if (st.step === 'standby') {
            document.getElementById('player-lobby-msg').innerHTML = `<h3>${APP_TEXT.Player.MsgLobbyHead}</h3><p>${APP_TEXT.Player.MsgLobbyBody}</p>`;
        }
        else if (st.step === 'question') {
            // ★v46: モード分岐
            if (currentMode === 'buzz') {
                handleBuzzMode(roomId, playerId, st);
            } else {
                handleNormalMode(roomId, playerId, st);
            }
        }
        else if (st.step === 'answer') {
            document.getElementById('player-wait-msg').classList.remove('hidden');
            document.getElementById('player-wait-msg').textContent = APP_TEXT.Player.MsgAnswered;
        }
        else if (st.step === 'ranking') {
            document.getElementById('player-ranking-overlay').classList.remove('hidden');
            renderPlayerRanking(roomId, playerId);
        }
    });
}

// ★v46: 早押しモードの処理
function handleBuzzMode(roomId, playerId, status) {
    const buzzArea = document.getElementById('player-buzz-area');
    const lobbyMsg = document.getElementById('player-lobby-msg');
    
    // まだ誰も回答権を得ていない & 早押し有効
    if (status.isBuzzActive) {
        buzzArea.classList.remove('hidden');
        const btn = document.getElementById('player-buzz-btn');
        btn.disabled = false;
        btn.textContent = APP_TEXT.Player.BtnBuzz;
        btn.style.opacity = "1";
        
        btn.onclick = () => {
            // 押した時間を記録
            const now = firebase.database.ServerValue.TIMESTAMP;
            window.db.ref(`rooms/${roomId}/players/${playerId}`).update({ buzzTime: now });
            btn.disabled = true; // 連打防止
            btn.textContent = "Wait...";
        };
    } 
    // 誰かが回答権を得た
    else if (status.currentAnswerer) {
        buzzArea.classList.add('hidden');
        if (status.currentAnswerer === playerId) {
            // 自分だ！
            lobbyMsg.innerHTML = `<h2 style="color:red; font-size:2em;">${APP_TEXT.Player.MsgBuzzWin}</h2>`;
        } else {
            // 他の人
            lobbyMsg.innerHTML = `<h3>LOCKED</h3><p>Waiting for answer...</p>`;
        }
    }
    else {
        // まだ開始前など
        lobbyMsg.textContent = "Ready...";
    }
}

// 通常モードの処理 (v45までと同じ)
function handleNormalMode(roomId, playerId, status) {
    window.db.ref(`rooms/${roomId}/players/${playerId}/lastAnswer`).once('value', ansSnap => {
        if(ansSnap.val() != null) {
            document.getElementById('player-wait-msg').classList.remove('hidden');
        } else {
            // 問題表示
            window.db.ref(`rooms/${roomId}/questions/${status.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                renderPlayerQuestion(q, roomId, playerId);
            });
        }
    });
}

function renderPlayerQuestion(q, roomId, playerId) {
    const area = document.getElementById('player-quiz-area');
    const qText = document.getElementById('question-text-disp');
    const inputCont = document.getElementById('player-input-container');
    
    area.classList.remove('hidden');
    qText.textContent = q.q;
    inputCont.innerHTML = '';

    if (q.type === 'choice') {
        q.c.forEach((choice, i) => {
            const btn = document.createElement('button');
            btn.className = 'btn-block answer-btn';
            btn.setAttribute('data-index', i);
            btn.textContent = choice;
            
            // 色分け
            if(i===0) btn.classList.add('btn-blue');
            else if(i===1) btn.classList.add('btn-red');
            else if(i===2) btn.classList.add('btn-green');
            else btn.classList.add('btn-yellow');

            btn.onclick = () => submitAnswer(roomId, playerId, i);
            inputCont.appendChild(btn);
        });
    } else if (q.type === 'sort') {
        const ul = document.createElement('div');
        q.c.forEach((choice, i) => {
            const btn = document.createElement('div');
            btn.className = 'btn-sort';
            btn.textContent = choice;
            btn.dataset.index = i;
            // 簡易的なクリック順序選択の実装は省略（今回は早押しメインのため）
            // 必要ならSortableJSなどを導入
            ul.appendChild(btn);
        });
        inputCont.innerHTML = "<p>Sort not supported in simple mode</p>"; 
    } else if (q.type === 'text') {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = 'Answer...';
        inp.style.fontSize = '1.2em';
        inp.style.marginBottom = '10px';
        const sub = document.createElement('button');
        sub.className = 'btn-primary btn-block';
        sub.textContent = 'Submit';
        sub.onclick = () => submitAnswer(roomId, playerId, inp.value);
        inputCont.appendChild(inp);
        inputCont.appendChild(sub);
    }
}

function submitAnswer(roomId, playerId, answer) {
    const now = firebase.database.ServerValue.TIMESTAMP;
    // 回答にかかった時間を計算するために開始時間を取得したいが、簡易的にサーバー時間のみ記録
    // 本来は status.startTime との差分をとる
    
    window.db.ref(`rooms/${roomId}/status/startTime`).once('value', snap => {
        const start = snap.val() || now;
        const duration = 0; // 簡易
        
        window.db.ref(`rooms/${roomId}/players/${playerId}`).update({
            lastAnswer: answer,
            lastTime: duration // 本来は (now - start)
        });
        
        document.getElementById('player-quiz-area').classList.add('hidden');
        document.getElementById('player-wait-msg').classList.remove('hidden');
    });
}

function showResultOverlay(result) {
    const ol = document.getElementById('player-result-overlay');
    const icon = document.getElementById('result-icon');
    const text = document.getElementById('result-text');
    
    ol.classList.remove('hidden');
    if (result === 'win') {
        ol.style.color = '#d00';
        icon.textContent = '⭕️';
        text.textContent = 'WIN';
    } else {
        ol.style.color = '#333';
        icon.textContent = '❌';
        text.textContent = 'LOSE';
    }
    
    setTimeout(() => {
        ol.classList.add('hidden');
    }, 3000);
}

function renderPlayerRanking(roomId, playerId) {
    const list = document.getElementById('player-leaderboard');
    const myRankEl = document.getElementById('player-my-rank');
    const myScoreEl = document.getElementById('player-my-score');
    
    list.innerHTML = 'Loading...';
    
    window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
        let ranking = [];
        snap.forEach(p => {
            const v = p.val();
            ranking.push({ key: p.key, name: v.name, score: v.periodScore||0, time: v.periodTime||0 });
        });
        ranking.sort((a,b) => (b.score - a.score) || (a.time - b.time));
        
        list.innerHTML = '';
        let myRank = '-';
        let myScore = '0';
        
        ranking.slice(0, 5).forEach((r, i) => {
            const div = document.createElement('div');
            div.style.borderBottom = '1px solid #666';
            div.style.padding = '5px';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.innerHTML = `<span>${i+1}. ${r.name}</span> <span>${r.score}</span>`;
            list.appendChild(div);
            
            if(r.key === playerId) {
                myRank = i + 1;
                myScore = r.score;
            }
        });
        
        // 5位以下の場合の自分探し
        if (myRank === '-') {
            const idx = ranking.findIndex(r => r.key === playerId);
            if (idx >= 0) {
                myRank = idx + 1;
                myScore = ranking[idx].score;
            }
        }
        
        myRankEl.textContent = myRank + APP_TEXT.Player.RankUnit;
        myScoreEl.textContent = myScore + APP_TEXT.Player.ScoreUnit;
    });
}
