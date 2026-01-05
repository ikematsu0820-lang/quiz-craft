/* =========================================================
 * host_core.js (v27: Fix Player Button)
 * =======================================================*/

// --- グローバル変数 (全ファイルで共有) ---
let currentShowId = null;
let currentRoomId = null;

// 作成モード用
let createdQuestions = [];
let editingSetId = null;

// 設定・スタジオ用
let periodPlaylist = [];
let currentPeriodIndex = -1;
let studioQuestions = [];
let currentConfig = { penalty: 'none', scoreUnit: 'point', theme: 'light', timeLimit: 0, passCount: 0 };
let currentQIndex = 0;

const RANKING_MONEY_TREE = [
    10000, 20000, 30000, 50000, 100000,
    200000, 300000, 500000, 750000, 1000000,
    1500000, 2500000, 5000000, 7500000, 10000000
];

// --- 画面定義 & 遷移関数 (ここで定義して確実に使えるようにする) ---
window.views = {};
window.showView = function(targetView) {
    // 初回アクセス時にDOM要素を取得
    if (Object.keys(window.views).length === 0) {
        window.views = {
            main: document.getElementById('main-view'),
            hostLogin: document.getElementById('host-login-view'),
            dashboard: document.getElementById('host-dashboard-view'),
            creator: document.getElementById('creator-view'),
            config: document.getElementById('config-view'),
            hostControl: document.getElementById('host-control-view'),
            ranking: document.getElementById('ranking-view'),
            respondent: document.getElementById('respondent-view'),
            playerGame: document.getElementById('player-game-view')
        };
    }

    Object.values(window.views).forEach(v => {
        if(v) v.classList.add('hidden');
    });
    if(targetView) targetView.classList.remove('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. メインメニュー
    const hostBtn = document.getElementById('main-host-btn');
    if(hostBtn) hostBtn.addEventListener('click', () => window.showView(window.views.hostLogin));

    // ★追加：回答者ボタンのイベント (これが抜けていました！)
    const playerBtn = document.getElementById('main-player-btn');
    if(playerBtn) playerBtn.addEventListener('click', () => window.showView(window.views.respondent));

    // 2. ホストログイン
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

    // 3. 戻るボタン類 (共通)
    const backBtns = document.querySelectorAll('.back-to-main');
    backBtns.forEach(btn => {
        btn.addEventListener('click', () => window.showView(window.views.main));
    });

    // 4. ダッシュボード
    const createBtn = document.getElementById('dash-create-btn');
    if(createBtn) createBtn.addEventListener('click', initCreatorMode);

    const configBtn = document.getElementById('dash-config-btn');
    if(configBtn) {
        configBtn.addEventListener('click', () => {
            periodPlaylist = []; // 新規ならクリア
            enterConfigMode(); 
        });
    }

    const studioBtn = document.getElementById('dash-studio-btn');
    if(studioBtn) studioBtn.addEventListener('click', startRoom);

    // 5. 各画面の戻るボタン
    const configHeaderBackBtn = document.getElementById('config-header-back-btn');
    if(configHeaderBackBtn) configHeaderBackBtn.addEventListener('click', () => enterDashboard());

    const creatorBackBtn = document.getElementById('creator-back-btn');
    if(creatorBackBtn) creatorBackBtn.addEventListener('click', () => enterDashboard());

    // 6. 機能ボタン
    const addQBtn = document.getElementById('add-question-btn');
    if(addQBtn) addQBtn.addEventListener('click', addQuestion);
    
    const saveBtn = document.getElementById('save-to-cloud-btn');
    if(saveBtn) saveBtn.addEventListener('click', saveToCloud);

    const configAddBtn = document.getElementById('config-add-playlist-btn');
    if(configAddBtn) configAddBtn.addEventListener('click', addPeriodToPlaylist);

    const configSaveProgBtn = document.getElementById('config-save-program-btn');
    if(configSaveProgBtn) configSaveProgBtn.addEventListener('click', saveProgramToCloud);

    const configGoStudioBtn = document.getElementById('config-go-studio-btn');
    if(configGoStudioBtn) configGoStudioBtn.addEventListener('click', startRoom);

    const initStatusSelect = document.getElementById('config-initial-status');
    if(initStatusSelect) initStatusSelect.addEventListener('change', updateBuilderUI);
});

// --- ダッシュボード機能 ---
function enterDashboard() {
    window.showView(window.views.dashboard);
    document.getElementById('dashboard-show-id').textContent = currentShowId;
    loadSavedSets();
    loadSavedPrograms();
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
            div.innerHTML = `
                <div>
                    <span>${item.title}</span>
                    <div style="font-size:0.8em; color:#666;">
                        ${new Date(item.createdAt).toLocaleDateString()} / 全${item.questions.length}問
                    </div>
                </div>
            `;
            const btnArea = document.createElement('div');
            btnArea.style.display = 'flex';
            btnArea.style.gap = '5px';

            const editBtn = document.createElement('button');
            editBtn.textContent = '編集';
            editBtn.style.backgroundColor = '#2c3e50';
            editBtn.style.color = 'white';
            editBtn.style.fontSize = '0.8em';
            editBtn.style.padding = '4px 8px';
            editBtn.onclick = () => loadSetForEditing(key, item);

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = '削除';
            delBtn.onclick = () => {
                if(confirm(`削除しますか？`)) {
                    window.db.ref(`saved_sets/${currentShowId}/${key}`).remove();
                    div.remove();
                }
            };
            btnArea.appendChild(editBtn);
            btnArea.appendChild(delBtn);
            div.appendChild(btnArea);
            listEl.appendChild(div);
        });
    });
}

function loadSavedPrograms() {
    const listEl = document.getElementById('dash-program-list');
    listEl.innerHTML = '<p style="text-align:center;">読み込み中...</p>';

    window.db.ref(`saved_programs/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        listEl.innerHTML = '';
        if(!data) {
            listEl.innerHTML = '<p style="text-align:center; color:#999;">保存されたプログラムはありません</p>';
            return;
        }
        Object.keys(data).forEach(key => {
            const item = data[key];
            const div = document.createElement('div');
            div.className = 'set-item';
            div.style.borderLeft = "5px solid #0055ff";

            const periodCount = item.playlist ? item.playlist.length : 0;

            div.innerHTML = `
                <div style="cursor:pointer; flex:1;" onclick="loadProgramIntoConfig('${key}')">
                    <span style="font-weight:bold; color:#0055ff;">${item.title}</span>
                    <div style="font-size:0.8em; color:#666;">
                        全${periodCount}ピリオド (クリックで読込)
                    </div>
                </div>
            `;
            
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = '削除';
            delBtn.onclick = () => {
                if(confirm(`プログラム「${item.title}」を削除しますか？`)) {
                    window.db.ref(`saved_programs/${currentShowId}/${key}`).remove();
                    div.remove();
                }
            };
            div.appendChild(delBtn);
            listEl.appendChild(div);
        });
    });
}

window.loadProgramIntoConfig = function(key) {
    window.db.ref(`saved_programs/${currentShowId}/${key}`).once('value', snap => {
        const prog = snap.val();
        if(prog && prog.playlist) {
            periodPlaylist = prog.playlist; 
            alert(`プログラム「${prog.title}」を読み込みました。\n構成を確認してスタジオへ移動してください。`);
            enterConfigMode(); 
        }
    });
};
