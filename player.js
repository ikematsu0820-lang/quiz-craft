/* =========================================================
 * player.js (v136: Max 8 Players Limit)
 * =======================================================*/

let myRoomId = null;
let myPlayerId = null;
let myName = "NoName";
let roomConfig = { mode: 'normal', normalLimit: 'one' }; 
let currentQuestion = null;

let isReanswering = false;

let localStatus = { step: 'standby' };
let localPlayerData = { isAlive: true, lastResult: null };

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('join-room-btn');
    if(btn) btn.onclick = joinRoom;

    const buzzBtn = document.getElementById('player-buzz-btn');
    if(buzzBtn) {
        buzzBtn.addEventListener('click', () => {
            if(!myRoomId || !myPlayerId) return;
            buzzBtn.disabled = true;
            buzzBtn.textContent = "送信中...";
            window.db.ref(`rooms/${myRoomId}/players/${myPlayerId}`).update({
                buzzTime: firebase.database.ServerValue.TIMESTAMP
            });
        });
    }
});

function showPlayerView(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(viewId);
    if(target) target.classList.remove('hidden');
}

function joinRoom() {
    const codeInput = document.getElementById('room-code-input');
    const nameInput = document.getElementById('player-name-input');
    
    const code = codeInput.value.trim().toUpperCase();
    const name = nameInput.value.trim();
    
    if(!code || !name) {
        alert("部屋コードとニックネームを入力してください");
        return;
    }
    
    const btn = document.getElementById('join-room-btn');
    btn.disabled = true;
    btn.textContent = "接続中...";

    window.db.ref(`rooms/${code}`).once('value', snap => {
        if (!snap.exists()) {
            alert("その部屋コードは見つかりませんでした");
            btn.disabled = false;
            btn.textContent = "参加する";
            return;
        }

        // ★追加: 人数制限チェック (最大8人)
        const val = snap.val();
        const currentPlayers = val.players || {};
        const count = Object.keys(currentPlayers).length;
        
        if (count >= 8) {
            alert("申し訳ありません、この部屋は満員です (定員8名)");
            btn.disabled = false;
            btn.textContent = "参加する";
            return;
        }

        myRoomId = code;
        myName = name;
        
        const playersRef = window.db.ref(`rooms/${code}/players`);
        const newPlayerRef = playersRef.push();
        myPlayerId = newPlayerRef.key;
        
        newPlayerRef.set({
            name: name,
            isAlive: true,
            periodScore: 0,
            periodTime: 0,
            lastResult: null,
            buzzTime: null
        }).then(() => {
            showPlayerView('player-game-view');
            document.getElementById('player-name-disp').textContent = name;
            startPlayerListener(code, myPlayerId);
        }).catch(e => {
            alert("エラーが発生しました: " + e.message);
            btn.disabled = false;
            btn.textContent = "参加する";
        });
    });
}

function startPlayerListener(roomId, playerId) {
    const statusRef = window.db.ref(`rooms/${roomId}/status`);
    const myRef = window.db.ref(`rooms/${roomId}/players/${playerId}`);
    const configRef = window.db.ref(`rooms/${roomId}/config`);

    myRef.on('value', snap => {
        const val = snap.val();
        if(!val) return;
        localPlayerData = val; 
        updateUI(); 
    });

    configRef.on('value', snap => {
        roomConfig = snap.val() || { mode: 'normal' };
    });

    statusRef.on('value', snap => {
        const st = snap.val();
        if(!st) return;
        localStatus = st; 
        
        if (st.step === 'answering' || st.step === 'question') {
             window.db.ref(`rooms/${roomId}/questions/${st.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                if(q) {
                    currentQuestion = q;
                    renderPlayerQuestion(q, roomId, playerId);
                }
            });
        }
        updateUI(); 
    });
}

function updateUI() {
    const st = localStatus;
    const p = localPlayerData;
    
    const badge = document.getElementById('alive-badge');
    if (p.isAlive) {
        badge.textContent = "ENTRY"; badge.style.background = "#00bfff"; badge.style.color = "#000";
        document.getElementById('player-dead-overlay').classList.add('hidden');
    } else {
        badge.textContent = "LOSE"; badge.style.background = "#555"; badge.style.color = "#aaa";
        document.getElementById('player-dead-overlay').classList.remove('hidden');
    }
    
    if (p.periodScore !== undefined) {
        document.getElementById('score-display-area').classList.remove('hidden');
        document.getElementById('current-score-value').textContent = p.periodScore;
    }

    const lobby = document.getElementById('player-lobby-msg');
    const quizArea = document.getElementById('player-quiz-area');
    const waitMsg = document.getElementById('player-wait-msg');
    const resultOverlay = document.getElementById('player-result-overlay');
    const buzzArea = document.getElementById('player-buzz-area');
    const oralArea = document.getElementById('player-oral-done-area');
    const changeArea = document.getElementById('change-btn-area');
    const rankingOverlay = document.getElementById('player-ranking-overlay');

    lobby.classList.add('hidden');
    if (st.step !== 'answering' && st.step !== 'question' && st.step !== 'answer') {
        quizArea.classList.add('hidden');
        buzzArea.classList.add('hidden');
        oralArea.classList.add('hidden');
    }
    waitMsg.classList.add('hidden');
    resultOverlay.classList.add('hidden');
    rankingOverlay.classList.add('hidden'); 

    if (st.step === 'standby') {
        lobby.classList.remove('hidden');
        lobby.innerHTML = `<h3>STANDBY</h3><p>ホストが準備中です...</p>`;
        isReanswering = false;
        if(changeArea) changeArea.innerHTML = ''; 
    }
    else if (st.step === 'ready') {
        lobby.classList.remove('hidden');
        lobby.innerHTML = `<h3>ARE YOU READY?</h3><p>まもなく開始します</p>`;
        isReanswering = false;
        if(changeArea) changeArea.innerHTML = '';
    }
    else if (st.step === 'question') {
        if (roomConfig.mode === 'buzz') {
            buzzArea.classList.remove('hidden');
        } else {
            handleNormalResponseUI(p, quizArea, waitMsg);
        }
    }
    else if (st.step === 'answering') {
        if (roomConfig.mode === 'buzz') {
            if (st.isBuzzActive) {
                buzzArea.classList.remove('hidden');
                const btn = document.getElementById('player-buzz-btn');
                if (p.buzzTime) {
                    btn.disabled = true; btn.textContent = "承認待ち..."; btn.style.background = "#555";
                } else {
                    btn.disabled = false; btn.textContent = "PUSH!"; btn.style.background = "radial-gradient(circle at 30% 30%, #ff6b6b, #c0392b)";
                }
            } else if (st.currentAnswerer === myPlayerId) {
                quizArea.classList.remove('hidden'); 
                buzzArea.classList.add('hidden');
            } else {
                lobby.classList.remove('hidden');
                lobby.innerHTML = `<h3>LOCKED</h3><p style="color:#e94560; font-weight:bold;">他のプレイヤーが回答中...</p>`;
                quizArea.classList.add('hidden');
                buzzArea.classList.add('hidden');
            }
        } else {
            handleNormalResponseUI(p, quizArea, waitMsg);
        }
    }
    else if (st.step === 'result') {
        isReanswering = false;
        if(changeArea) changeArea.innerHTML = '';
        
        quizArea.classList.add('hidden');
        waitMsg.classList.remove('hidden');
        waitMsg.style.background = "#444";
        waitMsg.style.color = "#ccc";
        waitMsg.style.border = "none";
        waitMsg.textContent = "回答を締め切りました。正解発表を待っています...";
    }
    else if (st.step === 'answer') {
        if(changeArea) changeArea.innerHTML = '';

        if(currentQuestion) {
            quizArea.classList.remove('hidden');
            document.getElementById('question-text-disp').textContent = currentQuestion.q;
            
            const ansBox = document.getElementById('player-input-container');
            let correctText = "";
            if(currentQuestion.type === 'choice') {
                if(Array.isArray(currentQuestion.correct)) correctText = currentQuestion.correct.map(i => currentQuestion.c[i]).join(' / ');
                else correctText = currentQuestion.c[currentQuestion.correct];
            } else if (currentQuestion.type === 'letter_select' && currentQuestion.steps) {
                correctText = currentQuestion.steps.map(s => s.correct).join('');
            } else {
                correctText = currentQuestion.correct;
            }

            let myAnsText = p.lastAnswer || "(未回答)";
            if(p.lastAnswer !== null && currentQuestion.type === 'choice') {
                const idx = parseInt(p.lastAnswer);
                if(!isNaN(idx) && currentQuestion.c && currentQuestion.c[idx]) {
                    myAnsText = currentQuestion.c[idx];
                }
            }
            
            let judgeHtml = '';
            if (p.lastResult === 'win') {
                judgeHtml = `<div style="background:#00b894; color:#fff; padding:10px; border-radius:8px; font-weight:bold; font-size:1.5em; text-align:center; margin-bottom:15px; border:2px solid #fff; box-shadow:0 0 15px #00b894;">⭕️ 正解！</div>`;
            } else if (p.lastResult === 'lose') {
                judgeHtml = `<div style="background:#e94560; color:#fff; padding:10px; border-radius:8px; font-weight:bold; font-size:1.5em; text-align:center; margin-bottom:15px; border:2px solid #fff; box-shadow:0 0 15px #e94560;">❌ 不正解...</div>`;
            }

            ansBox.innerHTML = `
                ${judgeHtml}
                <div style="background:#00bfff; color:#000; padding:15px; border-radius:8px; font-weight:bold; text-align:center; margin-top:10px;">
                    <div style="font-size:0.8em; margin-bottom:5px;">正解 (ANSWER)</div>
                    <div style="font-size:1.5em;">${correctText}</div>
                </div>
                <div style="background:#333; border:1px solid #555; color:#fff; padding:15px; border-radius:8px; font-weight:bold; text-align:center; margin-top:10px;">
                    <div style="font-size:0.8em; margin-bottom:5px; color:#aaa;">あなたの回答 (YOUR ANSWER)</div>
                    <div style="font-size:1.3em;">${myAnsText}</div>
                </div>
            `;
        }
    }
    else if (st.step === 'final_ranking') {
        showFinalResult(myRoomId, myPlayerId);
    }
}

function showFinalResult(roomId, myId) {
    const overlay = document.getElementById('player-ranking-overlay');
    overlay.classList.remove('hidden');
    
    window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
        const players = snap.val() || {};
        const arr = Object.keys(players).map(k => ({
            id: k,
            name: players[k].name,
            score: players[k].periodScore || 0
        })).sort((a,b) => b.score - a.score);

        const myRankIdx = arr.findIndex(p => p.id === myId);
        const myData = arr[myRankIdx];
        
        if (myData) {
            document.getElementById('player-my-rank').textContent = `${myRankIdx + 1}位`;
            document.getElementById('player-my-score').textContent = `${myData.score}点`;
        }

        const list = document.getElementById('player-leaderboard');
        list.innerHTML = '';
        arr.slice(0, 5).forEach((p, i) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.padding = '8px';
            div.style.borderBottom = '1px solid #444';
            div.style.color = (p.id === myId) ? '#00bfff' : '#fff';
            div.style.fontWeight = (p.id === myId) ? 'bold' : 'normal';
            
            div.innerHTML = `<span>${i+1}. ${p.name}</span><span>${p.score}pt</span>`;
            list.appendChild(div);
        });
    });
}

function handleNormalResponseUI(p, quizArea, waitMsg) {
    quizArea.classList.remove('hidden');
    waitMsg.classList.add('hidden');

    const inputCont = document.getElementById('player-input-container');
    let changeBtnArea = document.getElementById('change-btn-area');
    if (!changeBtnArea) {
        changeBtnArea = document.createElement('div');
        changeBtnArea.id = 'change-btn-area';
        inputCont.parentNode.insertBefore(changeBtnArea, inputCont.nextSibling);
    }

    if (p.lastAnswer != null) {
        if (roomConfig.normalLimit === 'unlimited') {
            if (isReanswering) {
                unlockChoices();
                changeBtnArea.innerHTML = ''; 
            } else {
                lockChoices(p.lastAnswer);
                if (!document.getElementById('btn-change-ans')) {
                    changeBtnArea.innerHTML = `
                        <button id="btn-change-ans" class="btn-change-answer">
                            答えを変更する
                        </button>
                    `;
                    document.getElementById('btn-change-ans').onclick = openConfirmModal;
                }
            }
        } else {
            quizArea.classList.add('hidden');
            waitMsg.classList.remove('hidden');
            waitMsg.style.background = "rgba(0, 184, 148, 0.2)";
            waitMsg.style.color = "#00b894";
            waitMsg.style.border = "1px solid #00b894";
            waitMsg.style.padding = "15px";
            waitMsg.textContent = "回答を受け付けました。発表を待っています...";
        }
    } else {
        unlockChoices();
        changeBtnArea.innerHTML = '';
    }
}

function lockChoices(selectedIndex) {
    const btns = document.querySelectorAll('.answer-btn');
    btns.forEach(btn => {
        btn.disabled = true; 
        if (btn.dataset.ans == selectedIndex) {
            btn.classList.add('btn-selected');
            btn.classList.remove('btn-dimmed');
        } else {
            btn.classList.add('btn-dimmed');
            btn.classList.remove('btn-selected');
        }
    });
}

function unlockChoices() {
    const btns = document.querySelectorAll('.answer-btn');
    btns.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('btn-selected', 'btn-dimmed');
    });
}

function openConfirmModal() {
    const old = document.getElementById('confirm-modal-overlay');
    if(old) old.remove();

    const html = `
        <div id="confirm-modal-overlay" class="confirm-modal-overlay">
            <div class="confirm-modal">
                <h3>答えを変更しますか？</h3>
                <div class="confirm-btns">
                    <button id="btn-yes" class="btn-confirm-yes">はい</button>
                    <button id="btn-no" class="btn-confirm-no">いいえ</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('btn-yes').onclick = () => {
        isReanswering = true;
        updateUI(); 
        document.getElementById('confirm-modal-overlay').remove();
    };
    document.getElementById('btn-no').onclick = () => {
        document.getElementById('confirm-modal-overlay').remove();
    };
}

function renderPlayerQuestion(q, roomId, playerId) {
    const inputCont = document.getElementById('player-input-container');
    const qText = document.getElementById('question-text-disp');
    
    const changeArea = document.getElementById('change-btn-area');
    if(changeArea) changeArea.innerHTML = '';

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
            btn.className = 'answer-btn'; 
            btn.textContent = item.text;
            btn.dataset.ans = item.originalIndex;
            
            if(i===0) btn.classList.add('btn-blue');
            else if(i===1) btn.classList.add('btn-red');
            else if(i===2) btn.classList.add('btn-green');
            else btn.classList.add('btn-yellow');

            btn.onclick = () => submitAnswer(roomId, playerId, item.originalIndex); 
            inputCont.appendChild(btn);
        });
    }
    else if (q.type === 'letter_select') {
        let pool = [];
        if (q.steps) {
            q.steps.forEach(step => {
                pool.push(step.correct);
                if (step.dummies) pool.push(...step.dummies);
            });
        } else {
            const correctChars = q.correct.split('');
            const dummyChars = (q.dummyChars || '').split('');
            pool = [...correctChars, ...dummyChars];
        }
        pool = pool.filter(c => c && c.trim() !== '');
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const displayBox = document.createElement('div');
        displayBox.className = 'letter-display-box'; 
        displayBox.style.background = "#fff"; displayBox.style.color = "#000"; displayBox.style.padding = "10px";
        displayBox.style.fontSize = "24px"; displayBox.style.fontWeight = "bold"; displayBox.style.textAlign = "center";
        displayBox.style.marginBottom = "15px"; displayBox.style.borderRadius = "8px"; displayBox.style.minHeight = "50px";
        displayBox.textContent = ""; 
        inputCont.appendChild(displayBox);
        const grid = document.createElement('div');
        grid.style.display = "grid"; grid.style.gridTemplateColumns = "repeat(5, 1fr)"; grid.style.gap = "8px"; grid.style.marginBottom = "15px";
        pool.forEach(char => {
            const btn = document.createElement('button');
            btn.textContent = char; btn.className = 'letter-panel-btn'; 
            btn.onclick = () => { if (displayBox.textContent.length < 20) displayBox.textContent += char; };
            grid.appendChild(btn);
        });
        inputCont.appendChild(grid);
        const controlRow = document.createElement('div');
        controlRow.style.display = "flex"; controlRow.style.gap = "10px";
        const clearBtn = document.createElement('button');
        clearBtn.textContent = "Clear"; clearBtn.className = "btn-danger btn-block";
        clearBtn.onclick = () => { displayBox.textContent = ""; };
        const submitBtn = document.createElement('button');
        submitBtn.textContent = "OK"; submitBtn.className = "btn-primary btn-block";
        submitBtn.onclick = () => {
            if (displayBox.textContent.length === 0) return;
            submitAnswer(roomId, playerId, displayBox.textContent);
        };
        controlRow.appendChild(clearBtn); controlRow.appendChild(submitBtn); inputCont.appendChild(controlRow);
    }
    else if (q.type === 'free_oral') {
        document.getElementById('player-oral-done-area').classList.remove('hidden');
        document.getElementById('player-oral-done-btn').onclick = () => { submitAnswer(roomId, playerId, "[Oral]"); };
    }
    else {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.placeholder = '回答を入力...'; inp.className = 'modern-input'; inp.style.marginBottom = '15px';
        const sub = document.createElement('button');
        sub.className = 'btn-primary btn-block'; sub.textContent = '送信';
        sub.onclick = () => {
            if(inp.value.trim() === "") return;
            submitAnswer(roomId, playerId, inp.value.trim());
        };
        inputCont.appendChild(inp); inputCont.appendChild(sub);
    }
}

function submitAnswer(roomId, playerId, answer) {
    isReanswering = false;
    window.db.ref(`rooms/${roomId}/players/${playerId}`).update({
        lastAnswer: answer
    });
}
