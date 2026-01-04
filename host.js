/* =========================================================
 * host.js (v6: Removed Manual Elimination)
 * =======================================================*/

let currentShowId = null;
let createdQuestions = [];
let studioQuestions = [];
let currentRoomId = null;
let currentQIndex = 0;
let currentConfig = { penalty: 'none', scoreUnit: 'point', theme: 'light' };
let editingSetId = null;
let returnToCreator = false;
let periodPlaylist = [];
let currentPeriodIndex = -1;

const RANKING_MONEY_TREE = [
    10000, 20000, 30000, 50000, 100000,
    200000, 300000, 500000, 750000, 1000000,
    1500000, 2500000, 5000000, 7500000, 10000000
];

document.addEventListener('DOMContentLoaded', () => {
    // 画面遷移・ボタン設定
    const hostBtn = document.getElementById('main-host-btn');
    if(hostBtn) hostBtn.addEventListener('click', () => window.showView(window.views.hostLogin));

    const loginBtn = document.getElementById('host-login-submit-btn');
    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            const input = document.getElementById('show-id-input').value.trim().toUpperCase();
            if(!input) { alert("番組IDを入力してください"); return; }
            if(!/^[A-Z0-9_-]+$/.test(input)) { alert("ID文字種エラー"); return; }
            currentShowId = input;
            enterDashboard();
        });
    }

    const createBtn = document.getElementById('dash-create-btn');
    if(createBtn) createBtn.addEventListener('click', initCreatorMode);

    const configBtn = document.getElementById('dash-config-btn');
    if(configBtn) {
        configBtn.addEventListener('click', () => {
            enterConfigMode(); 
        });
    }

    const studioBtn = document.getElementById('dash-studio-btn');
    if(studioBtn) studioBtn.addEventListener('click', startRoom);

    const configAddBtn = document.getElementById('config-add-playlist-btn');
    if(configAddBtn) configAddBtn.addEventListener('click', addPeriodToPlaylist);

    const configGoStudioBtn = document.getElementById('config-go-studio-btn');
    if(configGoStudioBtn) configGoStudioBtn.addEventListener('click', startRoom);

    const configHeaderBackBtn = document.getElementById('config-header-back-btn');
    if(configHeaderBackBtn) configHeaderBackBtn.addEventListener('click', () => enterDashboard());

    const addQBtn = document.getElementById('add-question-btn');
    if(addQBtn) addQBtn.addEventListener('click', addQuestion);
    
    const saveBtn = document.getElementById('save-to-cloud-btn');
    if(saveBtn) saveBtn.addEventListener('click', saveToCloud);
    
    const creatorBackBtn = document.getElementById('creator-back-btn');
    if(creatorBackBtn) creatorBackBtn.addEventListener('click', () => enterDashboard());
});

// --- Dashboard & Config ---
function enterDashboard() {
    window.showView(window.views.dashboard);
    document.getElementById('dashboard-show-id').textContent = currentShowId;
    loadSavedSets();
}

function loadSavedSets() {
    const listEl = document.getElementById('dash-set-list');
    listEl.innerHTML = '<p style="text-align:center;">読み込み中...</p>';

    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
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
            const themeName = (item.config && item.config.theme === 'dark') ? '💰ミリオネア風' : '🌈感謝祭風';
            div.innerHTML = `
                <div>
                    <span>${item.title}</span> <span style="font-size:0.8em; background:#eee; padding:2px 5px; border-radius:3px;">${themeName}</span>
                    <div style="font-size:0.8em; color:#666;">
                        ${new Date(item.createdAt).toLocaleDateString()} / 全${item.questions.length}問
                    </div>
                </div>
            `;
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = '削除';
            delBtn.onclick = () => {
                if(confirm(`削除しますか？`)) {
                    window.db.ref(`saved_sets/${currentShowId}/${key}`).remove();
                    div.remove();
                }
            };
            div.appendChild(delBtn);
            listEl.appendChild(div);
        });
    });
}

function initCreatorMode() {
    editingSetId = null;
    createdQuestions = [];
    document.getElementById('quiz-set-title').value = '';
    document.getElementById('save-to-cloud-btn').textContent = '☁️ クラウドに保存して完了';
    renderQuestionList();
    window.showView(window.views.creator);
}

function addQuestion() {
    const qText = document.getElementById('question-text').value.trim();
    const correctIndex = parseInt(document.getElementById('correct-index').value);
    const cBlue = document.querySelector('.btn-blue.choice-input').value.trim() || "A";
    const cRed = document.querySelector('.btn-red.choice-input').value.trim() || "B";
    const cGreen = document.querySelector('.btn-green.choice-input').value.trim() || "C";
    const cYellow = document.querySelector('.btn-yellow.choice-input').value.trim() || "D";

    if(!qText) { alert('問題文を入力してください'); return; }

    createdQuestions.push({ q: qText, c: [cBlue, cRed, cGreen, cYellow], correctIndex: correctIndex });
    renderQuestionList();
    document.getElementById('question-text').value = '';
    document.getElementById('question-text').focus();
}

function renderQuestionList() {
    const list = document.getElementById('q-list');
    list.innerHTML = '';
    createdQuestions.forEach((q, index) => {
        const li = document.createElement('li');
        li.textContent = `Q${index + 1}. ${q.q}`;
        list.appendChild(li);
    });
    document.getElementById('q-count').textContent = createdQuestions.length;
}

function saveToCloud() {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }
    const title = document.getElementById('quiz-set-title').value.trim() || "無題のセット";
    const defaultConf = { penalty: 'none', scoreUnit: 'point', theme: 'light' };
    const saveData = {
        title: title,
        config: defaultConf,
        questions: createdQuestions,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    window.db.ref(`saved_sets/${currentShowId}`).push(saveData)
    .then(() => { alert(`「${title}」を新規保存しました！`); enterDashboard(); });
}

// --- Config Mode ---
function enterConfigMode() {
    window.showView(window.views.config);
    const select = document.getElementById('config-set-select');
    select.innerHTML = '<option value="">読み込み中...</option>';
    
    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = '<option value="">-- セットを選択 --</option>';
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ q: item.questions, c: item.config || {}, t: item.title });
                opt.textContent = item.title;
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = '<option value="">セットがありません</option>';
        }
    });
    renderConfigPreview();
}

function addPeriodToPlaylist() {
    const select = document.getElementById('config-set-select');
    const json = select.value;
    if(!json) { alert("セットを選んでください"); return; }
    
    const data = JSON.parse(json);
    const newConfig = {
        penalty: document.getElementById('config-penalty').value,
        scoreUnit: document.getElementById('config-score-unit').value,
        theme: document.getElementById('config-theme').value
    };
    
    periodPlaylist.push({
        title: data.t,
        questions: data.q,
        config: newConfig
    });
    renderConfigPreview();
}

function renderConfigPreview() {
    const container = document.getElementById('config-playlist-preview');
    container.innerHTML = '';
    if(periodPlaylist.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; font-size:0.8em;">まだ追加されていません</p>';
        return;
    }
    
    periodPlaylist.forEach((item, index) => {
        const div = document.createElement('div');
        div.style.background = "white";
        div.style.marginBottom = "5px";
        div.style.padding = "5px 10px";
        div.style.borderRadius = "4px";
        div.style.fontSize = "0.9em";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.innerHTML = `
            <span><b>${index+1}. ${item.title}</b> (${item.config.theme})</span>
            <span style="color:#d00; cursor:pointer;" onclick="removeFromPlaylist(${index})">[削除]</span>
        `;
        container.appendChild(div);
    });
}

window.removeFromPlaylist = function(index) {
    periodPlaylist.splice(index, 1);
    renderConfigPreview();
};

// --- Studio Mode ---
function startRoom() {
    if(periodPlaylist.length === 0) {
        if(!confirm("プレイリストが空です。スタジオへ移動しますか？")) return;
    }
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    currentPeriodIndex = -1; // 初期化
    
    window.db.ref(`rooms/${currentRoomId}`).set({
        questions: [],
        status: { step: 'standby', qIndex: 0 },
        config: { theme: 'light', scoreUnit: 'point' },
        players: {}
    }).then(() => {
        enterHostMode(currentRoomId);
    });
}

function enterHostMode(roomId) {
    window.showView(window.views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;
    document.getElementById('studio-show-id').textContent = currentShowId;
    renderStudioTimeline();

    window.db.ref(`rooms/${roomId}/players`).on('value', snap => {
        const players = snap.val() || {};
        const total = Object.keys(players).length;
        const alive = Object.values(players).filter(p => p.isAlive).length;
        document.getElementById('host-player-count').textContent = total;
        document.getElementById('host-alive-count').textContent = alive;
    });

    setupStudioButtons(roomId);
}

function renderStudioTimeline() {
    const container = document.getElementById('studio-period-timeline');
    container.innerHTML = '';
    
    if(periodPlaylist.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; font-size:0.9em;">セット設定画面でリストを作成してください</p>';
        return;
    }

    periodPlaylist.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'timeline-card';
        if (index === currentPeriodIndex) div.classList.add('active');
        
        div.innerHTML = `
            <div>
                <h5>第${index + 1}ピリオド: ${item.title}</h5>
                <div class="info">
                    全${item.questions.length}問 / ${item.config.theme === 'dark' ? '💰ミリオネ' : '🌈感謝祭'} / 
                    ${item.config.penalty === 'immediate' ? '☠️即死' : '継続'}
                </div>
            </div>
            <button class="play-btn" onclick="playPeriod(${index})">再生 ▶</button>
        `;
        container.appendChild(div);
    });
}

window.playPeriod = function(index) {
    if(!periodPlaylist[index]) return;
    const item = periodPlaylist[index];
    
    currentPeriodIndex = index;
    studioQuestions = item.questions;
    currentConfig = item.config;
    currentQIndex = 0;
    
    renderStudioTimeline();
    
    window.db.ref(`rooms/${currentRoomId}/questions`).set(studioQuestions);
    window.db.ref(`rooms/${currentRoomId}/config`).set(currentConfig);
    window.db.ref(`rooms/${currentRoomId}/status`).update({ step: 'standby', qIndex: 0 });
    
    document.getElementById('control-panel').classList.remove('hidden');
    document.getElementById('current-period-title').textContent = `Now Playing: 第${index+1}ピリオド (${item.title})`;
    
    document.getElementById('host-new-period-btn').classList.remove('hidden');
    document.getElementById('host-start-btn').classList.add('hidden');
    document.getElementById('host-show-answer-btn').classList.add('hidden');
    // eliminateボタンは削除したので非表示処理も不要
    document.getElementById('host-next-btn').classList.add('hidden');
    
    alert(`第${index+1}ピリオドをセットしました！\n「全員復活させてスタート」を押してください。`);
    updateKanpe();
};

function setupStudioButtons(roomId) {
    const btnNewPeriod = document.getElementById('host-new-period-btn');
    const btnStart = document.getElementById('host-start-btn');
    const btnShowAns = document.getElementById('host-show-answer-btn');
    // Eliminateボタン削除
    const btnNext = document.getElementById('host-next-btn');
    const btnRanking = document.getElementById('host-ranking-btn');
    const btnClose = document.getElementById('host-close-studio-btn');
    const rankingBackBtn = document.getElementById('ranking-back-btn');
    
    btnNewPeriod.onclick = () => {
        if(!confirm("全員を復活させて開始しますか？")) return;
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
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
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'question', qIndex: currentQIndex, startTime: now });
        btnStart.classList.add('hidden');
        btnShowAns.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = "Thinking Time...";
    };

    btnShowAns.onclick = () => {
        const q = studioQuestions[currentQIndex];
        const correctIdx = q.correctIndex;
        
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => {
                const val = p.val();
                if(!val.isAlive) return;
                if(val.lastAnswer === correctIdx) {
                    const t = val.lastTime || 99999;
                    p.ref.update({ periodScore: (val.periodScore||0)+1, periodTime: (val.periodTime||0)+t });
                } else {
                    if(currentConfig.penalty === 'immediate') p.ref.update({ isAlive: false });
                }
            });
        });
        
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });
        btnShowAns.classList.add('hidden');
        // Eliminateボタン表示処理削除
        btnNext.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = "正解発表";

        // ボタンの切り替えロジック
        if (currentQIndex >= studioQuestions.length - 1) {
            if (currentPeriodIndex < periodPlaylist.length - 1) {
                btnNext.textContent = "⏭ 次のピリオドへ進む";
                btnNext.classList.remove('btn-info');
                btnNext.classList.add('btn-warning');
            } else {
                btnNext.textContent = "🏁 全工程終了";
                btnNext.classList.remove('btn-info');
                btnNext.classList.add('btn-dark');
            }
        } else {
            btnNext.textContent = "次の問題へ";
            btnNext.classList.remove('btn-warning', 'btn-dark');
            btnNext.classList.add('btn-info');
        }
    };

    // Eliminateボタンのクリックイベント削除

    btnNext.onclick = () => {
        if (currentQIndex >= studioQuestions.length - 1) {
            if (currentPeriodIndex < periodPlaylist.length - 1) {
                if(confirm("このピリオドは終了です。次のピリオドへ進みますか？")) {
                    playPeriod(currentPeriodIndex + 1);
                }
            } else {
                alert("全てのピリオドが終了しました！お疲れ様でした！");
                btnNext.classList.add('hidden');
            }
            return;
        }

        currentQIndex++;
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ lastAnswer: -1, lastTime: 99999 }));
        });
        updateKanpe();
        btnStart.classList.remove('hidden');
        btnNext.classList.add('hidden');
        // Eliminateボタン非表示処理削除
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} スタンバイ...`;
    };

    btnRanking.onclick = () => {
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let ranking = [];
            snap.forEach(p => {
                const v = p.val();
                ranking.push({ name: v.name, score: v.periodScore, time: v.periodTime, isAlive: v.isAlive });
            });
            ranking.sort((a,b) => (b.score - a.score) || (a.time - b.time));
            renderRankingView(ranking);
            window.showView(window.views.ranking);
        });
    };

    rankingBackBtn.onclick = () => {
        window.showView(window.views.hostControl);
    };
    
    btnClose.onclick = () => {
        if(confirm("ダッシュボードに戻りますか？")) enterDashboard();
    };
}

function updateKanpe() {
    const kanpeArea = document.getElementById('host-kanpe-area');
    if(studioQuestions.length > currentQIndex) {
        const q = studioQuestions[currentQIndex];
        kanpeArea.classList.remove('hidden');
        document.getElementById('kanpe-question').textContent = `Q${currentQIndex+1}. ${q.q}`;
        const labels = (currentConfig.theme === 'dark') ? ["A","B","C","D"] : ["青","赤","緑","黄"];
        document.getElementById('kanpe-answer').textContent = `正解: ${labels[q.correctIndex]} (${q.c[q.correctIndex]})`;
    } else {
        kanpeArea.classList.add('hidden');
    }
}

function renderRankingView(data) {
    const list = document.getElementById('ranking-list');
    list.innerHTML = '';
    if (data.length === 0) { list.innerHTML = '<p style="padding:20px;">参加者がいません</p>'; return; }
    const isCurrency = (currentConfig.scoreUnit === 'currency');
    data.forEach((r, i) => {
        const rank = i + 1;
        const div = document.createElement('div');
        let rankClass = 'rank-row';
        if (rank === 1) rankClass += ' rank-1';
        else if (rank === 2) rankClass += ' rank-2';
        else if (rank === 3) rankClass += ' rank-3';
        if (!r.isAlive && currentConfig.penalty === 'immediate') {
            div.style.opacity = "0.6"; div.style.background = "#eee";
        }
        div.className = rankClass;
        let scoreText = `${r.score}問`;
        if (isCurrency) {
            const amount = (r.score > 0) ? RANKING_MONEY_TREE[Math.min(r.score-1, RANKING_MONEY_TREE.length-1)] : 0;
            scoreText = `¥${amount.toLocaleString()}`;
        }
        const timeText = `${(r.time/1000).toFixed(2)}s`;
        div.innerHTML = `
            <div style="display:flex; align-items:center;">
                <span class="rank-badge">${rank}</span>
                <span>${r.name}</span>
            </div>
            <div class="rank-score">${scoreText}<br><small>${timeText}</small></div>
        `;
        list.appendChild(div);
    });
}
