/* =========================================================
 * host_creator.js (v66: Refactored Module)
 * =======================================================*/

App.Creator = {
    // 編集中のインデックス
    editingIndex: null,
    editingTitle: "",

    // 初期化 (Dashボタンから呼ばれる)
    init: function() {
        this.editingIndex = null;
        this.editingTitle = "";
        App.Data.createdQuestions = [];
        App.State.editingSetId = null;

        const btnSave = document.getElementById('save-to-cloud-btn');
        if(btnSave) btnSave.textContent = APP_TEXT.Creator.BtnSave;

        // デザイン設定のリセット (host_design.jsの関数利用)
        if(window.resetGlobalSettings) window.resetGlobalSettings();

        this.resetForm();
        this.renderList();
        App.Ui.showView(App.Ui.views.creator);

        // タイプ選択のロック解除
        const typeSelect = document.getElementById('creator-q-type');
        if(typeSelect) {
            typeSelect.disabled = false;
            document.getElementById('creator-type-locked-msg').classList.add('hidden');
            this.renderForm(typeSelect.value);
        }
    },

    // 既存セットの読み込み (DashのEditボタンから)
    loadSet: function(key, item) {
        App.State.editingSetId = key;
        this.editingTitle = item.title || "";
        App.Data.createdQuestions = item.questions || [];

        const btnSave = document.getElementById('save-to-cloud-btn');
        if(btnSave) btnSave.textContent = APP_TEXT.Creator.BtnUpdate;

        const typeSelect = document.getElementById('creator-q-type');
        
        // 1問目があれば設定をロック
        if(App.Data.createdQuestions.length > 0) {
            const firstQ = App.Data.createdQuestions[0];
            typeSelect.value = firstQ.type;
            typeSelect.disabled = true;
            document.getElementById('creator-type-locked-msg').classList.remove('hidden');

            if(document.getElementById('creator-set-layout')) document.getElementById('creator-set-layout').value = firstQ.layout || 'standard';
            if(window.updateAlignUI) window.updateAlignUI(firstQ.align || 'center');
            
            // デザイン適用 (host_design.js)
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

    // フォームのリセット
    resetForm: function() {
        this.editingIndex = null;
        document.getElementById('creator-form-title').textContent = APP_TEXT.Creator.HeadingNewQ;
        document.getElementById('add-question-btn').classList.remove('hidden');
        document.getElementById('update-question-area').classList.add('hidden');
        document.getElementById('question-text').value = '';
        
        const type = document.getElementById('creator-q-type').value;
        this.renderForm(type);
    },

    // フォーム描画 (Typeに応じて切り替え)
    renderForm: function(type, data = null) {
        const container = document.getElementById('creator-form-container');
        if(!container) return; 
        container.innerHTML = ''; 

        // --- 選択式 (Choice) ---
        if (type === 'choice') {
            const isMulti = data ? data.multi : false;
            container.innerHTML = `<label class="mb-10 block"><input type="checkbox" id="opt-multi-select" ${isMulti?'checked':''}> ${APP_TEXT.Creator.OptMulti}</label>`;
            
            const choicesDiv = document.createElement('div');
            choicesDiv.id = 'creator-choices-list';
            choicesDiv.className = 'grid-gap-5';
            container.appendChild(choicesDiv);

            if (data) data.c.forEach((txt, i) => this.addChoiceInput(choicesDiv, i, txt, data.correct.includes(i)));
            else for(let i=0; i<4; i++) this.addChoiceInput(choicesDiv, i);

            this.createAddBtn(container, APP_TEXT.Creator.BtnAddChoice, () => this.addChoiceInput(choicesDiv));
        } 
        // --- 並べ替え (Sort) ---
        else if (type === 'sort') {
            const initVal = data ? data.initialOrder : 'random';
            container.innerHTML = `
                <p class="text-sm text-gray mb-5">${APP_TEXT.Creator.DescSort}</p>
                <label class="text-sm bold">${APP_TEXT.Creator.LabelSortInitial}</label>
                <select id="sort-initial-order" class="mb-10"><option value="random" ${initVal==='random'?'selected':''}>${APP_TEXT.Creator.SortInitialRandom}</option><option value="fixed" ${initVal==='fixed'?'selected':''}>${APP_TEXT.Creator.SortInitialFixed}</option></select>
            `;
            const sortDiv = document.createElement('div');
            sortDiv.className = 'flex-col gap-5';
            container.appendChild(sortDiv);

            if (data) data.c.forEach((txt, i) => this.addSortInput(sortDiv, i, txt));
            else for(let i=0; i<4; i++) this.addSortInput(sortDiv, i);

            this.createAddBtn(container, APP_TEXT.Creator.BtnAddSort, () => this.addSortInput(sortDiv));
        }
        // --- 記述 (Free) ---
        else if (type === 'free_written' || type === 'free_oral') {
            container.innerHTML = `<p class="text-sm text-gray mb-5">${APP_TEXT.Creator.DescText}</p>`;
            const input = document.createElement('input');
            input.type = 'text'; input.id = 'creator-text-answer'; input.className = 'btn-block';
            input.placeholder = 'Answer Keyword';
            if (data && data.correct) input.value = data.correct.join(', ');
            container.appendChild(input);
        }
        // --- 多答 (Multi) ---
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

    // 選択肢入力行の追加
    addChoiceInput: function(parent, index, text="", checked=false) {
        if (parent.children.length >= 20) { alert(APP_TEXT.Creator.AlertMaxChoice); return; }
        const row = document.createElement('div');
        row.className = 'choice-row flex-center gap-5 p-5';
        
        row.innerHTML = `
            <input type="checkbox" class="choice-correct-chk" style="display:none;" ${checked?'checked':''}>
            <div class="choice-label-btn ${checked?'active':''}" onclick="this.previousElementSibling.click(); this.classList.toggle('active');">A</div>
            <input type="text" class="choice-text-input flex-1" placeholder="Choice" value="${text}">
            <button class="btn-mini btn-dark w-30" onclick="this.parentElement.remove(); App.Creator.updateLabels(this.parentElement.parentElement);">×</button>
        `;
        // 削除ボタンのonclickイベントはinnerHTMLだとthis参照が難しいので後付け推奨だが、今回は簡便に
        const delBtn = row.querySelector('button');
        delBtn.onclick = () => { row.remove(); this.updateLabels(parent); };
        
        parent.appendChild(row);
        this.updateLabels(parent);
    },

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

    // フォームからデータ収集
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

    // アクション
    add: function() {
        const q = this.getData();
        if(q) {
            App.Data.createdQuestions.push(q);
            this.resetForm();
            this.renderList();
            App.Ui.showToast(APP_TEXT.Creator.MsgAddedToast);
            // ロック
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

        // デザイン・レイアウト収集
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

// Global Bindings (HTMLのonclick互換性維持)
window.initCreatorMode = () => App.Creator.init();
window.loadSetForEditing = (k, i) => App.Creator.loadSet(k, i);
// イベントリスナー登録
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('creator-q-type')?.addEventListener('change', (e) => {
        if(App.Data.createdQuestions.length===0) App.Creator.renderForm(e.target.value);
    });
    document.getElementById('add-question-btn')?.addEventListener('click', () => App.Creator.add());
    document.getElementById('update-question-btn')?.addEventListener('click', () => App.Creator.update());
    document.getElementById('cancel-update-btn')?.addEventListener('click', () => App.Creator.resetForm());
    document.getElementById('save-to-cloud-btn')?.addEventListener('click', () => App.Creator.save());
});
