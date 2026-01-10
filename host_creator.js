/* =========================================================
 * host_creator.js (v65: Sort Labels A-Z & Max 20)
 * =======================================================*/

let editingQuestionIndex = null;
let currentEditingTitle = "";

window.initCreatorMode = function() {
    editingSetId = null;
    currentEditingTitle = "";
    createdQuestions = [];
    
    const btnSave = document.getElementById('save-to-cloud-btn');
    if(btnSave) btnSave.textContent = APP_TEXT.Creator.BtnSave;
    
    // resetGlobalSettingsが失敗しないようにtry-catch
    try {
        if(typeof resetGlobalSettings === 'function') resetGlobalSettings();
    } catch(e) { console.error(e); }

    resetForm();
    renderQuestionList();
    window.showView(window.views.creator);
    
    const typeSelect = document.getElementById('creator-q-type');
    if(typeSelect) {
        typeSelect.disabled = false;
        document.getElementById('creator-type-locked-msg').classList.add('hidden');
        renderCreatorForm(typeSelect.value);
    }
};

window.loadSetForEditing = function(key, item) {
    editingSetId = key;
    currentEditingTitle = item.title || "";
    createdQuestions = item.questions || [];
    
    const btnSave = document.getElementById('save-to-cloud-btn');
    if(btnSave) btnSave.textContent = APP_TEXT.Creator.BtnUpdate;
    
    const typeSelect = document.getElementById('creator-q-type');
    
    if(createdQuestions.length > 0) {
        const firstQ = createdQuestions[0];
        typeSelect.value = firstQ.type;
        typeSelect.disabled = true;
        document.getElementById('creator-type-locked-msg').classList.remove('hidden');

        if(firstQ.layout) document.getElementById('creator-set-layout').value = firstQ.layout;
        if(firstQ.align && typeof updateAlignUI === 'function') updateAlignUI(firstQ.align);
        
        if(firstQ.design) {
            const d = firstQ.design;
            if(document.getElementById('design-main-bg-color')) document.getElementById('design-main-bg-color').value = d.mainBgColor || "#222222";
            if(document.getElementById('design-bg-image-data')) document.getElementById('design-bg-image-data').value = d.bgImage || "";
            if(document.getElementById('design-q-text')) document.getElementById('design-q-text').value = d.qTextColor || "#ffffff";
            if(document.getElementById('design-q-bg')) document.getElementById('design-q-bg').value = d.qBgColor || "#2c5066";
            if(document.getElementById('design-q-border')) document.getElementById('design-q-border').value = d.qBorderColor || "#ffffff";
            if(document.getElementById('design-c-text')) document.getElementById('design-c-text').value = d.cTextColor || "#ffffff";
            if(document.getElementById('design-c-bg')) document.getElementById('design-c-bg').value = d.cBgColor || "#365c75";
            if(document.getElementById('design-c-border')) document.getElementById('design-c-border').value = d.cBorderColor || "#ffffff";
        }
    } else {
        try {
            if(typeof resetGlobalSettings === 'function') resetGlobalSettings();
        } catch(e) {}
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
        typeSelect.innerHTML = `
            <option value="choice">${APP_TEXT.Creator.TypeChoice}</option>
            <option value="sort">${APP_TEXT.Creator.TypeSort}</option>
            <option value="free_oral">${APP_TEXT.Creator.TypeFreeOral}</option>
            <option value="free_written">${APP_TEXT.Creator.TypeFreeWritten}</option>
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
            if(typeof updateAlignUI === 'function') updateAlignUI(align);
        });
    });

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

// --- グローバルリセット関数 (host_design.jsの関数を呼ぶ) ---
window.resetGlobalSettings = function() {
    if(typeof setDefaultDesignUI === 'function') {
        setDefaultDesignUI();
    } else {
        // フォールバック
        const layout = document.getElementById('creator-set-layout');
        if(layout) layout.value = 'standard';
    }
};

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

    } else if (type === 'free_written' || type === 'free_oral') {
        const optDiv = document.createElement('div');
        optDiv.style.marginBottom = '10px';
        optDiv.innerHTML = `<p style="font-size:0.8em; color:#666; margin:5px 0;">${APP_TEXT.Creator.DescText}</p>`;
        container.appendChild(optDiv);

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'creator-text-answer';
        input.className = 'btn-block';
        input.placeholder = 'e.g. Apple, Ringot, APPL';
        if (data && data.correct) input.value = data.correct.join(', ');
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

/* host_creator.js の addChoiceInput 周辺を修正 */

// ★修正: チェックボックスを隠して、ラベルをクリックで正解切り替えにする
function addChoiceInput(parent, index, text = "", checked = false) {
    if (parent.children.length >= 20) { alert(APP_TEXT.Creator.AlertMaxChoice); return; }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'choice-row';
    // 行全体をクリックしても正解切り替えできるようにしてもいいが、誤操作防止のためラベルのみにする
    
    // 1. 隠しチェックボックス（データ用）
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'choice-correct-chk';
    chk.checked = checked;
    chk.style.display = 'none'; // 見えなくする

    // 2. アルファベットラベル（ボタンスタイル）
    const labelBtn = document.createElement('div');
    labelBtn.className = 'choice-label-btn';
    if(checked) labelBtn.classList.add('active'); // 初期状態
    
    // クリックでトグル処理
    labelBtn.onclick = () => {
        chk.checked = !chk.checked;
        if(chk.checked) labelBtn.classList.add('active');
        else labelBtn.classList.remove('active');
    };

    // 3. テキスト入力
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'choice-text-input';
    inp.placeholder = 'Choice';
    inp.value = text;
    inp.style.flex = '1';

    // 4. 削除ボタン
    const del = document.createElement('button');
    del.textContent = '×';
    del.className = 'btn-mini btn-dark';
    del.style.width = '30px';
    del.style.marginLeft = '5px';
    del.onclick = () => {
        parent.removeChild(wrapper);
        updateChoiceLabels(parent); // 削除後に番号振り直し
    };

    wrapper.appendChild(chk);
    wrapper.appendChild(labelBtn); // チェックボックスの代わりにラベルを表示
    wrapper.appendChild(inp);
    wrapper.appendChild(del);
    parent.appendChild(wrapper);
    
    updateChoiceLabels(parent); // 追加後に番号振り直し
}

// ★新規追加: 選択肢のアルファベット(A,B,C...)を一括更新する関数
function updateChoiceLabels(parent) {
    const rows = parent.querySelectorAll('.choice-row');
    rows.forEach((row, i) => {
        const label = row.querySelector('.choice-label-btn');
        if(label) {
            label.textContent = String.fromCharCode(65 + i); // A, B, C...
        }
    });
}

function addSortInput(parent, index, text = "") {
    if (parent.children.length >= 20) { alert(APP_TEXT.Creator.AlertMaxChoice); return; }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'sort-row'; 
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '5px';
    
    const num = document.createElement('span');
    num.className = 'sort-label'; 
    num.style.fontWeight = 'bold';
    num.style.color = '#00bfff';
    num.style.minWidth = '25px';
    num.style.textAlign = 'center';
    num.style.fontSize = '1.2em';
    
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
    
    del.onclick = () => {
        parent.removeChild(wrapper);
        updateSortLabels(parent);
    };

    wrapper.appendChild(num);
    wrapper.appendChild(inp);
    wrapper.appendChild(del);
    parent.appendChild(wrapper);
    
    updateSortLabels(parent);
}

function updateSortLabels(parent) {
    const rows = parent.querySelectorAll('.sort-row');
    rows.forEach((row, i) => {
        const label = row.querySelector('.sort-label');
        if(label) label.textContent = String.fromCharCode(65 + i); 
    });
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

    } else if (type === 'free_written' || type === 'free_oral') {
        const ansText = document.getElementById('creator-text-answer').value.trim();
        if (type === 'free_written' && !ansText) { alert(APP_TEXT.Creator.AlertNoTextAns); return null; }
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
    renderCreatorForm(q.type, q);
    
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
        
        if(createdQuestions.length === 0) {
            document.getElementById('creator-q-type').disabled = false;
            document.getElementById('creator-type-locked-msg').classList.add('hidden');
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
        if(q.type === 'free_oral') typeIcon = '🗣';
        if(q.type === 'free_written') typeIcon = '✍️';
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
    
    const inputTitle = prompt("セット名を入力してください:", currentEditingTitle);
    if(inputTitle === null) return; 
    if(!inputTitle.trim()) {
        alert("セット名は必須です！");
        return;
    }
    const title = inputTitle.trim();
    
    const layout = document.getElementById('creator-set-layout').value;
    const align = document.getElementById('creator-set-align').value;
    // スペシャルモードは削除したのでnone固定
    const specialMode = 'none';
    
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
