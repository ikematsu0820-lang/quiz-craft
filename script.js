/* =========================================================
 * ALL STAR SYSTEM: Custom Config Edition
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

/* --- 通貨レート定義 (15段階) --- */
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
    document.body.classList.remove('dark-theme');
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
            const div = document.createElement('div');
            div.className = 'set-item';
            div.innerHTML = `
                <div>
                    <span>${item.title}</span> 
                    <div style="font-size:0.8em; color:#666;">
                        ${new Date(item.createdAt).toLocaleDateString()} / 全${item.questions.length}問<br>
                        [脱落:${item.config.penalty}] [単位:${item.config.scoreUnit}]
                    </div>
                </div>
            `;
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = '削除';
            delBtn.onclick = () => {
                if(confirm(`削除しますか？`)) {
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
 * 2. HOST: 問題作成 (カスタム設定保存)
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
    
    // ★設定値の取得
    const config = {
        penalty: document.getElementById('config-penalty').value, // none / immediate
        scoreUnit: document.getElementById('config-score-unit').value, // point / currency
        theme: document.getElementById('config-theme').value // light / dark
    };

    db.ref(`saved_sets/${currentShowId}`).push({
        title: title,
        config: config, // 設定を保存
        questions: createdQuestions,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert(`保存しました！`);
        enterDashboard();
    }).catch(err => alert("保存エラー: " + err.message));
});


/* =========================================================
 * 3. HOST: スタジオ進行
 * =======================================================*/
let currentRoomId = null;
let currentQIndex = 0;
let studioQuestions = [];
let currentConfig = { penalty: 'none', scoreUnit: 'point', theme: 'light' }; // 初期値

function startRoom() {
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    db.ref(`rooms/${currentRoomId}`).set({
        questions: [],
        status: { step: 'standby', qIndex: 0 },
        config: currentConfig,
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
                // 設定と問題を埋め込む
                const payload = { q: item.questions, c: item.config || currentConfig };
                const opt = document.createElement('option');
                opt.value = JSON.stringify(payload);
                opt.textContent = `${item.title}`;
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
            
            let extraInfo = "";
            if(currentConfig.scoreUnit === 'currency') {
                const amount = MONEY_TREE[Math.min(currentQIndex, MONEY_TREE.length-1)];
                extraInfo = ` [¥${amount.toLocaleString()}]`;
            }
            const colors = (currentConfig.theme === 'dark') ? ["A","B","C","D"] : ["青","赤","緑","黄"];
            document.getElementById('kanpe-answer').textContent = `正解: ${colors[q.correctIndex]}（${q.c[q.correctIndex]}）` + extraInfo;
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
        currentConfig = data.c; // 設定更新
        currentQIndex = 0;

        // Firebase更新 (設定も同期)
        db.ref(`rooms/${roomId}/questions`).set(studioQuestions);
        db.ref(`rooms/${roomId}/config`).set(currentConfig);
        db.ref(`rooms/${roomId}/status`).update({ step: 'standby', qIndex: 0 });

        alert(`セット完了！\nモード: ${currentConfig.theme==='dark'?'ダーク':'ライト'}\n脱落: ${currentConfig.penalty==='immediate'?'即死':'なし'}`);
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
                    // ★設定による脱落判定
                    if(currentConfig.penalty === 'immediate') {
                        p.ref.update({ isAlive: false });
                    }
                    // 'none'の場合は何もしない（継続）
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
            
            let msg = `🏆 ランキング 🏆\n`;
            ranking.slice(0,10).forEach((r,i) => {
                const scoreDisp = calculateScoreDisplay(r.score, currentConfig.scoreUnit);
                msg += `${i+1}. ${r.name} (${scoreDisp} / ${(r.time/1000).toFixed(2)}s)\n`;
            });
            alert(msg);
        });
    };
}


/* =========================================================
 * 4. PLAYER: 回答者
 * =======================================================*/
let myPlayerId = null;
let myRoomRef = null;
let questionStartTime = 0;

// スコア表示ヘルパー
function calculateScoreDisplay(score, unit) {
    if(unit === 'currency') {
        if(score <= 0) return "¥0";
        const money = MONEY_TREE[Math.min(score-1, MONEY_TREE.length-1)];
        return `¥${money.toLocaleString()}`;
    } else {
        return `${score}問`;
    }
}

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
