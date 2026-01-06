/* =========================================================
 * host_core.js (v58: Back Button Fix + Design View)
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

// 画面管理
window.views = {};

window.showView = function(targetView) {
    Object.values(window.views).forEach(v => {
        if(v) v.classList.add('hidden');
    });
    if(targetView) targetView.classList.remove('hidden');
};

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

// 起動時処理
document.addEventListener('DOMContentLoaded', () => {
    // 1. テキスト適用
    window.applyTextConfig();

    // 2. ビューの登録
    window.views = {
        main: document.getElementById('main-view'),
        hostLogin: document.getElementById('host-login-view'),
        dashboard: document.getElementById('host-dashboard-view'),
        design: document.getElementById('design-view'),
        creator: document.getElementById('creator-view'),
        config: document.getElementById('config-view'),
        hostControl: document.getElementById('host-control-view'),
        ranking: document.getElementById('ranking-view'),
        respondent: document.getElementById('respondent-view'),
        playerGame: document.getElementById('player-game-view'),
        viewerLogin: document.getElementById('viewer-login-view'),
        viewerMain: document.getElementById('viewer-main-view')
    };

    // 3. 初期表示
    Object.values(window.views).forEach(v => {
        if(v && v.id !== 'main-view') v.classList.add('hidden');
    });

    // 4. メイン遷移
    const hostBtn = document.getElementById('main-host-btn');
    if(hostBtn) hostBtn.addEventListener('click', () => window.showView(window.views.hostLogin));

    const playerBtn = document.getElementById('main-player-btn');
    if(playerBtn) playerBtn.addEventListener('click', () => window.showView(window.views.respondent));

    const loginBtn = document.getElementById('host-login-submit-btn');
    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            const input = document.getElementById('show-id-input').value.trim().toUpperCase();
            if(!input) { alert(APP_TEXT.Login.AlertEmpty); return; }
            if(!/^[A-Z0-9_-]+$/.test(input)) { alert(APP_TEXT.Login.AlertError); return; }
            currentShowId = input;
            enterDashboard();
        });
    }

    // ★戻るボタン共通（ここが今回の肝）
    // - header-back-btn：原則ダッシュボードへ
    // - back-to-main：ログアウト/ホーム系
    document.querySelectorAll('.header-back-btn').forEach(btn => {
        const isLogout = btn.classList.contains('btn-logout') || btn.closest('#host-dashboard-view');
        const isHome = btn.classList.contains('back-to-main') && (
            btn.closest('#host-login-view') ||
            btn.closest('#respondent-view')
        );

        if(isLogout || isHome) {
            btn.addEventListener('click', () => window.showView(window.views.main));
        } else {
            // viewer-login / creator / config / design は全部ダッシュボードに戻す
            btn.addEventListener('click', () => enterDashboard());
        }
    });

    // 各機能への遷移（ダッシュボード）
    const createBtn = document.getElementById('dash-create-btn');
    if(createBtn) createBtn.addEventListener('click', () => {
        if(typeof window.initCreatorMode === 'function') window.initCreatorMode();
    });

    const configBtn = document.getElementById('dash-config-btn');
    if(configBtn) {
        configBtn.addEventListener('click', () => {
            periodPlaylist = [];
            if(typeof enterConfigMode === 'function') enterConfigMode();
        });
    }

    const studioBtn = document.getElementById('dash-studio-btn');
    if(studioBtn) studioBtn.addEventListener('click', startRoom);

    const dashViewerBtn = document.getElementById('dash-viewer-btn');
    if(dashViewerBtn) dashViewerBtn.addEventListener('click', () => window.showView(window.views.viewerLogin));

    const dashDesignBtn = document.getElementById('dash-design-btn');
    if(dashDesignBtn) dashDesignBtn.addEventListener('click', () => {
        if(typeof window.enterDesignMode === 'function') window.enterDesignMode();
        else window.showView(window.views.design);
    });

    // 保存・追加ボタン等
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
});

function enterDashboard() {
    window.showView(window.views.dashboard);
    document.getElementById('dashboard-show-id').textContent = currentShowId;
    loadSavedSets();

    // デザイン設定があればダッシュボード復帰時に読み直し（任意だけど便利）
    if(typeof window.loadDesignSettings === 'function') {
        window.loadDesignSettings();
    }
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

            let typeLabel = "Mix";
            if (item.questions && item.questions.length > 0) {
                const type = item.questions[0].type;
                if (type === 'choice') typeLabel = APP_TEXT.Creator.TypeChoice;
                else if (type === 'sort') typeLabel = APP_TEXT.Creator.TypeSort;
                else if (type === 'free_oral') typeLabel = APP_TEXT.Creator.TypeFreeOral;
                else if (type === 'free_written') typeLabel = APP_TEXT.Creator.TypeFreeWritten;
                else if (type === 'multi') typeLabel = APP_TEXT.Creator.TypeMulti;
            }

            div.innerHTML = `
                <div>
                    <span style="font-weight:bold;">${item.title}</span> <span style="font-size:0.8em; color:#0055ff;">[${typeLabel}]</span>
                    <div style="font-size:0.8em; color:#666;">
                        ${new Date(item.createdAt).toLocaleDateString()} / ${item.questions.length}Q
                    </div>
                </div>
            `;
            const btnArea = document.createElement('div');
            btnArea.style.display = 'flex';
            btnArea.style.gap = '5px';

            const editBtn = document.createElement('button');
            editBtn.textContent = "Edit";
            editBtn.className = 'btn-mini';
            editBtn.style.backgroundColor = '#2c3e50';
            editBtn.style.color = 'white';
            editBtn.onclick = () => loadSetForEditing(key, item);

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = "Del";
            delBtn.onclick = () => {
                if(confirm(APP_TEXT.Dashboard.DeleteConfirm)) {
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
