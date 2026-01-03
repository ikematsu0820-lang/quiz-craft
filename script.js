/* =========================================================
 * 🛠️ 診断モード付き script.js
 * =======================================================*/

// エラーが起きたらスマホ画面に表示するおまじない
window.onerror = function(msg, url, line) {
    alert("⚠️ エラー発生！\n" + msg + "\n行: " + line);
};

// 読み込み確認
alert("プログラムを読み込みました！\nボタンを押してみてください。");

/* =========================================================
 * SECTION: Firebase設定
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

// Firebaseチェック
if (typeof firebase === 'undefined') {
    alert("❌ エラー：Firebaseが読み込まれていません。\n通信環境が良い場所でリロードしてください。");
} else {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}

let db;
try {
    db = firebase.database();
} catch (e) {
    alert("❌ データベースエラー: " + e.message);
}

/* =========================================================
 * SECTION: 画面遷移管理
 * =======================================================*/
const views = {
    main: document.getElementById('main-view'),
    creator: document.getElementById('creator-view'),
    hostControl: document.getElementById('host-control-view'),
    respondent: document.getElementById('respondent-view'),
    playerGame: document.getElementById('player-game-view')
};

function showView(target) {
    if(!target) {
        alert("❌ エラー：移動先の画面が見つかりません");
        return;
    }
    Object.values(views).forEach(v => {
        if(v) v.classList.add('hidden');
    });
    target.classList.remove('hidden');
    
    if(target === views.creator) {
        renderHistoryList();
    }
}

// 戻るボタン
document.querySelectorAll('.back-to-main').forEach(btn => {
    btn.addEventListener('click', () => showView(views.main));
});

// ★★★ ここを診断 ★★★
const showCreatorBtn = document.getElementById('show-creator-btn');
if(showCreatorBtn) {
    showCreatorBtn.addEventListener('click', () => showView(views.creator));
} else {
    alert("⚠️ 出題者ボタンが見つかりません");
}

const showRespondentBtn = document.getElementById('show-respondent-btn');
if(showRespondentBtn) {
    showRespondentBtn.addEventListener('click', () => {
        // ボタンが押されたら反応するかチェック
        // alert("ボタンが押されました！部屋入力画面へ移動します。"); 
        showView(views.respondent);
    });
} else {
    alert("⚠️ 部屋に入るボタンが見つかりません");
}

/* =========================================================
 * SECTION: 出題者（作成＆履歴管理）
 * =======================================================*/
let createdQuestions = [];

function updateQuestionListDisplay() {
    const list = document.getElementById('q-list');
    if(!list) return;
    list.innerHTML = '';
    createdQuestions.forEach((q, i) => {
        const li = document.createElement('li');
        li.textContent = `Q${i+1}. ${q.q} (正解: ${q.correct || q.c[0]})`;
        li.style.borderBottom = '1px solid #eee';
        li.style.padding = '5px';
        list.appendChild(li);
    });
    const countSpan = document.getElementById('q-count');
    if(countSpan) countSpan.textContent = createdQuestions.length;
}

const addQBtn = document.getElementById('add-question-btn');
if(addQBtn) {
    addQBtn.addEventListener('click', () => {
        const qText = document.getElementById('question-text').value.trim();
        const choiceInputs = document.querySelectorAll('.choice-input');
        let choices = [];
        choiceInputs.forEach(inp => { if(inp.value.trim()) choices.push(inp.value.trim()); });

        if(!qText || choices.length < 2) {
            alert('問題文と、少なくとも2つの選択肢を入力してください');
            return;
        }

        const correctText = choices[0];
        createdQuestions.push({
            q: qText,
            c: choices,
            correct: correctText
        });

        updateQuestionListDisplay();

        document.getElementById('question-text').value = '';
        choiceInputs.forEach(inp => inp.value = '');
        document.getElementById('question-text').focus();
    });
}

// 履歴管理
function saveToHistory(title, questions) {
    try {
        const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
        history.unshift({
            title: title || '無題のセット',
            questions: questions,
            date: new Date().toLocaleString()
        });
        if(history.length > 20) history.pop();
        localStorage.setItem('quiz_history', JSON.stringify(history));
    } catch(e) { console.error(e); }
}

function renderHistoryList() {
    const list = document.getElementById('history-list');
    if(!list) return;
    list.innerHTML = '';

    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    const oldQuizzes = JSON.parse(localStorage.getItem('quizzes') || '{}');
    const oldKeys = Object.keys(oldQuizzes);
    
    let allItems = [];
    history.forEach(h => allItems.push({ type: 'new', ...h }));
    oldKeys.forEach(k => {
        const d = oldQuizzes[k];
        allItems.push({
            type: 'old',
            title: d.title || `過去の部屋(${k})`,
            questions: d.questions || [],
            date: '以前のバージョン'
        });
    });

    if(allItems.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#999;">履歴はありません</p>';
        return;
    }

    allItems.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = "border:1px solid #ddd; padding:10px; background:#fff; border-radius:5px; cursor:pointer; margin-bottom:5px;";
        div.innerHTML = `<div style="font-weight:bold; color:#0056b3;">${item.title}</div><div style="font-size:0.8em; color:#666;">${item.date} / 全${item.questions ? item.questions.length : 0}問</div>`;
        div.onclick = () => {
            if(!confirm(`「${item.title}」を読み込みますか？`)) return;
            if(item.questions) {
                createdQuestions = item.questions.map(q => ({
                    q: q.q || q.questionText,
                    c: q.c || q.choices,
                    correct: q.correct || (q.c ? q.c[0] : (q.choices ? q.choices[0] : ''))
                }));
                const titleInput = document.getElementById('quiz-set-title');
                if(titleInput) titleInput.value = item.title;
                updateQuestionListDisplay();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        list.appendChild(div);
    });
}

// 部屋作成
const saveRoomBtn = document.getElementById('save-room-btn');
if(saveRoomBtn) {
    saveRoomBtn.addEventListener('click', () => {
        if(createdQuestions.length === 0) { alert('問題がありません'); return; }

        const currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const titleInput = document.getElementById('quiz-set-title');
        const title = (titleInput ? titleInput.value : '') || '無題のクイズ';

        saveToHistory(title, createdQuestions);

        if(!db) { alert('データベース接続エラー'); return; }

        db.ref('rooms/' + currentRoomId).set({
            info: { title: title, hostActive: true },
            questions: createdQuestions,
            status: { step: 'lobby', qIndex: 0 },
            players: {}
        }).then(() => {
            enterHostMode(currentRoomId);
        });
    });
}

/* =========================================================
 * SECTION: 出題者進行＆回答者ロジック
 * =======================================================*/
let currentRoomId = null;
let currentQuestionIndex = 0;

function enterHostMode(roomId) {
    currentRoomId = roomId;
    showView(views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;

    db.ref(`rooms/${roomId}/players`).on('value', snapshot => {
        document.getElementById('host-player-count').textContent = snapshot.numChildren();
    });

    const startBtn = document.getElementById('host-start-btn');
    const nextBtn = document.getElementById('host-next-btn');
    const ansBtn = document.getElementById('host-show-answer-btn');
    const endBtn = document.getElementById('host-end-btn');

    startBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
    ansBtn.classList.add('hidden');
    endBtn.classList.add('hidden');

    startBtn.onclick = () => {
        currentQuestionIndex = 0;
        updateRoomStatus('question', 0);
        startBtn.classList.add('hidden');
        ansBtn.classList.remove('hidden');
        document.getElementById('host-status-area').innerHTML = `<h3>Q1 出題中...</h3>`;
    };

    ansBtn.onclick = () => {
        updateRoomStatus('answer', currentQuestionIndex);
        ansBtn.classList.add('hidden');
        if(currentQuestionIndex < createdQuestions.length - 1) {
            nextBtn.classList.remove('hidden');
        } else {
            endBtn.classList.remove('hidden');
        }
        document.getElementById('host-status-area').innerHTML = `<h3>答え合わせ中</h3>`;
    };

    nextBtn.onclick = () => {
        currentQuestionIndex++;
        updateRoomStatus('question', currentQuestionIndex);
        nextBtn.classList.add('hidden');
        ansBtn.classList.remove('hidden');
        document.getElementById('host-status-area').innerHTML = `<h3>Q${currentQuestionIndex+1} 出題中...</h3>`;
    };
    
    endBtn.onclick = () => {
        if(confirm('終了しますか？')) showView(views.main);
    }
}

function updateRoomStatus(step, qIndex) {
    if(!db) return;
    db.ref(`rooms/${currentRoomId}/status`).set({
        step: step,
        qIndex: qIndex,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

let myPlayerId = null;
let currentScore = 0;
let playerRoomRef = null;

const joinRoomBtn = document.getElementById('join-room-btn');
if(joinRoomBtn) {
    joinRoomBtn.addEventListener('click', () => {
        const codeInput = document.getElementById('room-code-input');
        const nameInput = document.getElementById('player-name-input');
        const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
        const name = (nameInput ? nameInput.value.trim() : '') || '名無し';
        
        if(!code) { alert('部屋コードを入力してください'); return; }
        if(!db) { alert('データベースに接続できていません'); return; }

        db.ref('rooms/' + code).once('value', snapshot => {
            if(snapshot.exists()) {
                joinRoomAsPlayer(code, name);
            } else {
                alert('部屋が見つかりません');
            }
        });
    });
}

function joinRoomAsPlayer(roomId, name) {
    showView(views.playerGame);
    currentScore = 0;
    document.getElementById('player-score').textContent = 0;
    document.getElementById('player-name-disp').textContent = name;

    playerRoomRef = db.ref(`rooms/${roomId}`);
    const newPlayerRef = playerRoomRef.child('players').push();
    myPlayerId = newPlayerRef.key;
    newPlayerRef.set({ name: name, score: 0 });

    playerRoomRef.child('status').on('value', snapshot => {
        const status = snapshot.val();
        if(!status) return;

        const lobbyMsg = document.getElementById('player-lobby-msg');
        const quizArea = document.getElementById('player-quiz-area');
        const waitMsg = document.getElementById('player-wait-msg');

        if(status.step === 'lobby') {
            lobbyMsg.classList.remove('hidden');
            quizArea.classList.add('hidden');
        } 
        else if(status.step === 'question') {
            lobbyMsg.classList.add('hidden');
            quizArea.classList.remove('hidden');
            waitMsg.classList.add('hidden');
            
            playerRoomRef.child('questions/' + status.qIndex).once('value', qSnap => {
                const qData = qSnap.val();
                renderPlayerQuestion(qData, status.qIndex);
            });
        }
        else if(status.step === 'answer') {
            waitMsg.classList.add('hidden');
        }
    });
}

function renderPlayerQuestion(qData, index) {
    document.getElementById('question-number').textContent = `Q${index + 1}`;
    document.getElementById('question-text-disp').textContent = qData.q;
    
    const area = document.getElementById('player-choices-area');
    area.innerHTML = '';
    const shuffled = [...qData.c].sort(() => Math.random() - 0.5);

    shuffled.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'btn-block';
        btn.style.cssText = "margin-bottom:10px; padding:15px; background:white; border:1px solid #ccc; color:#333;";
        btn.textContent = choice;
        
        btn.onclick = () => {
            if(choice === qData.correct) {
                currentScore += 10;
                document.getElementById('player-score').textContent = currentScore;
                alert('⭕ 正解！');
            } else {
                alert('❌ 残念...');
            }
            area.innerHTML = '<p style="text-align:center; color:#888;">回答済み</p>';
            document.getElementById('player-wait-msg').classList.remove('hidden');
            if(myPlayerId) {
                playerRoomRef.child(`players/${myPlayerId}/score`).set(currentScore);
            }
        };
        area.appendChild(btn);
    });
}
