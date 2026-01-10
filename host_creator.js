/* =========================================================
 * host_creator.js (v64: Order Changed & Special Mode Removed)
 * =======================================================*/

let editingQuestionIndex = null;
let currentEditingTitle = ""; 

window.initCreatorMode = function() {
    editingSetId = null;
    currentEditingTitle = "";
    createdQuestions = [];
    
    document.getElementById('save-to-cloud-btn').textContent = APP_TEXT.Creator.BtnSave;
    
    resetGlobalSettings(); 
    resetForm();
    
    renderQuestionList();
    window.showView(window.views.creator);
    
    const typeSelect = document.getElementById('creator-q-type');
    typeSelect.disabled = false;
    document.getElementById('creator-type-locked-msg').classList.add('hidden');
    renderCreatorForm(typeSelect.value);
};

window.loadSetForEditing = function(key, item) {
    editingSetId = key;
    currentEditingTitle = item.title || "";
    createdQuestions = item.questions || [];
    
    document.getElementById('save-to-cloud-btn').textContent = APP_TEXT.Creator.BtnUpdate;
    
    const typeSelect = document.getElementById('creator-q-type');
    
    if(createdQuestions.length > 0) {
        const firstQ = createdQuestions[0];
        typeSelect.value = firstQ.type;
        typeSelect.disabled = true;
        document.getElementById('creator-type-locked-msg').classList.remove('hidden');

        if(firstQ.layout) document.getElementById('creator-set-layout').value = firstQ.layout;
        if(firstQ.align) updateAlignUI(firstQ.align);
        if(firstQ.design) {
            if(document.getElementById('design-main-bg-color')) document.getElementById('design-main-bg-color').value = firstQ.design.mainBgColor || "#222222";
            if(document.getElementById('design-bg-image-data')) document.getElementById('design-bg-image-data').value = firstQ.design.bgImage || "";
            if(document.getElementById('design-q-text')) document.getElementById('design-q-text').value = firstQ.design.qTextColor || "#ffffff";
            if(document.getElementById('design-q-bg')) document.getElementById('design-q-bg').value = firstQ.design.qBgColor || "#2c5066";
            if(document.getElementById('design-q-border')) document.getElementById('design-q-border').value = firstQ.design.qBorderColor || "#ffffff";
            if(document.getElementById('design-c-text')) document.getElementById('design-c-text').value = firstQ.design.cTextColor || "#ffffff";
            if(document.getElementById('design-c-bg')) document.getElementById('design-c-bg').value = firstQ.design.cBgColor || "#365c75";
            if(document.getElementById('design-c-border')) document.getElementById('design-c-border').value = firstQ.design.cBorderColor || "#ffffff";
        }
        // ★削除: スペシャルモードの読み込み処理を削除
    } else {
        resetGlobalSettings();
        typeSelect.disabled = false;
        document.getElementById('creator-type-locked-msg').classList.add('hidden');
    }

    resetForm();
    renderQuestionList();
    window.showView(window.views.creator);
};

document.addEventListener('DOMContentLoaded', () => {
    const typeSelect = document.getElementById('creator-q-type');
    if(typeSelect) {
        // ★変更: プルダウンの並び順を変更
        typeSelect.innerHTML = `
            <option value="free_oral">${APP_TEXT.Creator.TypeFreeOral}</option>
            <option value="free_written">${APP_TEXT.Creator.TypeFreeWritten}</option>
            <option value="choice">${APP_TEXT.Creator.TypeChoice}</option>
            <option value="sort">${APP_TEXT.Creator.TypeSort}</option>
            <option value="multi">${APP_TEXT.Creator.TypeMulti}</option>
        `;
        typeSelect.addEventListener('change', (e) => {
            if (createdQuestions.length === 0) {
                renderCreatorForm(e.target.value);
            }
        });
    }

    document.querySelectorAll('.btn-align').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const align = e.target.getAttribute('data-align');
            updateAlignUI(align);
        });
    });

    const imgBtn = document.getElementById('design-bg-image-btn');
    const imgInput = document.getElementById('design-bg-image-file');
    const clearBtn = document.getElementById('design-bg-clear-btn');

    if(imgBtn && imgInput) {
        imgBtn.addEventListener('click', () => imgInput.click());
        imgInput.addEventListener('change', handleImageUpload);
    }
    
    if(clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.getElementById('design-bg-image-data').value = "";
            document.getElementById('design-bg-image-status').textContent = APP_TEXT.Creator.MsgNoImage;
            if(imgInput) imgInput.value = "";
        });
    }

    const upBtn = document.getElementById('update-question-btn');
    if(upBtn) upBtn.addEventListener('click', updateQuestion);
    
    const cancelBtn = document.getElementById('cancel-update-btn');
    if(cancelBtn) cancelBtn.addEventListener('click', resetForm);
});

window.showToast = function(msg) {
    const container = document.getElementById('toast-container');
    const div = document.createElement('div');
    div.className = 'toast-msg';
    div.textContent = msg;
    container.appendChild(div);
    setTimeout(() => div.remove(), 3000);
};

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_WIDTH = 1280;
            let width = img.width;
            let height = img.height;
            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            document.getElementById('design-bg-image-data').value = dataUrl;
            document.getElementById('design-bg-image-status').textContent = APP_TEXT.Creator.MsgImageLoaded;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function resetGlobalSettings() {
    if(typeof setDefaultDesignUI === 'function') {
        setDefaultDesignUI();
    } else {
        document.getElementById('creator-set-layout').value = 'standard';
        updateAlignUI('center');
        document.getElementById('design-main-bg-color').value = "#222222";
        document.getElementById('design-bg-image-data').value = "";
        document.getElementById('design-bg-image-status').textContent = APP_TEXT.Creator.MsgNoImage;
    }
    // ★削除: スペシャルモードのリセット処理を削除
    if(typeof window.loadDesignSettings === 'function') {
        window.loadDesignSettings();
    }
}

function updateAlignUI(align) {
    document.getElementById('creator-set-align').value = align;
    document.querySelectorAll('.btn-align').forEach(btn => {
        if(btn.getAttribute('data-align') === align) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function resetForm() {
    editingQuestionIndex = null;
    document.getElementById('creator-form-title').textContent = APP_TEXT.Creator.HeadingNewQ;
    document.getElementById('add-question-btn').classList.remove('hidden');
    document.getElementById('update-question-area').classList.add('hidden');
    document.getElementById('question-text').value = '';
    
    const type = document.getElementById('creator-q-type').value;
    renderCreatorForm(type);
}

function renderCreatorForm(type, data = null) {
    const container = document.getElementById('creator-form-container');
    if(!container) return; 
    container.innerHTML = ''; 

    if (type === 'choice') {
        const settingsDiv = document.createElement('div');
        settingsDiv.style.marginBottom = '10px';
        settingsDiv.style.fontSize = '0.9em';
        const isMulti = data ? data.multi : false;
        settingsDiv.innerHTML = `
            <label style="margin-right:10px;"><input type="checkbox" id="opt-multi-select" ${isMulti?'checked':''}> ${APP_TEXT.Creator.OptMulti}</label>
        `;
        container.appendChild(settingsDiv);

        const choicesDiv = document.createElement('div');
        choicesDiv.id = 'creator-choices-list';
        choicesDiv.style.display = 'grid';
        choicesDiv.style.gap = '5px';
        container.appendChild(choicesDiv);

        if (data) {
            data.c.forEach((choiceText, i) => {
                const isCorrect = data.correct.includes(i);
                addChoiceInput(choicesDiv, i, choiceText, isCorrect);
            });
        } else {
            for(let i=0; i<4; i++) addChoiceInput(choicesDiv, i);
        }

        const add
