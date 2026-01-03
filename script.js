/* =========================================================
 * ALL STAR SYSTEM: Cloud Edition (Multi-Style)
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

/* --- ミリオネア用マネーツリー定義 --- */
const MONEY_TREE = [
    10000, 20000, 30000, 50000, 100000,
    200000, 300000, 500000, 750000, 1000000,
    1500000, 2500000, 5000000, 7500000, 10000000
];

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
    // テーマリセット
    document.body.classList.remove('millionaire-theme');
}

document.querySelectorAll('.back-to-main').forEach(btn => btn.addEventListener('click', () => {
    currentShowId = null;
    showView(views.main);
}));
document.getElementById('main-host-btn').addEventListener('click', () => showView(views.hostLogin));
document.getElementById('main-player-btn').addEventListener('click', () => showView(views.respondent));


/* =========================================================
 * 1. HOST: ログイン & ダッシュボード
 * =======================================================*/
let currentShowId = null;

document.getElementById('host-login-submit-btn').addEventListener('click', () => {
    const input = document.getElementById('show-id-input').value.trim().toUpperCase();
    if(!input) { alert("番組IDを入力してください"); return; }
    if(!/^[A-Z0-9_-]+$/.test(input)) { alert("ID文字種エラー"); return; }
    currentShowId = input;
    enterDashboard();
});

function enterDashboard() {
    showView(views.dashboard);
    document.getElementById('dashboard-show-id').textContent = currentShowId;
    loadSavedSets();
}

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
            const styleName = (item.style === 'millionaire') ? '💰ミリオネア' : '🌈感謝祭';
            const div = document.createElement('div');
            div.className = 'set-item';
            div.innerHTML = `
                <div>
                    <span>${item.title}</span> <span style="font-size:0.8em; background:#ccc; padding:2px 4px; border-radius:3px;">${styleName}</span>
                    <div style="font-size:0.8em; color:#666;">${new Date(item.createdAt).toLocaleDateString()} / 全${item.questions.length}問</div>
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
    createdQuestions = [];
    document.getElementById('q-list').innerHTML = '';
    document.getElementById('q-count').textContent = '0';
    document.getElementById('quiz-set-title').value = '';
    showView(views.creator);
};
document.getElementById('dash-studio-btn').onclick = () => startRoom();
document.getElementById('creator-back-btn').addEventListener('click', () => enterDashboard());


/* =========================================================
 * 2. HOST: 問題作成 (スタイル選択対応)
 * =======================================================*/
let createdQuestions = [];

document.getElementById('add-question-btn').addEventListener('click', () => {
    const qText = document.getElementById('question-text').value.trim();
    const correctIndex = parseInt(document.getElementById('correct-index').value);
    
    const cBlue = document.querySelector('.btn-blue.choice-input').value.trim() || "A";
    const cRed = document.querySelector('.btn-red.choice-input').value.trim() || "B";
    const cGreen = document.querySelector('.btn-green.choice-input').value.trim() || "C";
    const cYellow = document.querySelector('.btn-yellow.choice-input').value.trim() || "D";

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

document.getElementById('save-to-cloud-btn').addEventListener('click', () => {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }
    const title = document.getElementById('quiz-set-title').value.trim() || "無題のセット";
    const style = document.getElementById('quiz-set-style').value; // スタイル取得
    
    db.ref(`saved_sets/${currentShowId}`).push({
        title: title,
        style: style, // スタイル保存
        questions: createdQuestions,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert(`保存しました！\nスタイル: ${style}`);
        enterDashboard();
    }).catch(err => alert("保存エラー: " + err.message));
});


/* =========================================================
 * 3. HOST: スタジオ進行
 * =======================================================*/
let currentRoomId = null;
let currentQIndex = 0;
let studioQuestions = [];
let currentStyle = 'standard'; // ロードしたセットのスタイル

function startRoom() {
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    db.ref(`rooms/${currentRoomId}`).set({
        questions: [],
        status: { step: 'standby', qIndex: 0, style: 'standard' },
        players: {}
    }).then(() => enterHostMode(currentRoomId));
}

function enterHostMode(roomId) {
    showView(views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;
    document.getElementById('studio-show-id').textContent = currentShowId;
    
    const select = document.getElementById('period-select');
    select.innerHTML = '<option value="">読み込み中...</option>';
    db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = '<option value="">-- セットを選択 --</option>';
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                // datasetにstyleやquestionsを埋め込む（簡易実装）
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ q: item.questions, s: item.style || 'standard' });
                opt.textContent = `${item.title} (${item.style === 'millionaire'?'💰':'🌈'})`;
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

    document.getElementById('host-close-studio-btn').onclick = () => {
        if(confirm("スタジオを閉じてダッシュボードに戻りますか？")) enterDashboard();
    };

    const btnLoad = document.getElementById('host-load-period-btn');
    const btnNewPeriod = document.getElementById('host-new-period-btn');
    const btnStart = document.getElementById('host-start-btn');
    const btnShowAns = document.getElementById('host-show-answer-btn');
    const btnEliminate = document.getElementById('host-eliminate-slowest-btn');
    const btnNext = document.getElementById('host-next-btn');
    const btnRanking = document.getElementById('host-ranking-btn');
    const kanpeArea = document.getElementById('host-kanpe-area');

    function updateKanpe() {
        if(studioQuestions.length > currentQIndex) {
            const q = studioQuestions[currentQIndex];
            kanpeArea.classList.remove('hidden');
            document.getElementById('kanpe-question').textContent = `Q${currentQIndex+1}. ${q.q}`;
            
            // 金額表示追加
            let moneyInfo = "";
            if(currentStyle === 'millionaire') {
                const amount = MONEY_TREE[Math.min(currentQIndex, MONEY_TREE.length-1)];
                moneyInfo = ` [¥${amount.toLocaleString()}]`;
            }

            const colors = (currentStyle==='millionaire') ? ["A","B","C","D"] : ["青","赤","緑","黄"];
            document.getElementById('kanpe-answer').textContent = `正解: ${colors[q.correctIndex]}（${q.c[q.correctIndex]}）` + moneyInfo;
        } else {
            kanpeArea.classList.add('hidden');
        }
    }

    // ★ロード実行
    btnLoad.onclick = () => {
        const json = document.getElementById('period-select').value;
        if(!json) return;
        if(studioQuestions.length > 0 && !confirm("問題を読み込み直しますか？")) return;

        const data = JSON.parse(json);
        studioQuestions = data.q;
        currentStyle = data.s; // スタイル更新
        currentQIndex = 0;

        // Firebase更新 (スタイル情報も含める)
        db.ref(`rooms/${roomId}/questions`).set(studioQuestions);
        db.ref(`rooms/${roomId}/status`).update({ 
            step: 'standby', 
            qIndex: 0,
            style: currentStyle 
        });

        alert(`セット完了！\nモード: ${currentStyle==='millionaire'?'ミリオネア':'感謝祭'}`);
        updateKanpe();
        document.getElementById('host-status-area').textContent = "Ready...";
        
        btnStart.classList.add('hidden');
        btnShowAns.classList.add('hidden');
        btnNext.classList.add('hidden');
        btnNewPeriod.classList.remove('hidden');
        document.getElementById('period-load-area').classList.add('hidden');
    };

    btnNewPeriod.onclick = () => {
        if(!studioQuestions.length) return;
        if(!confirm("全員を復活させて開始しますか？")) return;

        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ isAlive: true, periodScore:0, periodTime:0, lastTime:99999 }));
        });
        currentQIndex = 0;
        updateKanpe();

        btnStart.classList.remove('hidden');
        btnNewPeriod.classList.add('hidden');
        document.getElementById('host-status-area').textContent = "スタンバイ...";
    };

    btnStart.onclick = () => {
        const now = firebase.database.ServerValue.TIMESTAMP;
        db.ref(`rooms/${roomId}/status`).update({ step: 'question', qIndex: currentQIndex, startTime: now });
        btnStart.classList.add('hidden');
        btnShowAns.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = `Thinking Time...`;
    };

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
        document.getElementById('host-status-area').textContent = `正解発表`;
    };

    btnEliminate.onclick = () => {
        if(!confirm("最も遅い1名を脱落させますか？")) return;
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
                alert(`脱落: ${(maxT/1000).toFixed(2)}秒`);
            } else { alert("対象なし"); }
        });
    };

    btnNext.onclick = () => {
        currentQIndex++;
        if(currentQIndex >= studioQuestions.length) {
            alert("終了！");
            btnNext.classList.add('hidden');
            document.getElementById('period-load-area').classList.remove('hidden');
            kanpeArea.classList.add('hidden');
            return;
        }
        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ lastAnswer: -1, lastTime: 99999 }));
        });
        updateKanpe();
        btnStart.classList.remove('hidden');
        btnNext.classList.add('hidden');
        btnEliminate.classList.add('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} スタンバイ...`;
    };

    btnRanking.onclick = () => {
        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let ranking = [];
            snap.forEach(p => {
                const v = p.val();
                if(v.isAlive) ranking.push({ name: v.name, score: v.periodScore, time: v.periodTime });
            });
            ranking.sort((a,b) => (b.score - a.score) || (a.time - b.time));
            
            // ★ランキング表示もモードで変える
            let msg = `🏆 ${currentStyle==='millionaire'?'獲得賞金':'正解数'}ランキング 🏆\n`;
            ranking.slice(0,10).forEach((r,i) => {
                let scoreDisp = `${r.score}問`;
                if(currentStyle === 'millionaire') {
                    // 正解数に応じた賞金を表示
                    const money = (r.score > 0) ? MONEY_TREE[Math.min(r.score-1, MONEY_TREE.length-1)] : 0;
                    scoreDisp = `¥${money.toLocaleString()}`;
                }
                msg += `${i+1}. ${r.name} (${scoreDisp} / ${(r.time/1000).toFixed(2)}s)\n`;
            });
            alert(msg);
        });
    };
}


/* =========================================================
 * 4. PLAYER: 回答者 (スタイル自動切替)
 * =======================================================*/
let myPlayerId = null;
let myRoomRef = null;
let questionStartTime = 0;

document.getElementById('join-room-btn').addEventListener('click', () => {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    const name = document.getElementById('player-name-input').value.trim() || "名無し";
    if(!code) return;
    db.ref(`rooms/${code}`).once('value', snap => {
        if(snap.exists()) joinGame(code, name);
        else alert('部屋が見つかりません');
    });
});

function joinGame(roomId, name) {
    showView(views.playerGame);
    document.getElementById('player-name-disp').textContent = name;
    myRoomRef = db.ref(`rooms/${roomId}`);
    const myRef = myRoomRef.child('players').push();
    myPlayerId = myRef.key;
    myRef.set({ name: name, isAlive: true, periodScore: 0, periodTime: 0, lastAnswer: -1, lastTime: 99999 });

    // 生存監視
    myRef.on('value', snap => {
        const val = snap.val();
        if(!val) return;
        const badge = document.getElementById('alive-badge');
        const overlay = document.getElementById('player-dead-overlay');
        const score = val.periodScore || 0;
        
        // 金額更新
        const moneyEl = document.getElementById('current-money-value');
        if(score > 0) {
            const money = MONEY_TREE[Math.min(score-1, MONEY_TREE.length-1)];
            moneyEl.textContent = `¥${money.toLocaleString()}`;
        } else {
            moneyEl.textContent = "¥0";
        }

        if(val.isAlive) {
            badge.textContent = "ALIVE";
            badge.style.background = "#00ff00";
            overlay.classList.add('hidden');
        } else {
            badge.textContent = "DROP OUT";
            badge.style.background = "#555";
            overlay.classList.remove('hidden');
        }
    });

    // ステータス・スタイル監視
    db.ref(`rooms/${roomId}/status`).on('value', snap => {
        const st = snap.val();
        if(!st) return;

        // ★スタイル適用
        const style = st.style || 'standard';
        if(style === 'millionaire') {
            document.body.classList.add('millionaire-theme');
            document.getElementById('millionaire-money-disp').classList.remove('hidden');
        } else {
            document.body.classList.remove('millionaire-theme');
            document.getElementById('millionaire-money-disp').classList.add('hidden');
        }

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
                    btn.style.border = (style==='millionaire') ? "2px solid #ffd700" : "none";
                    
                    // ミリオネアのときはABCD表記に変えるなどの処理はCSSで対応済み
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
        if(document.body.classList.contains('millionaire-theme')) {
            btn.style.border = "4px solid white";
        }
        document.getElementById('answer-timer-disp').textContent = `${(estimatedTimeTaken/1000).toFixed(2)}秒`;
        if(myPlayerId && myRoomRef) {
            myRoomRef.child(`players/${myPlayerId}`).update({ lastAnswer: myAnswerIndex, lastTime: estimatedTimeTaken });
        }
    });
});
