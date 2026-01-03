/* =========================================================
 * SECTION: Firebase設定 (オンライン化の心臓部)
 * =======================================================*/

// あなた専用の「鍵」を設定します
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

// Firebaseを初期化（使えるようにする）
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
// データベースを使う準備
const db = firebase.database();


/* =========================================================
 * SECTION 5-1: 画面切り替えと共通ユーティリティ
 * =======================================================*/

const views = {
    main: document.getElementById('main-view'),
    creator: document.getElementById('creator-view'),
    respondent: document.getElementById('respondent-view'),
    quizDisplay: document.getElementById('quiz-display-view')
};

function showView(viewToShow) {
    Object.values(views).forEach(view => view.classList.add('hidden'));
    viewToShow.classList.remove('hidden');

    const roomStatus = document.getElementById('room-status-message');
    const resultMsg    = document.getElementById('result-message');
    const creatorMsg  = document.getElementById('creator-status-message');
    const timerDisp    = document.getElementById('timer-display');
    if (roomStatus) roomStatus.textContent = '';
    if (resultMsg)  resultMsg.innerHTML  = '';
    if (creatorMsg) creatorMsg.textContent = '';
    if (timerDisp)  timerDisp.textContent = '';
}

showView(views.main);

document.getElementById('show-creator-btn').addEventListener('click', () => showView(views.creator));
document.getElementById('show-respondent-btn').addEventListener('click', () => showView(views.respondent));
document.getElementById('back-to-main-from-creator').addEventListener('click', () => showView(views.main));
document.getElementById('back-to-main-from-respondent').addEventListener('click', () => showView(views.main));
document.getElementById('new-quiz-btn').addEventListener('click', () => showView(views.main));

function generateRoomId() {
    // ランダムな6桁の英数字を生成
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}


/* =========================================================
 * SECTION 5-3: 出題者ロジック（問題作成・Firebaseへ保存）
 * =======================================================*/

const quizForm             = document.getElementById('quiz-form');
const tempQuestionsList    = document.getElementById('temp-questions-list');
const tempCountSpan        = document.getElementById('temp-count');
const saveSetBtn           = document.getElementById('save-set-btn');
const creatorStatusMessage = document.getElementById('creator-status-message');
const quizSetTitleInput    = document.getElementById('quiz-set-title');

// フォーム関連
const questionTypeSelect   = document.getElementById('question-type');
const choiceEditor         = document.getElementById('type-choice-editor');
const orderEditor          = document.getElementById('type-order-editor');
const textEditor           = document.getElementById('type-text-editor');

const choicesArea          = document.getElementById('choices-area');
const addChoiceBtn         = document.getElementById('add-choice-btn');
const removeChoiceBtn      = document.getElementById('remove-choice-btn');
const orderItemsArea       = document.getElementById('order-items-area');
const addOrderItemBtn      = document.getElementById('add-order-item-btn');
const removeOrderItemBtn   = document.getElementById('remove-order-item-btn');

const MIN_CHOICES = 2;
const MAX_CHOICES = 10;
const DEFAULT_POINTS = 10;

let tempQuestions = [];

// 画面表示切替
if (questionTypeSelect) {
    questionTypeSelect.addEventListener('change', () => {
        const type = questionTypeSelect.value;
        choiceEditor.style.display = (type === 'choice') ? 'block' : 'none';
        orderEditor.style.display  = (type === 'order')  ? 'block' : 'none';
        textEditor.style.display   = (type === 'text')   ? 'block' : 'none';
    });
}

// 選択肢の追加削除ロジック
function getChoiceContainers() { return choicesArea.querySelectorAll('.choice-container'); }
function createChoiceRow(placeholderText = '選択肢') {
    const div = document.createElement('div');
    div.className = 'choice-container';
    div.style.marginBottom = '5px';
    div.innerHTML = `<input type="checkbox" class="correct-flag"> <input type="text" class="choice-input" placeholder="${placeholderText}" style="width:75%;">`;
    choicesArea.appendChild(div);
}
if (addChoiceBtn) addChoiceBtn.addEventListener('click', () => { if(getChoiceContainers().length < MAX_CHOICES) createChoiceRow(); });
if (removeChoiceBtn) removeChoiceBtn.addEventListener('click', () => { const c = getChoiceContainers(); if(c.length > MIN_CHOICES) choicesArea.removeChild(c[c.length-1]); });

function getOrderItemContainers() { return orderItemsArea.querySelectorAll('.choice-container'); }
function createOrderItemRow() {
    const div = document.createElement('div');
    div.className = 'choice-container';
    div.style.marginBottom = '5px';
    div.innerHTML = `<span>.</span> <input type="text" class="order-item-input" style="width:80%;">`;
    orderItemsArea.appendChild(div);
    renumberOrderLabels();
}
function renumberOrderLabels() {
    getOrderItemContainers().forEach((div, idx) => { div.querySelector('span').textContent = `${idx + 1}.`; });
}
if (addOrderItemBtn) addOrderItemBtn.addEventListener('click', () => { if(getOrderItemContainers().length < MAX_CHOICES) createOrderItemRow(); });
if (removeOrderItemBtn) removeOrderItemBtn.addEventListener('click', () => { const c = getOrderItemContainers(); if(c.length > MIN_CHOICES) { orderItemsArea.removeChild(c[c.length-1]); renumberOrderLabels(); } });


// 問題追加ボタン
if (quizForm) {
    quizForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = questionTypeSelect.value;
        const qText = document.getElementById('question').value.trim();
        const imgUrl = document.getElementById('question-image-url').value.trim();
        const timeLimit = Number(document.getElementById('time-limit').value) || 0;
        const explanation = document.getElementById('question-explanation').value.trim();
        let points = Number(document.getElementById('question-points').value);
        if (!points || points <= 0) points = DEFAULT_POINTS;

        if (!qText) { alert('問題文を入力してください'); return; }

        let newQ = null;

        if (type === 'choice') {
            const inputs = document.querySelectorAll('#creator-view .choice-input');
            const flags = document.querySelectorAll('#creator-view .correct-flag');
            const choices = [];
            const correctIndexes = [];
            inputs.forEach((inp, idx) => {
                const val = inp.value.trim();
                if(val) {
                    choices.push(val);
                    if(flags[idx].checked) correctIndexes.push(choices.length - 1);
                }
            });
            if(choices.length < 2) { alert('選択肢が足りません'); return; }
            if(correctIndexes.length === 0) { alert('正解を選んでください'); return; }
            newQ = { type, mode: correctIndexes.length > 1 ? 'multi' : 'single', q: qText, c: choices, correctIndexes, explanation, timeLimitSec: timeLimit, imageUrl: imgUrl, points };

        } else if (type === 'order') {
            const inputs = document.querySelectorAll('#creator-view .order-item-input');
            const items = [];
            inputs.forEach(inp => { if(inp.value.trim()) items.push(inp.value.trim()); });
            if(items.length < 2) { alert('要素が足りません'); return; }
            newQ = { type, q: qText, items, explanation, timeLimitSec: timeLimit, imageUrl: imgUrl, points };

        } else if (type === 'text') {
            const raw = document.getElementById('text-answers-input').value;
            const answers = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
            if(answers.length === 0) { alert('正解パターンを入力してください'); return; }
            newQ = { type, q: qText, answers, matchMode:'loose', explanation, timeLimitSec: timeLimit, imageUrl: imgUrl, points };
        }

        tempQuestions.push(newQ);
        updateTempList();
        quizForm.reset();
        document.getElementById('question').focus();
    });
}

function updateTempList() {
    tempCountSpan.textContent = tempQuestions.length;
    if (tempQuestions.length === 0) {
        tempQuestionsList.innerHTML = '<li style="color:#999; padding:10px;">まだ問題が追加されていません</li>';
        return;
    }
    tempQuestionsList.innerHTML = tempQuestions.map((q, i) =>
        `<li style="margin-bottom:5px; padding:5px; border-bottom:1px solid #eee;">Q${i+1}. [${q.type}] ${q.q}</li>`
    ).join('');
}

// ★★★ ここが重要：Firebaseへ保存 ★★★
if (saveSetBtn) {
    saveSetBtn.addEventListener('click', () => {
        if (tempQuestions.length === 0) {
            alert('問題がありません');
            return;
        }

        const roomId = generateRoomId(); // 新しい部屋コード発行
        const title = quizSetTitleInput.value.trim() || '無題のクイズ';

        // Firebaseの 'rooms/部屋コード' にデータを書き込む
        db.ref('rooms/' + roomId).set({
            title: title,
            questions: tempQuestions,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            creatorStatusMessage.innerHTML = `
                <div style="font-size:1.2em; color:green;">保存完了！</div>
                <div>部屋コード: <strong style="font-size:1.5em; color:red;">${roomId}</strong></div>
                <div style="font-size:0.9em; color:#555;">このコードを回答者に教えてください</div>
            `;
            // 入力リセット
            tempQuestions = [];
            updateTempList();
            quizSetTitleInput.value = '';
        })
        .catch((error) => {
            console.error(error);
            alert('保存に失敗しました: ' + error.message);
        });
    });
}


/* =========================================================
 * SECTION 5-4: 回答者ロジック（Firebaseからデータ取得）
 * =======================================================*/

const joinRoomBtn       = document.getElementById('join-room-btn');
const roomCodeInput     = document.getElementById('room-code-input');
const roomStatusMessage = document.getElementById('room-status-message');

if (joinRoomBtn) joinRoomBtn.addEventListener('click', executeJoin);

function executeJoin() {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!code) { alert('部屋コードを入力してください'); return; }

    // Firebaseの 'rooms/コード' を見に行く
    roomStatusMessage.textContent = '通信中...';

    db.ref('rooms/' + code).once('value')
    .then((snapshot) => {
        if (snapshot.exists()) {
            // データがあった！
            const data = snapshot.val();
            roomStatusMessage.textContent = '';
            alert(`「${data.title}」に参加します！`);
            startQuiz(data); // クイズを開始
            showView(views.quizDisplay);
        } else {
            // データがなかった
            roomStatusMessage.textContent = '❌ そのコードの部屋は見つかりません';
        }
    })
    .catch((error) => {
        console.error(error);
        roomStatusMessage.textContent = 'エラーが発生しました';
    });
}


/* =========================================================
 * SECTION 5-5: クイズ進行・採点ロジック (変更なし)
 * =======================================================*/

let currentQuizSet = [];
let currentQuestionIndex = 0;
let correctCount = 0;
let score = 0;
let timerId = null;
let remainingSec = 0;
let currentOrderState = [];

function startQuiz(quizData) {
    if(!quizData.questions) return;
    currentQuizSet = quizData.questions;
    currentQuestionIndex = 0;
    correctCount = 0;
    score = 0;
    showQuestion();
}

function showQuestion() {
    const q = currentQuizSet[currentQuestionIndex];
    const content = document.getElementById('quiz-content');
    document.getElementById('result-message').innerHTML = '';
    document.getElementById('timer-display').textContent = '';
    clearInterval(timerId);

    // 問題表示（簡易版）
    if(q.type === 'choice') {
        let btns = q.c.map((c,i) => `<button onclick="handleAnswer(${i})" class="btn-block" style="margin:5px 0; background:white; border:1px solid #ccc; padding:10px;">${i+1}. ${c}</button>`).join('');
        content.innerHTML = `<h3>Q${currentQuestionIndex+1}. ${q.q}</h3>${q.imageUrl ? `<img src="${q.imageUrl}" style="max-width:100%">` : ''}<div>${btns}</div>`;
    } else {
        content.innerHTML = `<h3>Q${currentQuestionIndex+1}. ${q.q}</h3><p>（このバージョンでは選択式のみ対応）</p><button onclick="handleAnswer(-1)">次へ</button>`;
    }
    
    // タイマー
    if(q.timeLimitSec > 0) {
        remainingSec = q.timeLimitSec;
        document.getElementById('timer-display').textContent = `残り ${remainingSec}秒`;
        timerId = setInterval(() => {
            remainingSec--;
            document.getElementById('timer-display').textContent = `残り ${remainingSec}秒`;
            if(remainingSec <= 0) { clearInterval(timerId); handleAnswer(-1); }
        }, 1000);
    }
}

window.handleAnswer = function(idx) {
    clearInterval(timerId);
    const q = currentQuizSet[currentQuestionIndex];
    const isCorrect = (q.type === 'choice' && q.correctIndexes.includes(idx));
    
    if(isCorrect) {
        score += (q.points || 10);
        correctCount++;
        document.getElementById('result-message').innerHTML = '<span style="color:green; font-weight:bold;">⭕ 正解！</span>';
    } else {
        document.getElementById('result-message').innerHTML = '<span style="color:red; font-weight:bold;">❌ 不正解...</span>';
    }

    setTimeout(() => {
        currentQuestionIndex++;
        if(currentQuestionIndex < currentQuizSet.length) {
            showQuestion();
        } else {
            document.getElementById('quiz-content').innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <h3>結果発表</h3>
                    <p style="font-size:2em;">${score}点</p>
                    <p>${correctCount} / ${currentQuizSet.length} 問正解</p>
                </div>`;
            document.getElementById('result-message').innerHTML = '';
        }
    }, 1500);
};