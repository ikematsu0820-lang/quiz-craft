/* =========================================================
 * host_creator.js (v25: Multi-Type Questions)
 * =======================================================*/

function initCreatorMode() {
    editingSetId = null;
    createdQuestions = [];
    document.getElementById('quiz-set-title').value = '';
    document.getElementById('save-to-cloud-btn').textContent = 'クラウドに保存して完了';
    
    // UI初期化：デフォルトは選択式
    document.getElementById('creator-q-type').value = 'choice';
    renderCreatorForm('choice');
    
    renderQuestionList();
    window.showView(window.views.creator);
}

function loadSetForEditing(key, item) {
    editingSetId = key;
    createdQuestions = item.questions || [];
    document.getElementById('quiz-set-title').value = item.title;
    document.getElementById('save-to-cloud-btn').textContent = '更新して完了';
    
    renderCreatorForm('choice'); // フォームは初期状態へ
    renderQuestionList();
    window.showView(window.views.creator);
}

// 形式切り替えリスナー
document.addEventListener('DOMContentLoaded', () => {
    const typeSelect = document.getElementById('creator-q-type');
    if(typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            renderCreatorForm(e.target.value);
        });
    }
});

// フォームの描画（タイプ別）
function renderCreatorForm(type) {
    const container = document.getElementById('creator-form-container');
    container.innerHTML = ''; // クリア

    if (type === 'choice') {
        // --- 選択式 ---
        // オプション設定
        const settingsDiv = document.createElement('div');
        settingsDiv.style.marginBottom = '10px';
        settingsDiv.style.fontSize = '0.9em';
        settingsDiv.innerHTML = `
            <label style="margin-right:10px;"><input type="checkbox" id="opt-multi-select"> 複数回答可</label>
            <span id="opt-partial-area" class="hidden">
                <label><input type="checkbox" id="opt-partial-credit"> 部分点あり</label>
            </span>
        `;
        container.appendChild(settingsDiv);

        // 選択肢コンテナ
        const choicesDiv = document.createElement('div');
        choicesDiv.id = 'creator-choices-list';
        choicesDiv.style.display = 'grid';
        choicesDiv.style.gap = '5px';
        container.appendChild(choicesDiv);

        // デフォルト4択生成
        for(let i=0; i<4; i++) addChoiceInput(choicesDiv, i);

        // 追加ボタン
        const addBtn = document.createElement('button');
        addBtn.textContent = '＋ 選択肢を追加';
        addBtn.className = 'btn-info';
        addBtn.style.marginTop = '10px';
        addBtn.style.padding = '5px';
        addBtn.onclick = () => addChoiceInput(choicesDiv);
        container.appendChild(addBtn);

        // 複数回答チェック時の挙動
        const multiChk = document.getElementById('opt-multi-select');
        multiChk.onchange = () => {
            const partial = document.getElementById('opt-partial-area');
            if(multiChk.checked) partial.classList.remove('hidden');
            else partial.classList.add('hidden');
        };

    } else if (type === 'sort') {
        // --- 並べ替え ---
        const desc = document.createElement('p');
        desc.style.fontSize = '0.8em';
        desc.style.color = '#666';
        desc.textContent = '※正解の順序で上から入力してください（出題時はシャッフルされます）';
        container.appendChild(desc);

        const sortDiv = document.createElement('div');
        sortDiv.id = 'creator-sort-list';
        sortDiv.style.display = 'flex';
        sortDiv.style.flexDirection = 'column';
        sortDiv.style.gap = '5px';
        container.appendChild(sortDiv);

        // デフォルト4つ
        for(let i=0; i<4; i++) addSortInput(sortDiv, i);

        const addBtn = document.createElement('button');
        addBtn.textContent = '＋ 項目を追加';
        addBtn.className = 'btn-info';
        addBtn.style.marginTop = '10px';
        addBtn.style.padding = '5px';
        addBtn.onclick = () => addSortInput(sortDiv);
        container.appendChild(addBtn);

    } else if (type === 'text') {
        // --- 自由入力 ---
        const desc = document.createElement('p');
        desc.style.fontSize = '0.8em';
        desc.style.color = '#666';
        desc.textContent = '※正解となるキーワードを入力してください（複数ある場合はカンマ区切り）';
        container.appendChild(desc);

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'creator-text-answer';
        input.className = 'btn-block';
        input.placeholder = '例: 徳川家康, 家康, 家康くん';
        container.appendChild(input);
    }
}

// 選択肢入力欄の追加
function addChoiceInput(parent, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'choice-row';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '5px';

    // 正解チェックボックス
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'choice-correct-chk';
    
    // テキスト入力
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'choice-text-input';
    inp.placeholder = '選択肢';
    inp.style.flex = '1';

    // 削除ボタン
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

// 並べ替え項目入力欄の追加
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
    inp.placeholder = '項目';
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

// 問題の追加処理（形式に応じてデータ構築）
function addQuestion() {
    const qText = document.getElementById('question-text').value.trim();
    if(!qText) { alert('問題文を入力してください'); return; }

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
                if(isChk) correct.push(options.length - 1); // インデックス保存
            }
        });

        if (options.length < 2) { alert('選択肢は2つ以上必要です'); return; }
        if (correct.length === 0) { alert('正解を選んでください'); return; }

        newQ.c = options; // 互換性のため 'c' (choices)
        newQ.correct = correct; // 配列で保存
        newQ.correctIndex = correct[0]; // 旧互換性（単一正解用）
        newQ.multi = document.getElementById('opt-multi-select').checked;
        newQ.partial = document.getElementById('opt-partial-credit').checked;

    } else if (type === 'sort') {
        const inputs = document.querySelectorAll('.sort-text-input');
        const options = [];
        inputs.forEach(inp => {
            if(inp.value.trim()) options.push(inp.value.trim());
        });
        if(options.length < 2) { alert('項目は2つ以上必要です'); return; }
        
        newQ.c = options; // 正しい順序で保存
        newQ.correct = options.map((_, i) => i); // [0, 1, 2...] 正解インデックス

    } else if (type === 'text') {
        const ansText = document.getElementById('creator-text-answer').value.trim();
        if(!ansText) { alert('正解を入力してください'); return; }
        
        // カンマ区切りで配列化
        const answers = ansText.split(',').map(s => s.trim()).filter(s => s);
        newQ.correct = answers; 
    }

    createdQuestions.push(newQ);
    renderQuestionList();
    
    // 入力クリア
    document.getElementById('question-text').value = '';
    document.getElementById('question-text').focus();
    // フォーム内もリセット（再描画）
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
        delSpan.textContent = ' [削除]';
        delSpan.style.color = 'red';
        delSpan.style.cursor = 'pointer';
        delSpan.style.marginLeft = '10px';
        delSpan.style.fontSize = '0.8em';
        delSpan.onclick = () => {
            createdQuestions.splice(index, 1);
            renderQuestionList();
        };
        li.appendChild(delSpan);
        list.appendChild(li);
    });
    document.getElementById('q-count').textContent = createdQuestions.length;
}

function saveToCloud() {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }
    const title = document.getElementById('quiz-set-title').value.trim() || "無題のセット";
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
            alert(`「${title}」を更新しました！`);
            enterDashboard();
        });
    } else {
        window.db.ref(`saved_sets/${currentShowId}`).push(saveData)
        .then(() => {
            alert(`「${title}」を新規保存しました！`);
            enterDashboard();
        });
    }
}
