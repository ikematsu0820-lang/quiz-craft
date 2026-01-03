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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

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
    Object.values(views).forEach(v => v.classList.add('hidden'));
    target.classList.remove('hidden');
    // 作成画面を開いたときだけ履歴を再読み込み
    if(target === views.creator) {
        renderHistoryList();
    }
}

document.querySelectorAll('.back-to-main').forEach(btn => {
    btn.addEventListener('click', () => showView(views.main));
});

document.getElementById('show-creator-btn').addEventListener('click', () => showView(views.creator));
document.getElementById('show-respondent-btn').addEventListener('click', () => showView(views.respondent));

/* =========================================================
 * SECTION: 出題者（作成＆履歴管理）
 * =======================================================*/
let createdQuestions = [];

// 問題リストの表示更新
function updateQuestionListDisplay() {
    const list = document.getElementById('q-list');
    list.innerHTML = '';
    createdQuestions.forEach((q, i) => {
        const li = document.createElement('li');
        li.textContent = `Q${i+1}. ${q.q} (正解: ${q.correct || q.c[0]})`;
        li.style.borderBottom = '1px solid #eee';
        li.style.padding = '5px';
        list.appendChild(li);
    });
    document.getElementById('q-count').textContent = createdQuestions.length;
}

// 問題追加ボタン
document.getElementById('add-question-btn').addEventListener('click', () => {
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

    // フォームリセット
    document.getElementById('question-text').value = '';
    choiceInputs.forEach(inp => inp.value = '');
    document.getElementById('question-text').focus();
});

// ★★★ 履歴管理ロジック ★★★

// 履歴データを保存（Local Storage）
function saveToHistory(title, questions) {
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    history.unshift({
        title: title || '無題のセット',
        questions: questions,
        date: new Date().toLocaleString()
    });
    // 最大20件まで保存
    if(history.length > 20) history.pop();
    localStorage.setItem('quiz_history', JSON.stringify(history));
}

// 履歴リストの表示
function renderHistoryList() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    // 1. 新しい履歴（オンライン版で作ったもの）
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    
    // 2. 古い履歴（オフライン版の遺産）も探してみる
    const oldQuizzes = JSON.parse(localStorage.getItem('quizzes') || '{}');
    const oldKeys = Object.keys(oldQuizzes);
    
    // 表示用配列にマージ
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
        div.style.cssText = "border:1px solid #ddd; padding:10px; background:#fff; border-radius:5px; cursor:pointer; transition:0.2s;";
        div.onmouseover = () => div.style.background = '#f9f9f9';
        div.onmouseout = () => div.style.background = '#fff';
        
        const qNum = item.questions ? item.questions.length : 0;
        div.innerHTML = `
            <div style="font-weight:bold; color:#0056b3;">${item.title}</div>
            <div style="font-size:0.8em; color:#666;">${item.date} / 全${qNum}問</div>
        `;
        
        // クリックで読み込み
        div.onclick = () => {
            if(!confirm(`「${item.title}」の内容を読み込みますか？\n（現在作成中の内容は上書きされます）`)) return;
            
            // データの形式を揃えて読み込み
            if(item.questions) {
                // 古い形式データのコンバートも兼ねる
                createdQuestions = item.questions.map(q => ({
                    q: q.q || q.questionText,
                    c: q.c || q.choices,
                    correct: q.correct || (q.c ? q.c[0] : (q.choices ? q.choices[0] : ''))
                }));
                
                document.getElementById('quiz-set-title').value = item.title;
                updateQuestionListDisplay();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                alert('読み込みました！編集して新しい部屋を作成できます。');
            }
        };
        list.appendChild(div);
    });
}

// 部屋作成ボタン（保存＆開始）
let currentRoomId = null;
let currentQuestionIndex = 0;

document.getElementById('save-room-btn').addEventListener('click', () => {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }

    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const title = document.getElementById('quiz-set-title').value || '無題のクイズ';

    // ★ここで履歴に保存！
    saveToHistory(title, createdQuestions);

    // Firebaseに部屋作成
    db.ref('rooms/' + currentRoomId).set({
        info: { title: title, hostActive: true },
        questions: createdQuestions,
        status: { step: 'lobby', qIndex: 0 },
        players: {}
    }).then(() => {
        enterHostMode(currentRoomId);
    });
});

/* =========================================================
 * SECTION: 出題者（ロビー＆進行パート）
 * =======================================================*/
function enterHostMode(roomId) {
    showView(views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;

    // 参加人数の監視
    db.ref(`rooms/${roomId}/players`).on('value', snapshot => {
        const count = snapshot.numChildren();
        document.getElementById('host-player-count').textContent = count;
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
    db.ref(`rooms/${currentRoomId}/status`).set({
        step: step,
        qIndex: qIndex,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

/* =========================================================
 * SECTION: 回答者（プレイヤーパート）
 * =======================================================*/
let myPlayerId = null;
let currentScore = 0;
let playerRoomRef = null;

document.getElementById('join-room-btn').addEventListener('click', () => {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    const name = document.getElementById('player-name-input').value.trim() || '名無し';
    
    if(!code) return;

    db.ref('rooms/' + code).once('value', snapshot => {
        if(snapshot.exists()) {
            joinRoomAsPlayer(code, name);
        } else {
            alert('部屋が見つかりません');
        }
    });
});

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

        if(status.step === 'lobby') {
            document.getElementById('player-lobby-msg').classList.remove('hidden');
            document.getElementById('player-quiz-area').classList.add('hidden');
        } 
        else if(status.step === 'question') {
            document.getElementById('player-lobby-msg').classList.add('hidden');
            document.getElementById('player-quiz-area').classList.remove('hidden');
            document.getElementById('player-wait-msg').classList.add('hidden');
            
            playerRoomRef.child('questions/' + status.qIndex).once('value', qSnap => {
                const qData = qSnap.val();
                renderPlayerQuestion(qData, status.qIndex);
            });
        }
        else if(status.step === 'answer') {
            document.getElementById('player-wait-msg').classList.add('hidden');
            alert('出題者が正解を表示しました！');
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