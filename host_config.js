/* =========================================================
 * host_config.js (v66.1: Restore Bulk & Individual)
 * =======================================================*/

App.Config = {
    selectedSetQuestions: [],

    init: function() {
        App.Ui.showView(App.Ui.views.config);
        
        const setSelect = document.getElementById('config-set-select');
        const container = document.getElementById('config-builder-ui');
        
        if(setSelect) {
            setSelect.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
            const newSelect = setSelect.cloneNode(true);
            setSelect.parentNode.replaceChild(newSelect, setSelect);
            newSelect.addEventListener('change', () => this.updateBuilderUI());
        }
        
        if(container) container.innerHTML = '<p class="text-center text-gray p-20">セットを選択してください</p>';
        document.getElementById('config-program-title').value = '';
        document.getElementById('config-final-ranking-chk').checked = true;

        this.loadSetList();
        this.renderPreview();
        this.setupModal();
    },

    loadSetList: function() {
        const select = document.getElementById('config-set-select');
        if(!select) return;
        select.innerHTML = `<option value="">Loading...</option>`;
        if(!App.State.currentShowId) return;

        window.db.ref(`saved_sets/${App.State.currentShowId}`).once('value', snap => {
            const data = snap.val();
            select.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
            if(data) {
                const items = Object.keys(data).map(k => ({...data[k], key: k})).sort((a,b)=>b.createdAt-a.createdAt);
                items.forEach(item => {
                    const opt = document.createElement('option');
                    const val = { t: item.title, q: item.questions, c: item.config, sp: item.questions?.[0]?.specialMode||'none' };
                    opt.value = JSON.stringify(val);
                    opt.textContent = `${item.title} (${new Date(item.createdAt).toLocaleDateString()})`;
                    select.appendChild(opt);
                });
            }
        });
    },

    updateBuilderUI: function() {
        const container = document.getElementById('config-builder-ui');
        const select = document.getElementById('config-set-select');
        if(!select.value) {
            this.selectedSetQuestions = [];
            container.innerHTML = '<p class="text-center text-gray p-20">セットを選択してください</p>';
            return;
        }

        const data = JSON.parse(select.value);
        this.selectedSetQuestions = data.q || [];
        const conf = data.c || {};
        
        let html = `
            <div class="config-section-title">${APP_TEXT.Config.LabelMode}</div>
            <div class="config-item-box">
                <select id="config-mode-select" class="btn-block config-select highlight-select" onchange="App.Config.updateModeDetails(this.value)">
                    <option value="normal">${APP_TEXT.Config.ModeNormal}</option>
                    <option value="buzz">${APP_TEXT.Config.ModeBuzz}</option>
                    <option value="turn">${APP_TEXT.Config.ModeTurn}</option>
                    <option value="time_attack" style="color:red;">${APP_TEXT.Config.ModeTimeAttack}</option>
                </select>
                <div id="mode-details-normal" class="mode-details hidden mt-10">
                    <label class="config-label">${APP_TEXT.Config.LabelNormalLimit}</label>
                    <select id="config-normal-limit" class="btn-block config-select"><option value="one">${APP_TEXT.Config.NormalLimitOne}</option><option value="unlimited">${APP_TEXT.Config.NormalLimitUnlimited}</option></select>
                    <label class="config-label mt-10">${APP_TEXT.Config.LabelShuffleQ}</label>
                    <select id="config-shuffle-q" class="btn-block config-select"><option value="off">${APP_TEXT.Config.ShuffleQOff}</option><option value="on">${APP_TEXT.Config.ShuffleQOn}</option></select>
                </div>
                <div id="mode-details-buzz" class="mode-details hidden mt-10">
                     <label class="config-label">不正解時の処理</label>
                     <select id="config-buzz-wrong-action" class="btn-block config-select"><option value="next">次の回答者へ</option><option value="reset">全員リセット</option></select>
                </div>
                <div id="mode-details-time_attack" class="mode-details hidden mt-10 p-10 bg-yellow"><p class="text-sm text-red bold">※Time Shock: 5 sec/Q</p></div>
            </div>

            <div class="config-section-title mt-20">${APP_TEXT.Config.LabelRule}</div>
            <div class="config-item-box">
                <label class="config-label-large">${APP_TEXT.Config.LabelGameType}</label>
                <select id="config-game-type" class="btn-block config-select mb-10">
                    <option value="score">${APP_TEXT.Config.GameTypeScore}</option>
                    <option value="territory">${APP_TEXT.Config.GameTypeTerritory}</option>
                </select>
                
                <h5 class="mb-10">${APP_TEXT.Config.HeadingCustomScore}</h5>
                
                <div class="flex gap-5 mb-10 text-xs items-center bg-gray p-5">
                    <span class="bold">一括:</span>
                    <input type="number" id="bulk-time" class="w-40 text-center" placeholder="Time" value="0">
                    <button class="btn-mini btn-dark" onclick="App.Config.bulkApply('time')">反映</button>
                    
                    <input type="number" id="bulk-point" class="w-40 text-center" placeholder="Pt" value="1">
                    <button class="btn-mini btn-info" onclick="App.Config.bulkApply('point')">反映</button>
                </div>

                <div id="config-questions-list" class="scroll-list" style="height:150px;"></div>
            </div>

            <button id="config-add-playlist-btn" class="btn-success btn-block btn-large mt-20">${APP_TEXT.Config.BtnAddList}</button>
        `;
        container.innerHTML = html;

        document.getElementById('config-add-playlist-btn').onclick = () => this.addPeriod();
        
        const modeSel = document.getElementById('config-mode-select');
        if(conf.mode) modeSel.value = conf.mode;
        this.updateModeDetails(modeSel.value);
        this.renderQList();
        
        if(data.sp === 'time_attack') {
            modeSel.value = 'time_attack'; modeSel.disabled = true;
            this.updateModeDetails('time_attack');
        }
    },

    updateModeDetails: function(mode) {
        document.querySelectorAll('.mode-details').forEach(e => e.classList.add('hidden'));
        const el = document.getElementById(`mode-details-${mode}`);
        if(el) el.classList.remove('hidden');
    },

    renderQList: function() {
        const list = document.getElementById('config-questions-list');
        list.innerHTML = '';
        this.selectedSetQuestions.forEach((q, i) => {
            const row = document.createElement('div');
            row.className = 'flex-center border-b p-5';
            // ③ 個別調整用の入力欄
            row.innerHTML = `
                <div class="flex-1 text-sm bold truncate mr-5">Q${i+1}. ${q.q}</div>
                <div class="flex gap-5 text-xs items-center">
                    Time <input type="number" class="q-time-input w-40 text-center" data-index="${i}" value="${q.timeLimit||0}">
                    Pt <input type="number" class="q-point-input w-40 text-center" data-index="${i}" value="${q.points||1}">
                </div>
            `;
            list.appendChild(row);
        });
    },

    // ③ 一括反映機能
    bulkApply: function(type) {
        const val = document.getElementById(type === 'time' ? 'bulk-time' : 'bulk-point').value;
        const selector = type === 'time' ? '.q-time-input' : '.q-point-input';
        document.querySelectorAll(selector).forEach(inp => inp.value = val);
    },

    addPeriod: function() {
        const title = JSON.parse(document.getElementById('config-set-select').value).t;
        const mode = document.getElementById('config-mode-select').value;
        const qs = JSON.parse(JSON.stringify(this.selectedSetQuestions));
        
        document.querySelectorAll('.q-point-input').forEach(inp => qs[inp.dataset.index].points = parseInt(inp.value));
        document.querySelectorAll('.q-time-input').forEach(inp => qs[inp.dataset.index].timeLimit = parseInt(inp.value));

        const shuffle = document.getElementById('config-shuffle-q')?.value === 'on';
        if(shuffle) {
            for (let i = qs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [qs[i], qs[j]] = [qs[j], qs[i]];
            }
        }

        App.Data.periodPlaylist.push({
            title: title,
            questions: qs,
            config: {
                mode: mode,
                gameType: document.getElementById('config-game-type').value,
                initialStatus: 'revive',
                timeLimit: 0, eliminationRule: 'none',
                buzzWrongAction: document.getElementById('config-buzz-wrong-action')?.value || 'next'
            }
        });
        this.renderPreview();
    },

    renderPreview: function() {
        const list = document.getElementById('config-playlist-preview');
        list.innerHTML = '';
        if(App.Data.periodPlaylist.length === 0) {
            list.innerHTML = `<p class="empty-msg">${APP_TEXT.Config.AlertEmptyList}</p>`;
            return;
        }
        App.Data.periodPlaylist.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'timeline-card';
            div.innerHTML = `
                <div class="flex-1">
                    <div class="bold">${i+1}. ${item.title}</div>
                    <div class="text-sm text-gray">[${item.config.mode.toUpperCase()}] ${item.questions.length}Q</div>
                </div>
                <button class="delete-btn btn-mini" onclick="App.Config.remove(${i})">Del</button>
            `;
            list.appendChild(div);
        });
    },

    remove: function(i) {
        App.Data.periodPlaylist.splice(i, 1);
        this.renderPreview();
    },

    saveProgram: function() {
        const title = document.getElementById('config-program-title').value.trim();
        if(!title) return alert(APP_TEXT.Config.AlertNoTitle);
        
        const data = {
            title: title,
            playlist: App.Data.periodPlaylist,
            finalRanking: document.getElementById('config-final-ranking-chk').checked,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        window.db.ref(`saved_programs/${App.State.currentShowId}`).push(data).then(() => {
            App.Ui.showToast(APP_TEXT.Config.MsgSaved);
            App.Data.periodPlaylist = [];
            this.renderPreview();
        });
    },

    setupModal: function() {
        document.getElementById('config-open-load-modal-btn').onclick = () => {
            const sel = document.getElementById('config-prog-select');
            sel.innerHTML = '<option>Loading...</option>';
            document.getElementById('config-load-modal').classList.remove('hidden');
            
            window.db.ref(`saved_programs/${App.State.currentShowId}`).once('value', snap => {
                sel.innerHTML = '<option value="">-- Select --</option>';
                const data = snap.val();
                if(data) {
                    Object.values(data).forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = JSON.stringify(d);
                        opt.textContent = d.title;
                        sel.appendChild(opt);
                    });
                }
            });
        };
        
        document.getElementById('config-load-prog-exec-btn').onclick = () => {
            const val = document.getElementById('config-prog-select').value;
            if(!val) return;
            const prog = JSON.parse(val);
            App.Data.periodPlaylist = prog.playlist;
            document.getElementById('config-program-title').value = prog.title;
            this.renderPreview();
            document.getElementById('config-load-modal').classList.add('hidden');
        };
        
        document.getElementById('config-modal-close-btn').onclick = () => {
            document.getElementById('config-load-modal').classList.add('hidden');
        };
    },
    
    loadExternal: function(progData) {
        if(!confirm("Load this program?")) return;
        App.Data.periodPlaylist = JSON.parse(JSON.stringify(progData.playlist));
        App.Ui.showView(App.Ui.views.config);
        document.getElementById('config-program-title').value = progData.title;
        this.renderPreview();
        setTimeout(() => this.loadSetList(), 500);
    }
};

window.enterConfigMode = () => App.Config.init();
window.loadProgramToConfigOnDash = (d) => App.Config.loadExternal(d);
document.getElementById('config-save-program-btn')?.addEventListener('click', () => App.Config.saveProgram());
document.getElementById('config-go-studio-btn')?.addEventListener('click', () => { App.Config.saveProgram(); window.startRoom(); });
