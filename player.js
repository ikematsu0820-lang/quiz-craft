/* =========================================================
 * player.js (v117: Complete Version with Letter Panel & Sync)
 * =======================================================*/

let myRoomId = null;
let myPlayerId = null;
let myName = "NoName";
let roomConfig = { mode: 'normal' };

// ローカル状態管理
let localStatus = { step: 'standby' };
let localPlayerData = { isAlive: true, lastResult: null };

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('join-room-btn');
    if(btn) btn.onclick = joinRoom;
});

// 画面切り替え
function showPlayerView(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(viewId);
    if(target) target.classList.remove('hidden');
}

// 参加処理
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

// データ監視と画面更新
function startPlayerListener(roomId, playerId) {
    const statusRef = window.db.ref(`rooms/${roomId}/status`);
    const myRef = window.db.ref(`rooms/${roomId}/players/${playerId}`);
    const configRef = window.db.ref(`rooms/${roomId}/config`);

    // A. 自分のデータ監視
    myRef.on('value', snap => {
        const val = snap.val();
        if(!val) return;
        localPlayerData = val; 
        updateUI(); // ★ここで画面更新を一元管理
    });

    // B. 設定監視
    configRef.on('value', snap => {
        roomConfig = snap.val() || { mode: 'normal' };
    });

    // C. ステータス監視
    statusRef.on('value', snap => {
        const st = snap.val();
        if(!st) return;
        localStatus = st; 
        
        // 問題が変わったらデータ取得して描画
        if (st.step === 'question' || st.step === 'answering') {
             window.db.ref(`rooms/${roomId}/questions/${st.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                if(q) renderPlayerQuestion(q, roomId, playerId);
            });
        }
        
        updateUI(); // ★ここでも画面更新
    });
}

// ★ UIの一括更新 (ここで状態と結果を突き合わせて表示を決定)
function updateUI() {
    const st = localStatus;
    const p = localPlayerData;
    
    // 1. 基本情報
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
    
    if (p.periodScore !== undefined) {
        document.getElementById('score-display-area').classList.remove('hidden');
        document.getElementById('current-score-value').textContent = p.periodScore;
    }

    // 2. 画面要素の取得
    const lobby = document.getElementById('player-lobby-msg');
    const quizArea = document.getElementById('player-quiz-area');
    const waitMsg = document.getElementById('player-wait-msg');
    const resultOverlay = document.getElementById('player-result-overlay');
    const buzzArea = document.getElementById('player-buzz-area');
    const oralArea = document.getElementById('player-oral-done-area');

    // 初期化 (一旦隠す)
    lobby.classList.add('hidden');
    if (st.step !== 'question' && st.step !== 'answering') {
        quizArea.classList.add('hidden');
        buzzArea.classList.add('hidden');
        oralArea.classList.add('hidden');
    }
    waitMsg.classList.add('hidden');
    resultOverlay.classList.add('hidden');

    // --- ステップごとの表示制御 ---
    
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
            const btn = document.getElementById('player-buzz-btn');
            if (p.buzzTime) {
                btn.disabled = true;
                btn.textContent = "承認待ち...";
            } else {
                btn.disabled = false;
                btn.textContent = "PUSH!";
            }
        } else {
            // 通常回答
            if (p.lastAnswer != null) {
                quizArea.classList.add('hidden');
                waitMsg.classList.remove('hidden');
                waitMsg.textContent = "回答を受け付けました。発表を待っています...";
            } else {
                quizArea.classList.remove('hidden');
            }
        }
    }
    else if (st.step === 'answering') {
        // 回答中 (早押しの場合、権利者のみ表示)
        if (roomConfig.mode === 'buzz') {
            if (st.currentAnswerer === myPlayerId) {
                quizArea.classList.remove('hidden'); 
                buzzArea.classList.add('hidden');
            } else {
                lobby.classList.remove('hidden');
                lobby.innerHTML = `<h3>LOCKED</h3><p>他のプレイヤーが回答中...</p>`;
                quizArea.classList.add('hidden');
                buzzArea.classList.add('hidden');
            }
        } else {
            if (p.lastAnswer != null) {
                quizArea.classList.add('hidden');
                waitMsg.classList.remove('hidden');
                waitMsg.textContent = "回答を受け付けました。発表を待っています...";
            } else {
                quizArea.classList.remove('hidden');
            }
        }
    }
    else if (st.step === 'result' || st.step === 'answer') {
        // ★結果発表 (ここがモニターと同期する部分)
        // 司会者が「正解発表」にするまで結果は出ない
        if (p.lastResult) {
            showResultOverlay(p.lastResult);
        } else {
            waitMsg.classList.remove('hidden');
            waitMsg.textContent = "正解発表中...";
        }
    }
}

// 結果表示オーバーレイ
function showResultOverlay(result) {
    const ol = document.getElementById('player-result-overlay');
    const icon = document.getElementById('result-icon');
    const text = document.getElementById('result-text');
    
    ol.classList.remove('hidden');
    
    if (result === 'win') {
        ol.style.background = "rgba(0, 180, 0, 0.9)";
        icon.textContent = '⭕️';
        text.textContent = 'WIN!';
        text.style.color = '#fff';
    } else {
        ol.style.background = "rgba(180, 0, 0, 0.9)";
        icon.textContent = '❌';
        text.textContent = 'LOSE...';
        text.style.color = '#fff';
    }
}

// 問題描画 (文字パネル対応版)
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
    // B. 文字選択式 (★ここが文字パネル機能！)
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
        
        // シャッフル
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // 表示枠
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

        // 文字パネルグリッド
        const grid = document.createElement('div');
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(5, 1fr)";
        grid.style.gap = "8px";
        grid.style.marginBottom = "15px";

        pool.forEach(char => {
            const btn = document.createElement('button');
            btn.textContent = char;
            btn.className = 'letter-panel-btn'; // CSSで定義済み
            btn.onclick = () => {
                if (displayBox.textContent.length < 20) {
                    displayBox.textContent += char;
                }
            };
            grid.appendChild(btn);
        });
        inputCont.appendChild(grid);

        // 操作ボタン
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
    }).then(() => {
        // 状態更新はリスナー側で行うため、ここでは何もしない
    });
}
