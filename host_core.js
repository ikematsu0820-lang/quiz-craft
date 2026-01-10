/* =========================================================
 * host_core.js (v69: Fix App Namespace & Navigation)
 * =======================================================*/

// ★ 新しい管理システム (Namespace)
window.App = {
    State: {
        currentShowId: null,
        currentRoomId: null,
        isHost: false
    },
    Data: {
        createdQuestions: [],
        periodPlaylist: [],
        studioQuestions: [],
        currentConfig: {}
    },
    Ui: {
        views: {},
        showView: function(targetId) {
            Object.values(this.views).forEach(el => {
                if(el) el.classList.add('hidden');
            });
            const target = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
            if(target) {
                target.classList.remove('hidden');
                window.scrollTo(0, 0);
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
    },
    
    // 初期化
    init: function() {
        this.Ui.views = {
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

        this.applyTexts();
        this.bindEvents();
        
        // 起動時はメイン画面へ
        this.Ui.showView(this.Ui.views.main);
        console.log("App Initialized (v69)");
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

    bindEvents: function() {
        // メイン画面
        document.getElementById('main-host-btn')?.addEventListener('click', () => App.Ui.showView(App.Ui.views.hostLogin));
        document.getElementById('main-player-btn')?.addEventListener('click', () => App.Ui.showView(App.Ui.views.respondent));

        // ログイン
        document.getElementById('host-login-submit-btn')?.addEventListener('click', () => {
            const input = document.getElementById('show-id-input').value.trim().toUpperCase();
            if(!input) { alert(APP_TEXT.Login.AlertEmpty); return; }
            if(!/^[A-Z0-9_-]+$/.test(input)) { alert(APP_TEXT.Login.AlertError); return; }
            
            App.State.currentShowId = input;
            this.Dashboard.enter();
        });

        // 戻るボタン共通制御
        document.querySelectorAll('.header-back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('btn-logout')) {
                    App.Ui.showView(App.Ui.views.main);
                    App.State.currentShowId = null;
                } else if (btn.classList.contains('back-to-main')) {
                    App.Ui.showView(App.Ui.views.main);
                } else {
                    this.Dashboard.enter();
                }
            });
        });

        // ダッシュボード遷移
        document.getElementById('dash-create-btn')?.addEventListener('click', () => {
            if(window.initCreatorMode) window.initCreatorMode();
        });
        document.getElementById('dash-config-btn')?.addEventListener('click', () => {
            App.Data.periodPlaylist = [];
            if(window.enterConfigMode) window.enterConfigMode();
        });
        document.getElementById('dash-design-btn')?.addEventListener('click', () => {
            if(window.enterDesignMode) window.enterDesignMode();
            else App.Ui.showView(App.Ui.views.design);
        });
        document.getElementById('dash-studio-btn')?.addEventListener('click', () => {
            if(window.startRoom) window.startRoom();
        });
        document.getElementById('dash-viewer-btn')?.addEventListener('click', () => App.Ui.showView(App.Ui.views.viewerLogin));
    },

    Dashboard: {
        enter: function() {
            App.Ui.showView(App.Ui.views.dashboard);
            document.getElementById('dashboard-show-id').textContent = App.State.currentShowId;
            this.loadItems();
        },
        
        loadItems: function() {
            const listEl = document.getElementById('dash-set-list');
            if(!listEl) return;
            
            listEl.innerHTML = `<p style="text-align:center;">${APP_TEXT.Config.SelectLoading}</p>`;
            const showId = App.State.currentShowId;

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

                // キャッシュ用
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
                        <button class="btn-mini btn-info" onclick="App.Dashboard.quick('${item.key}')">▶ Quick</button>
                        <button class="btn-mini btn-dark" onclick="window.loadSetForEditing('${item.key}', App.Dashboard.getCache('${item.key}'))">Edit</button>
                        <button class="delete-btn btn-mini" onclick="App.Dashboard.del('saved_sets', '${item.key}')">Del</button>
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div style="flex:1;">
                        <div class="item-title"><span class="badge-prog">PROG</span> ${d.title}</div>
                        <div class="item-meta">${dateStr} / ${d.playlist ? d.playlist.length : 0} Periods</div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-mini btn-danger" onclick="window.loadProgramToConfigOnDash(App.Dashboard.getCache('${item.key}'))">Load</button>
                        <button class="delete-btn btn-mini" onclick="App.Dashboard.del('saved_programs', '${item.key}')">Del</button>
                    </div>
                `;
            }
            return div;
        },
        
        getCache: function(key) { return this._cache[key]; },
        
        quick: function(key) {
            const data = this._cache[key];
            if(window.quickStartSet && confirm(`「${data.title}」をU-NEXT風デザインで\n即座にスタジオ投影しますか？`)) {
                window.quickStartSet(data);
            }
        },
        
        del: function(path, key) {
            if(confirm(APP_TEXT.Dashboard.DeleteConfirm)) {
                window.db.ref(`${path}/${App.State.currentShowId}/${key}`).remove()
                .then(() => this.loadItems());
            }
        }
    }
};

// --- 互換性ブリッジ (古いコードも動くようにする) ---
Object.defineProperty(window, 'currentShowId', { get: () => App.State.currentShowId, set: (v) => App.State.currentShowId = v });
Object.defineProperty(window, 'currentRoomId', { get: () => App.State.currentRoomId, set: (v) => App.State.currentRoomId = v });
Object.defineProperty(window, 'createdQuestions', { get: () => App.Data.createdQuestions, set: (v) => App.Data.createdQuestions = v });
Object.defineProperty(window, 'periodPlaylist', { get: () => App.Data.periodPlaylist, set: (v) => App.Data.periodPlaylist = v });
Object.defineProperty(window, 'studioQuestions', { get: () => App.Data.studioQuestions, set: (v) => App.Data.studioQuestions = v });
Object.defineProperty(window, 'currentConfig', { get: () => App.Data.currentConfig, set: (v) => App.Data.currentConfig = v });

window.showView = App.Ui.showView.bind(App.Ui);
window.showToast = App.Ui.showToast.bind(App.Ui);
window.enterDashboard = App.Dashboard.enter.bind(App.Dashboard);

// 起動
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
