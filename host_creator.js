/* =========================================================
 * host_creator.js (v56: Fixed Type)
 * =======================================================*/

let editingQuestionIndex = null;

window.initCreatorMode = function() {
    editingSetId = null;
    createdQuestions = [];
    document.getElementById('quiz-set-title').value = '';
    document.getElementById('save-to-cloud-btn').textContent = APP_TEXT.Creator.BtnSave;
    
    resetGlobalSettings(); 
    resetForm();
    
    renderQuestionList();
    window.showView(window.views.creator);
    
    // Type Selectを初期化（アンロック）
    const typeSelect = document.getElementById('creator-q-type');
    typeSelect.disabled = false;
    document.getElementById('creator-type-locked-msg').classList.add('hidden');
    renderCreatorForm(typeSelect.value); // 初期フォーム表示
};

window.loadSetForEditing = function(key, item) {
    editingSetId = key;
    createdQuestions = item.questions || [];
    document.getElementById('quiz-set-title').value = item.title;
    document.getElementById('save-to-cloud-btn').textContent = APP_TEXT.Creator.BtnUpdate;
    
    const typeSelect = document.getElementById('creator-q-type');
    
    if(createdQuestions.length > 0) {
        const firstQ = createdQuestions[0];
        
        // 保存された問題形式を復元してロック
        typeSelect.value = firstQ.type;
        typeSelect.disabled = true;
        document.getElementById('creator-type-locked-msg').classList.remove('hidden');

        if(firstQ.layout) document.getElementById('creator-set-layout').value = firstQ.layout;
        if(firstQ.align) updateAlignUI(firstQ.align);
        if(firstQ.design) {
            document.getElementById('design-main-bg-color').value = firstQ.design.mainBgColor || "#222222";
            document.getElementById('design-bg-image-data').value = firstQ.design.bgImage || "";
            document.getElementById('design-q-text').value = firstQ.design.qTextColor || "#ffffff";
            document.getElementById('design-q-bg').value = firstQ.design.qBgColor || "#2c5066";
            document.getElementById('design-q-border').value = firstQ.design.qBorderColor || "#ffffff";
            document.getElementById('design-c-text').value = firstQ.design.cTextColor || "#ffffff";
            document.getElementById('design-c-bg').value = firstQ.design.cBgColor || "#365c75";
            document.getElementById('design-c-border').value = firstQ.design.cBorderColor || "#ffffff";
        }
        document.getElementById('creator-special-mode').value = firstQ.specialMode || 'none';
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
    // Type選択の初期化
    const typeSelect = document.getElementById('creator-q-type');
    typeSelect.innerHTML = `
        <option value="choice">${APP_TEXT.Creator.TypeChoice}</option>
        <option value="sort">${APP_TEXT.Creator.TypeSort}</option>
        <option value="text">${APP_TEXT.Creator.TypeText}</option>
        <option value="multi">${APP_TEXT.Creator.TypeMulti}</option>
    `;
    typeSelect.addEventListener('change', (e) => {
        // 問題がなければフォーム切り替え
        if (createdQuestions.length === 0) {
            renderCreatorForm(e.target.value);
        }
    });

    document.querySelectorAll('.btn-align').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const align = e.target.getAttribute('data-align');
            updateAlignUI(align);
        });
    });

    // ... (画像アップロード関連は既存維持)
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

    document.getElementById('update-question-btn').addEventListener('click', updateQuestion);
    document.getElementById('cancel-update-btn').addEventListener('click', resetForm);
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
    document.getElementById('creator-set-layout').value = 'standard';
    updateAlignUI('center');
    document.getElementById('creator-special-mode').value = 'none';
    document.getElementById('design-main-bg-color').value = "#222222";
    document.getElementById('design-bg-image-data').value = "";
    document.getElementById('design-bg-image-status').textContent = APP_TEXT.Creator.MsgNoImage;
    document.getElementById('design-q-text').value = "#ffffff";
    document.getElementById('design-q-bg').value = "#2c5066";
    document.getElementById('design-q-border').value = "#ffffff";
    document.getElementById('design-c-text').value = "#ffffff";
    document.getElementById('design-c-bg').value = "#365c75";
    document.getElementById('design-c-border').value = "#ffffff";
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
    
    // フォームの中身を、現在のType設定に合わせて再描画
    const currentType = document.getElementById('creator-q-type').value;
    renderCreatorForm(currentType);
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

        const addBtn = document.createElement('button');
        addBtn.textContent = APP_TEXT.Creator.BtnAddChoice;
        addBtn.className = 'btn-info';
        addBtn.style.marginTop = '10px';
        addBtn.style.padding = '5px';
        addBtn.onclick = () => addChoiceInput(choicesDiv);
        container.appendChild(addBtn);

    } else if (type === 'sort') {
        const optDiv = document.createElement('div');
        optDiv.style.marginBottom = '10px';
        const initVal = data ? data.initialOrder : 'random';
        optDiv.innerHTML = `
            <p style="font-size:0.8em; color:#666; margin:0 0 5px 0;">${APP_TEXT.Creator.DescSort}</p>
            <label style="font-size:0.8em; font-weight:bold;">${APP_TEXT.Creator.LabelSortInitial}</label>
            <select id="sort-initial-order" style="padding:5px; font-size:0.9em;">
                <option value="random" ${initVal==='random'?'selected':''}>${APP_TEXT.Creator.SortInitialRandom}</option>
                <option value="fixed" ${initVal==='fixed'?'selected':''}>${APP_TEXT.Creator.SortInitialFixed}</option>
            </select>
        `;
        container.appendChild(optDiv);

        const sortDiv = document.createElement('div');
        sortDiv.id = 'creator-sort-list';
        sortDiv.style.display = 'flex';
        sortDiv.style.flexDirection = 'column';
        sortDiv.style.gap = '5px';
        container.appendChild(sortDiv);

        if (data) {
            data.c.forEach((itemText, i) => addSortInput(sortDiv, i, itemText));
        } else {
            for(let i=0; i<4; i++) addSortInput(sortDiv, i);
        }

        const addBtn = document.createElement('button');
        addBtn.textContent = APP_TEXT.Creator.BtnAddSort;
        addBtn.className = 'btn-info';
        addBtn.style.marginTop = '10px';
        addBtn.style.padding = '5px';
        addBtn.onclick = () => addSortInput(sortDiv);
        container.appendChild(addBtn);

    } else if (type === 'text') {
        const optDiv = document.createElement('div');
        optDiv.style.marginBottom = '10px';
        const modeVal = data ? data.mode : 'written';
        optDiv.innerHTML = `
            <label style="font-size:0.8em; font-weight:bold;">${APP_TEXT.Creator.LabelTextFormat}</label>
            <select id="text-mode-select" style="padding:5px; font-size:0.9em;">
                <option value="written" ${modeVal==='written'?'selected':''}>${APP_TEXT.Creator.TextFormatWritten}</option>
                <option value="oral" ${modeVal==='oral'?'selected':''}>${APP_TEXT.Creator.TextFormatOral}</option>
            </select>
            <p style="font-size:0.8em; color:#666; margin:5px 0;">${APP_TEXT.Creator.DescText}</p>
        `;
        container.appendChild(optDiv);

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'creator-text-answer';
        input.className = 'btn-block';
        input.placeholder = 'e.g. Apple, Ringot, APPL';
        if (data) input.value = data.correct.join(', ');
        container.appendChild(input);

    } else if (type === 'multi') {
        const optDiv = document.createElement('div');
        optDiv.innerHTML = `<p style="font-size:0.8em; color:#666; margin:0 0 5px 0;">${APP_TEXT.Creator.DescMulti}</p>`;
        container.appendChild(optDiv);

        const multiDiv = document.createElement('div');
        multiDiv.id = 'creator-multi-list';
        multiDiv.style.display = 'grid';
        multiDiv.style.gap = '5px';
        container.appendChild(multiDiv);

        if (data) {
            data.c.forEach((text, i) => addMultiInput(multiDiv, i, text));
        } else {
            for(let i=0; i<5; i++) addMultiInput(multiDiv, i);
        }

        const addBtn = document.createElement('button');
        addBtn.textContent = APP_TEXT.Creator.BtnAddMulti;
        addBtn.className = 'btn-info';
        addBtn.style.marginTop = '10px';
        addBtn.style.padding = '5px';
        addBtn.onclick = () => addMultiInput(multiDiv);
        container.appendChild(addBtn);
    }
}

function addChoiceInput(parent, index, text = "", checked = false) {
    if (parent.children.length >= 10) { alert(APP_TEXT.Creator.AlertMaxChoice); return; }
    const wrapper = document.createElement('div');
    wrapper.className = 'choice-row';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'choice-correct-chk';
    chk.checked = checked;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'choice-text-input';
    inp.placeholder = 'Choice';
    inp.value = text;
    inp.style.flex = '1';
    const del = document.createElement('button');
    del.textContent = '×';
    del.style.background = '#ccc';
    del.style.color = '#333';
    del.style.width = '30px';
    del.style.padding = '5px';
    del.onclick = () => parent.removeChild(wrapper);
    wrapper.appendChild(chk);
    wrapper.appendChild(inp);
    wrapper.appendChild(del);
    parent.appendChild(wrapper);
}

function addSortInput(parent, index, text = "") {
    if (parent.children.length >= 10) { alert(APP_TEXT.Creator.AlertMaxChoice); return; }
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '5px';
    const num = document.createElement('span');
    num.textContent = '🔹'; 
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'sort-text-input';
    inp.placeholder = 'Item';
    inp.value = text;
    inp.style.flex = '1';
    const del = document.createElement('button');
    del.textContent = '×';
    del.style.background = '#ccc';
    del.style.color = '#333';
    del.style.width = '30px';
    del.style.padding = '5px';
    del.onclick = () => parent.removeChild(wrapper);
    wrapper.appendChild(num);
    wrapper.appendChild(inp);
    wrapper.appendChild(del);
    parent.appendChild(wrapper);
}

function addMultiInput(parent, index, text = "") {
    if (parent.children.length >= 20) { alert("Max 20 answers"); return; }
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '5px';
    const num = document.createElement('span');
    num.textContent = '✅'; 
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'multi-text-input';
    inp.placeholder = 'Answer';
    inp.value = text;
    inp.style.flex = '1';
    const del = document.createElement('button');
    del.textContent = '×';
    del.style.background = '#ccc';
    del.style.color = '#333';
    del.style.width = '30px';
    del.style.padding = '5px';
    del.onclick = () => parent.removeChild(wrapper);
    wrapper.appendChild(num);
    wrapper.appendChild(inp);
    wrapper.appendChild(del);
    parent.appendChild(wrapper);
}

function getQuestionDataFromForm() {
    const qText = document.getElementById('question-text').value.trim();
    if(!qText) { alert(APP_TEXT.Creator.AlertNoQ); return null; }

    // ★v56: 上部の固定プルダウンから取得
    const type = document.getElementById('creator-q-type').value;
    let newQ = { q: qText, type: type, points: 1, loss: 0 };

    if (type === 'choice') {
        const rows = document.querySelectorAll('.choice-row');
        const options = [];
        const correct = [];
        rows.forEach((row, idx) => {
            const text = row.querySelector('.choice-text-input').value.trim();
            const isChk = row.querySelector('.choice-correct-chk').checked;
            if(text) {
                options.push(text);
                if(isChk) correct.push(options.length - 1);
            }
        });
        if (options.length < 2) { alert(APP_TEXT.Creator.AlertLessChoice); return null; }
        if (correct.length === 0) { alert(APP_TEXT.Creator.AlertNoCorrect); return null; }
        newQ.c = options; 
        newQ.correct = correct;
        newQ.correctIndex = correct[0];
        newQ.multi = document.getElementById('opt-multi-select').checked;
        newQ.partial = false;

    } else if (type === 'sort') {
        const inputs = document.querySelectorAll('.sort-text-input');
        const options = [];
        inputs.forEach(inp => { if(inp.value.trim()) options.push(inp.value.trim()); });
        if(options.length < 2) { alert(APP_TEXT.Creator.AlertLessChoice); return null; }
        newQ.c = options; 
        newQ.correct = options.map((_, i) => i);
        newQ.initialOrder = document.getElementById('sort-initial-order').value;

    } else if (type === 'text') {
        const mode = document.getElementById('text-mode-select').value;
        newQ.mode = mode;
        const ansText = document.getElementById('creator-text-answer').value.trim();
        if (mode === 'written' && !ansText) { alert(APP_TEXT.Creator.AlertNoTextAns); return null; }
        const answers = ansText ? ansText.split(',').map(s => s.trim()).filter(s => s) : [];
        newQ.correct = answers; 

    } else if (type === 'multi') {
        const inputs = document.querySelectorAll('.multi-text-input');
        const options = [];
        inputs.forEach(inp => { if(inp.value.trim()) options.push(inp.value.trim()); });
        if(options.length < 1) { alert("At least 1 answer required"); return null; }
        newQ.c = options;
        newQ.correct = options; 
    }
    return newQ;
}

function addQuestion() {
    const q = getQuestionDataFromForm();
    if(q) {
        createdQuestions.push(q);
        resetForm();
        renderQuestionList();
        window.showToast(APP_TEXT.Creator.MsgAddedToast);
        
        // ★v56: 1問追加されたらタイプをロック
        document.getElementById('creator-q-type').disabled = true;
        document.getElementById('creator-type-locked-msg').classList.remove('hidden');
    }
}

function updateQuestion() {
    if(editingQuestionIndex === null) return;
    const q = getQuestionDataFromForm();
    if(q) {
        createdQuestions[editingQuestionIndex] = { ...createdQuestions[editingQuestionIndex], ...q };
        resetForm();
        renderQuestionList();
        window.showToast(APP_TEXT.Creator.MsgUpdatedToast);
    }
}

function editQuestion(index) {
    editingQuestionIndex = index;
    const q = createdQuestions[index];
    
    document.getElementById('creator-form-title').textContent = APP_TEXT.Creator.HeadingEditQ;
    document.getElementById('add-question-btn').classList.add('hidden');
    document.getElementById('update-question-area').classList.remove('hidden');
    
    document.getElementById('question-text').value = q.q;
    
    // 編集時はその問題のデータをフォームに入れる（Typeは共通なので変更不要）
    const type = document.getElementById('creator-q-type').value;
    renderCreatorForm(type, q);
    
    document.getElementById('creator-view').scrollIntoView({behavior: "smooth"});
}

function moveQuestion(index, direction) {
    if (direction === -1 && index > 0) {
        [createdQuestions[index], createdQuestions[index - 1]] = [createdQuestions[index - 1], createdQuestions[index]];
    } else if (direction === 1 && index < createdQuestions.length - 1) {
        [createdQuestions[index], createdQuestions[index + 1]] = [createdQuestions[index + 1], createdQuestions[index]];
    }
    renderQuestionList();
}

function deleteQuestion(index) {
    if(confirm(APP_TEXT.Dashboard.DeleteConfirm)) {
        createdQuestions.splice(index, 1);
        if(editingQuestionIndex === index) resetForm();
        else if(editingQuestionIndex > index) editingQuestionIndex--;
        renderQuestionList();
        
        // ★v56: 全削除されたらロック解除
        if(createdQuestions.length === 0) {
            document.getElementById('creator-q-type').disabled = false;
            document.getElementById('creator-type-locked-msg').classList.add('hidden');
            // リセット時にフォームを再描画
            renderCreatorForm(document.getElementById('creator-q-type').value);
        }
    }
}

function renderQuestionList() {
    const list = document.getElementById('q-list');
    list.innerHTML = '';
    createdQuestions.forEach((q, index) => {
        const div = document.createElement('div');
        div.className = 'q-list-item';
        
        let typeIcon = '🔳';
        if(q.type === 'sort') typeIcon = '🔢';
        if(q.type === 'text') typeIcon = '✍️';
        if(q.type === 'multi') typeIcon = '📚';
        
        div.innerHTML = `
            <div class="q-list-content">
                ${typeIcon} <b>Q${index + 1}.</b> ${q.q}
            </div>
            <div class="q-list-actions">
                <button class="btn-mini btn-move" onclick="moveQuestion(${index}, -1)">↑</button>
                <button class="btn-mini btn-move" onclick="moveQuestion(${index}, 1)">↓</button>
                <button class="btn-mini btn-edit" onclick="editQuestion(${index})">Edit</button>
                <button class="btn-mini btn-del" onclick="deleteQuestion(${index})">×</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function saveToCloud() {
    if(createdQuestions.length === 0) { alert('No questions'); return; }
    const title = document.getElementById('quiz-set-title').value.trim() || "Untitled";
    
    const layout = document.getElementById('creator-set-layout').value;
    const align = document.getElementById('creator-set-align').value;
    const specialMode = document.getElementById('creator-special-mode').value;
    
    const design = {
        mainBgColor: document.getElementById('design-main-bg-color').value,
        bgImage: document.getElementById('design-bg-image-data').value,
        qTextColor: document.getElementById('design-q-text').value,
        qBgColor: document.getElementById('design-q-bg').value,
        qBorderColor: document.getElementById('design-q-border').value,
        cTextColor: document.getElementById('design-c-text').value,
        cBgColor: document.getElementById('design-c-bg').value,
        cBorderColor: document.getElementById('design-c-border').value
    };

    createdQuestions.forEach(q => {
        q.layout = layout;
        q.align = align;
        q.design = design;
        q.specialMode = specialMode;
    });

    const defaultConf = { eliminationRule: 'none', scoreUnit: 'point', theme: 'light' };
    const saveData = {
        title: title,
        config: defaultConf,
        questions: createdQuestions,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    if (editingSetId) {
        window.db.ref(`saved_sets/${currentShowId}/${editingSetId}`).update(saveData)
        .then(() => { 
            window.showToast(APP_TEXT.Creator.MsgSavedToast);
            enterDashboard(); 
        });
    } else {
        window.db.ref(`saved_sets/${currentShowId}`).push(saveData)
        .then(() => { 
            window.showToast(APP_TEXT.Creator.MsgSavedToast);
            enterDashboard(); 
        });
    }
}
