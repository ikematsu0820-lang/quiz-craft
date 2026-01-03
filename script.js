/* =========================================================
 * ALL STAR SYSTEM: Cloud Edition (Stable V1)
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
    createdQuestions = [];
    document.getElementById('q-list').innerHTML = '';
    document.getElementById('q-count').textContent = '0';
    document.getElementById('quiz-set-title').value = '';
    showView(views.creator);
};
document.getElementById('dash-studio-btn').onclick = () => startRoom();
document.getElementById('creator-back-btn').addEventListener('click', () => enterDashboard());


/* =========================================================
 * 2. HOST: 問題作成
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

document.getElementById('save-to-cloud-btn').addEventListener('click', () => {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }
    const title = document.getElementById('quiz-set-title').value.trim() || "無題のセット";
    
    db.ref(`saved_sets/${currentShowId}`).push({
        title: title,
        questions: createdQuestions,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert(`クラウドに保存しました！\nダッシュボードに戻ります。`);
        enterDashboard();
    }).catch(err => alert("保存エラー: " + err.message));
});


/* =========================================================
 * 3. HOST: スタジオ進行
 * =======================================================*/
let currentRoomId = null;
let currentQIndex = 0;
let studioQuestions = [];

function startRoom() {
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    db.ref(`rooms/${currentRoomId}`).set({
        questions: [],
        status: { step: 'standby', qIndex: 0 },
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
                const opt = document.createElement('option');
                opt.value = JSON.stringify(item.questions);
                opt.textContent = item.title;
                select.appendChild(opt);
            });
        }
    });

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
            const colors = ["青","赤","緑","黄"];
            document.getElementById('kanpe-answer').textContent = `正解: ${colors
