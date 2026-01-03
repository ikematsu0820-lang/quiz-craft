/* =========================================================
 * ALL STAR SYSTEM: Cloud Edition
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
} catch(e) { console.error(e); }

/* --- 画面遷移 --- */
const views = {
    main: document.getElementById('main-view'),
    hostLogin: document.getElementById('host-login-view'),
    dashboard: document.getElementById('host-dashboard-view'),
    creator: document.getElementById('creator-view'),
    hostControl: document.getElementById('host-control-view'),
    respondent: document.getElementById('respondent-view'),
    playerGame: document.getElementById('player-game-view')
};

function showView(target) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    target.classList.remove('hidden');
}

// 戻るボタン等
document.querySelectorAll('.back-to-main').forEach(btn => btn.addEventListener('click', () => {
    // ログアウト扱い
    currentShowId = null;
    showView(views.main);
}));
document.getElementById('main-host-btn').addEventListener('click', () => showView(views.hostLogin));
document.getElementById('main-player-btn').addEventListener('click', () => showView(views.respondent));


/* =========================================================
 * 1. HOST: ログイン & ダッシュボード
 * =======================================================*/
let currentShowId = null;

// ログインボタン
document.getElementById('host-login-submit-btn').addEventListener('click', () => {
    const input = document.getElementById('show-id-input').value.trim().toUpperCase();
    if(!input) { alert("番組IDを入力してください"); return; }
    
    // 英数字のみチェック
    if(!/^[A-Z0-9_-]+$/.test(input)) {
        alert("IDは半角英数字、ハイフン、アンダーバーのみ使用できます");
        return;
    }

    currentShowId = input;
    enterDashboard();
});

function enterDashboard() {
    showView(views.dashboard);
    document.getElementById('dashboard-show-id').textContent = currentShowId;
    loadSavedSets(); // クラウドからリスト取得
}

// クラウド上のセット一覧を取得
function loadSavedSets() {
    const listEl = document.getElementById('dash-set-list');
    listEl.innerHTML = '<p style="text-align:center;">読み込み中...</p>';

    db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        listEl.innerHTML = '';
        
        if(!data) {
            listEl.innerHTML = '<p style="text-align:center; color:#999;">保存されたセットはありません</p>';
            return;
        }

        Object.keys(data).forEach(key => {
            const item = data[key];
            const div = document.createElement('div');
            div.className = 'set-item';
            div.innerHTML = `
                <div>
                    <span>${item.title}</span> <small>(${new Date(item.createdAt).toLocaleDateString()})</small>
                    <div style="font-size:0.8em; color:#666;">全${item.questions.length}問</div>
                </div>
            `;
            
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = '削除';
            delBtn.onclick = () => {
                if(confirm(`「${item.title}」を削除しますか？`)) {
                    db.ref(`saved_sets/${currentShowId}/${key}`).remove();
                    div.remove();
                }
            };
            div.appendChild(delBtn);
            listEl.appendChild(div);
        });
    });
}

document.getElementById('dash-create-btn').onclick = () => {
    // 作成画面リセット
    createdQuestions = [];
    document.getElementById('q-list').innerHTML = '';
    document.getElementById('q-count').textContent = '0';
    document.getElementById('quiz-set-title').value = '';
    showView(views.creator);
};

document.getElementById('dash-studio-btn').onclick = () => {
    startRoom(); // 部屋作成へ
};


/* =========================================================
 * 2. HOST: 問題作成 & クラウド保存
 * =======================================================*/
let createdQuestions = [];

document.getElementById('creator-back-btn').addEventListener('click', () => enterDashboard());

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

// ★クラウド保存
document.getElementById('save-to-cloud-btn').addEventListener('click', () => {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }
    
    const title = document.getElementById('quiz-set-title').value.trim() || "無題のセット";
    
    // FirebaseにPush
    db.ref(`saved_sets/${currentShowId}`).push({
        title: title,
        questions: createdQuestions,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert(`クラウドに「${title}」を保存しました！\nダッシュボードに戻ります。`);
        enterDashboard();
    }).catch(err => {
        alert("保存エラー: " + err.message);
    });
});


/* =========================================================
 * 3. HOST: スタジオ進行 (クラウドロード機能)
 * =======================================================*/
let currentRoomId = null;
let currentQIndex = 0;
let studioQuestions = []; // スタジオで使う問題

function startRoom() {
    // 部屋ID作成 (毎回ランダム)
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    db.ref(`rooms/${currentRoomId}`).set({
        questions: [],
        status: { step: 'standby', qIndex: 0 },
        players: {}
    }).then(() => {
        enterHostMode(currentRoomId);
    });
}

function enterHostMode(roomId) {
    showView(views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;
    document.getElementById('studio-show-id').textContent = currentShowId;
    
    // ロード用プルダウン更新
    const select = document.getElementById('period-select');
    select.innerHTML = '<option value="">読み込み中...</option>';
    
    // Firebaseからリスト取得
    db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = '<option value="">-- セットを選択 --</option>';
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                opt.value = JSON.stringify(item.questions); // 簡易的に値を埋め込む
                opt.textContent = item.title;
                select.appendChild(opt);
            });
        }
    });

    // プレイヤー監視
    db.ref(`rooms/${roomId}/players`).on('value', snap => {
        const players = snap.val() || {};
        const total = Object.keys(players).length;
        const alive = Object.values(players).filter(p => p.isAlive).length;
        document.getElementById('host-player-count').textContent = total;
        document.getElementById('host-alive-count').textContent = alive;
    });

    // スタジオ閉じる
    document.getElementById('host-close-studio-btn').onclick = () => {
        if(confirm("スタジオを閉じてダッシュボードに戻りますか？\n(参加者は切断されます)")) {
            enterDashboard();
        }
    };

    // ボタン定義
    const btnLoad = document.getElementById('host-load-period-btn');
    const btnNewPeriod = document.getElementById('host-new-period-btn');
    const btnStart = document.getElementById('host-start-btn');
    const btnShowAns = document.getElementById('host-show-answer-btn');
    const btnEliminate = document.getElementById('host-eliminate-slowest-btn');
    const btnNext = document.getElementById('host-next-btn');
    const btnRanking = document.getElementById('host-ranking-btn');

    // ★ロード実行
    btnLoad.onclick = () => {
        const json = document.getElementById('period-select').value;
        if(!json) return;
        
        if(studioQuestions.length > 0) {
            if(!confirm("進行中の問題を破棄して、新しいセットを読み込みますか？")) return;
        }

        studioQuestions = JSON.parse(json);
        currentQIndex = 0;

        // 部屋データを更新
        db.ref(`rooms/${roomId}/questions`).set(studioQuestions);
        db.ref(`rooms/${roomId}/status`).update({ step: 'standby', qIndex: 0 });

        alert("セット完了！\n「全員復活させてスタート」を押してください。");
        document.getElementById('host-status-area').textContent = "Ready...";
        
        btnStart.classList.add('hidden');
        btnShowAns.classList.add('hidden');
        btnNext.classList.add('hidden');
        btnNewPeriod.classList.remove('hidden');
    };

    // ★全員復活
    btnNewPeriod.onclick = () => {
        if(!studioQuestions.length) { alert("問題をロードしてください"); return; }
        if(!confirm("全員を復活させてピリオドを開始しますか？")) return;

        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ isAlive: true, periodScore:0, periodTime:0, lastTime:99999 }));
        });
        currentQIndex = 0;
        btnStart.classList.remove('hidden');
        btnNewPeriod.classList.add('hidden');
    };

    // ★START
    btnStart.onclick = () => {
        const now = firebase.database.ServerValue.TIMESTAMP;
        db.ref(`rooms/${roomId}/status`).set({ step: 'question', qIndex: currentQIndex, startTime: now });
        btnStart.classList.add('hidden');
        btnShowAns.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} Thinking...`;
    };

    // ★正解発表
    btnShowAns.onclick = () => {
        const q = studioQuestions[currentQIndex];
        const correctIdx = q.correctIndex;
        
        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => {
                const val = p.val();
                if(!val.isAlive) return;
                if(val.lastAnswer === correctIdx) {
                    const t = val.lastTime || 99999;
                    p.ref.update({ periodScore: (val.periodScore||0)+1, periodTime: (val.periodTime||0)+t });
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
        if(!confirm("正解者の中で最も遅い1名を脱落させますか？")) return;
        const correctIdx = studioQuestions[currentQIndex].correctIndex;
        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let target = null, maxT = -1;
            snap.forEach(p => {
                const v = p.val();
                if(v.isAlive && v.lastAnswer === correctIdx) {
                    if(v.lastTime > maxT) { maxT = v.lastTime; target = p.key; }
                }
            });
            if(target) {
                db.ref(`rooms/${roomId}/players/${target}`).update({ isAlive: false });
                alert(`脱落執行: ${(maxT/1000).toFixed(2)}秒`);
            } else {
                alert("対象なし");
            }
        });
    };

    // ★次へ
    btnNext.onclick = () => {
        currentQIndex++;
        if(currentQIndex >= studioQuestions.length) {
            alert("ピリオド終了！ランキングを確認してください。");
            btnNext.classList.add('hidden');
            return;
        }
        // 回答リセット
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
                if(v.isAlive) ranking.push({ name: v.name, score: v.periodScore, time: v.periodTime });
            });
            ranking.sort((a,b) => (b.score - a.score) || (a.time - b.time));
            let msg = "🏆 生存者ランキング 🏆\n";
            ranking.slice(0,10).forEach((r,i) => msg += `${i+1}. ${r.name} (${r.score}問/${(r.time/1000).toFixed(2)}s)\n`);
            alert(msg);
        });
    };
}


/* =========================================================
 * 4. PLAYER: 回答者 (変更なし)
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

    myRef.set({ name: name, isAlive: true, periodScore: 0, periodTime: 0, lastAnswer: -1, lastTime: 99999 });

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
            lobby.classList.remove('hidden');
            quizArea.classList.add('hidden');
            waitMsg.classList.add('hidden');
        }
    });
}

document.querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const estimatedTimeTaken = Date.now() - questionStartTime;
        const myAnswerIndex = parseInt(btn.dataset.index);
        document.querySelectorAll('.answer-btn').forEach(b => { b.disabled = true; b.style.opacity = "0.3"; });
        btn.style.opacity = "1";
        btn.style.border = "4px solid white";
        document.getElementById('answer-timer-disp').textContent = `${(estimatedTimeTaken/1000).toFixed(2)}秒`;
        if(myPlayerId && myRoomRef) {
            myRoomRef.child(`players/${myPlayerId}`).update({ lastAnswer: myAnswerIndex, lastTime: estimatedTimeTaken });
        }
    });
});
