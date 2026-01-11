/* =========================================================
 * player.js (v93: Fix View Switching Error)
 * =======================================================*/

let myRoomId = null;
let myPlayerId = null;
let myName = "NoName";
let roomConfig = {};

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
        // ★修正: 画面切り替えの記述を最新の形式に変更
        App.Ui.showView(App.Ui.views.playerGame);
        
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
        document.getElementById('player-oral-done-area').classList.add('hidden');

        if (st.step === 'standby') {
            document.getElementById('player-lobby-msg').innerHTML = `<h3>${APP_TEXT.Player.MsgLobbyHead}</h3><p>${APP_TEXT.Player.MsgLobbyBody}</p>`;
        }
        else if (st.step === 'question') {
            if (roomConfig.mode === 'buzz') {
                handleBuzzMode(roomId, playerId, st);
            } else if (roomConfig.mode === 'turn') {
                handleTurnMode(roomId, playerId, st);
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
            window.db.ref(`rooms/${roomId}/questions/${status.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                renderPlayerQuestion(q, roomId, playerId); 
            });
        } else {
            lobbyMsg.innerHTML = `<h3>LOCKED</h3><p>Waiting for answer...</p>`;
        }
    }
    else {
        lobbyMsg.textContent = "Ready...";
    }
}

function handleTurnMode(roomId, playerId, status) {
    const lobbyMsg = document.getElementById('player-lobby-msg');
    
    if (status.currentAnswerer === playerId) {
        lobbyMsg.innerHTML = `<h3 style="color:#0055ff;">${APP_TEXT.Player.MsgTurnYou}</h3>`;
        window.db.ref(`rooms/${roomId}/questions/${status.qIndex}`).once('value', qSnap => {
            const q = qSnap.val();
            renderPlayerQuestion(q, roomId, playerId);
        });
    } else {
        if (status.currentAnswerer) {
            lobbyMsg.innerHTML = `<p>Waiting for turn...</p>`;
        } else {
            lobbyMsg.textContent = "Wait...";
        }
    }
}

function handleNormalMode(roomId, playerId, status) {
    window.db.ref(`rooms/${roomId}/players/${playerId}/lastAnswer`).once('value', ansSnap => {
        const hasAnswered = (ansSnap.val() != null);
        const limitOne = (roomConfig.normalLimit === 'one');

        if(hasAnswered && limitOne) {
            document.getElementById('player-wait-msg').classList.remove('hidden');
        } else {
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
    const oralArea = document.getElementById('player-oral-done-area');
    
    area.classList.remove('hidden');
    oralArea.classList.add('hidden'); 
    
    qText.textContent = q.q;
    inputCont.innerHTML = '';

    if (q.type === 'choice') {
        let choices = q.c.map((text, i) => ({ text: text, originalIndex: i }));
        
        if (roomConfig.shuffleChoices === 'on') {
            for (let i = choices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [choices[i], choices[j]] = [choices[j], choices[i]];
            }
        }

        choices.forEach((item, i) => {
            const btn = document.createElement('button');
            btn.className = 'btn-block answer-btn';
            btn.textContent = item.text;
            
            if(i===0) btn.classList.add('btn-blue');
            else if(i===1) btn.classList.add('btn-red');
            else if(i===2) btn.classList.add('btn-green');
            else btn.classList.add('btn-yellow');

            btn.onclick = () => submitAnswer(roomId, playerId, item.originalIndex); 
            inputCont.appendChild(btn);
        });

    } else if (q.type === 'sort') {
        let choices = q.c.map((text, i) => ({ text: text, originalIndex: i }));
        
        if (!q.initialOrder || q.initialOrder === 'random') {
            for (let i = choices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [choices[i], choices[j]] = [choices[j], choices[i]];
            }
        }
        
        const ul = document.createElement('div');
        choices.forEach((item) => {
            const btn = document.createElement('div');
            btn.className = 'btn-sort';
            btn.textContent = item.text;
            btn.dataset.index = item.originalIndex; 
            ul.appendChild(btn);
        });
        inputCont.innerHTML = "<p style='font-size:0.8em;'>Sort not supported on simple web view yet.</p>"; 

    } else if (q.type === 'free_written' || q.type === 'free_oral') {
        if (q.type === 'free_oral') {
            area.classList.add('hidden'); 
            oralArea.classList.remove('hidden'); 
            
            document.getElementById('player-oral-done-btn').onclick = () => {
                submitAnswer(roomId, playerId, "[Oral]");
            };
        } else {
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
        
        if(roomConfig.mode === 'turn') {
             document.getElementById('player-quiz-area').classList.add('hidden');
             document.getElementById('player-oral-done-area').classList.add('hidden');
             document.getElementById('player-lobby-msg').innerHTML = "<p>Answered.</p>";
        } else if (roomConfig.normalLimit === 'one') {
             document.getElementById('player-quiz-area').classList.add('hidden');
             document.getElementById('player-oral-done-area').classList.add('hidden');
             document.getElementById('player-wait-msg').classList.remove('hidden');
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
