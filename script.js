/* =========================================================
 * ALL STAR SYSTEM: script.js (Multi-Period Edition)
 * =======================================================*/

const firebaseConfig = {
  apiKey: "AIzaSyDl9kq_jJb_zvYc3lfTfL_oTQrdqv2Abww",
  databaseURL: "https://quizcraft-56950-default-rtdb.asia-southeast1.firebasedatabase.app/",
  authDomain: "quizcraft-56950.firebaseapp.com",
  projectId: "quizcraft-56950",
  storageBucket: "quizcraft-56950.firebasestorage.app",
  messagingSenderId: "556267695492",
  appId: "1:556267695492:web:9855ff279731300b4101d1",
  measurementId: "G-3HRYY8ZC2W"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
let db;
try {
    db = firebase.database();
} catch(e) {
    console.error(e);
}

/* --- 画面遷移 --- */
const views = {
    main: document.getElementById('main-view'),
    creator: document.getElementById('creator-view'),
    hostControl: document.getElementById('host-control-view'),
    respondent: document.getElementById('respondent-view'),
    playerGame: document.getElementById('player-game-view')
};

function showView(target) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    target.classList.remove('hidden');
}

// 戻るボタンなど
document.querySelectorAll('.back-to-main').forEach(btn => {
    btn.addEventListener('click', () => showView(views.main));
});
document.getElementById('show-creator-btn').addEventListener('click', () => showView(views.creator));
document.getElementById('show-respondent-btn').addEventListener('click', () => showView(views.respondent));


/* =========================================================
 * 1. HOST: 問題作成 & 保存
 * =======================================================*/
let createdQuestions = [];

document.getElementById('add-question-btn').addEventListener('click', () => {
    const qText = document.getElementById('question-text').value.trim();
    const correctIndex = parseInt(document.getElementById('correct-index').value);
    
    const cBlue = document.querySelector('.btn-blue.choice-input').value.trim() || "選択肢1";
    const cRed = document.querySelector('.btn-red.choice-input').value.trim() || "選択肢2";
    const cGreen = document.querySelector('.btn-green.choice-input').value.trim() || "選択肢3";
    const cYellow = document.querySelector('.btn-yellow.choice-input').value.trim() || "選択肢4";

    if(!qText) { alert('問題文を入力してください'); return; }

    createdQuestions.push({
        q: qText,
        c: [cBlue, cRed, cGreen, cYellow],
        correctIndex: correctIndex
    });

    const list = document.getElementById('q-list');
    const li = document.createElement('li');
    li.textContent = `Q${createdQuestions.length}. ${qText}`;
    list.appendChild(li);
    document.getElementById('q-count').textContent = createdQuestions.length;

    document.getElementById('question-text').value = '';
    document.getElementById('question-text').focus();
});

// ★履歴（ピリオドストック）に保存
function saveToLocalHistory(title, questions) {
    if(!title) title = "無題のセット " + new Date().toLocaleTimeString();
    const history = JSON.parse(localStorage.getItem('as_history') || '[]');
    history.unshift({
        title: title,
        questions: questions,
        date: new Date().toLocaleString()
    });
    localStorage.setItem('as_history', JSON.stringify(history));
    alert(`「${title}」を保存しました！\n本番画面から呼び出せます。`);
}

// 保存ボタン（端末に保存だけ）
document.getElementById('save-only-btn').addEventListener('click', () => {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }
    const title = document.getElementById('quiz-set-title').value.trim();
    saveToLocalHistory(title, createdQuestions);
});

/* =========================================================
 * 2. HOST: 進行管理 (ピリオドロード機能付き)
 * =======================================================*/
let currentRoomId = null;
let currentQIndex = 0;

// すぐに放送開始（部屋作成）
document.getElementById('save-room-btn').addEventListener('click', () => {
    // 部屋を作るときは、現在作成中のリストを使う
    // （もし空なら、ダミーで部屋だけ作ることも許可）
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 現在の内容も一応保存しておく
    if(createdQuestions.length > 0) {
        const title = document.getElementById('quiz-set-title').value.trim();
        saveToLocalHistory(title, createdQuestions);
    }

    db.ref(`rooms/${currentRoomId}`).set({
        questions: createdQuestions, // 初期の問題セット
        status: { step: 'standby', qIndex: 0 },
        players: {}
    }).then(() => {
        enterHostMode(currentRoomId);
    });
});

function enterHostMode(roomId) {
    showView(views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;
    
    // ピリオド選択プルダウンを更新
    updatePeriodSelect();

    // プレイヤー監視
    db.ref(`rooms/${roomId}/players`).on('value', snap => {
        const players = snap.val() || {};
        const total = Object.keys(players).length;
        const alive = Object.values(players).filter(p => p.isAlive).filter(Boolean).length;
        document.getElementById('host-player-count').textContent = total;
        document.getElementById('host-alive-count').textContent = alive;
    });

    const btnNewPeriod = document.getElementById('host-new-period-btn');
    const btnStart = document.getElementById('host-start-btn');
    const btnShowAns = document.getElementById('host-show-answer-btn');
    const btnNext = document.getElementById('host-next-btn');
    const btnEliminate = document.getElementById('host-eliminate-slowest-btn');
    const btnRanking = document.getElementById('host-ranking-btn');
    const btnLoadPeriod = document.getElementById('host-load-period-btn');

    // ★ピリオドロード機能
    btnLoadPeriod.onclick = () => {
        const select = document.getElementById('period-select');
        const json = select.value;
        if(!json) return;
        
        if(!confirm('現在進行中の問題セットを破棄し、\n選択したピリオドを読み込みますか？')) return;

        const selectedSet = JSON.parse(json);
        createdQuestions = selectedSet.questions; // ホストのメモリを書き換え
        currentQIndex = 0;

        // Firebase上の問題を書き換え
        db.ref(`rooms/${roomId}/questions`).set(createdQuestions);
        // ステータスをリセット
        db.ref(`rooms/${roomId}/status`).update({ step: 'standby', qIndex: 0 });

        alert(`「${selectedSet.title}」をセットしました！\n「新ピリオド開始」を押してください。`);
        document.getElementById('host-status-area').textContent = `セット完了: ${selectedSet.title}`;
        
        btnStart.classList.add('hidden');
        btnNewPeriod.classList.remove('hidden');
    };

    // ★新ピリオド開始
    btnNewPeriod.onclick = () => {
        if(createdQuestions.length === 0) { alert('問題がロードされていません！'); return; }
        if(!confirm('全員を復活させ、ピリオドを開始しますか？')) return;
        
        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(child => {
                child.ref.update({
                    isAlive: true,
                    periodScore: 0,
                    periodTime: 0,
                    lastTime: 99999
                });
            });
        });
        
        currentQIndex = 0;
        document.getElementById('host-status-area').textContent = "Ready...";
        btnStart.classList.remove('hidden');
        btnNewPeriod.classList.add('hidden');
    };

    // ★START
    btnStart.onclick = () => {
        const now = firebase.database.ServerValue.TIMESTAMP;
        db.ref(`rooms/${roomId}/status`).set({
            step: 'question',
            qIndex: currentQIndex,
            startTime: now
        });
        btnStart.classList.add('hidden');
        btnShowAns.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} Thinking...`;
    };

    // ★正解発表
    btnShowAns.onclick = () => {
        const currentQ = createdQuestions[currentQIndex];
        const correctIdx = currentQ.correctIndex;

        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => {
                const val = p.val();
                if(!val.isAlive) return;
                if(val.lastAnswer === correctIdx) {
                    const timeTaken = val.lastTime || 99999;
                    p.ref.update({
                        periodScore: (val.periodScore || 0) + 1,
                        periodTime: (val.periodTime || 0) + timeTaken
                    });
                } else {
                    p.ref.update({ isAlive: false });
                }
            });
        });

        db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });
        btnShowAns.classList.add('hidden');
        btnEliminate.classList.remove('hidden');
        btnNext.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = `正解: ${["青","赤","緑","黄"][correctIdx]}`;
    };

    // ★予選落ち
    btnEliminate.onclick = () => {
        if(!confirm('正解者の中で一番遅い1名を脱落させますか？')) return;
        const currentQ = createdQuestions[currentQIndex];
        const correctIdx = currentQ.correctIndex;

        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let slowestKey = null;
            let maxTime = -1;
            snap.forEach(p => {
                const val = p.val();
                if(val.isAlive && val.lastAnswer === correctIdx) {
                    if(val.lastTime > maxTime) {
                        maxTime = val.lastTime;
                        slowestKey = p.key;
                    }
                }
            });
            if(slowestKey) {
                db.ref(`rooms/${roomId}/players/${slowestKey}`).update({ isAlive: false });
                alert(`脱落: ${(maxTime/1000).toFixed(2)}秒`);
            } else {
                alert('対象者なし');
            }
        });
    };

    // ★次へ
    btnNext.onclick = () => {
        currentQIndex++;
        if(currentQIndex >= createdQuestions.length) {
            alert('ピリオド終了！チャンピオンを決めましょう');
            btnNext.classList.add('hidden');
            return;
        }
        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ lastAnswer: -1, lastTime: 99999 }));
        });
        btnStart.classList.remove('hidden');
        btnNext.classList.add('hidden');
        btnEliminate.classList.add('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} Ready...`;
    };

    // ★ランキング
    btnRanking.onclick = () => {
        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let ranking = [];
            snap.forEach(p => {
                const v = p.val();
                if(v.isAlive) {
                    ranking.push({ name: v.name, score: v.periodScore, time: v.periodTime });
                }
            });
            ranking.sort((a, b) => (b.score - a.score) || (a.time - b.time));
            
            let msg = "🏆 生存者ランキング 🏆\n";
            ranking.slice(0, 10).forEach((r, i) => {
                msg += `${i+1}. ${r.name} (${r.score}問/${(r.time/1000).toFixed(2)}s)\n`;
            });
            alert(msg);
        });
    };
}

// 履歴プルダウン更新
function updatePeriodSelect() {
    const select = document.getElementById('period-select');
    select.innerHTML = '<option value="">-- セットを選択 --</option>';
    const history = JSON.parse(localStorage.getItem('as_history') || '[]');
    
    history.forEach(h => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify(h);
        opt.textContent = `${h.title} (${h.date})`;
        select.appendChild(opt);
    });
}


/* =========================================================
 * 3. PLAYER: 回答者
 * =======================================================*/
let myPlayerId = null;
let myRoomRef = null;
let questionStartTime = 0;

document.getElementById('join-room-btn').addEventListener('click', () => {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    const name = document.getElementById('player-name-input').value.trim() || "名無し";
    if(!code) return;

    db.ref(`rooms/${code}`).once('value', snap => {
        if(snap.exists()) {
            joinGame(code, name);
        } else {
            alert('部屋が見つかりません');
        }
    });
});

function joinGame(roomId, name) {
    showView(views.playerGame);
    document.getElementById('player-name-disp').textContent = name;

    myRoomRef = db.ref(`rooms/${roomId}`);
    const myRef = myRoomRef.child('players').push();
    myPlayerId = myRef.key;

    myRef.set({
        name: name,
        isAlive: true,
        periodScore: 0,
        periodTime: 0,
        lastAnswer: -1,
        lastTime: 99999
    });

    // 自分の状態監視
    myRef.on('value', snap => {
        const val = snap.val();
        if(!val) return;
        const badge = document.getElementById('alive-badge');
        const overlay = document.getElementById('player-dead-overlay');
        
        if(val.isAlive) {
            badge.textContent = "STAND UP";
            badge.style.background = "#00ff00";
            overlay.classList.add('hidden');
        } else {
            badge.textContent = "SIT DOWN";
            badge.style.background = "#555";
            overlay.classList.remove('hidden');
        }
    });

    // 全体進行監視
    db.ref(`rooms/${roomId}/status`).on('value', snap => {
        const st = snap.val();
        if(!st) return;

        const lobby = document.getElementById('player-lobby-msg');
        const quizArea = document.getElementById('player-quiz-area');
        const waitMsg = document.getElementById('player-wait-msg');

        if(st.step === 'question') {
            lobby.classList.add('hidden');
            waitMsg.classList.add('hidden');
            quizArea.classList.remove('hidden');
            questionStartTime = st.startTime; 

            db.ref(`rooms/${roomId}/questions/${st.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                if(!q) return;
                document.getElementById('question-text-disp').textContent = q.q;
                
                const btns = document.querySelectorAll('.answer-btn');
                btns.forEach((btn, i) => {
                    btn.textContent = q.c[i];
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.border = "none";
                });
            });

        } else if(st.step === 'answer') {
            quizArea.classList.add('hidden');
            waitMsg.classList.remove('hidden');
        } else {
            // Standby
            lobby.classList.remove('hidden');
            quizArea.classList.add('hidden');
            waitMsg.classList.add('hidden');
        }
    });
}

document.querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // 簡易タイム計測
        const estimatedTimeTaken = Date.now() - questionStartTime;
        const myAnswerIndex = parseInt(btn.dataset.index);
        
        document.querySelectorAll('.answer-btn').forEach(b => {
            b.disabled = true;
            b.style.opacity = "0.3";
        });
        btn.style.opacity = "1";
        btn.style.border = "4px solid white";

        document.getElementById('answer-timer-disp').textContent = `${(estimatedTimeTaken/1000).toFixed(2)}秒`;

        if(myPlayerId && myRoomRef) {
            myRoomRef.child(`players/${myPlayerId}`).update({
                lastAnswer: myAnswerIndex,
                lastTime: estimatedTimeTaken
            });
        }
    });
});
