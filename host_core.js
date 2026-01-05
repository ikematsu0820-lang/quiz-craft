/* =========================================================
 * host_core.js (v16: Program Loading)
 * =======================================================*/

let currentShowId = null;
let createdQuestions = [];
let studioQuestions = [];
let currentRoomId = null;
let currentQIndex = 0;
let currentConfig = { penalty: 'none', scoreUnit: 'point', theme: 'light', timeLimit: 0, passCount: 0 };
let editingSetId = null;
let returnToCreator = false;
// ★ここにロードされたプログラムが入る
let periodPlaylist = [];
let currentPeriodIndex = -1;

const RANKING_MONEY_TREE = [
    10000, 20000, 30000, 50000, 100000,
    200000, 300000, 500000, 750000, 1000000,
    1500000, 2500000, 5000000, 7500000, 10000000
];

document.addEventListener('DOMContentLoaded', () => {
    // 画面遷移
    const hostBtn = document.getElementById('main-host-btn');
    if(hostBtn) hostBtn.addEventListener('click', () => window.showView(window.views.hostLogin));

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

    const createBtn = document.getElementById('dash-create-btn');
    if(createBtn) createBtn.addEventListener('click', initCreatorMode);

    const configBtn = document.getElementById('dash-config-btn');
    if(configBtn) {
        configBtn.addEventListener('click', () => {
            // 新規作成扱いでconfigへ（リストはクリアしないが、明示的にクリアしたほうが安全かも？）
            // 今回は継続編集できるようにクリアしないでおく
            enterConfigMode(); 
        });
    }

    const studioBtn = document.getElementById('dash-studio-btn');
    if(studioBtn) studioBtn.addEventListener('click', startRoom);

    // 戻るボタン
    const configHeaderBackBtn = document.getElementById('config-header-back-btn');
    if(configHeaderBackBtn) configHeaderBackBtn.addEventListener('click', () => enterDashboard());

    const creatorBackBtn = document.getElementById('creator-back-btn');
    if(creatorBackBtn) creatorBackBtn.addEventListener('click', () => enterDashboard());

    // 各機能ボタン
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
    loadSavedPrograms(); // ★プログラムも読み込む
}

// 保存済みセット（素材）の読み込み
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

// ★保存済みプログラム（構成）の読み込み
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
            div.className = 'set-item'; // 同じスタイルを流用
            div.style.borderLeft = "5px solid #0055ff"; // 青ラインで区別

            const periodCount = item.playlist ? item.playlist.length : 0;

            div.innerHTML = `
                <div style="cursor:pointer; flex:1;" onclick="loadProgramIntoConfig('${key}')">
                    <span style="font-weight:bold; color:#0055ff;">${item.title}</span>
                    <div style="font-size:0.8em; color:#666;">
                        全${periodCount}ピリオド
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

// ★プログラムをクリックしたらConfigにロードして遷移
window.loadProgramIntoConfig = function(key) {
    window.db.ref(`saved_programs/${currentShowId}/${key}`).once('value', snap => {
        const prog = snap.val();
        if(prog && prog.playlist) {
            periodPlaylist = prog.playlist; // グローバル変数にセット
            alert(`プログラム「${prog.title}」を読み込みました`);
            enterConfigMode(); // 設定画面へ
        }
    });
};
