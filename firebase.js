/* =========================================================
 * firebase.js
 * =======================================================*/
// ... (前半のFirebase設定部分は変更なし) ...

window.db = firebase.database();

/* --- 共通：画面切り替え機能 --- */
window.views = {
    main: 'main-view',
    hostLogin: 'host-login-view',
    dashboard: 'host-dashboard-view',
    creator: 'creator-view',
    config: 'config-view',
    hostControl: 'host-control-view',
    ranking: 'ranking-view', // ★追加：ランキング画面
    respondent: 'respondent-view',
    playerGame: 'player-game-view'
};

window.showView = function(targetId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(targetId);
    if(target) {
        target.classList.remove('hidden');
    }
    document.body.classList.remove('dark-theme');
};

/* --- 共通：戻るボタンの動作 --- */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.back-to-main').forEach(btn => {
        btn.addEventListener('click', () => {
            window.showView(window.views.main);
        });
    });
});
