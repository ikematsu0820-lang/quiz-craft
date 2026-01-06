/* =========================================================
 * host_core.js (v57: Bootloader)
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
    // 全てのビューを隠す
    Object.values(window.views).forEach(v => {
        if(v) v.classList.add('hidden');
    });
    // ターゲットだけ表示
    if(targetView) {
        targetView.classList.remove('hidden');
    }
};

window.applyTextConfig = function() {
    if(typeof APP_TEXT === 'undefined') return;
    
    document.querySelectorAll('[data-text]').forEach(el => {
        const keys = el.getAttribute('data-text').split('.')
