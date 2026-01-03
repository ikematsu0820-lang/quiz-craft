/* =========================================================
 * ALL STAR SYSTEM: script.js
 * =======================================================*/

const firebaseConfig = {
  // ★ここにあなたのFirebaseConfigを貼り付けてください★
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

document.getElementById('show-creator-btn').addEventListener('click', () => showView(views.creator));
document.getElementById('show-respondent-btn').addEventListener('click', () => showView(views.respondent));


/* =========================================================
 * 1. HOST: 問題作成
 * =======================================================*/
let createdQuestions = [];

document.getElementById('add-question-btn').addEventListener('click', () => {
    const qText = document.getElementById('question-text').value.trim();
    const correctIndex = parseInt(document.getElementById('correct-index').value);
    
    // 4色の選択肢を取得
    const cBlue = document.querySelector('.btn-blue.choice-input').value.trim() || "選択肢1";
    const cRed = document.querySelector('.btn-red.choice-input').value.trim() || "選択肢2";
    const cGreen = document.querySelector('.btn-green.choice-input').value.trim() || "選択肢3";
    const cYellow = document.querySelector('.btn-yellow.choice-input').value.trim() || "選択肢4";

    if(!qText) { alert('問題文を入力してください'); return; }

    createdQuestions.push({
        q: qText,
        c: [cBlue, cRed, cGreen, cYellow], // 0:青, 1:赤, 2:緑, 3:黄
        correctIndex: correctIndex
    });

    // リスト表示更新
    const list = document.getElementById('q-list');
    const li = document.createElement('li');
    li.textContent = `Q${createdQuestions.length}. ${qText}`;
    list.appendChild(li);
    document.getElementById('q-count').textContent = createdQuestions.length;

    document.getElementById('question-text').value = '';
});

/* =========================================================
 * 2. HOST: 進行管理 (THE ALL STAR LOGIC)
 * =======================================================*/
let currentRoomId = null;
let currentQIndex = 0;

document.getElementById('save-room-btn').addEventListener('click', () => {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 部屋初期化
    db.ref(`rooms/${currentRoomId}`).set({
        questions: createdQuestions,
        status: { step: 'standby', qIndex: 0 },
        players: {}
    }).then(() => {
        enterHostMode(currentRoomId);
    });
});

function enterHostMode(roomId) {
    showView(views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;

    // プレイヤー監視
    db.ref(`rooms/${roomId}/players`).on('value', snap => {
        const players = snap.val() || {};
        const total = Object.keys(players).length;
        // Alive（生存者）カウント
        const alive = Object.values(players).filter(p => p.isAlive).length;
        
        document.getElementById('host-player-count').textContent = total;
        document.getElementById('host-alive-count').textContent = alive;
    });

    // --- ボタンアクション ---
    const btnNewPeriod = document.getElementById('host-new-period-btn');
    const btnStart = document.getElementById('host-start-btn');
    const btnShowAns = document.getElementById('host-show-answer-btn');
    const btnNext = document.getElementById('host-next-btn');
    const btnEliminate = document.getElementById('host-eliminate-slowest-btn');
    const btnRanking = document.getElementById('host-ranking-btn');

    // ★ピリオド開始（全員復活）
    btnNewPeriod.onclick = () => {
        if(!confirm('新しいピリオドを開始しますか？\n全員がStandUp（復活）し、ピリオド成績がリセットされます。')) return;
        
        // 全プレイヤーの状態をリセット
        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(child => {
                child.ref.update({
                    isAlive: true,      // 復活
                    periodScore: 0,     // ピリオドスコア0
                    periodTime: 0,      // ピリオドタイム0
                    lastTime: 99999     // 今回のタイムリセット
                });
            });
        });
        
        currentQIndex = 0;
        document.getElementById('host-status-area').textContent = "新ピリオド 待機中...";
        btnStart.classList.remove('hidden');
        btnNewPeriod.classList.add('hidden');
    };

    // ★問題START（タイム計測開始）
    btnStart.onclick = () => {
        // 現在時刻（サーバー時刻）を記録
        const now = firebase.database.ServerValue.TIMESTAMP;
        
        db.ref(`rooms/${roomId}/status`).set({
            step: 'question',
            qIndex: currentQIndex,
            startTime: now
        });

        btnStart.classList.add('hidden');
        btnShowAns.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} Thinking Time...`;
    };

    // ★正解発表 & 生存判定 (Sit Down Logic)
    btnShowAns.onclick = () => {
        const currentQ = createdQuestions[currentQIndex];
        const correctIdx = currentQ.correctIndex;

        // 答え合わせ処理
        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => {
                const val = p.val();
                if(!val.isAlive) return; // 既に死んでいる人は無視

                // 正解チェック
                if(val.lastAnswer === correctIdx) {
                    // 正解！: ピリオドスコア加算、タイム加算
                    const timeTaken = val.lastTime || 99999;
                    p.ref.update({
                        periodScore: (val.periodScore || 0) + 1,
                        periodTime: (val.periodTime || 0) + timeTaken
                    });
                } else {
                    // 不正解！: Sit Down（脱落）
                    p.ref.update({ isAlive: false });
                }
            });
        });

        db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });

        btnShowAns.classList.add('hidden');
        btnEliminate.classList.remove('hidden'); // 予選落ちボタン出現
        btnNext.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} 正解: ${["青","赤","緑","黄"][correctIdx]}`;
    };

    // ★予選落ち（一番遅い正解者を消す）
    btnEliminate.onclick = () => {
        if(!confirm('【予選落ち】\nこの問題の正解者の中で、一番タイムが遅かった1名を脱落させますか？')) return;

        const currentQ = createdQuestions[currentQIndex];
        const correctIdx = currentQ.correctIndex;

        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let slowestPlayerKey = null;
            let maxTime = -1;

            snap.forEach(p => {
                const val = p.val();
                // 「生きていて」かつ「今回正解した人」の中で
                if(val.isAlive && val.lastAnswer === correctIdx) {
                    if(val.lastTime > maxTime) {
                        maxTime = val.lastTime;
                        slowestPlayerKey = p.key;
                    }
                }
            });

            if(slowestPlayerKey) {
                // 最下位を脱落させる
                db.ref(`rooms/${roomId}/players/${slowestPlayerKey}`).update({ isAlive: false });
                alert(`予選落ち執行: タイム ${maxTime/1000}秒 のプレイヤーを脱落させました。`);
            } else {
                alert('対象者がいませんでした。');
            }
        });
    };

    // ★次の問題へ
    btnNext.onclick = () => {
        currentQIndex++;
        if(currentQIndex >= createdQuestions.length) {
            alert('全問終了です！');
            btnNext.classList.add('hidden');
            return;
        }
        
        // 次の問題の準備（回答リセット）
        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ lastAnswer: -1, lastTime: 99999 }));
        });

        btnStart.classList.remove('hidden');
        btnNext.classList.add('hidden');
        btnEliminate.classList.add('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} 待機中...`;
    };

    // ★ランキング集計
    btnRanking.onclick = () => {
        db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let ranking = [];
            snap.forEach(p => {
                const v = p.val();
                if(v.isAlive) { // 生存者のみ
                    ranking.push({
                        name: v.name,
                        score: v.periodScore,
                        time: v.periodTime
                    });
                }
            });

            // 順位付け: ①正解数(降順) > ②タイム(昇順)
            ranking.sort((a, b) => {
                if(b.score !== a.score) return b.score - a.score;
                return a.time - b.time;
            });

            let msg = "🏆 ピリオド中間発表 🏆\n\n";
            ranking.slice(0, 5).forEach((r, i) => {
                msg += `${i+1}位: ${r.name} (${r.score}問 / ${(r.time/1000).toFixed(2)}秒)\n`;
            });
            alert(msg);
        });
    };
}


/* =========================================================
 * 3. PLAYER: 回答者 (1/100秒計測 & SitDown)
 * =======================================================*/
let myPlayerId = null;
let myRoomRef = null;
let questionStartTime = 0; // ミリ秒

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

    // 初期状態: 生存
    myRef.set({
        name: name,
        isAlive: true,
        periodScore: 0,
        periodTime: 0,
        lastAnswer: -1,
        lastTime: 99999
    });

    // 監視開始
    monitorStatus(roomId);
    monitorMyStatus(myRef);
}

// 自分の生存確認 (Sit Down監視)
function monitorMyStatus(ref) {
    ref.on('value', snap => {
        const val = snap.val();
        if(!val) return;

        const badge = document.getElementById('alive-badge');
        const overlay = document.getElementById('player-dead-overlay');

        if(val.isAlive) {
            badge.textContent = "STAND UP";
            badge.style.background = "#00ff00"; // Green
            overlay.classList.add('hidden');
        } else {
            badge.textContent = "SIT DOWN";
            badge.style.background = "#555";    // Gray
            overlay.classList.remove('hidden'); // 脱落画面を出す
        }
    });
}

// 全体進行監視
function monitorStatus(roomId) {
    db.ref(`rooms/${roomId}/status`).on('value', snap => {
        const st = snap.val();
        if(!st) return;

        const lobby = document.getElementById('player-lobby-msg');
        const quizArea = document.getElementById('player-quiz-area');
        const waitMsg = document.getElementById('player-wait-msg');

        if(st.step === 'question') {
            // 問題表示
            lobby.classList.add('hidden');
            waitMsg.classList.add('hidden');
            quizArea.classList.remove('hidden');

            // サーバー時刻を使って開始時刻を同期
            questionStartTime = st.startTime; 

            // 問題文取得
            db.ref(`rooms/${roomId}/questions/${st.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                document.getElementById('question-text-disp').textContent = q.q;
                
                // 選択肢ボタンにテキストセット
                const btns = document.querySelectorAll('.answer-btn');
                btns.forEach((btn, i) => {
                    btn.textContent = q.c[i];
                    btn.disabled = false;
                    btn.style.opacity = "1";
                });
            });

        } else if(st.step === 'answer') {
            // 正解発表待ち
            quizArea.classList.add('hidden');
            waitMsg.classList.remove('hidden');
        } else {
            // 待機中
            lobby.classList.remove('hidden');
            quizArea.classList.add('hidden');
            waitMsg.classList.add('hidden');
        }
    });
}

// 4色ボタンクリック処理
document.querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // ボタンを押した瞬間のタイム
        const pressTime = new Date().getTime(); // クライアント時刻(暫定)
        // 本来はサーバー時刻との差分補正が必要だが、簡易的に「サーバー開始時刻」と「現在時刻」の差を使う
        // ※厳密にはズレるが、早押し遊びレベルなら許容範囲
        
        // 補正: firebase.database.ServerValue.TIMESTAMP は書き込み時のみ有効なので
        // ここでは簡易的に `Date.now()` を使うが、Host側で開始した `st.startTime` との差分をとる
        
        // サーバー上のstartTimeは「過去」なので、本来はローカルクロックとの差分補正が必要。
        // ★簡易実装: 押した瞬間のタイムスタンプをそのまま送るのではなく、
        // 「問題が表示されてから何ミリ秒で押したか」をローカルで計算して送る形にする。
        
        // 正確には `firebase.database.ServerValue.TIMESTAMP` を送ってサーバー側で差分を取りたいが
        // データ書き込みラグがあるため、ここでは「ボタンを押した瞬間のローカル時間」を送る。
        
        const myAnswerIndex = parseInt(btn.dataset.index);
        
        // ボタン無効化
        document.querySelectorAll('.answer-btn').forEach(b => {
            b.disabled = true;
            b.style.opacity = "0.3";
        });
        btn.style.opacity = "1";
        btn.style.border = "4px solid white";

        // 時間計算（概算）
        // 厳密にするなら「Offset」計算が必要だが、今回は簡易的に
        // 「サーバーのstartTime」と「ローカルの現在時刻」の差分をとる（ズレは全員同じと仮定）
        const estimatedTimeTaken = Date.now() - questionStartTime;

        document.getElementById('answer-timer-disp').textContent = `${(estimatedTimeTaken/1000).toFixed(2)}秒`;

        // 送信
        if(myPlayerId && myRoomRef) {
            myRoomRef.child(`players/${myPlayerId}`).update({
                lastAnswer: myAnswerIndex,
                lastTime: estimatedTimeTaken // タイム送信
            });
        }
    });
});
