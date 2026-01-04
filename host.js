/* =========================================================
 * host.js (Stable v3)
 * =======================================================*/

let currentShowId = null;
let createdQuestions = [];
let studioQuestions = [];
let currentRoomId = null;
let currentQIndex = 0;
let currentConfig = { penalty: 'none', scoreUnit: 'point', theme: 'light' };
let editingSetId = null;
let returnToCreator = false;
let periodPlaylist = [];

const RANKING_MONEY_TREE = [
    10000, 20000, 30000, 50000, 100000,
    200000, 300000, 500000, 750000, 1000000,
    1500000, 2500000, 5000000, 7500000, 10000000
];

document.addEventListener('DOMContentLoaded', () => {
    // 画面遷移・ボタン設定
    const hostBtn = document.getElementById('main-host-btn');
    if(hostBtn) hostBtn.addEventListener('click', () => window.showView(window.views.hostLogin));

    const loginBtn = document.getElementById('host-login-submit-btn');
    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            const input = document.getElementById('show-id-input').value.trim().toUpperCase();
            if(!input) { alert("番組IDを入力してください"); return; }
            currentShowId = input;
            enterDashboard();
        });
    }

    const createBtn = document.getElementById('dash-create-btn');
    if(createBtn) createBtn.addEventListener('click', initCreatorMode);

    const configBtn = document.getElementById('dash-config-btn');
    if(configBtn) {
        configBtn.addEventListener('click', () => {
            returnToCreator = false;
            updateConfigViewInputs();
            window.showView(window.views.config);
        });
    }

    const studioBtn = document.getElementById('dash-studio-btn');
    if(studioBtn) studioBtn.addEventListener('click', startRoom);

    const creatorConfigBtn = document.getElementById('creator-go-config-btn');
    if(creatorConfigBtn) {
        creatorConfigBtn.addEventListener('click', () => {
            returnToCreator = true;
            updateConfigViewInputs();
            window.showView(window.views.config);
        });
    }

    const configOkBtn = document.getElementById('config-ok-btn');
    if(configOkBtn) configOkBtn.addEventListener('click', goBackFromConfig);

    const configHeaderBackBtn = document.getElementById('config-header-back-btn');
    if(configHeaderBackBtn) configHeaderBackBtn.addEventListener('click', goBackFromConfig);

    const addPeriodBtn = document.getElementById('studio-add-period-btn');
    if(addPeriodBtn) addPeriodBtn.addEventListener('click', addPeriodToPlaylist);
    
    // 編集・保存ボタン
    const addQBtn = document.getElementById('add-question-btn');
    if(addQBtn) addQBtn.addEventListener('click', addQuestion);
    
    const saveBtn = document.getElementById('save-to-cloud-btn');
    if(saveBtn) saveBtn.addEventListener('click', saveToCloud);
    
    const creatorBackBtn = document.getElementById('creator-back-btn');
    if(creatorBackBtn) creatorBackBtn.addEventListener('click', () => enterDashboard());
});

// --- Config Functions ---
function updateConfigViewInputs() {
    document.getElementById('config-penalty').value = currentConfig.penalty || 'none';
    document.getElementById('config-score-unit').value = currentConfig.scoreUnit || 'point';
    document.getElementById('config-theme').value = currentConfig.theme || 'light';
}

function goBackFromConfig() {
    currentConfig = {
        penalty: document.getElementById('config-penalty').value,
        scoreUnit: document.getElementById('config-score-unit').value,
        theme: document.getElementById('config-theme').value
    };
    if(returnToCreator) window.showView(window.views.creator);
    else enterDashboard();
}

function enterDashboard() {
    window.showView(window.views.dashboard);
    document.getElementById('dashboard-show-id').textContent = currentShowId;
    loadSavedSets();
}

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
            
            const conf = item.config || {};
            const themeName = conf.theme === 'dark' ? '💰ミリオネア風' : '🌈感謝祭風';
            
            div.innerHTML = `
                <div>
                    <span>${item.title}</span> <span style="font-size:0.8em; background:#eee; padding:2px 5px; border-radius:3px;">${themeName}</span>
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

function initCreatorMode() {
    editingSetId = null;
    createdQuestions = [];
    document.getElementById('quiz-set-title').value = '';
    currentConfig = { penalty: 'none', scoreUnit: 'point', theme: 'light' };
    document.getElementById('save-to-cloud-btn').textContent = '☁️ クラウドに保存して完了';
    renderQuestionList();
    window.showView(window.views.creator);
}

function loadSetForEditing(key, item) {
    editingSetId = key;
    createdQuestions = item.questions || [];
    document.getElementById('quiz-set-title').value = item.title;
    currentConfig = item.config || { penalty:'none', scoreUnit:'point', theme:'light' };
    document.getElementById('save-to-cloud-btn').textContent = '🔄 更新して完了';
    renderQuestionList();
    window.showView(window.views.creator);
}

function addQuestion() {
    const qText = document.getElementById('question-text').value.trim();
    const correctIndex = parseInt(document.getElementById('correct-index').value);
    const cBlue = document.querySelector('.btn-blue.choice-input').value.trim() || "A";
    const cRed = document.querySelector('.btn-red.choice-input').value.trim() || "B";
    const cGreen = document.querySelector('.btn-green.choice-input').value.trim() || "C";
    const cYellow = document.querySelector('.btn-yellow.choice-input').value.trim() || "D";

    if(!qText) { alert('問題文を入力してください'); return; }

    createdQuestions.push({ q: qText, c: [cBlue, cRed, cGreen, cYellow], correctIndex: correctIndex });
    renderQuestionList();
    document.getElementById('question-text').value = '';
    document.getElementById('question-text').focus();
}

function renderQuestionList() {
    const list = document.getElementById('q-list');
    list.innerHTML = '';
    createdQuestions.forEach((q, index) => {
        const li = document.createElement('li');
        li.textContent = `Q${index + 1}. ${q.q}`;
        const delSpan = document.createElement('span');
        delSpan.textContent = ' [x]';
        delSpan.style.color = 'red';
        delSpan.style.cursor = 'pointer';
        delSpan.style.marginLeft = '10px';
        delSpan.onclick = () => { createdQuestions.splice(index, 1); renderQuestionList(); };
        li.appendChild(delSpan);
        list.appendChild(li);
    });
    document.getElementById('q-count').textContent = createdQuestions.length;
}

function saveToCloud() {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }
    const title = document.getElementById('quiz-set-title').value.trim() || "無題のセット";
    const saveData = {
        title: title,
        config: currentConfig,
