/* =========================================================
 * host_config.js (v68: Unified Modern UI)
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
        
        // ★UI構築：全モードをSoloモード風のグリッドデザインに統一
        let html = `
            <div class="config-section-title">${APP_TEXT.Config.LabelMode}</div>
            <div class="config-item-box">
                <select id="config-mode-select" class="btn-block config-select highlight-select" onchange="App.Config.updateModeDetails(this.value)">
                    <option value="normal">${APP_TEXT.Config.ModeNormal}</option>
                    <option value="buzz">${APP_TEXT.Config.ModeBuzz}</option>
                    <option value="turn">${APP_TEXT.Config.ModeTurn}</option>
                    <option value="solo" style="color:#00bfff; font-weight:bold;">${APP_TEXT.Config.ModeSolo}</option>
                </select>
                
                <div id="mode-details-normal" class="mode-details hidden mode-settings-box mode-box-normal">
                    <div class="grid-2-col">
                        <div>
                            <label class="config-label">制限時間 (Time Limit)</label>
                            <div class="flex-center">
                                <input type="number" id="config-normal-time" class="btn-block" value="0" min="0" placeholder="0=無制限">
                                <span class="unit-text">秒</span>
                            </div>
                        </div>
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelNormalLimit}</label>
                            <select id="config-normal-limit" class="btn-block config-select">
                                <option value="unlimited">${APP_TEXT.Config.NormalLimitUnlimited}</option>
                                <option value="one">${APP_TEXT.Config.NormalLimitOne}</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid-2-col mt-10">
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelShuffleQ}</label>
                            <select id="config-shuffle-q" class="btn-block config-select">
                                <option value="off">${APP_TEXT.Config.ShuffleQOff}</option>
                                <option value="on">${APP_TEXT.Config.ShuffleQOn}</option>
                            </select>
                        </div>
                        <div></div> 
                    </div>
                </div>
                
                <div id="mode-details-buzz" class="mode-details hidden mode-settings-box mode-box-buzz">
                    <div class="grid-2-col">
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelBuzzWrongAction}</label>
                            <select id="config-buzz-wrong-action" class="btn-block config-select">
                                <option value="next">${APP_TEXT.Config.BuzzWrongNext}</option>
                                <option value="reset">${APP_TEXT.Config.BuzzWrongReset}</option>
                                <option value="end">${APP_TEXT.Config.BuzzWrongEnd}</option>
                            </select>
                        </div>
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelBuzzTime}</label>
                            <select id="config-buzz-timer" class="btn-block config-select">
                                <option value="0">${APP_TEXT.Config.BuzzTimeNone}</option>
                                <option value="5">${APP_TEXT.Config.BuzzTime5}</option>
                                <option value="10">${APP_TEXT.Config.BuzzTime10}</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid-2-col mt-10">
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelShuffleQ}</label>
                            <select id="config-buzz-shuffle" class="btn-block config-select">
                                <option value="off">${APP_TEXT.Config.ShuffleQOff}</option>
                                <option value="on">${APP_TEXT.Config.ShuffleQOn}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div id="mode-details-turn" class="mode-details hidden mode-settings-box mode-box-turn">
                    <div class="grid-2-col">
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelTurnOrder}</label>
                            <select id="config-turn-order" class="btn-block config-select">
                                <option value="fixed">${APP_TEXT.Config.TurnOrderFixed}</option>
                                <option value="random">${APP_TEXT.Config.TurnOrderRandom}</option>
                                <option value="rank">${APP_TEXT.Config.TurnOrderRank}</option>
                            </select>
                        </div>
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelTurnPass}</label>
                            <select id="config-turn-pass" class="btn-block config-select">
                                <option value="ok">${APP_TEXT.Config.TurnPassOk}</option>
                                <option value="ng">${APP_TEXT.Config.TurnPassNg}</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid-2-col mt-10">
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelShuffleQ}</label>
                            <select id="config-turn-shuffle" class="btn-block config-select">
                                <option value="off">${APP_TEXT.Config.ShuffleQOff}</option>
                                <option value="on">${APP_TEXT.Config.ShuffleQOn}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div id="mode-details-solo" class="mode-details hidden mode-settings-box mode-box-solo">
                    <div class="grid-2-col">
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelSoloStyle}</label>
                            <select id="config-solo-style" class="btn-block config-select">
                                <option value="manual">${APP_TEXT.Config.SoloStyleManual}</option>
                                <option value="correct">${APP_TEXT.Config.SoloStyleCorrect}</option>
                                <option value="auto">${APP_TEXT.Config.SoloStyleAuto}</option>
                            </select>
                        </div>
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelSoloTimeType}</label>
                            <select id="config-solo-time-type" class="btn-block config-select">
                                <option value="per_q">${APP_TEXT.Config.SoloTimePerQ}</option>
                                <option value="total">${APP_TEXT.Config.SoloTimeTotal}</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="grid-2-col mt-10">
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelSoloTimeValue}</label>
                            <div class="flex-center">
                                <input type="number" id="config-solo-time-val" class="btn-block" value="5" min="1">
                                <span class="unit-text">秒</span>
                            </div>
                        </div>
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelSoloRecovery}</label>
                            <select id="config-solo-recovery" class="btn-block config-select">
                                <option value="none">${APP_TEXT.Config.SoloRecoveryNone}</option>
                                <option value="1">+1s</option>
                                <option value="3">+3s</option>
                                <option value="5">+5s</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid-2-col mt-10">
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelSoloLife}</label>
                            <select id="config-solo-life" class="btn-block config-select">
                                <option value="0">${APP_TEXT.Config.SoloLifeSudden}</option>
                                <option value="2">2 Lives</option>
                                <option value="3">3 Lives</option>
                                <option value="5">5 Lives</option>
                            </select>
                        </div>
                        <div>
                            <label class="config-label">${APP_TEXT.Config.LabelSoloRetire}</label>
                            <select id="config-solo-retire" class="btn-block config-select">
                                <option value="off">${APP_TEXT.Config.SoloRetireOff}</option>
                                <option value="on">${APP_TEXT.Config.SoloRetireOn}</option>
                            </select>
                        </div>
                    </div>
                </div>
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
        if(conf.mode) modeSel.value = (conf.mode === 'time_attack') ? 'solo' : conf.mode;
        this.updateModeDetails(modeSel.value);
        this.renderQList();
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

        // シャッフル設定の読み取り（モード別IDに対応）
        let shuffle = 'off';
        if(mode === 'normal') shuffle = document.getElementById('config-shuffle-q')?.value;
        else if(mode === 'buzz') shuffle = document.getElementById('config-buzz-shuffle')?.value;
        else if(mode === 'turn') shuffle = document.getElementById('config-turn-shuffle')?.value;
        
        if(shuffle === 'on') {
            for (let i = qs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [qs[i], qs[j]] = [qs[j], qs[i]];
            }
        }

        // 基本Config
        const newConfig = {
            mode: mode,
            gameType: document.getElementById('config-game-type').value,
            initialStatus: 'revive',
            timeLimit: 0, 
            eliminationRule: 'none',
            buzzWrongAction: document.getElementById('config-buzz-wrong-action')?.value || 'next',
            buzzTime: parseInt(document.getElementById('config-buzz-timer')?.value) || 0,
            
            // 一斉回答の設定
            normalLimit: document.getElementById('config-normal-limit')?.value || 'unlimited',
            
            // 順番回答の設定
            turnOrder: document.getElementById('config-turn-order')?.value || 'fixed',
            turnPass: document.getElementById('config-turn-pass')?.value || 'ok'
        };

        // 一斉回答の制限時間設定
        if (mode === 'normal') {
            newConfig.timeLimit = parseInt(document.getElementById('config-normal-time')?.value) || 0;
        }

        // Solo Mode Configs
        if (mode === 'solo') {
            newConfig.soloStyle = document.getElementById('config-solo-style').value;
            newConfig.soloTimeType = document.getElementById('config-solo-time-type').value;
            newConfig.soloTimeVal = parseInt(document.getElementById('config-solo-time-val').value) || 5;
            newConfig.soloLife = parseInt(document.getElementById('config-solo-life').value) || 0;
            newConfig.soloRetire = document.getElementById('config-solo-retire').value;
            newConfig.soloRecovery = parseInt(document.getElementById('config-solo-recovery').value) || 0;
        }

        App.Data.periodPlaylist.push({
            title: title,
            questions: qs,
            config: newConfig
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
