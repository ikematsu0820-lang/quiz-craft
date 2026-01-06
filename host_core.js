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

/* host_core.js の loadSavedSets をこれに差し替え */
function loadAllDashboardItems() {
    const listEl = document.getElementById('dash-set-list');
    if(!listEl) return;
    
    // 見出しを更新（HTMLをいじらなくて済むようにJSで書き換え）
    const heading = listEl.previousElementSibling;
    if(heading && heading.tagName === 'H4') heading.textContent = "保存済みデータ (Sets & Programs)";

    listEl.innerHTML = `<p style="text-align:center;">${APP_TEXT.Config.SelectLoading}</p>`;

    // セットとプログラムを並行して取得
    Promise.all([
        window.db.ref(`saved_sets/${currentShowId}`).once('value'),
        window.db.ref(`saved_programs/${currentShowId}`).once('value')
    ]).then(([setSnap, progSnap]) => {
        const sets = setSnap.val() || {};
        const progs = progSnap.val() || {};
        
        let items = [];

        // セットを配列化
        Object.keys(sets).forEach(key => {
            items.push({ type: 'set', key: key, data: sets[key], date: sets[key].createdAt || 0 });
        });

        // プログラムを配列化
        Object.keys(progs).forEach(key => {
            items.push({ type: 'prog', key: key, data: progs[key], date: progs[key].createdAt || 0 });
        });

        // 日付の新しい順にソート
        items.sort((a, b) => b.date - a.date);

        listEl.innerHTML = '';
        if(items.length === 0) {
            listEl.innerHTML = `<p style="text-align:center; color:#999;">データがありません</p>`;
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            const d = item.data;
            const dateStr = new Date(item.date).toLocaleDateString();

            if (item.type === 'set') {
                // ▼ セット（素材）の表示
                let typeLabel = "Mix";
                if (d.questions && d.questions.length > 0) typeLabel = d.questions[0].type.toUpperCase();
                
                div.className = 'dash-list-item item-type-set';
                div.innerHTML = `
                    <div style="flex:1;">
                        <div class="item-title"><span class="badge-set">SET</span> ${d.title}</div>
                        <div class="item-meta">
                            ${dateStr} / ${d.questions.length}Q / [${typeLabel}]
                        </div>
                    </div>
                `;
                
                // ボタンエリア
                const btnArea = document.createElement('div');
                btnArea.style.display = 'flex';
                btnArea.style.gap = '5px';

                const editBtn = document.createElement('button');
                editBtn.className = 'btn-mini';
                editBtn.style.background = '#2c3e50';
                editBtn.style.color = 'white';
                editBtn.textContent = 'Edit';
                editBtn.onclick = () => loadSetForEditing(item.key, d);

                const delBtn = document.createElement('button');
                delBtn.className = 'delete-btn';
                delBtn.textContent = 'Del';
                delBtn.onclick = () => {
                    if(confirm(APP_TEXT.Dashboard.DeleteConfirm)) {
                        window.db.ref(`saved_sets/${currentShowId}/${item.key}`).remove().then(loadAllDashboardItems);
                    }
                };
                
                btnArea.appendChild(editBtn);
                btnArea.appendChild(delBtn);
                div.appendChild(btnArea);

            } else {
                // ▼ プログラム（構成）の表示
                div.className = 'dash-list-item item-type-prog';
                div.innerHTML = `
                    <div style="flex:1;">
                        <div class="item-title"><span class="badge-prog">PROG</span> ${d.title}</div>
                        <div class="item-meta">
                            ${dateStr} / ${d.playlist ? d.playlist.length : 0} Periods
                        </div>
                    </div>
                `;

                // ボタンエリア
                const btnArea = document.createElement('div');
                btnArea.style.display = 'flex';
                btnArea.style.gap = '5px';

                const loadBtn = document.createElement('button');
                loadBtn.className = 'btn-mini';
                loadBtn.style.background = '#e94560'; // ピンク
                loadBtn.style.color = 'white';
                loadBtn.textContent = 'Load';
                loadBtn.onclick = () => {
                    // ダッシュボードから直接Configへロードして遷移
                    if(typeof window.loadProgramToConfig === 'function') {
                        window.loadProgramToConfig(d);
                    }
                };

                const delBtn = document.createElement('button');
                delBtn.className = 'delete-btn';
                delBtn.textContent = 'Del';
                delBtn.onclick = () => {
                    if(confirm(APP_TEXT.Config.MsgConfirmDelProg)) {
                        window.db.ref(`saved_programs/${currentShowId}/${item.key}`).remove().then(loadAllDashboardItems);
                    }
                };

                btnArea.appendChild(loadBtn);
                btnArea.appendChild(delBtn);
                div.appendChild(btnArea);
            }

            listEl.appendChild(div);
        });
    });
}
