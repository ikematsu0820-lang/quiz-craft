/* =========================================================
 * host_studio.js (修正版)
 * 役割：クイズ本番の制御、Firebaseステータス更新、カンペ表示
 * =======================================================*/

let currentProgramConfig = { finalRanking: true };
let buzzWinnerId = null;
let taTimer = null;

// スタジオ開始（host_core.jsから呼ばれる）
window.startRoom = function() {
    // 状態の初期化
    studioQuestions = [];
    periodPlaylist = [];
    currentQIndex = 0;
    currentPeriodIndex = 0;
    currentConfig = { mode: 'normal' };
    
    // 部屋IDをランダム生成
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Firebaseに部屋を作成
    window.db.ref(`rooms/${currentRoomId}`).set({
        questions: [],
        status: { step: 'standby', qIndex: 0, isBuzzActive: false },
        config: currentConfig,
        players: {}
    }).then(function() {
        enterHostMode(currentRoomId);
    }).catch(function(e) {
        alert("部屋の作成に失敗しました: " + e.message);
    });
};

// ホスト制御画面のセットアップ
function enterHostMode(roomId) {
    window.showView('host-control-view');
    
    document.getElementById('host-room-id').textContent = roomId;
    document.getElementById('studio-show-id').textContent = currentShowId;
    
    // 画面パーツの初期表示設定
    document.getElementById('studio-program-loader').classList.remove('hidden');
    document.getElementById('studio-timeline-area').classList.add('hidden');
    document.getElementById('control-panel').classList.add('hidden');
    document.getElementById('host-buzz-winner-area').classList.add('hidden');
    
    // プレイヤー数の監視
    window.db.ref(`rooms/${roomId}/players`).on('value', function(snap) {
        const players = snap.val() || {};
        const total = Object.keys(players).length;
        const alive = Object.values(players).filter(p => p.isAlive).length;
        document.getElementById('host-player-count').textContent = total;
        document.getElementById('host-alive-count').textContent = alive;
        
        // 早押し判定（Buzzモード時）
        if (currentConfig.mode === 'buzz') identifyBuzzWinner(players);
    });

    loadProgramsInStudio();
    setupStudioButtons(roomId);
    updateKanpe();
}

// 保存済みプログラム（番組構成）を読み込む
function loadProgramsInStudio() {
    const select = document.getElementById('studio-program-select');
    const btn = document.getElementById('studio-load-program-btn');
    if(!select || !btn) return;

    window.db.ref(`saved_programs/${currentShowId}`).once('value', function(snap) {
        const data = snap.val();
        select.innerHTML = `<option value="">${APP_TEXT.Studio.SelectProgDefault}</option>`;
        if(data) {
            Object.keys(data).forEach(function(key) {
                const item = data[key];
                const opt = document.createElement('option');
                opt.value = JSON.stringify(item);
                opt.textContent = item.title;
                select.appendChild(opt);
            });
        }
    });

    btn.onclick = function() {
        if(!select.value) return;
        const prog = JSON.parse(select.value);
        periodPlaylist = prog.playlist || [];
        document.getElementById('studio-program-loader').classList.add('hidden');
        document.getElementById('studio-timeline-area').classList.remove('hidden');
        renderStudioTimeline();
    };
}

// タイムライン（ピリオド一覧）の描画
function renderStudioTimeline() {
    const container = document.getElementById('studio-period-timeline');
    container.innerHTML = '';
    periodPlaylist.forEach(function(item, index) {
        const div = document.createElement('div');
        div.className = 'timeline-card';
        if (index === currentPeriodIndex) div.classList.add('active');
        div.innerHTML = `<h5>No.${index + 1}: ${item.title}</h5>
                         <div class="info">[${item.config.mode.toUpperCase()}]</div>`;
        container.appendChild(div);
    });
}

// スタジオ内の各ボタンの動作設定
function setupStudioButtons(roomId) {
    // 再生ボタン（最初のピリオドを開始）
    const btnMasterPlay = document.getElementById('studio-master-play-btn');
    if (btnMasterPlay) {
        btnMasterPlay.onclick = function() {
            playPeriod(0);
        };
    }

    // 問題開始ボタン
    const btnStart = document.getElementById('host-start-btn');
    if(btnStart) btnStart.onclick = function() {
        window.db.ref(`rooms/${roomId}/status`).update({
            step: 'question',
            qIndex: currentQIndex,
            startTime: firebase.database.ServerValue.TIMESTAMP
        });
        btnStart.classList.add('hidden');
    };

    // 正解発表ボタン
    const btnShowAns = document.getElementById('host-show-answer-btn');
    if(btnShowAns) btnShowAns.onclick = function() {
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });
        document.getElementById('host-next-btn').classList.remove('hidden');
    };

    // スタジオを閉じる
    const btnClose = document.getElementById('host-close-studio-btn');
    if (btnClose) btnClose.onclick = () => window.showView('host-dashboard-view');
}

// ピリオド（セット）の開始処理
function playPeriod(index) {
    if(!periodPlaylist[index]) return;
    const item = periodPlaylist[index];
    
    currentPeriodIndex = index;
    studioQuestions = item.questions;
    currentConfig = item.config;
    currentQIndex = 0;
    
    document.getElementById('studio-timeline-area').classList.add('hidden');
    document.getElementById('control-panel').classList.remove('hidden');
    document.getElementById('current-period-title').textContent = item.title;
    document.getElementById('host-start-btn').classList.remove('hidden');
    document.getElementById('host-next-btn').classList.add('hidden');

    window.db.ref(`rooms/${currentRoomId}/config`).set(currentConfig);
    window.db.ref(`rooms/${currentRoomId}/questions`).set(studioQuestions);
    window.db.ref(`rooms/${currentRoomId}/status`).update({ step: 'standby', qIndex: 0 });
    
    updateKanpe();
}

// カンペ（司会者用画面）の更新
function updateKanpe() {
    const kanpeArea = document.getElementById('host-kanpe-area');
    if(studioQuestions.length > currentQIndex) {
        const q = studioQuestions[currentQIndex];
        kanpeArea.classList.remove('hidden');
        document.getElementById('kanpe-question').textContent = `Q${currentQIndex+1}. ${q.q}`;
        document.getElementById('kanpe-answer').textContent = `正解: ${q.correct}`;
    } else {
        kanpeArea.classList.add('hidden');
    }
}

// 早押し者の特定
function identifyBuzzWinner(players) {
    if (buzzWinnerId) return;
    let winner = null;
    let minTime = Infinity;

    Object.keys(players).forEach(id => {
        const p = players[id];
        if (p.buzzTime && p.buzzTime < minTime) {
            minTime = p.buzzTime;
            winner = { id: id, name: p.name };
        }
    });

    if (winner) {
        buzzWinnerId = winner.id;
        window.db.ref(`rooms/${currentRoomId}/status`).update({ currentAnswerer: winner.id, isBuzzActive: false });
        document.getElementById('host-buzz-winner-name').textContent = winner.name;
        document.getElementById('host-buzz-winner-area').classList.remove('hidden');
    }
}
