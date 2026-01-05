/* =========================================================
 * host_creator.js (v38: Removed Partial Credit)
 * =======================================================*/

window.initCreatorMode = function() {
    editingSetId = null;
    createdQuestions = [];
    document.getElementById('quiz-set-title').value = '';
    document.getElementById('save-to-cloud-btn').textContent = APP_TEXT.Creator.BtnSave;
    
    const typeSelect = document.getElementById('creator-q-type');
    if(typeSelect) {
        typeSelect.innerHTML = `
            <option value="choice">${APP_TEXT.Creator.TypeChoice}</option>
            <option value="sort">${APP_TEXT.Creator.TypeSort}</option>
            <option value="text">${APP_TEXT.Creator.TypeText}</option>
        `;
        typeSelect.value = 'choice';
        renderCreatorForm('choice');
    }
    
    renderQuestionList();
    window.showView(window.views.creator);
};

window.loadSetForEditing = function(key, item) {
    editingSetId = key;
    createdQuestions = item.questions || [];
    document.getElementById('quiz-set-title').value = item.title;
    document.getElementById('save-to-cloud-btn').textContent = APP_TEXT.Creator.BtnUpdate;
    
    const typeSelect = document.getElementById('creator-q-type');
    if(typeSelect) {
        typeSelect.innerHTML = `
            <option value="choice">${APP_TEXT.Creator.TypeChoice}</option>
            <option value="sort">${APP_TEXT.Creator.TypeSort}</option>
            <option value="text">${APP_TEXT.Creator.TypeText}</option>
        `;
        typeSelect.value = 'choice';
        renderCreatorForm('choice'); 
    }

    renderQuestionList();
    window.showView(window.views.creator);
};

document.addEventListener('DOMContentLoaded', () => {
    const typeSelect = document.getElementById('creator-q-type');
    if(typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            renderCreatorForm(e.target.value);
        });
    }
});

function renderCreatorForm(type) {
    const container = document.getElementById('creator-form-container');
    if(!container) return; 
    container.innerHTML = ''; 

    if (type === 'choice') {
        const settingsDiv = document.createElement('div');
        settingsDiv.style.marginBottom = '10px';
        settingsDiv.style.fontSize = '0.9em';
        // ★修正: 部分点エリアを削除
        settingsDiv.innerHTML = `
            <label style="margin-right:10px;"><input type="checkbox" id="opt-multi-select"> ${APP_TEXT.Creator.OptMulti}</label>
        `;
        container.appendChild(settingsDiv);

        const choicesDiv = document.createElement('div');
        choicesDiv.id = 'creator-choices-list';
        choicesDiv.style.display = 'grid';
        choicesDiv.style.gap = '5px';
        container.appendChild(choicesDiv);

        for(let i=0; i<4; i++) addChoiceInput(choicesDiv, i);

        const addBtn = document.createElement('button');
        addBtn.textContent = APP_TEXT.Creator.BtnAddChoice;
        addBtn.className = 'btn-info';
        addBtn.style.marginTop = '10px';
        addBtn.style.padding = '5px';
        addBtn.onclick = () => addChoiceInput(choicesDiv);
        container.appendChild(addBtn);

    } else if (type === 'sort') {
        const desc = document.createElement('p');
        desc.style.fontSize = '0.8em';
        desc.style.color = '#666';
        desc.textContent = '※Correct Order (Top to Bottom)';
        container.appendChild(desc);

        const sortDiv = document.createElement('div');
        sortDiv.id = 'creator-sort-list';
        sortDiv.style.display = 'flex';
        sortDiv.style.flexDirection = 'column';
        sortDiv.style.gap = '5px';
        container.appendChild(sortDiv);

        for(let i=0; i<4; i++) addSortInput(sortDiv, i);

        const addBtn = document.createElement('button');
        addBtn.textContent = APP_TEXT.Creator.BtnAddSort;
        addBtn.className = 'btn-info';
        addBtn.style.marginTop = '10px';
        addBtn.style.padding = '5px';
        addBtn.onclick = () => addSortInput(sortDiv);
        container.appendChild(addBtn);

    } else if (type === 'text') {
        const desc = document.createElement('p');
        desc.style.fontSize = '0.8em';
        desc.style.color = '#666';
        desc.textContent = '※Correct Keywords (comma separated)';
        container.appendChild(desc);

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'creator-text-answer';
        input.className = 'btn-block';
        input.placeholder = 'e.g. Apple, Ringot, APPL';
        container.appendChild(input);
    }
}

function addChoiceInput(parent, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'choice-row';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'choice-correct-chk';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'choice-text-input';
    inp.placeholder = 'Choice';
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

function addSortInput(parent) {
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

function addQuestion() {
    const qText = document.getElementById('question-text').value.trim();
    if(!qText) { alert(APP_TEXT.Creator.AlertNoQ); return; }

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
        if (options.length < 2) { alert(APP_TEXT.Creator.AlertLessChoice); return; }
        if (correct.length === 0) { alert(APP_TEXT.Creator.AlertNoCorrect); return; }
        newQ.c = options; 
        newQ.correct = correct;
        newQ.correctIndex = correct[0];
        newQ.multi = document.getElementById('opt-multi-select').checked;
        newQ.partial = false; // ★修正: 部分点は常に無効

    } else if (type === 'sort') {
        const inputs = document.querySelectorAll('.sort-text-input');
        const options = [];
        inputs.forEach(inp => { if(inp.value.trim()) options.push(inp.value.trim()); });
        if(options.length < 2) { alert(APP_TEXT.Creator.AlertLessChoice); return; }
        newQ.c = options; 
        newQ.correct = options.map((_, i) => i);

    } else if (type === 'text') {
        const ansText = document.getElementById('creator-text-answer').value.trim();
        if(!ansText) { alert(APP_TEXT.Creator.AlertNoTextAns); return; }
        const answers = ansText.split(',').map(s => s.trim()).filter(s => s);
        newQ.correct = answers; 
    }

    createdQuestions.push(newQ);
    renderQuestionList();
    document.getElementById('question-text').value = '';
    document.getElementById('question-text').focus();
    renderCreatorForm(type);
}

function renderQuestionList() {
    const list = document.getElementById('q-list');
    list.innerHTML = '';
    createdQuestions.forEach((q, index) => {
        const li = document.createElement('li');
        let typeIcon = '🔳';
        if(q.type === 'sort') typeIcon = '🔢';
        if(q.type === 'text') typeIcon = '✍️';
        li.innerHTML = `${typeIcon} <b>Q${index + 1}.</b> ${q.q}`;
        const delSpan = document.createElement('span');
        delSpan.textContent = ' [x]';
        delSpan.style.color = 'red';
        delSpan.style.cursor = 'pointer';
        delSpan.onclick = () => {
            createdQuestions.splice(index, 1);
            renderQuestionList();
        };
        li.appendChild(delSpan);
        list.appendChild(li);
    });
}

function saveToCloud() {
    if(createdQuestions.length === 0) { alert('No questions'); return; }
    const title = document.getElementById('quiz-set-title').value.trim() || "Untitled";
    const defaultConf = { eliminationRule: 'none', scoreUnit: 'point', theme: 'light' };
    const saveData = {
        title: title,
        config: defaultConf,
        questions: createdQuestions,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    if (editingSetId) {
        window.db.ref(`saved_sets/${currentShowId}/${editingSetId}`).update(saveData)
        .then(() => { alert(`Updated!`); enterDashboard(); });
    } else {
        window.db.ref(`saved_sets/${currentShowId}`).push(saveData)
        .then(() => { alert(`Saved!`); enterDashboard(); });
    }
}
