/* =========================================================
 * host_core.js (v70: Robust App Initialization)
 * =======================================================*/

// ★ 安全装置: Appがまだ無ければ作る
window.App = window.App || {};

// StateとDataの初期化（既に定義されていればそのまま）
window.App.State = window.App.State || {
    currentShowId: null,
    currentRoomId: null,
    isHost: false
};

window.App.Data = window.App.Data || {
    createdQuestions: [],
    periodPlaylist: [],
    studioQuestions: [],
    currentConfig: {}
};

// UI機能の定義
window.App.Ui = {
    views: {},
    
    showView: function(targetId) {
        // ビュー要素の再取得（キャッシュが空の場合の保険）
        if (Object.keys(this.views).length === 0) {
            this.cacheViews();
        }

        Object.values(this.views).forEach(el => {
            if(el) el.classList.add('hidden');
        });
        
        const target = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if(target) {
            target.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else {
            console.error("Target view not found:", targetId);
        }
    },

    cacheViews: function() {
        this.views = {
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
    },

    applyTexts: function() {
        if(typeof APP_TEXT === 'undefined') return;
        document.querySelectorAll('[data-text]').forEach(el => {
            const keys = el.getAttribute('data-text').split('.');
            let val = APP_TEXT;
            keys.forEach(k => { if(val) val = val[k]; });
            if(val) el.textContent = val;
        });
        
        const phMap = {
            'show-id-input': APP_TEXT.Login.Placeholder,
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
    },

    showToast: function(msg) {
        const container = document.getElementById('toast-container');
        if(!container) return;
        const div = document.createElement('div');
        div.className = 'toast-msg';
        div.textContent = msg;
        container.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }
};

// 初期化とイベント設定
window.App.init = function() {
    this.Ui.cacheViews();
    this.Ui.applyTexts();
    this.bindEvents();
    
    // 起動時はメイン画面へ
    this.Ui.showView(this.Ui.views.main);
    console.log("App Initialized (v70)");
};

window.App.bindEvents = function() {
    const U = this.Ui;
    const V = this.Ui.views;

    // メイン画面
    document.getElementById('main-host-btn')?.addEventListener('click', () => U.showView(V.hostLogin));
    document.getElementById('main-player-btn')?.addEventListener('click', () => U.showView(V.respondent));

    // ログイン
    document.getElementById('host-login-submit-btn')?.addEventListener('click', () => {
        const input = document.getElementById('show-id-input').value.trim().toUpperCase();
        if(!input) { alert(APP_TEXT.Login.AlertEmpty); return; }
        if(!/^[A-Z0-9_-]+$/.test(input)) { alert(APP_TEXT.Login.AlertError); return; }
        
        window.App.State.currentShowId = input;
        window.App.Dashboard.enter();
    });

    // 戻るボタン共通制御
    document.querySelectorAll('.header-back-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const isLogout = btn.classList.contains('btn-logout');
            const isHome = btn.classList.contains('back-to-main');
            
            if (isLogout) {
                U.showView(V.main);
                window.App.State.currentShowId = null;
            } else if (isHome) {
                U.showView(V.main);
            } else {
                window.App.Dashboard.enter();
            }
        });
    });

    // --- ダッシュボードのボタン（ここが動かない原因だった場所） ---
    document.getElementById('dash-create-btn')?.addEventListener('click', () => {
        console.log("Create Button Clicked"); // デバッグ用
        if(window.App.Creator && window.App.Creator.init) {
            window.App.Creator.init();
        } else {
            alert("エラー: Creatorモジュールが読み込まれていません。\nページをリロードしてみてください。");
        }
    });

    document.getElementById('dash-config-btn')?.addEventListener('click', () => {
        window.App.Data.periodPlaylist = [];
        if(window.App.Config && window.App.Config.init) window.App.Config.init();
    });
    
    document.getElementById('dash-design-btn')?.addEventListener('click', () => {
        if(window.App.Design && window.App.Design.init) window.App.Design.init();
        else U.showView(V.design);
    });

    document.getElementById('dash-studio-btn')?.addEventListener('click', () => {
        if(window.App.Studio && window.App.Studio.startRoom) window.App.Studio.startRoom();
    });
    
    document.getElementById('dash-viewer-btn')?.addEventListener('click', () => U.showView(V.viewerLogin));
};

// ダッシュボードロジック
window.App.Dashboard = {
    enter: function() {
        window.App.Ui.showView(window.App.Ui.views.dashboard);
        document.getElementById('dashboard-show-id').textContent = window.App.State.currentShowId;
        this.loadItems();
    },
    
    loadItems: function() {
        const listEl = document.getElementById('dash-set-list');
        if(!listEl) return;
        
        listEl.innerHTML = `<p style="text-align:center;">${APP_TEXT.Config.SelectLoading}</p>`;
        const showId = window.App.State.currentShowId;

        Promise.all([
            window.db.ref(`saved_sets/${showId}`).once('value'),
            window.db.ref(`saved_programs/${showId}`).once('value')
        ]).then(([setSnap, progSnap]) => {
            const sets = setSnap.val() || {};
            const progs = progSnap.val() || {};
            let items = [];

            Object.keys(sets).forEach(k => items.push({ type: 'set', key: k, data: sets[k], date: sets[k].createdAt || 0 }));
            Object.keys(progs).forEach(k => items.push({ type: 'prog', key: k, data: progs[k], date: progs[k].createdAt || 0 }));
            
            items.sort((a, b) => b.date - a.date);
            listEl.innerHTML = '';

            if(items.length === 0) {
                listEl.innerHTML = `<p style="text-align:center; color:#999;">データがありません</p>`;
                return;
            }

            this._cache = {};
            items.forEach(item => {
                this._cache[item.key] = item.data;
                listEl.appendChild(this.createItem(item));
            });
        });
    },

    createItem: function(item) {
        const div = document.createElement('div');
        const d = item.data;
        const dateStr = new Date(item.date).toLocaleDateString();
        div.className = `dash-list-item item-type-${item.type}`;

        if (item.type === 'set') {
            const typeLabel = (d.questions && d.questions.length > 0) ? d.questions[0].type.toUpperCase() : "MIX";
            div.innerHTML = `
                <div style="flex:1;">
                    <div class="item-title"><span class="badge-set">SET</span> ${d.title}</div>
                    <div class="item-meta">${dateStr} / ${d.questions.length}Q / [${typeLabel}]</div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn-mini btn-info" onclick="window.App.Dashboard.quick('${item.key}')">▶ Quick</button>
                    <button class="btn-mini btn-dark" onclick="window.App.Creator.loadSet('${item.key}', window.App.Dashboard.getCache('${item.key}'))">Edit</button>
                    <button class="delete-btn btn-mini" onclick="window.App.Dashboard.del('saved_sets', '${item.key}')">Del</button>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div style="flex:1;">
                    <div class="item-title"><span class="badge-prog">PROG</span> ${d.title}</div>
                    <div class="item-meta">${dateStr} / ${d.playlist ? d.playlist.length : 0} Periods</div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn-mini btn-danger" onclick="window.App.Config.loadExternal(window.App.Dashboard.getCache('${item.key}'))">Load</button>
                    <button class="delete-btn btn-mini" onclick="window.App.Dashboard.del('saved_programs', '${item.key}')">Del</button>
                </div>
            `;
        }
        return div;
    },
    
    getCache: function(key) { return this._cache[key]; },
    
    quick: function(key) {
        const data = this._cache[key];
        if(window.App.Studio && window.App.Studio.quickStart && confirm(`「${data.title}」をU-NEXT風デザインで\n即座にスタジオ投影しますか？`)) {
            window.App.Studio.quickStart(data);
        }
    },
    
    del: function(path, key) {
        if(confirm(APP_TEXT.Dashboard.DeleteConfirm)) {
            window.db.ref(`${path}/${window.App.State.currentShowId}/${key}`).remove()
            .then(() => this.loadItems());
        }
    }
};

// --- 互換性ブリッジ (古いHTMLや他ファイルとの連携用) ---
Object.defineProperty(window, 'currentShowId', { get: () => window.App.State.currentShowId, set: (v) => window.App.State.currentShowId = v });
Object.defineProperty(window, 'currentRoomId', { get: () => window.App.State.currentRoomId, set: (v) => window.App.State.currentRoomId = v });
Object.defineProperty(window, 'createdQuestions', { get: () => window.App.Data.createdQuestions, set: (v) => window.App.Data.createdQuestions = v });
Object.defineProperty(window, 'periodPlaylist', { get: () => window.App.Data.periodPlaylist, set: (v) => window.App.Data.periodPlaylist = v });
Object.defineProperty(window, 'studioQuestions', { get: () => window.App.Data.studioQuestions, set: (v) => window.App.Data.studioQuestions = v });
Object.defineProperty(window, 'currentConfig', { get: () => window.App.Data.currentConfig, set: (v) => window.App.Data.currentConfig = v });

// 旧関数名のマッピング
window.initCreatorMode = () => window.App.Creator.init();
window.loadSetForEditing = (k, i) => window.App.Creator.loadSet(k, i);
window.enterConfigMode = () => window.App.Config.init();
window.loadProgramToConfigOnDash = (d) => window.App.Config.loadExternal(d);
window.startRoom = () => window.App.Studio.startRoom();
window.quickStartSet = (d) => window.App.Studio.quickStart(d);
window.enterDashboard = () => window.App.Dashboard.enter();
window.showView = (id) => window.App.Ui.showView(id);
window.showToast = (msg) => window.App.Ui.showToast(msg);

// 起動
document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
});
