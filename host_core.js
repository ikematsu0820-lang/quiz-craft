/* =========================================================
 * host_core.js (v66: Centralized App Namespace)
 * =======================================================*/

// ★名前空間の定義（アプリの全状態をここで管理）
window.App = {
    // 状態管理 (State)
    State: {
        currentShowId: null,
        currentRoomId: null,
        editingSetId: null,
        currentPeriodIndex: -1,
        currentQIndex: 0,
        isHost: false
    },
    
    // データ保持 (Data)
    Data: {
        createdQuestions: [], // Creator用
        periodPlaylist: [],   // Config/Studio用
        studioQuestions: [],  // Studio実行用
        currentConfig: {}     // 現在のルール設定
    },

    // UI操作 (View/Text)
    Ui: {
        views: {}, // DOM要素のキャッシュ
        
        // 画面切り替え
        showView: function(targetId) {
            // 全ビューを隠す
            Object.values(this.views).forEach(el => {
                if(el) el.classList.add('hidden');
            });
            // ターゲットを表示
            const target = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
            if(target) {
                target.classList.remove('hidden');
                // 画面遷移時にスクロールをトップへ
                window.scrollTo(0, 0);
            }
        },

        // テキスト一括適用 (text_config.js対応)
        applyTexts: function() {
            if(typeof APP_TEXT === 'undefined') return;
            
            // data-text属性を持つ要素を更新
            document.querySelectorAll('[data-text]').forEach(el => {
                const keys = el.getAttribute('data-text').split('.');
                let val = APP_TEXT;
                keys.forEach(k => { if(val) val = val[k]; });
                if(val) el.textContent = val;
            });

            // プレースホルダーの更新マップ
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
        },

        // トースト通知
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

    // アプリ初期化 (Entry Point)
    init: function() {
        // 1. ビュー要素のキャッシュ
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

        // 2. テキスト適用
        this.Ui.applyTexts();

        // 3. イベントリスナー登録
        this.bindEvents();

        // 4. 初期表示
        this.Ui.showView(this.Ui.views.main);
        
        console.log("App Initialized (v66)");
    },

    // イベントバインディング
    bindEvents: function() {
        const U = this.Ui;
        const V = U.views;

        // メイン画面遷移
        document.getElementById('main-host-btn')?.addEventListener('click', () => U.showView(V.hostLogin));
        document.getElementById('main-player-btn')?.addEventListener('click', () => U.showView(V.respondent));

        // ホストログイン
        document.getElementById('host-login-submit-btn')?.addEventListener('click', () => {
            const input = document.getElementById('show-id-input').value.trim().toUpperCase();
            if(!input) { alert(APP_TEXT.Login.AlertEmpty); return; }
            if(!/^[A-Z0-9_-]+$/.test(input)) { alert(APP_TEXT.Login.AlertError); return; }
            
            App.State.currentShowId = input;
            this.Dashboard.enter();
        });

        // 戻るボタンの共通制御
        document.querySelectorAll('.header-back-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const isLogout = btn.classList.contains('btn-logout');
                const isHome = btn.classList.contains('back-to-main');
                const isDash = e.target.closest('#design-view, #creator-view, #config-view, #viewer-login-view');
                
                if (isLogout) {
                    U.showView(V.main);
                    App.State.currentShowId = null;
                } else if (isHome) {
                    U.showView(V.main);
                } else {
                    // 基本はダッシュボードに戻る
                    this.Dashboard.enter();
                }
            });
        });

        // ダッシュボード機能
        document.getElementById('dash-create-btn')?.addEventListener('click', () => {
            if(window.initCreatorMode) window.initCreatorMode();
        });
        document.getElementById('dash-config-btn')?.addEventListener('click', () => {
            App.Data.periodPlaylist = []; // Reset
            if(window.enterConfigMode) window.enterConfigMode();
        });
        document.getElementById('dash-design-btn')?.addEventListener('click', () => {
            if(window.enterDesignMode) window.enterDesignMode();
            else U.showView(V.design);
        });
        document.getElementById('dash-studio-btn')?.addEventListener('click', () => {
            if(window.startRoom) window.startRoom();
        });
        document.getElementById('dash-viewer-btn')?.addEventListener('click', () => U.showView(V.viewerLogin));
    },

    // ダッシュボードロジック
    Dashboard: {
        enter: function() {
            App.Ui.showView(App.Ui.views.dashboard);
            document.getElementById('dashboard-show-id').textContent = App.State.currentShowId;
            this.loadItems();
            
            // デザイン設定のロード（もしあれば）
            if(window.loadDesignSettings) window.loadDesignSettings();
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
                // 統合リスト作成
                Object.keys(sets).forEach(k => items.push({ type: 'set', key: k, data: sets[k], date: sets[k].createdAt || 0 }));
                Object.keys(progs).forEach(k => items.push({ type: 'prog', key: k, data: progs[k], date: progs[k].createdAt || 0 }));
                
                // 日付順ソート
                items.sort((a, b) => b.date - a.date);

                listEl.innerHTML = '';
                if(items.length === 0) {
                    listEl.innerHTML = `<p style="text-align:center; color:#999;">データがありません</p>`;
                    return;
                }

                items.forEach(item => {
                    const el = this.createListItem(item);
                    listEl.appendChild(el);
                });
            });
        },

        createListItem: function(item) {
            const div = document.createElement('div');
            const d = item.data;
            const dateStr = new Date(item.date).toLocaleDateString();
            div.className = `dash-list-item item-type-${item.type}`;

            let labelHtml = '';
            let metaHtml = '';
            let buttonsHtml = '';

            if (item.type === 'set') {
                const typeLabel = (d.questions && d.questions.length > 0) ? d.questions[0].type.toUpperCase() : "MIX";
                labelHtml = `<span class="badge-set">SET</span> ${d.title}`;
                metaHtml = `${dateStr} / ${d.questions.length}Q / [${typeLabel}]`;
                
                buttonsHtml = `
                    <button class="btn-mini btn-info" onclick="App.Dashboard.handleQuickStart('${item.key}')">▶ Quick</button>
                    <button class="btn-mini btn-dark" onclick="window.loadSetForEditing('${item.key}', App.Dashboard.getCachedItem('${item.key}'))">Edit</button>
                    <button class="delete-btn btn-mini" onclick="App.Dashboard.deleteItem('saved_sets', '${item.key}')">Del</button>
                `;
                // ※キャッシュ用にデータを一時保存
                this._cache = this._cache || {};
                this._cache[item.key] = d;

            } else {
                labelHtml = `<span class="badge-prog">PROG</span> ${d.title}`;
                metaHtml = `${dateStr} / ${d.playlist ? d.playlist.length : 0} Periods`;
                
                buttonsHtml = `
                    <button class="btn-mini btn-danger" onclick="window.loadProgramToConfigOnDash(App.Dashboard.getCachedItem('${item.key}'))">Load</button>
                    <button class="delete-btn btn-mini" onclick="App.Dashboard.deleteItem('saved_programs', '${item.key}')">Del</button>
                `;
                this._cache[item.key] = d;
            }

            div.innerHTML = `
                <div style="flex:1;">
                    <div class="item-title">${labelHtml}</div>
                    <div class="item-meta">${metaHtml}</div>
                </div>
                <div style="display:flex; gap:5px;">${buttonsHtml}</div>
            `;
            return div;
        },
        
        getCachedItem: function(key) { return this._cache[key]; },

        handleQuickStart: function(key) {
            const data = this._cache[key];
            if(window.quickStartSet && confirm(`「${data.title}」をU-NEXT風デザインで\n即座にスタジオ投影しますか？`)) {
                window.quickStartSet(data);
            }
        },

        deleteItem: function(path, key) {
            if(confirm(APP_TEXT.Dashboard.DeleteConfirm)) {
                window.db.ref(`${path}/${App.State.currentShowId}/${key}`).remove()
                .then(() => this.loadItems());
            }
        }
    }
};

// -------------------------------------------------------------
// LEGACY BRIDGE (互換性維持のためのブリッジ)
// -------------------------------------------------------------
// 他のファイル(host_studio.jsなど)はまだグローバル変数を参照しているため、
// Getter/Setterを使ってApp.Stateと同期させます。
// ※リファクタリングが進んだら削除します。

Object.defineProperty(window, 'currentShowId', {
    get: () => App.State.currentShowId,
    set: (v) => App.State.currentShowId = v
});
Object.defineProperty(window, 'currentRoomId', {
    get: () => App.State.currentRoomId,
    set: (v) => App.State.currentRoomId = v
});
Object.defineProperty(window, 'createdQuestions', {
    get: () => App.Data.createdQuestions,
    set: (v) => App.Data.createdQuestions = v
});
Object.defineProperty(window, 'periodPlaylist', {
    get: () => App.Data.periodPlaylist,
    set: (v) => App.Data.periodPlaylist = v
});
Object.defineProperty(window, 'studioQuestions', {
    get: () => App.Data.studioQuestions,
    set: (v) => App.Data.studioQuestions = v
});
Object.defineProperty(window, 'currentConfig', {
    get: () => App.Data.currentConfig,
    set: (v) => App.Data.currentConfig = v
});
// 簡易変数は直接マッピング（同期ズレに注意）
window.editingSetId = null; 
window.currentPeriodIndex = -1;
window.currentQIndex = 0;

// 旧関数名のエイリアス
window.showView = App.Ui.showView.bind(App.Ui);
window.showToast = App.Ui.showToast.bind(App.Ui);
window.enterDashboard = App.Dashboard.enter.bind(App.Dashboard);

// -------------------------------------------------------------
// 起動処理
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
