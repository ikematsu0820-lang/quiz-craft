/* =========================================================
 * player.js (v96: Standalone & Robust Version)
 * =======================================================*/

// グローバル変数
let myRoomId = null;
let myPlayerId = null;
let myName = "NoName";
let roomConfig = { mode: 'normal' };

// 起動時処理
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('join-room-btn');
    if(btn) {
        // ボタンの連打防止
        btn.onclick = joinRoom;
    }
});

// 画面切り替え用（他ファイルに依存しない独自関数）
function showPlayerView(viewId) {
    // 全ての.viewを隠す
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
    // 指定されたIDだけ表示
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

    // 1. まず部屋が存在するか確認
    window.db.ref(`rooms/${code}`).once('value', snap => {
        if (!snap.exists()) {
            alert("その部屋コードは見つかりませんでした");
            btn.disabled = false;
            btn.textContent = "参加する";
            return;
        }

        // 2. 部屋があったら参加登録
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
            // 参加成功！画面を切り替える
            showPlayerView('player-game-view'); // 依存せず直接ID指定
            document.getElementById('player-name-disp').textContent = name;
            
            // 監視開始
            startPlayerListener(code, myPlayerId);
        }).catch(e => {
            alert("エラーが発生しました: " + e.message);
            btn.disabled = false;
            btn.textContent = "参加する";
        });
    });
}

// ゲーム状態の監視
function startPlayerListener(roomId, playerId) {
    const statusRef = window.db.ref(`rooms/${roomId}/status`);
    const myRef = window.db.ref(`rooms/${roomId}/players/${playerId}`);
    const configRef = window.db.ref(`rooms/${roomId}/config`);

    // A. 自分の状態（生存/死亡/結果）監視
    myRef.on('value', snap => {
        const val = snap.val();
        if(!val) return;
        
        // 生存バッジ
        const badge = document.getElementById('alive-badge');
        if(badge) {
            if (val.isAlive) {
                badge.textContent = "生存";
                badge.style.background = "#00ff00";
                badge.style.color = "#000";
                document.getElementById('player-dead-overlay').classList.add('hidden');
            } else {
                badge.textContent = "脱落";
                badge.style.background = "#d00";
                badge.style.color = "#fff";
                document.getElementById('player-dead-overlay').classList.remove('hidden');
            }
        }
        
        // スコア表示
        if (val.periodScore !== undefined) {
            document.getElementById('score-display-area').classList.remove('hidden');
            document.getElementById('current-score-value').textContent = val.periodScore;
        }
        
        // 正誤結果ポップアップ
        if (val.lastResult) {
            showResultOverlay(val.lastResult);
        }
    });

    // B. ルール設定の監視
    configRef.on('value', snap => {
        roomConfig = snap.val() || { mode: 'normal' };
    });

    // C. 進行ステータスの監視（ここがメイン）
    statusRef.on('value', snap => {
        const st = snap.val();
        if(!st) return;

        // 一旦画面をリセット
        resetPlayerScreen();

        if (st.step === 'standby') {
            // 待機中
            const lobby = document.getElementById('player-lobby-msg');
            lobby.innerHTML = `<h3>しばらくお待ちください</h3><p>ホストが準備中です...</p>`;
            lobby.classList.remove('hidden');
        }
        else if (st.step === 'ready') {
            // 直前
            const lobby = document.getElementById('player-lobby-msg');
            lobby.innerHTML = `<h3>まもなく開始します！</h3><p>Ready...</p>`;
            lobby.classList.remove('hidden');
        }
        else if (st.step === 'question') {
            // 出題中（モードによって分岐）
            if (roomConfig.mode === 'buzz') {
                handleBuzzMode(roomId, playerId, st);
            } else {
                // 通常・ソロ・一斉回答
                handleNormalMode(roomId, playerId, st);
            }
        }
        else if (st.step === 'answering') {
            // 回答受付中（早押し後の回答など）
            if (roomConfig.mode === 'buzz') {
                handleBuzzMode(roomId, playerId, st); // 早押し判定継続
            } else {
                // 通常モードはQuestionと同じ扱いでOK（未回答なら入力画面）
                handleNormalMode(roomId, playerId, st);
            }
        }
        else if (st.step === 'result' || st.step === 'answer') {
            // 正解発表・結果
            const wait = document.getElementById('player-wait-msg');
            wait.textContent = "集計中 / 正解発表...";
            wait.classList.remove('hidden');
        }
    });
}

// 画面要素のリセット
function resetPlayerScreen() {
    document.getElementById('player-lobby-msg').classList.add('hidden');
    document.getElementById('player-lobby-msg').innerHTML = "";
    document.getElementById('player-quiz-area').classList.add('hidden');
    document.getElementById('player-wait-msg').classList.add('hidden');
    document.getElementById('player-ranking-overlay').classList.add('hidden');
    document.getElementById('player-buzz-area').classList.add('hidden');
    document.getElementById('player-oral-done-area').classList.add('hidden');
}

// 早押しモードの処理
function handleBuzzMode(roomId, playerId, status) {
    const buzzArea = document.getElementById('player-buzz-area');
    const lobbyMsg = document.getElementById('player-lobby-msg');
    
    // 1. まだ誰も押していない（早押しボタン表示）
    if (status.isBuzzActive) {
        buzzArea.classList.remove('hidden');
        const btn = document.getElementById('player-buzz-btn');
        btn.disabled = false;
        btn.textContent = "PUSH!";
        btn.style.opacity = "1";
        
        btn.onclick = () => {
            // 押した時間を記録
            const now = firebase.database.ServerValue.TIMESTAMP;
            window.db.ref(`rooms/${roomId}/players/${playerId}`).update({ buzzTime: now });
            btn.disabled = true; 
            btn.textContent = "承認待ち...";
        };
    } 
    // 2. 誰かが回答権を得た
    else if (status.currentAnswerer) {
        if (status.currentAnswerer === playerId) {
            // 自分だ！ -> 回答画面表示
            window.db.ref(`rooms/${roomId}/questions/${status.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                renderPlayerQuestion(q, roomId, playerId); 
            });
        } else {
            // 自分じゃない -> 待機
            lobbyMsg.classList.remove('hidden');
            lobbyMsg.innerHTML = `<h3>LOCKED</h3><p>回答権：他のプレイヤー</p>`;
        }
    }
    // 3. 準備中
    else {
        lobbyMsg.classList.remove('hidden');
        lobbyMsg.textContent = "Ready...";
    }
}

// 通常モードの処理
function handleNormalMode(roomId, playerId, status) {
    // 自分がすでに回答済みかチェック
    window.db.ref(`rooms/${roomId}/players/${playerId}/lastAnswer`).once('value', ansSnap => {
        const hasAnswered = (ansSnap.val() != null);

        // 回答済みなら待機画面
        if(hasAnswered) {
            const wait = document.getElementById('player-wait-msg');
            wait.textContent = "回答を受け付けました";
            wait.classList.remove('hidden');
        } else {
            // 未回答なら問題表示
            window.db.ref(`rooms/${roomId}/questions/${status.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                if(q) renderPlayerQuestion(q, roomId, playerId);
            });
        }
    });
}

// 問題描画 (選択肢ボタンなどを生成)
function renderPlayerQuestion(q, roomId, playerId) {
    const area = document.getElementById('player-quiz-area');
    const qText = document.getElementById('question-text-disp');
    const inputCont = document.getElementById('player-input-container');
    const oralArea = document.getElementById('player-oral-done-area');
    
    area.classList.remove('hidden');
    oralArea.classList.add('hidden'); 
    qText.textContent = q.q;
    inputCont.innerHTML = '';

    // --- A. 選択式 ---
    if (q.type === 'choice') {
        let choices = q.c.map((text, i) => ({ text: text, originalIndex: i }));
        if (roomConfig.shuffleChoices === 'on') {
            // シャッフル処理
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
    } 
    
    // --- ★追加: B. 文字選択式 (Letter Select) ---
    else if (q.type === 'letter_select') {
        let pool = [];
        
        // ステップデータがある場合 (新方式)
        if (q.steps) {
            q.steps.forEach(step => {
                pool.push(step.correct);
                if (step.dummies) pool.push(...step.dummies);
            });
        } 
        // 旧方式（念のため互換性維持）
        else {
            const correctChars = q.correct.split('');
            const dummyChars = (q.dummyChars || '').split('');
            pool = [...correctChars, ...dummyChars];
        }
        
        // 空文字を除去してシャッフル
        pool = pool.filter(c => c && c.trim() !== '');
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // 表示エリア
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
        displayBox.style.border = "2px solid #ccc";
        displayBox.textContent = ""; 
        inputCont.appendChild(displayBox);

        // グリッド
        const grid = document.createElement('div');
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(5, 1fr)";
        grid.style.gap = "8px";
        grid.style.marginBottom = "15px";

        pool.forEach(char => {
            const btn = document.createElement('button');
            btn.textContent = char;
            btn.className = 'letter-panel-btn';
            btn.style.aspectRatio = "1";
            btn.style.background = "#333";
            btn.style.border = "1px solid #555";
            btn.style.color = "#fff";
            btn.style.fontSize = "20px";
            btn.style.fontWeight = "bold";
            btn.style.borderRadius = "8px";
            btn.style.cursor = "pointer";
            
            btn.onclick = () => {
                if (displayBox.textContent.length < 20) {
                    displayBox.textContent += char;
                    // クリックアニメーション
                    btn.style.transform = "scale(0.9)";
                    setTimeout(() => btn.style.transform = "scale(1)", 100);
                }
            };
            grid.appendChild(btn);
        });
        inputCont.appendChild(grid);

        // ボタン
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
    
    // --- C. 口頭回答 ---
    else if (q.type === 'free_oral') {
        area.classList.add('hidden'); 
        oralArea.classList.remove('hidden'); 
        document.getElementById('player-oral-done-btn').onclick = () => {
            submitAnswer(roomId, playerId, "[Oral]");
        };
    } 
    
    // --- D. 記述式 ---
    else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = '回答を入力...';
        inp.className = 'modern-input';
        inp.style.marginBottom = '10px';
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
// 回答送信処理
function submitAnswer(roomId, playerId, answer) {
    window.db.ref(`rooms/${roomId}/players/${playerId}`).update({
        lastAnswer: answer
    }).then(() => {
        // 送信したら即座に待機画面へ
        document.getElementById('player-quiz-area').classList.add('hidden');
        document.getElementById('player-oral-done-area').classList.add('hidden');
        
        const wait = document.getElementById('player-wait-msg');
        wait.textContent = "回答を受け付けました";
        wait.classList.remove('hidden');
    });
}

// 正誤結果ポップアップ表示
function showResultOverlay(result) {
    const ol = document.getElementById('player-result-overlay');
    const icon = document.getElementById('result-icon');
    const text = document.getElementById('result-text');
    
    ol.classList.remove('hidden');
    if (result === 'win') {
        ol.style.color = '#00ff00';
        icon.textContent = '⭕️';
        text.textContent = 'WIN';
    } else {
        ol.style.color = '#ff3333';
        icon.textContent = '❌';
        text.textContent = 'LOSE';
    }
    
    // 3秒後に消える
    setTimeout(() => {
        ol.classList.add('hidden');
        // 結果情報をクリアして、次の判定に備える
        if(myRoomId && myPlayerId) {
             window.db.ref(`rooms/${myRoomId}/players/${myPlayerId}/lastResult`).set(null);
        }
    }, 3000);
}
