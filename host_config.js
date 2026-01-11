/* =========================================================
 * host_config.js (v103: Full Version with Split Mode/Type)
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
        
        let typeDisplay = "不明";
        if(this.selectedSetQuestions.length > 0) {
            const t = this.selectedSetQuestions[0].type;
            if(t === 'choice') typeDisplay = APP_TEXT.Creator.TypeChoice;
            else if(t === 'sort') typeDisplay = APP_TEXT.Creator.TypeSort;
            else if(t === 'free_oral') typeDisplay = APP_TEXT.Creator.TypeFreeOral;
            else if(t === 'free_written') typeDisplay = APP_TEXT.Creator.TypeFreeWritten;
            else if(t === 'multi') typeDisplay = APP_TEXT.Creator.TypeMulti;
        }

        let html = `
            <div style="background:#252525; padding:12px; border-radius:6px; border:1px solid #444; border-left:4px solid #aaa; margin-bottom:20px; display:flex; align-items:center;">
                <div style="color:#aaa; font-size:0.9em; font-weight:bold; margin-right:10px;">収録形式:</div>
                <div style="color:#fff; font-weight:bold; font-size:1.1em;">${typeDisplay}</div>
                <div style="color:#666; font-size:0.8em; margin-left:auto; font-family:monospace;">全${this.selectedSetQuestions.length}問</div>
            </div>
        `;

        html += `<div class="config-section-title">${APP_TEXT.Config.LabelRule}</div>`;
        
        // ★修正: モードとゲームタイプを分離したUI
        html += `
            <div class="config-item-box">
                <div class="mb-15">
                    <label class="config-label">1. 回答モード (Answer Mode)</label>
                    <select id="config-mode-select" class="btn-block config-select mb-10 highlight-select">
                        <option value="normal">一斉回答 (Normal)</option>
                        <option value="buzz">早押し (Buzz)</option>
                        <option value="time_attack">タイムアタック</option>
                        <option value="solo">ソロ挑戦 (Solo)</option>
                    </select>

                    <label class="config-label">2. ゲームタイプ (Reward Type)</label>
                    <select id="config-game-type" class="btn-block config-select">
                        <option value="score">得点制 (Score)</option>
                        <option value="panel">陣取り (Panel 25)</option>
                        <option value="race">レース / すごろく (Race)</option>
                    </select>
                </div>
                
                <div id="conf-detail-area"></div>
                
                <h5 style="margin:15px 0 5px 0;">${APP_TEXT.Config.HeadingCustomScore}</h5>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:15px; background:#222; padding:10px; border-radius:6px; border:1px solid #444;">
                    <div>
                        <label class="config-label" style="font-size:0.8em; color:#aaa;">${APP_TEXT.Config.LabelHeaderTime}</label>
                        <div style="display:flex; gap:5px; margin-bottom:5px;">
                            <input type="number" id="config-bulk-time-input" value="10" min="1" placeholder="Sec" style="width:100%; text-align:center;">
                            <button id="config-bulk-time-btn" class="btn-mini btn-dark">SET</button>
                        </div>
                        <button id="config-bulk-time-inf-btn" class="btn-mini btn-info" style="width:100%; font-size:0.8em;">無制限 (No Limit)</button>
                    </div>
                    <div>
                        <label class="config-label" style="font-size:0.8em; color:#0055ff;">${APP_TEXT.Config.LabelHeaderPt}</label>
                        <div style="display:flex; gap:5px;">
                            <input type="number" id="config-bulk-point-input" value="1" min="1" style="width:100%; text-align:center; color:#0055ff; font-weight:bold;">
                            <button id="config-bulk-point-btn" class="btn-mini btn-primary">SET</button>
                        </div>
                    </div>
                    <div>
                        <label class="config-label" style="font-size:0.8em; color:#d00;">${APP_TEXT.Config.LabelHeaderLoss}</label>
                        <div style="display:flex; gap:5px;">
                            <input type="number" id="config-bulk-loss-input" value="0" min="0" style="width:100%; text-align:center; color:#d00; font-weight:bold;">
                            <button id="config-bulk-loss-btn" class="btn-mini btn-danger">SET</button>
                        </div>
                    </div>
                </div>

                <button id="btn-toggle-q-list" class="btn-block btn-dark" style="margin-bottom:10px;">▼ 個別で設定する (全${this.selectedSetQuestions.length}問)</button>
                <div id="config-questions-list" class="hidden scroll-list" style="height:200px; border:1px solid #333; padding:5px; background:#1a1a1a;"></div>
            </div>`;

        html += `<button id="config-add-playlist-btn" class="btn-success btn-block btn-large mt-20">${APP_TEXT.Config.BtnAddList}</button>`;

        container.innerHTML = html;

        // イベントリスナー再設定
        const modeSel = document.getElementById('config-mode-select');
        const typeSel = document.getElementById('config-game-type');
        
        const updateDetails = () => {
            this.renderDetail(modeSel.value, typeSel.value);
        };
        
        modeSel.onchange = updateDetails;
        typeSel.onchange = updateDetails;
        
        document.getElementById('config-add-playlist-btn').onclick = () => this.addPeriod();
        
        // トグルボタン
        document.getElementById('btn-toggle-q-list').onclick = () => {
            const list = document.getElementById('config-questions-list');
            list.classList.toggle('hidden');
            const btn = document.getElementById('btn-toggle-q-list');
            if (list.classList.contains('hidden')) {
                btn.textContent = `▼ 個別で設定する (全${this.selectedSetQuestions.length}問)`;
                btn.style.background = "#636e72";
            } else {
                btn.textContent = `▲ リストを閉じる`;
                btn.style.background = "#444";
            }
        };

        // 一括反映ボタン
        document.getElementById('config-bulk-time-btn').onclick = () => {
            const val = document.getElementById('config-bulk-time-input').value;
            document.querySelectorAll('.q-time-input').forEach(inp => {
                inp.value = val;
                inp.type = "number";
            });
        };
        document.getElementById('config-bulk-time-inf-btn').onclick = () => {
            document.querySelectorAll('.q-time-input').forEach(inp => {
                inp.type = "text";
                inp.value = "無制限";
            });
            App.Ui.showToast("全ての制限時間を「無制限」に設定しました");
        };
        document.getElementById('config-bulk-point-btn').onclick = () => {
            const val = document.getElementById('config-bulk-point-input').value;
            document.querySelectorAll('.q-point-input').forEach(inp => inp.value = val);
        };
        document.getElementById('config-bulk-loss-btn').onclick = () => {
            const val = document.getElementById('config-bulk-loss-input').value;
            document.querySelectorAll('.q-loss-input').forEach(inp => inp.value = val);
        };
        
        // 初期状態の反映
        if(conf.mode) modeSel.value = (conf.mode === 'time_attack') ? 'solo' : conf.mode;
        updateDetails();
        this.renderQList();
    },

    // ★追加: 選択されたモードとタイプに応じた詳細設定を表示
    renderDetail: function(mode, gameType) {
        const area = document.getElementById('conf-detail-area');
        let html = '';

        // モードごとの設定
        if(mode === 'buzz') {
            html += `<div class="mode-settings-box mode-box-buzz"><p>早押しボタンを使用します。</p></div>`;
        } else if (mode === 'solo') {
            html += `<div class="mode-settings-box mode-box-solo">
                <label>ライフ設定</label>
                <input type="number" id="conf-solo-life" value="3" class="config-select">
            </div>`;
        } else if (mode === 'time_attack') {
            html += `<div class="mode-settings-box mode-box-buzz">
                <label>制限時間 (秒)</label>
                <input type="number" id="conf-time-limit" value="10" class="config-select">
            </div>`;
        }

        // ゲームタイプごとの設定
        if (gameType === 'panel') {
            html += `<div class="mode-settings-box mode-box-normal" style="border-color:#ffd700;">
                <label style="color:#ffd700;">★ 陣取りモード</label>
                <p class="unit-text">正解者にパネル選択権を与えます。<br>司会者画面にパネル操作盤が表示されます。</p>
            </div>`;
        } else if (gameType === 'race') {
            html += `<div class="mode-settings-box mode-box-normal" style="border-color:#00ff00;">
                <label style="color:#00ff00;">★ レースモード</label>
                <label>ゴールまでのポイント数</label>
                <input type="number" id="conf-pass-count" value="10" class="config-select">
            </div>`;
        }

        area.innerHTML = html;
    },

    renderQList: function() {
        const list = document.getElementById('config-questions-list');
        list.innerHTML = '';
        this.selectedSetQuestions.forEach((q, i) => {
            const row = document.createElement('div');
            row.className = 'flex-center border-b p-5';
            row.style.borderBottom = '1px solid #333';
            row.style.padding = '8px 0';
            
            const isNoLimit = (q.timeLimit === 0 || q.timeLimit === "0");
            const timeVal = isNoLimit ? "無制限" : q.timeLimit;
            const inputType = isNoLimit ? "text" : "number";

            row.innerHTML = `
                <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.9em; font-weight:bold; color:#ddd;">
                    Q${i+1}. ${q.q}
                </div>
                <div style="display:flex; gap:5px; align-items:center;">
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span style="font-size:0.6em; color:#aaa;">Time</span>
                        <input type="${inputType}" class="q-time-input" data-index="${i}" value="${timeVal||0}" style="width:60px; text-align:center; padding:5px; font-size:0.8em;" onfocus="this.type='number'; this.value='';">
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span style="font-size:0.6em; color:#0055ff;">Pt</span>
                        <input type="number" class="q-point-input" data-index="${i}" value="${q.points||1}" style="width:40px; text-align:center; color:#0055ff; font-weight:bold; padding:5px;">
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span style="font-size:0.6em; color:#d00;">Loss</span>
                        <input type="number" class="q-loss-input" data-index="${i}" value="${q.loss||0}" style="width:40px; text-align:center; color:#d00; font-weight:bold; padding:5px;">
                    </div>
                </div>
            `;
            list.appendChild(row);
        });
    },

    addPeriod: function() {
        const title = JSON.parse(document.getElementById('config-set-select').value).t;
        
        // ★修正: ModeとGameTypeの両方を取得
        const mode = document.getElementById('config-mode-select').value;
        const gameType = document.getElementById('config-game-type').value;
        
        const qs = JSON.parse(JSON.stringify(this.selectedSetQuestions));
        
        document.querySelectorAll('.q-point-input').forEach(inp => qs[inp.dataset.index].points = parseInt(inp.value));
        document.querySelectorAll('.q-loss-input').forEach(inp => qs[inp.dataset.index].loss = parseInt(inp.value));
        
        document.querySelectorAll('.q-time-input').forEach(inp => {
            const val = inp.value;
            if (val === "無制限") qs[inp.dataset.index].timeLimit = 0;
            else qs[inp.dataset.index].timeLimit = parseInt(val) || 0;
        });

        // シャッフル
        let shuffle = 'off'; // 今回は簡易化のためOFF固定（必要なら復活可）
        
        const newConfig = {
            mode: mode,
            gameType: gameType, // ★追加
            initialStatus: 'revive',
            timeLimit: 0, 
            eliminationRule: 'none',
            buzzWrongAction: 'next',
            buzzTime: 0,
            normalLimit: 'unlimited',
            turnOrder: 'fixed',
            turnPass: 'ok'
        };

        // 個別設定の取得
        const lifeEl = document.getElementById('conf-solo-life');
        if(lifeEl) newConfig.soloLife = lifeEl.value;
        
        const timeEl = document.getElementById('conf-time-limit');
        if(timeEl) newConfig.timeLimit = timeEl.value;

        const goalEl = document.getElementById('conf-pass-count');
        if(goalEl) newConfig.passCount = goalEl.value;

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
                    <div class="text-sm text-gray">[${item.config.mode.toUpperCase()}] / [${item.config.gameType.toUpperCase()}] ${item.questions.length}Q</div>
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
