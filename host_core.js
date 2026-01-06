/* =========================================================
 * host_core.js (修正版)
 * 役割：メイン遷移、ログイン管理、共通データ保持
 * =======================================================*/

// グローバル変数
let currentShowId = null;
let currentRoomId = null;
let createdQuestions = [];
let editingSetId = null;
let periodPlaylist = [];
let currentPeriodIndex = -1;
let studioQuestions = [];
let currentConfig = {};
let currentQIndex = 0;

window.views = {};

// 画面切り替えの共通関数
window.showView = function(targetId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(targetId);
    if(target) {
        target.classList.remove('hidden');
    }
    // 画面遷移時に特定の設定をリセット
    document.body.classList.remove('dark-theme');
};

// テキスト設定の反映
window.applyTextConfig = function() {
    if(typeof APP_TEXT === 'undefined') return;
    
    document.querySelectorAll('[data-text]').forEach(el => {
        const keys = el.getAttribute('data-text').split('.');
        let val = APP_TEXT;
        keys.forEach(k => { if(val) val = val[k]; });
        if(val) el.textContent = val;
    });

    const phMap = {
        'show-id-input': APP_TEXT.Login.Placeholder,
        'quiz-set-title': APP_TEXT.Creator.PlaceholderSetName,
        'question-text': APP_TEXT.Creator.PlaceholderQ,
        'config-program-title': APP_TEXT.Config.PlaceholderProgName,
        'room-code-input': APP_TEXT.Player.PlaceholderCode,
        'player-name-input': APP_TEXT.Player.PlaceholderName,
        'viewer-room-code': APP_TEXT.Player.PlaceholderCode 
    };
    for(let id in phMap) {
        const el = document.getElementById(id);
        if(el) el.placeholder = phMap[id];
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.applyTextConfig();

    // --- メインメニュー ---
    const hostBtn = document.getElementById('main-host-btn');
    if(hostBtn) hostBtn.addEventListener('click', () => window.showView('host-login-view'));

    const playerBtn = document.getElementById('main-player-btn');
    if(playerBtn) playerBtn.addEventListener('click', () => window.showView('respondent-view'));

    // --- ホストログイン ---
    const loginBtn = document.getElementById('host-login-submit-btn');
    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            const input = document.getElementById('show-id-input').value.trim().toUpperCase();
            if(!input) { alert(APP_TEXT.Login.AlertEmpty); return; }
            currentShowId = input;
            enterDashboard();
        });
    }

    // --- ナビゲーション (戻るボタン) ---
    document.querySelectorAll('.back-to-main').forEach(btn => {
        btn.addEventListener('click', () => window.showView('main-view'));
    });

    const creatorBack = document.getElementById('creator-back-btn');
    if(creatorBack) creatorBack.addEventListener('click', () => enterDashboard());

    const configBack = document.getElementById('config-header-back-btn');
    if(configBack) configBack.addEventListener('click', () => enterDashboard());

    const logoutBtn = document.querySelector('#host-dashboard-view .btn-logout');
    if(logoutBtn) logoutBtn.addEventListener('click', () => window.showView('main-view'));

    // --- ダッシュボード機能ボタン ---
    // ここで window. 内の関数を呼ぶことで、別ファイルの読み込み順が前後しても動作するようにします
    const createBtn = document.getElementById('dash-create-btn');
    if(createBtn) createBtn.addEventListener('click', () => {
        if(typeof window.initCreatorMode === 'function') window.initCreatorMode();
    });

    const configBtn = document.getElementById('dash-config-btn');
    if(configBtn) {
        configBtn.addEventListener('click', () => {
            if(typeof window.enterConfigMode === 'function') {
                window.enterConfigMode();
            } else {
                alert("エラー: host_config.js が読み込まれていません。");
            }
        });
    }

    const studioBtn = document.getElementById('dash-studio-btn');
    if(studioBtn) {
        studioBtn.addEventListener('click', () => {
            if (typeof window.startRoom === 'function') {
                window.startRoom();
            } else {
                alert("エラー: host_studio.js が読み込まれていません。");
            }
        });
    }

    const dashViewerBtn = document.getElementById('dash-viewer-btn');
    if(dashViewerBtn) {
        dashViewerBtn.addEventListener('click', () => window.showView('viewer-login-view'));
    }
});

function enterDashboard() {
    window.showView('host-dashboard-view');
    document.getElementById('dashboard-show-id').textContent = currentShowId;
    loadSavedSets();
}

function loadSavedSets() {
    const listEl = document.getElementById('dash-set-list');
    listEl.innerHTML = `<p style="text-align:center;">${APP_TEXT.Config.SelectLoading}</p>`;

    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        listEl.innerHTML = '';
        if(!data) {
            listEl.innerHTML = `<p style="text-align:center; color:#999;">${APP_TEXT.Config.SelectEmpty}</p>`;
            return;
        }
        Object.keys(data).forEach(key => {
            const item = data[key];
            const div = document.createElement('div');
            div.className = 'set-item';
            div.innerHTML = `<div><span style="font-weight:bold;">${item.title}</span></div>`;
            
            const btnArea = document.createElement('div');
            const editBtn = document.createElement('button');
            editBtn.textContent = "Edit";
            editBtn.className = 'btn-mini btn-edit';
            editBtn.onclick = () => {
                if(typeof window.loadSetForEditing === 'function') {
                    window.loadSetForEditing(key, item);
                }
            };
            btnArea.appendChild(editBtn);
            div.appendChild(btnArea);
            listEl.appendChild(div);
        });
    });
}
