/* =========================================================
 * player.js
 * 役割：回答者（Player）のロジック。参加、回答、演出切り替え
 * =======================================================*/

const MONEY_TREE = [
    10000, 20000, 30000, 50000, 100000,
    200000, 300000, 500000, 750000, 1000000,
    1500000, 2500000, 5000000, 7500000, 10000000
];

let myPlayerId = null;
let myRoomRef = null;
let questionStartTime = 0;
let playerConfig = { theme: 'light', scoreUnit: 'point' };

document.addEventListener('DOMContentLoaded', () => {
    // トップ画面のボタン
    const playerBtn = document.getElementById('main-player-btn');
    if(playerBtn) {
        playerBtn.addEventListener('click', () => window.showView(window.views.respondent));
    }

    // 部屋参加ボタン
    const joinBtn = document.getElementById('join-room-btn');
    if(joinBtn) {
        joinBtn.addEventListener('click', () => {
            const code = document.getElementById('room-code-input').value.trim().toUpperCase();
            const name = document.getElementById('player-name-input').value.trim() || "名無し";
            if(!code) return;
            
            window.db.ref(`rooms/${code}`).once('value', snap => {
                if(snap.exists()) joinGame(code, name);
                else alert('部屋が見つかりません');
            });
        });
    }

    // 回答ボタン
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', () => submitAnswer(btn));
    });
});

function joinGame(roomId, name) {
    window.showView(window.views.playerGame);
    document.getElementById('player-name-disp').textContent = name;
    
    myRoomRef = window.db.ref(`rooms/${roomId}`);
    const myRef = myRoomRef.child('players').push();
    myPlayerId = myRef.key;
    
    // 初期化
    myRef.set({ name: name, isAlive: true, periodScore: 0, periodTime: 0, lastAnswer: -1, lastTime: 99999 });

    // 設定(Config)の監視 -> テーマ切り替え
    myRoomRef.child('config').on('value', snap => {
        if(!snap.val()) return;
        playerConfig = snap.val();
        applyTheme(playerConfig.theme);
    });

    // 自分の状態監視
    myRef.on('value', snap => {
        const val = snap.val();
        if(!val) return;
        
        updateScoreDisplay(val.periodScore || 0);
        updateAliveStatus(val.isAlive);
    });

    // 進行ステータス監視
    myRoomRef.child('status').on('value', snap => {
        const st = snap.val();
        if(!st) return;
        handleStatusChange(st, roomId);
    });
}

function applyTheme(theme) {
    if(theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function updateScoreDisplay(score) {
    const scoreArea = document.getElementById('score-display-area');
    scoreArea.classList.remove('hidden');
    const valEl = document.getElementById('current-score-value');
    
    if(playerConfig.scoreUnit === 'currency') {
        const money = (score > 0) ? MONEY_TREE[Math.min(score-1, MONEY_TREE.length-1)] : 0;
        valEl.textContent = `¥${money.toLocaleString()}`;
    } else {
        valEl.textContent = `${score}問`;
    }
}

function updateAliveStatus(isAlive) {
    const badge = document.getElementById('alive-badge');
    const overlay = document.getElementById('player-dead-overlay');
    
    if(isAlive) {
        badge.textContent = "ALIVE";
        badge.style.background = "#00ff00";
        overlay.classList.add('hidden');
    } else {
        badge.textContent = "DROP OUT";
        badge.style.background = "#555";
        overlay.classList.remove('hidden');
    }
}

function handleStatusChange(st, roomId) {
    const lobby = document.getElementById('player-lobby-msg');
    const quizArea = document.getElementById('player-quiz-area');
    const waitMsg = document.getElementById('player-wait-msg');

    if(st.step === 'question') {
        lobby.classList.add('hidden');
        waitMsg.classList.add('hidden');
        quizArea.classList.remove('hidden');
        questionStartTime = st.startTime;
        
        // 問題文取得
        window.db.ref(`rooms/${roomId}/questions/${st.qIndex}`).once('value', qSnap => {
            const q = qSnap.val();
            if(!q) return;
            renderQuestion(q);
        });
    } else if(st.step === 'answer') {
        quizArea.classList.add('hidden');
        waitMsg.classList.remove('hidden');
    } else {
        // standby
        lobby.classList.remove('hidden');
        quizArea.classList.add('hidden');
        waitMsg.classList.add('hidden');
    }
}

function renderQuestion(q) {
    document.getElementById('question-text-disp').textContent = q.q;
    const btns = document.querySelectorAll('.answer-btn');
    btns.forEach((btn, i) => {
        btn.textContent = q.c[i];
        btn.disabled = false;
        btn.style.opacity = "1";
        
        // テーマごとのボタンスタイルリセット
        if(playerConfig.theme === 'dark') {
            btn.style.border = "2px solid #ffd700";
        } else {
            btn.style.border = "none";
        }
    });
}

function submitAnswer(btn) {
    const estimatedTimeTaken = Date.now() - questionStartTime;
    const myAnswerIndex = parseInt(btn.dataset.index);
    
    // ボタン無効化演出
    document.querySelectorAll('.answer-btn').forEach(b => { 
        b.disabled = true; 
        b.style.opacity = "0.3"; 
    });
    btn.style.opacity = "1";
    
    if(playerConfig.theme === 'dark') {
        btn.style.border = "4px solid white";
    } else {
        btn.style.border = "4px solid #333";
    }

    document.getElementById('answer-timer-disp').textContent = `${(estimatedTimeTaken/1000).toFixed(2)}秒`;
    
    if(myPlayerId && myRoomRef) {
        myRoomRef.child(`players/${myPlayerId}`).update({ 
            lastAnswer: myAnswerIndex, 
            lastTime: estimatedTimeTaken 
        });
    }
}