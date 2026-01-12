/* =========================================================
 * player.js (v119: Allow Answer Correction)
 * =======================================================*/

let myRoomId = null;
let myPlayerId = null;
let myName = "NoName";
let roomConfig = { mode: 'normal', normalLimit: 'one' }; // デフォルトは1回
let currentQuestion = null;

let localStatus = { step: 'standby' };
let localPlayerData = { isAlive: true, lastResult: null };

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('join-room-btn');
    if(btn) btn.onclick = joinRoom;
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
        // 設定を読み込む
        roomConfig = snap.val() || { mode: 'normal' };
    });

    statusRef.on('value', snap => {
        const st = snap.val();
        if(!st) return;
        localStatus = st; 
        
        // 問題データ取得
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
    
    // 生存バッジ
    const badge = document.getElementById('alive-badge');
    if (p.isAlive) {
        badge.textContent = "ENTRY";
        badge.style.background = "#00bfff";
        badge.style.color = "#000";
        document.getElementById('player-dead-overlay').classList.add('hidden');
    } else {
        badge.textContent = "LOSE";
        badge.style.background = "#555";
        badge.style.color = "#aaa";
        document.getElementById('player-dead-overlay').classList.remove('hidden');
    }
    
    // スコア
    if (p.periodScore !== undefined) {
        document.getElementById('score-display-area').classList.remove('hidden');
        document.getElementById('current-score-value').textContent = p.periodScore;
    }

    // 要素取得
    const lobby = document.getElementById('player-lobby-msg');
    const quizArea = document.getElementById('player-quiz-area');
    const waitMsg = document.getElementById('player-wait-msg');
    const resultOverlay = document.getElementById('player-result-overlay');
    const buzzArea = document.getElementById('player-buzz-area');
    const oralArea = document.getElementById('player-oral-done-area');

    // 初期化: 基本的に隠す
    lobby.classList.add('hidden');
    if (st.step !== 'answering' && st.step !== 'question' && st.step !== 'answer') {
        quizArea.classList.add('hidden');
        buzzArea.classList.add('hidden');
        oralArea.classList.add('hidden');
    }
    waitMsg.classList.add('hidden');
    resultOverlay.classList.add('hidden');

    // --- ステップ制御 ---
    if (st.step === 'standby') {
        lobby.classList.remove('hidden');
        lobby.innerHTML = `<h3>STANDBY</h3><p>ホストが準備中です...</p>`;
    }
    else if (st.step === 'ready') {
        lobby.classList.remove('hidden');
        lobby.innerHTML = `<h3>ARE YOU READY?</h3><p>まもなく開始します</p>`;
    }
    else if (st.step === 'question') {
        // 出題中
        if (roomConfig.mode === 'buzz') {
            buzzArea.classList.remove('hidden');
            // ...
        } else {
            // ★修正: 一斉回答モードの挙動
            handleNormalResponseUI(p, quizArea, waitMsg);
        }
    }
    else if (st.step === 'answering') {
        // 回答中
        if (roomConfig.mode === 'buzz') {
            if (st.isBuzzActive) {
                buzzArea.classList.remove('hidden');
                const btn = document.getElementById('player-buzz-btn');
                if (p.buzzTime) {
                    btn.disabled = true; btn.textContent = "承認待ち...";
                } else {
                    btn.disabled = false; btn.textContent = "PUSH!";
                }
            } else if (st.currentAnswerer === myPlayerId) {
                quizArea.classList.remove('hidden'); 
                buzzArea.classList.add('hidden');
            } else {
                lobby.classList.remove('hidden');
                lobby.innerHTML = `<h3>LOCKED</h3><p>他のプレイヤーが回答中...</p>`;
                quizArea.classList.add('hidden');
                buzzArea.classList.add('hidden');
            }
        } else {
            // ★修正: 一斉回答モードの挙動
            handleNormalResponseUI(p, quizArea, waitMsg);
        }
    }
    else if (st.step === 'result') {
        if (p.lastResult) showResultOverlay(p.lastResult);
        else {
            waitMsg.classList.remove('hidden');
            waitMsg.textContent = "正解発表中...";
        }
    }
    else if (st.step === 'answer') {
        // 正解表示
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
            
            ansBox.innerHTML = `
                <div style="background:#00bfff; color:#000; padding:15px; border-radius:8px; font-weight:bold; text-align:center; margin-top:20px;">
                    <div style="font-size:0.8em; margin-bottom:5px;">正解 (ANSWER)</div>
                    <div style="font-size:1.5em;">${correctText}</div>
                </div>
            `;
        }
    }
}

// ★追加: 通常回答のUI制御（修正可なら画面を残す）
function handleNormalResponseUI(p, quizArea, waitMsg) {
    if (p.lastAnswer != null) {
        // 回答済みの場合
        if (roomConfig.normalLimit === 'unlimited') {
            // 修正可: 画面は消さず、メッセージだけ出す
            quizArea.classList.remove('hidden');
            waitMsg.classList.remove('hidden');
            waitMsg.style.background = "transparent";
            waitMsg.style.color = "#00bfff";
            waitMsg.style.border = "none";
            waitMsg.style.padding = "5px";
            waitMsg.innerHTML = `<span style="font-size:0.8em;">現在の回答: <strong>${p.lastAnswer}</strong> (修正可)</span>`;
        } else {
            // 1回のみ: 画面を消す
            quizArea.classList.add('hidden');
            waitMsg.classList.remove('hidden');
            waitMsg.style.background = "rgba(0, 184, 148, 0.2)";
            waitMsg.style.color = "#00b894";
            waitMsg.style.border = "1px solid #00b894";
            waitMsg.style.padding = "15px";
            waitMsg.textContent = "回答を受け付けました。発表を待っています...";
        }
    } else {
        // 未回答
        quizArea.classList.remove('hidden');
        waitMsg.classList.add('hidden');
    }
}

function showResultOverlay(result) {
    const ol = document.getElementById('player-result-overlay');
    const icon = document.getElementById('result-icon');
    const text = document.getElementById('result-text');
    ol.classList.remove('hidden');
    if (result === 'win') {
        ol.style.background = "rgba(0, 180, 0, 0.9)";
        icon.textContent = '⭕️'; text.textContent = 'WIN!'; text.style.color = '#fff';
    } else {
        ol.style.background = "rgba(180, 0, 0, 0.9)";
        icon.textContent = '❌'; text.textContent = 'LOSE...'; text.style.color = '#fff';
    }
}

function renderPlayerQuestion(q, roomId, playerId) {
    const inputCont = document.getElementById('player-input-container');
    const qText = document.getElementById('question-text-disp');
    
    qText.textContent = q.q;
    inputCont.innerHTML = '';

    // A. 選択式
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
            if(i===0) btn.classList.add('btn-blue');
            else if(i===1) btn.classList.add('btn-red');
            else if(i===2) btn.classList.add('btn-green');
            else btn.classList.add('btn-yellow');
            btn.onclick = () => submitAnswer(roomId, playerId, item.originalIndex); 
            inputCont.appendChild(btn);
        });
    }
    // B. 文字選択式
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
        displayBox.style.background = "#fff";
        displayBox.style.color = "#000";
        displayBox.style.padding = "10px";
        displayBox.style.fontSize = "24px";
        displayBox.style.fontWeight = "bold";
        displayBox.style.textAlign = "center";
        displayBox.style.marginBottom = "15px";
        displayBox.style.borderRadius = "8px";
        displayBox.style.minHeight = "50px";
        displayBox.textContent = ""; 
        inputCont.appendChild(displayBox);

        const grid = document.createElement('div');
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(5, 1fr)";
        grid.style.gap = "8px";
        grid.style.marginBottom = "15px";

        pool.forEach(char => {
            const btn = document.createElement('button');
            btn.textContent = char;
            btn.className = 'letter-panel-btn'; 
            btn.onclick = () => {
                if (displayBox.textContent.length < 20) {
                    displayBox.textContent += char;
                }
            };
            grid.appendChild(btn);
        });
        inputCont.appendChild(grid);

        const controlRow = document.createElement('div');
        controlRow.style.display = "flex";
        controlRow.style.gap = "10px";
        const clearBtn = document.createElement('button');
        clearBtn.textContent = "Clear";
        clearBtn.className = "btn-danger btn-block";
        clearBtn.onclick = () => { displayBox.textContent = ""; };
        const submitBtn = document.createElement('button');
        submitBtn.textContent = "OK";
        submitBtn.className = "btn-primary btn-block";
        submitBtn.onclick = () => {
            if (displayBox.textContent.length === 0) return;
            submitAnswer(roomId, playerId, displayBox.textContent);
        };
        controlRow.appendChild(clearBtn);
        controlRow.appendChild(submitBtn);
        inputCont.appendChild(controlRow);
    }
    // C. 口頭回答
    else if (q.type === 'free_oral') {
        document.getElementById('player-oral-done-area').classList.remove('hidden');
        document.getElementById('player-oral-done-btn').onclick = () => {
            submitAnswer(roomId, playerId, "[Oral]");
        };
    }
    // D. 記述式
    else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = '回答を入力...';
        inp.className = 'modern-input'; 
        inp.style.marginBottom = '15px';
        const sub = document.createElement('button');
        sub.className = 'btn-primary btn-block';
        sub.textContent = '送信';
        sub.onclick = () => {
            if(inp.value.trim() === "") return;
            submitAnswer(roomId, playerId, inp.value.trim());
        };
        inputCont.appendChild(inp);
        inputCont.appendChild(sub);
    }
}

function submitAnswer(roomId, playerId, answer) {
    window.db.ref(`rooms/${roomId}/players/${playerId}`).update({
        lastAnswer: answer
    });
    // UI更新はupdateUI()に任せる（ここで何かするとちらつくため）
}
