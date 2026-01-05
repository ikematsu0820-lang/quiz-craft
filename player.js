/* =========================================================
 * player.js (v49: Advanced Player Modes)
 * =======================================================*/

let myRoomId = null;
let myPlayerId = null;
let myName = "NoName";
let roomConfig = {}; // ★v49: 設定を保持

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
    const configRef = window.db.ref(`rooms/${roomId}/config`);

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
        
        if (val.lastResult) {
            showResultOverlay(val.lastResult);
        } else {
            document.getElementById('player-result-overlay').classList.add('hidden');
        }
    });

    // ★v49: 設定監視
    configRef.on('value', snap => {
        roomConfig = snap.val() || { mode: 'normal' };
    });

    statusRef.on('value', snap => {
        const st = snap.val();
        if(!st) return;

        // 画面初期化
        document.getElementById('player-lobby-msg').innerHTML = "";
        document.getElementById('player-quiz-area').classList.add('hidden');
        document.getElementById('player-wait-msg').classList.add('hidden');
        document.getElementById('player-ranking-overlay').classList.add('hidden');
        document.getElementById('player-buzz-area').classList.add('hidden');

        if (st.step === 'standby') {
            document.getElementById('player-lobby-msg').innerHTML = `<h3>${APP_TEXT.Player.MsgLobbyHead}</h3><p>${APP_TEXT.Player.MsgLobbyBody}</p>`;
        }
        else if (st.step === 'question') {
            if (roomConfig.mode === 'buzz') {
                handleBuzzMode(roomId, playerId, st);
            } else if (roomConfig.mode === 'turn') {
                handleTurnMode(roomId, playerId, st); // ★v49
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

function handleBuzzMode(roomId, playerId, status) {
    const buzzArea = document.getElementById('player-buzz-area');
    const lobbyMsg = document.getElementById('player-lobby-msg');
    
    if (status.isBuzzActive) {
        buzzArea.classList.remove('hidden');
        const btn = document.getElementById('player-buzz-btn');
        btn.disabled = false;
        btn.textContent = APP_TEXT.Player.BtnBuzz;
        btn.style.opacity = "1";
        
        btn.onclick = () => {
            const now = firebase.database.ServerValue.TIMESTAMP;
            window.db.ref(`rooms/${roomId}/players/${playerId}`).update({ buzzTime: now });
            btn.disabled = true; 
            btn.textContent = "Wait...";
        };
    } 
    else if (status.currentAnswerer) {
        buzzArea.classList.add('hidden');
        if (status.currentAnswerer === playerId) {
            lobbyMsg.innerHTML = `<h2 style="color:red; font-size:2em;">${APP_TEXT.Player.MsgBuzzWin}</h2>`;
        } else {
            lobbyMsg.innerHTML = `<h3>LOCKED</h3><p>Waiting for answer...</p>`;
        }
    }
    else {
        lobbyMsg.textContent = "Ready...";
    }
}

// ★v49: 順番回答の処理
function handleTurnMode(roomId, playerId, status) {
    const lobbyMsg = document.getElementById('player-lobby-msg');
    
    if (status.currentAnswerer === playerId) {
        // 自分の番
        lobbyMsg.innerHTML = `<h3 style="color:#0055ff;">${APP_TEXT.Player.MsgTurnYou}</h3>`;
        // 通常の回答フォームを表示
        window.db.ref(`rooms/${roomId}/questions/${status.qIndex}`).once('value', qSnap => {
            const q = qSnap.val();
            renderPlayerQuestion(q, roomId, playerId);
        });
    } else {
        // 他人の番
        if (status.currentAnswerer) {
            // 名前を取得して表示したいが、簡易的に
            lobbyMsg.innerHTML = `<p>Waiting for turn...</p>`;
        } else {
            lobbyMsg.textContent = "Wait...";
        }
    }
}

// ★v49: 一斉回答の処理（回数制限対応）
function handleNormalMode(roomId, playerId, status) {
    window.db.ref(`rooms/${roomId}/players/${playerId}/lastAnswer`).once('value', ansSnap => {
        const hasAnswered = (ansSnap.val() != null);
        const limitOne = (roomConfig.normalLimit === 'one');

        if(hasAnswered && limitOne) {
            document.getElementById('player-wait-msg').classList.remove('hidden');
        } else {
            // 未回答、または何度でも修正可の場合
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
    
    window.db.ref(`rooms/${roomId}/status/startTime`).once('value', snap => {
        const start = snap.val() || now;
        const duration = 0; 
        
        window.db.ref(`rooms/${roomId}/players/${playerId}`).update({
            lastAnswer: answer,
            lastTime: duration 
        });
        
        // 順番回答なら送信後に即座に隠す
        if(roomConfig.mode === 'turn') {
             document.getElementById('player-quiz-area').classList.add('hidden');
             document.getElementById('player-lobby-msg').innerHTML = "<p>Answered.</p>";
        } else if (roomConfig.normalLimit === 'one') {
             document.getElementById('player-quiz-area').classList.add('hidden');
             document.getElementById('player-wait-msg').classList.remove('hidden');
        } else {
             // 何度でも修正可なら、メッセージだけ出す（フォームは消さない）
             // ただしUX的には「送信しました」などのトーストが出ると良いが、今回は簡易的に
        }
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
