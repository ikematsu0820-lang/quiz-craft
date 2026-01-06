{
type: uploaded file
fileName: host_config.js
fullContent:
/* =========================================================
 * host_config.js (v67: Safe Fix)
 * =======================================================*/

let selectedSetQuestions = [];

window.onSetSelectChange = function() {
    updateBuilderUI();
};

function enterConfigMode() {
    window.showView(window.views.config);
    
    const setSelect = document.getElementById('config-set-select');
    const container = document.getElementById('config-builder-ui');
    
    if(setSelect) {
        setSelect.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
        setSelect.removeEventListener('change', window.onSetSelectChange);
        setSelect.addEventListener('change', window.onSetSelectChange);
    }
    
    if(container) {
        container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">セットを選択してください</p>';
    }
    
    const titleInput = document.getElementById('config-program-title');
    if(titleInput) titleInput.value = '';
    
    const rankChk = document.getElementById('config-final-ranking-chk');
    if(rankChk) rankChk.checked = true;

    loadSetListInConfig();
    loadSavedProgramsInConfig();
    renderConfigPreview();
}

// ヘルパー: 安全に値を取得する関数
function getElVal(id, def) {
    const el = document.getElementById(id);
    return el ? el.value : def;
}

function loadSetListInConfig() {
    const select = document.getElementById('config-set-select');
    if(!select) return;

    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;
    
    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                let typeLabel = "Mix";
                if(item.questions && item.questions.length > 0) {
                     const t = item.questions[0].type;
                     if(t === 'choice') typeLabel = "選択式";
                     else if(t === 'sort') typeLabel = "並べ替え";
                     else if(t === 'free_oral') typeLabel = "口頭";
                     else if(t === 'free_written') typeLabel = "記述";
                     else if(t === 'multi') typeLabel = "多答";
                }
                const firstQ = (item.questions && item.questions.length > 0) ? item.questions[0] : {};
                const spMode = firstQ.specialMode || 'none';
                
                const valObj = { q: item.questions, c: item.config || {}, t: item.title, sp: spMode };
                opt.value = JSON.stringify(valObj);
                opt.textContent = `${item.title} [${typeLabel}]` + (spMode !== 'none' ? ` (${spMode})` : '');
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = `<option value="">${APP_TEXT.Config.SelectEmpty}</option>`;
        }
    });
}

function updateBuilderUI() {
    const container = document.getElementById('config-builder-ui');
    const select = document.getElementById('config-set-select');
    if (!container || !select) return;

    if (!select.value) {
        selectedSetQuestions = [];
        container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">セットを選択してください</p>';
