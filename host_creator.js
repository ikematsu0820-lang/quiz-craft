/* =========================================================
 * host_creator.js (v66.1: Fix Select Options)
 * =======================================================*/

App.Creator = {
    editingIndex: null,
    editingTitle: "",

    init: function() {
        this.editingIndex = null;
        this.editingTitle = "";
        App.Data.createdQuestions = [];
        App.State.editingSetId = null;

        const btnSave = document.getElementById('save-to-cloud-btn');
        if(btnSave) btnSave.textContent = APP_TEXT.Creator.BtnSave;

        // デザイン設定のリセット
        if(window.resetGlobalSettings) window.resetGlobalSettings();

        // ★修正: 出題形式の選択肢を生成
        this.setupTypeSelect();

        this.resetForm();
        this.renderList();
        App.Ui.showView(App.Ui.views.creator);

        const typeSelect = document.getElementById('creator-q-type');
        if(typeSelect) {
            typeSelect.disabled = false;
            document.getElementById('creator-type-locked-msg').classList.add('hidden');
            this.renderForm(typeSelect.value);
        }
    },

    // ★追加: セレクトボックスの選択肢生成
    setupTypeSelect: function() {
        const sel = document.getElementById('creator-q-type');
        if(!sel || sel.options.length > 0) return; // 既に生成済みならスキップ

        const opts = [
            { v: 'choice', t: APP_TEXT.Creator.TypeChoice },
            { v: 'sort', t: APP_TEXT.Creator.TypeSort },
            { v: 'free_oral', t: APP_TEXT.Creator.TypeFreeOral },
            { v: 'free_written', t: APP_TEXT.Creator.TypeFreeWritten },
            { v: 'multi', t: APP_TEXT.Creator.TypeMulti }
        ];
        opts.forEach(o => {
            const el = document.createElement('option');
            el.value = o.v;
            el.textContent = o.t;
            sel.appendChild(el);
        });
        
        // イベント再登録
        sel.onchange = (e) => {
            if(App.Data.createdQuestions.length === 0) this.renderForm(e.target.value);
        };
    },

    loadSet: function(key, item) {
        App.State.editingSetId = key;
        this.editingTitle = item.title || "";
        App.Data.createdQuestions = item.questions || [];

        const btnSave = document.getElementById('save-to-cloud-btn');
        if(btnSave) btnSave.textContent = APP_TEXT.Creator.BtnUpdate;

        // 選択肢生成を確実に行う
        this.setupTypeSelect();

        const typeSelect = document.getElementById('creator-q-type');
        if(App.Data.createdQuestions.length > 0) {
            const firstQ = App.Data.createdQuestions[0];
            typeSelect.value = firstQ.type;
            typeSelect.disabled = true;
            document.getElementById('creator-type-locked-msg').classList.remove('hidden');

            if(document.getElementById('creator-set-layout')) document.getElementById('creator-set-layout').value = firstQ.layout || 'standard';
            if(window.updateAlignUI) window.updateAlignUI(firstQ.align || 'center');
            
            if(window.applyDesignToUI && firstQ.design) {
                window.applyDesignToUI(firstQ.design, firstQ.layout, firstQ.align);
            }
        } else {
            typeSelect.disabled = false;
            document.getElementById('creator-type-locked-msg').classList.add('hidden');
        }

        this.resetForm();
        this.renderList();
        App.Ui.showView(App.Ui.views.creator);
    },

    resetForm: function() {
        this.editingIndex = null;
        document.getElementById('creator-form-title').textContent = APP_TEXT.Creator.HeadingNewQ;
        document.getElementById('add-question-btn').classList.remove('hidden');
        document.getElementById('update-question-area').classList.add('hidden');
        document.getElementById('question-text').value = '';
        
        const type = document.getElementById('creator-q-type').value;
        this.renderForm(type);
    },

    renderForm: function(type, data = null) {
        const container = document.getElementById('creator-form-container');
        if(!container) return; 
        container.innerHTML = ''; 

        if (type === 'choice') {
            const isMulti = data ? data.multi : false;
            container.innerHTML = `<label class="mb-10 block pointer"><input type="checkbox" id="opt-multi-select" ${isMulti?'checked':''}> ${APP_TEXT.Creator.OptMulti}</label>`;
            
            const choicesDiv = document.createElement('div');
            choicesDiv.id = 'creator-choices-list';
            choicesDiv.className = 'grid-gap-5';
            container.appendChild(choicesDiv);

            if (data) data.c.forEach((txt, i) => this.addChoiceInput(choicesDiv, i, txt, data.correct.includes(i)));
            else for(let i=0; i<4; i++) this.addChoiceInput(choicesDiv, i);

            this.createAddBtn(container, APP_TEXT.Creator.BtnAddChoice, () => this.addChoiceInput(choicesDiv));
        } 
        else if (type === 'sort') {
            const initVal = data ? data.initialOrder : 'random';
            container.innerHTML = `
                <p class="text-sm text-gray mb-5">${APP_TEXT.Creator.DescSort}</p>
                <label class="text-sm bold">${APP_TEXT.Creator.LabelSortInitial}</label>
                <select id="sort-initial-order" class="mb-10 config-select btn-block"><option value="random" ${initVal==='random'?'selected':''}>${APP_TEXT.Creator.SortInitialRandom}</option><option value="fixed" ${initVal==='fixed'?'selected':''}>${APP_TEXT.Creator.SortInitialFixed}</option></select>
            `;
            const sortDiv = document.createElement('div');
            sortDiv.className = 'flex-col gap-5';
            container.appendChild(sortDiv);

            if (data) data.c.forEach((txt, i) => this.addSortInput(sortDiv, i, txt));
            else for(let i=0; i<4; i++) this.addSortInput(sortDiv, i);

            this.createAddBtn(container, APP_TEXT.Creator.BtnAddSort, () => this.addSortInput(sortDiv));
        }
        else if (type === 'free_written' || type === 'free_oral') {
            container.innerHTML = `<p class="text-sm text-gray mb-5">${APP_TEXT.Creator.DescText}</p>`;
            const input = document.createElement('input');
            input.type = 'text'; input.id = 'creator-text-answer'; input.className = 'btn-block';
            input.placeholder = 'Answer Keyword';
            if (data && data.correct) input.value = data.correct.join(', ');
            container.appendChild(input);
        }
        else if (type === 'multi') {
            container.innerHTML = `<p class="text-sm text-gray mb-5">${APP_TEXT.Creator.DescMulti}</p>`;
            const multiDiv = document.createElement('div');
            multiDiv.className = 'grid-gap-5';
            container.appendChild(multiDiv);

            if (data) data.c.forEach((txt, i) => this.addMultiInput(multiDiv, i, txt));
            else for(let i=0; i<5; i++) this.addMultiInput(multiDiv, i);

            this.createAddBtn(container, APP_TEXT.Creator.BtnAddMulti, () => this.addMultiInput(multiDiv));
        }
    },

   function addChoiceInput(parent, index, text = "", checked = false) {
    if (parent.children.length >= 20) { alert(APP_TEXT.Creator.AlertMaxChoice); return; }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'choice-row';
    // CSSでレイアウト調整済み
    
    // 1. 隠しチェックボックス（データ用）
    // 見た目は消しますが、機能として残します
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'choice-correct-chk';
    chk.checked = checked;
    chk.style.display = 'none'; // ★ここ重要：画面から隠す

    // 2. アルファベットラベル（これをボタン化する）
    const labelBtn = document.createElement('div');
    labelBtn.className = 'choice-label-btn';
    if(checked) labelBtn.classList.add('active'); // 初期状態が正解なら色をつける
    
    // ★クリックで正解/不正解を切り替える処理
    labelBtn.onclick = () => {
        chk.checked = !chk.checked; // チェック状態を反転
        
        // 見た目の切り替え
        if(chk.checked) labelBtn.classList.add('active');
        else labelBtn.classList.remove('active');
    };

    // 3. テキスト入力
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'choice-text-input';
    inp.placeholder = 'Choice';
    inp.value = text;
    inp.style.flex = '1'; // 横幅いっぱいに

    // 4. 削除ボタン
    const del = document.createElement('button');
    del.textContent = '×';
    del.className = 'btn-mini btn-dark';
    del.style.width = '30px';
    del.style.marginLeft = '5px';
    del.onclick = () => {
        parent.removeChild(wrapper);
        updateChoiceLabels(parent); // 削除後にA,B,C...を振り直し
    };

    wrapper.appendChild(chk);
    wrapper.appendChild(labelBtn); // チェックボックスの代わりにラベルを表示
    wrapper.appendChild(inp);
    wrapper.appendChild(del);
    parent.appendChild(wrapper);
    
    updateChoiceLabels(parent); // 追加後にA,B,C...を振り直し
}

// （もし無ければ）アルファベットの一括更新関数
function updateChoiceLabels(parent) {
    const rows = parent.querySelectorAll('.choice-row');
    rows.forEach((row, i) => {
        const label = row.querySelector('.choice-label-btn');
        if(label) {
            label.textContent = String.fromCharCode(65 + i); // A, B, C...
        }
    });
}

    addSortInput: function(parent, index, text="") {
        const row = document.createElement('div');
        row.className = 'sort-row flex-center gap-5';
        row.innerHTML = `
            <span class="sort-label bold cyan text-lg w-25 text-center">A</span>
            <input type="text" class="sort-text-input flex-1" placeholder="Item" value="${text}">
            <button class="btn-mini btn-dark w-30">×</button>
        `;
        row.querySelector('button').onclick = () => { row.remove(); this.updateSortLabels(parent); };
        parent.appendChild(row);
        this.updateSortLabels(parent);
    },

    addMultiInput: function(parent, index, text="") {
        const row = document.createElement('div');
        row.className = 'flex-center gap-5';
        row.innerHTML = `
            <span>✅</span><input type="text" class="multi-text-input flex-1" placeholder="Answer" value="${text}">
            <button class="btn-mini btn-dark w-30">×</button>
        `;
        row.querySelector('button').onclick = () => row.remove();
        parent.appendChild(row);
    },

    createAddBtn: function(parent, text, onClick) {
        const btn = document.createElement('button');
        btn.className = 'btn-info btn-mini mt-10';
        btn.textContent = text;
        btn.onclick = onClick;
        parent.appendChild(btn);
    },

    updateLabels: function(parent) {
        parent.querySelectorAll('.choice-label-btn').forEach((el, i) => el.textContent = String.fromCharCode(65 + i));
    },
    updateSortLabels: function(parent) {
        parent.querySelectorAll('.sort-label').forEach((el, i) => el.textContent = String.fromCharCode(65 + i));
    },

    getData: function() {
        const qText = document.getElementById('question-text').value.trim();
        if(!qText) { alert(APP_TEXT.Creator.AlertNoQ); return null; }
        const type = document.getElementById('creator-q-type').value;
        let newQ = { q: qText, type: type, points: 1, loss: 0 };

        if (type === 'choice') {
            const opts = [], corr = [];
            document.querySelectorAll('.choice-row').forEach((row, i) => {
                const val = row.querySelector('.choice-text-input').value.trim();
                if(val) { opts.push(val); if(row.querySelector('.choice-correct-chk').checked) corr.push(opts.length-1); }
            });
            if(opts.length < 2 || corr.length === 0) { alert(APP_TEXT.Creator.AlertLessChoice); return null; }
            newQ.c = opts; newQ.correct = corr; newQ.correctIndex = corr[0];
            newQ.multi = document.getElementById('opt-multi-select').checked;
        } else if (type === 'sort') {
            const opts = [];
            document.querySelectorAll('.sort-text-input').forEach(inp => { if(inp.value.trim()) opts.push(inp.value.trim()); });
            if(opts.length < 2) return null;
            newQ.c = opts; newQ.correct = opts.map((_,i)=>i);
            newQ.initialOrder = document.getElementById('sort-initial-order').value;
        } else if (type.startsWith('free')) {
            const ans = document.getElementById('creator-text-answer').value.trim();
            if(type==='free_written' && !ans) { alert(APP_TEXT.Creator.AlertNoTextAns); return null; }
            newQ.correct = ans ? ans.split(',').map(s=>s.trim()).filter(s=>s) : [];
        } else if (type === 'multi') {
            const opts = [];
            document.querySelectorAll('.multi-text-input').forEach(inp => { if(inp.value.trim()) opts.push(inp.value.trim()); });
            if(opts.length < 1) return null;
            newQ.c = opts; newQ.correct = opts;
        }
        return newQ;
    },

    add: function() {
        const q = this.getData();
        if(q) {
            App.Data.createdQuestions.push(q);
            this.resetForm();
            this.renderList();
            App.Ui.showToast(APP_TEXT.Creator.MsgAddedToast);
            document.getElementById('creator-q-type').disabled = true;
            document.getElementById('creator-type-locked-msg').classList.remove('hidden');
        }
    },

    update: function() {
        if(this.editingIndex === null) return;
        const q = this.getData();
        if(q) {
            App.Data.createdQuestions[this.editingIndex] = { ...App.Data.createdQuestions[this.editingIndex], ...q };
            this.resetForm();
            this.renderList();
            App.Ui.showToast(APP_TEXT.Creator.MsgUpdatedToast);
        }
    },

    edit: function(index) {
        this.editingIndex = index;
        const q = App.Data.createdQuestions[index];
        document.getElementById('creator-form-title').textContent = APP_TEXT.Creator.HeadingEditQ;
        document.getElementById('add-question-btn').classList.add('hidden');
        document.getElementById('update-question-area').classList.remove('hidden');
        document.getElementById('question-text').value = q.q;
        this.renderForm(q.type, q);
        document.getElementById('creator-view').scrollIntoView({behavior:"smooth"});
    },

    delete: function(index) {
        if(confirm(APP_TEXT.Dashboard.DeleteConfirm)) {
            App.Data.createdQuestions.splice(index, 1);
            if(this.editingIndex === index) this.resetForm();
            this.renderList();
            if(App.Data.createdQuestions.length === 0) {
                document.getElementById('creator-q-type').disabled = false;
                document.getElementById('creator-type-locked-msg').classList.add('hidden');
                this.renderForm(document.getElementById('creator-q-type').value);
            }
        }
    },

    move: function(index, dir) {
        if ((dir === -1 && index > 0) || (dir === 1 && index < App.Data.createdQuestions.length - 1)) {
            const arr = App.Data.createdQuestions;
            [arr[index], arr[index + dir]] = [arr[index + dir], arr[index]];
            this.renderList();
        }
    },

    renderList: function() {
        const list = document.getElementById('q-list');
        list.innerHTML = '';
        App.Data.createdQuestions.forEach((q, i) => {
            const div = document.createElement('div');
            div.className = 'q-list-item flex-between';
            const icon = q.type==='sort'?'🔢':(q.type.startsWith('free')?'✍️':(q.type==='multi'?'📚':'🔳'));
            div.innerHTML = `
                <div class="text-sm bold">${icon} Q${i+1}. ${q.q}</div>
                <div class="flex gap-5">
                    <button class="btn-mini btn-dark" onclick="App.Creator.move(${i}, -1)">↑</button>
                    <button class="btn-mini btn-dark" onclick="App.Creator.move(${i}, 1)">↓</button>
                    <button class="btn-mini btn-info" onclick="App.Creator.edit(${i})">Edit</button>
                    <button class="btn-mini btn-danger" onclick="App.Creator.delete(${i})">×</button>
                </div>
            `;
            list.appendChild(div);
        });
    },

    save: function() {
        if(App.Data.createdQuestions.length === 0) { alert('No questions'); return; }
        const title = prompt("セット名を入力:", this.editingTitle);
        if(!title) return;

        const layout = document.getElementById('creator-set-layout').value;
        const align = document.getElementById('creator-set-align').value;
        const design = window.collectDesignSettings ? window.collectDesignSettings().design : {};

        App.Data.createdQuestions.forEach(q => {
            q.layout = layout; q.align = align; q.design = design; q.specialMode = 'none';
        });

        const data = {
            title: title,
            config: { eliminationRule: 'none', scoreUnit: 'point', theme: 'light' },
            questions: App.Data.createdQuestions,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        const path = `saved_sets/${App.State.currentShowId}`;
        const ref = App.State.editingSetId ? window.db.ref(`${path}/${App.State.editingSetId}`) : window.db.ref(path).push();
        
        (App.State.editingSetId ? ref.update(data) : ref.set(data)).then(() => {
            App.Ui.showToast(APP_TEXT.Creator.MsgSavedToast);
            App.Dashboard.enter();
        });
    }
};

window.initCreatorMode = () => App.Creator.init();
window.loadSetForEditing = (k, i) => App.Creator.loadSet(k, i);
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-question-btn')?.addEventListener('click', () => App.Creator.add());
    document.getElementById('update-question-btn')?.addEventListener('click', () => App.Creator.update());
    document.getElementById('cancel-update-btn')?.addEventListener('click', () => App.Creator.resetForm());
    document.getElementById('save-to-cloud-btn')?.addEventListener('click', () => App.Creator.save());
});
