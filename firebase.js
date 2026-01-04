/* =========================================================
 * firebase.js
 * 役割：通信の初期化、共通の便利機能（画面切り替えなど）
 * =======================================================*/

const firebaseConfig = {
  apiKey: "AIzaSyDl9kq_jJb_zvYc3lfTfL_oTQrdqv2Abww",
  databaseURL: "https://quizcraft-56950-default-rtdb.asia-southeast1.firebasedatabase.app/",
  authDomain: "quizcraft-56950.firebaseapp.com",
  projectId: "quizcraft-56950",
  storageBucket: "quizcraft-56950.firebasestorage.app",
  messagingSenderId: "556267695492",
  appId: "1:556267695492:web:9855ff279731300b4101d1",
  measurementId: "G-3HRYY8ZC2W"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.db = firebase.database();

/* --- 共通：画面切り替え機能 --- */
window.views = {
    main: 'main-view',
    hostLogin: 'host-login-view',
    dashboard: 'host-dashboard-view',
    creator: 'creator-view',
    config: 'config-view', // ★追加：設定画面
    hostControl: 'host-control-view',
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
