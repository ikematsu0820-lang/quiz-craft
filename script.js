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
}

document.querySelectorAll('.back-to-main').forEach(btn => {
    btn.addEventListener('click', () => showView(views.main));
});

document.getElementById('show-creator-btn').addEventListener('click', () => showView(views.creator));
document.getElementById('show-respondent-btn').addEventListener('click', () => showView(views.respondent));

/* =========================================================
 * SECTION: 出題者（作成パート）
 * =======================================================*/
let createdQuestions = [];

document.getElementById('add-question-btn').addEventListener('click', () => {
    const qText = document.getElementById('question-text').value.trim();
    const choiceInputs = document.querySelectorAll('.choice-input');
    
    // 選択肢収集（空欄除外）
    let choices = [];
    choiceInputs.forEach(inp => { if(inp.value.trim()) choices.push(inp.value.trim()); });

    if(!qText || choices.length < 2) {
        alert('問題文と、少なくとも2つの選択肢を入力してください');
        return;
    }

    // 正解は常に「入力欄の一番上（choices[0]）」とする（後でシャッフル表示）
    const correctText = choices[0];

    createdQuestions.push({
        q: qText,
        c: choices, // 配列の0番目が正解
        correct: correctText
    });

    // 表示更新
    const li = document.createElement('li');
    li.textContent = `Q${createdQuestions.length}. ${qText} (正解: ${correctText})`;
    document.getElementById('q-list').appendChild(li);
    document.getElementById('q-count').textContent = createdQuestions.length;

    // フォームリセット
    document.getElementById('question-text').value = '';
    choiceInputs.forEach(inp => inp.value = '');
});

/* =========================================================
 * SECTION: 出題者（ロビー＆進行パート）
 * =======================================================*/
let currentRoomId = null;
let currentQuestionIndex = 0;

document.getElementById('save-room-btn').addEventListener('click', () => {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }

    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const title = document.getElementById('quiz-set-title').value || '無題のクイズ';

    // Firebaseに部屋作成
    db.ref('rooms/' + currentRoomId).set({
        info: { title: title, hostActive: true },
        questions: createdQuestions,
        status: { step: 'lobby', qIndex: 0 }, // ここを全員が監視する
        players: {}
    }).then(() => {
        enterHostMode(currentRoomId);
    });
});

function enterHostMode(roomId) {
    showView(views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;

    // 参加人数の監視
    db.ref(`rooms/${roomId}/players`).on('value', snapshot => {
        const count = snapshot.numChildren();
        document.getElementById('host-player-count').textContent = count;
    });

    // ボタン設定
    const startBtn = document.getElementById('host-start-btn');
    const nextBtn = document.getElementById('host-next-btn');
    const ansBtn = document.getElementById('host-show-answer-btn');
    const endBtn = document.getElementById('host-end-btn');

    startBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
    ansBtn.classList.add('hidden');
    endBtn.classList.add('hidden');

    // ★「開始」ボタン
    startBtn.onclick = () => {
        currentQuestionIndex = 0;
        updateRoomStatus('question', 0);
        
        startBtn.classList.add('hidden');
        ansBtn.classList.remove('hidden');
        document.getElementById('host-status-area').innerHTML = `<h3>Q1 出題中...</h3>`;
    };

    // ★「正解表示」ボタン
    ansBtn.onclick = () => {
        updateRoomStatus('answer', currentQuestionIndex);
        
        ansBtn.classList.add('hidden');
        if(currentQuestionIndex < createdQuestions.length - 1) {
            nextBtn.classList.remove('hidden'); // 次の問題があるなら
        } else {
            endBtn.classList.remove('hidden');  // 最後なら終了ボタン
        }
        document.getElementById('host-status-area').innerHTML = `<h3>答え合わせ中</h3>`;
    };

    // ★「次の問題」ボタン
    nextBtn.onclick = () => {
        currentQuestionIndex++;
        updateRoomStatus('question', currentQuestionIndex);
        
        nextBtn.classList.add('hidden');
        ansBtn.classList.remove('hidden');
        document.getElementById('host-status-area').innerHTML = `<h3>Q${currentQuestionIndex+1} 出題中...</h3>`;
    };
    
    // ★「終了」ボタン
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

    // 部屋の存在確認
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

    // プレイヤー登録
    playerRoomRef = db.ref(`rooms/${roomId}`);
    const newPlayerRef = playerRoomRef.child('players').push();
    myPlayerId = newPlayerRef.key;
    newPlayerRef.set({ name: name, score: 0 });

    // ★★★ ここが「同期」の心臓部 ★★★
    // ホストが status を書き換えるたびに、ここが動く
    playerRoomRef.child('status').on('value', snapshot => {
        const status = snapshot.val();
        if(!status) return;

        if(status.step === 'lobby') {
            // ロビー待機
            document.getElementById('player-lobby-msg').classList.remove('hidden');
            document.getElementById('player-quiz-area').classList.add('hidden');
        } 
        else if(status.step === 'question') {
            // 問題表示！
            document.getElementById('player-lobby-msg').classList.add('hidden');
            document.getElementById('player-quiz-area').classList.remove('hidden');
            document.getElementById('player-wait-msg').classList.add('hidden');
            
            // 問題データを取得して表示
            playerRoomRef.child('questions/' + status.qIndex).once('value', qSnap => {
                const qData = qSnap.val();
                renderPlayerQuestion(qData, status.qIndex);
            });
        }
        else if(status.step === 'answer') {
            // 正解発表モード
            document.getElementById('player-wait-msg').classList.add('hidden');
            // ここで正解アニメーションなどを出しても良い
            alert('出題者が正解を表示しました！画面を確認してください');
        }
    });
}

function renderPlayerQuestion(qData, index) {
    document.getElementById('question-number').textContent = `Q${index + 1}`;
    document.getElementById('question-text-disp').textContent = qData.q;
    
    // 選択肢をシャッフルして表示
    const area = document.getElementById('player-choices-area');
    area.innerHTML = '';
    
    // シャッフル用配列作成
    const shuffled = [...qData.c].sort(() => Math.random() - 0.5);

    shuffled.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'btn-block';
        btn.style.cssText = "margin-bottom:10px; padding:15px; background:white; border:1px solid #ccc;";
        btn.textContent = choice;
        
        btn.onclick = () => {
            // 回答送信
            if(choice === qData.correct) {
                currentScore += 10;
                document.getElementById('player-score').textContent = currentScore;
                alert('⭕ 正解！'); // 簡易表示
            } else {
                alert('❌ 残念...');
            }
            // 二重回答防止
            area.innerHTML = '<p style="text-align:center; color:#888;">回答済み</p>';
            document.getElementById('player-wait-msg').classList.remove('hidden');
            
            // スコア送信（オプション）
            if(myPlayerId) {
                playerRoomRef.child(`players/${myPlayerId}/score`).set(currentScore);
            }
        };
        area.appendChild(btn);
    });
}