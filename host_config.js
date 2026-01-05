/* =========================================================
 * host_config.js (v55: New UI Layout)
 * =======================================================*/

let selectedSetQuestions = [];

function enterConfigMode() {
    window.showView(window.views.config);
    
    // UI初期化
    document.getElementById('config-set-select').innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
    document.getElementById('config-builder-ui').innerHTML = '';
    document.getElementById('config-program-title').value = '';
    document.getElementById('config-final-ranking-chk').checked = true;

    // イベントリスナー設定 (重複防止)
    const setSelect = document.getElementById('config-set-select');
    setSelect.removeEventListener('change', updateBuilderUI);
    setSelect.addEventListener('change', updateBuilderUI);

    // データロード
    loadSetListInConfig();
    loadSavedProgramsInConfig();
    renderConfigPreview();
}

function loadSetListInConfig() {
    const select = document.getElementById('config-set-select');
    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;
    
    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                // データに specialMode を含める
                const firstQ = (item.questions && item.questions.length > 0) ? item.questions[0] : {};
                const spMode = firstQ.specialMode || 'none';
                
                opt.value = JSON.stringify({ q: item.questions, c: item.config || {}, t: item.title, sp: spMode });
                opt.textContent = item.title + (spMode !== 'none' ? ` [${spMode}]` : '');
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = `<option value="">${APP_TEXT.Config.SelectEmpty}</option>`;
        }
    });
}

// ★UI構築メイン関数 (新デザイン適用)
function updateBuilderUI() {
    const container = document.getElementById('config-builder-ui');
    container.innerHTML = '';

    const select = document.getElementById('config-set-select');
    if (!select.value) {
        selectedSetQuestions = [];
        return;
    }

    const setData = JSON.parse(select.value);
    selectedSetQuestions = setData.q || [];
    const config = setData.c || {};
    
    // スペシャルモード判定
    const spMode = setData.sp || 'none';

    let html = '';

    // 1. 回答モードセクション
    html += `<div class="config-section-title">${APP_TEXT.Config.LabelMode}</div>`;
    html += `
    <div class="config-item-box">
        <select id="config-mode-select" class="btn-block config-select highlight-select">
            <option value="normal" ${config.mode === 'normal' ? 'selected' : ''}>${APP_TEXT.Config.ModeNormal}</option>
            <option value="buzz" ${config.mode === 'buzz' ? 'selected' : ''}>${APP_TEXT.Config.ModeBuzz}</option>
            <option value="turn" ${config.mode === 'turn' ? 'selected' : ''}>${APP_TEXT.Config.ModeTurn}</option>
            <option value="time_attack" ${config.mode === 'time_attack' ? 'selected' : ''} style="color:red;">${APP_TEXT.Config.ModeTimeAttack}</option>
            <option value="panel_attack" ${config.mode === 'panel_attack' ? 'selected' : ''} style="color:blue;">${APP_TEXT.Config.ModePanel}</option>
            <option value="bomb" ${config.mode === 'bomb' ? 'selected' : ''} style="color:purple;">${APP_TEXT.Config.ModeBomb}</option>
        </select>
        <p id="config-mode-locked-msg" class="hidden" style="color:#d00; font-size:0.8em; margin-top:5px; font-weight:bold;">${APP_TEXT.Config.MsgLockedMode}</p>

        <div id="mode-details-normal" class="mode-details hidden" style="margin-top:15px;">
            <label class="config-label">${APP_TEXT.Config.LabelNormalLimit}</label>
            <select id="config-normal-limit" class="btn-block config-select">
                <option value="one">${APP_TEXT.Config.NormalLimitOne}</option>
                <option value="unlimited">${APP_TEXT.Config.NormalLimitUnlimited}</option>
            </select>
        </div>

        <div id="mode-details-buzz" class="mode-details hidden" style="margin-top:15px;">
            <label class="config-label">${APP_TEXT.Config.LabelBuzzWrongAction}</label>
            <select id="config-buzz-wrong-action" class="btn-block config-select" style="margin-bottom:10px;">
                <option value="next">${APP_TEXT.Config.BuzzWrongNext}</option>
                <option value="reset">${APP_TEXT.Config.BuzzWrongReset}</option>
                <option value="end">${APP_TEXT.Config.BuzzWrongEnd}</option>
            </select>
            <label class="config-label">${APP_TEXT.Config.LabelBuzzTime}</label>
            <select id="config-buzz-timer" class="btn-block config-select">
                <option value="0">${APP_TEXT.Config.BuzzTimeNone}</option>
                <option value="3">${APP_TEXT.Config.BuzzTime3}</option>
                <option value="5">${APP_TEXT.Config.BuzzTime5}</option>
                <option value="10">${APP_TEXT.Config.BuzzTime10}</option>
            </select>
        </div>

        <div id="mode-details-turn" class="mode-details hidden" style="margin-top:15px;">
            <label class="config-label">${APP_TEXT.Config.LabelTurnOrder}</label>
            <select id="config-turn-order" class="btn-block config-select" style="margin-bottom:10px;">
                <option value="fixed">${APP_TEXT.Config.TurnOrderFixed}</option>
                <option value="random">${APP_TEXT.Config.TurnOrderRandom}</option>
                <option value="rank">${APP_TEXT.Config.TurnOrderRank}</option>
            </select>
            <label class="config-label">${APP_TEXT.Config.LabelTurnPass}</label>
            <select id="config-turn-pass" class="btn-block config-select">
                <option value="ok">${APP_TEXT.Config.TurnPassOk}</option>
                <option value="ng">${APP_TEXT.Config.TurnPassNg}</option>
            </select>
        </div>
        
        <div id="mode-details-bomb" class="mode-details hidden" style="margin-top:15px;">
            <label class="config-label">${APP_TEXT.Config.LabelBombCount}</label>
            <select id="config-bomb-count" class="btn-block config-select" style="margin-bottom:10px;">
                <option value="10">10 Cards</option>
                <option value="15">15 Cards</option>
                <option value="20">20 Cards</option>
            </select>
            <label class="config-label">${APP_TEXT.Config.LabelBombTarget}</label>
            <select id="config-bomb-target" class="btn-block config-select">
                <option value="bomb1">1 Bomb (Others Safe)</option>
                <option value="treasure1">1 Treasure (Others Out)</option>
            </select>
        </div>
        
        <div id="mode-details-time_attack" class="mode-details hidden" style="margin-top:15px; background:#fff5e6; padding:10px; border-radius:5px;">
            <p style="font-size:0.9em; margin:0; color:#d32f2f; font-weight:bold;">
                ※Time Shock: 5 sec/Q (Auto Advance)
            </p>
        </div>
    </div>`;

    // 2. ルール設定セクション
    html += `<div id="config-rule-section">`; // ロック時に隠すエリア開始
    html += `<div class="config-section-title">${APP_TEXT.Config.LabelRule}</div>`;

    // 時間・スコア設定
    html += `
    <div class="config-item-box">
        <div class="config-flex-row">
            <div class="config-flex-item">
                <label class="config-label-large">${APP_TEXT.Config.LabelTime}</label>
                <select id="config-time-limit" class="btn-block config-select" style="font-size:1.1em;">
                    <option value="0" ${config.timeLimit === 0 ? 'selected' : ''}>0 (No Limit)</option>
                    <option value="10" ${config.timeLimit === 10 ? 'selected' : ''}>10s</option>
                    <option value="20" ${config.timeLimit === 20 ? 'selected' : ''}>20s</option>
                    <option value="30" ${config.timeLimit === 30 ? 'selected' : ''}>30s</option>
                    <option value="60" ${config.timeLimit === 60 ? 'selected' : ''}>60s</option>
                </select>
            </div>
            <div>
                <label class="config-label">&nbsp;</label>
                <button id="config-custom-score-btn" class="custom-score-btn" title="${APP_TEXT.Config.HeadingCustomScore}">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/%3E%3C/svg%3E">
                </button>
            </div>
        </div>
        
        <div id="config-custom-points-area" class="hidden" style="margin-top:15px; border-top:1px dashed #ddd; padding-top:15px;">
            <h5 style="margin:0 0 10px 0;">${APP_TEXT.Config.HeadingCustomScore}</h5>
            <div style="display:flex; justify-content:flex-end; align-items:center; gap:5px; margin-bottom:10px; background:#f9f9f9; padding:5px; font-size:0.8em;">
                <div><span style="color:#0055ff; font-weight:bold;">${APP_TEXT.Config.LabelBulkPt}</span><input type="number" id="config-bulk-point-input" value="1" min="1" style="width:40px; text-align:center; margin:0 5px;"><button id="config-bulk-point-btn" class="btn-mini" style="background:#0055ff; color:white;">反映</button></div>
                <div><span style="color:#d00; font-weight:bold;">${APP_TEXT.Config.LabelBulkLoss}</span><input type="number" id="config-bulk-loss-input" value="0" min="0" style="width:40px; text-align:center; margin:0 5px;"><button id="config-bulk-loss-btn" class="btn-mini" style="background:#d00; color:white;">反映</button></div>
            </div>
            <div id="config-questions-list" style="font-size:0.9em; max-height:200px; overflow-y:auto; border:1px solid #eee; padding:5px;"></div>
        </div>
    </div>`;

    // 脱落条件（要望通り下に配置）
    html += `
    <div class="config-item-box">
        <label class="config-label-large">${APP_TEXT.Config.LabelElim}</label>
        <select id="config-elimination-rule" class="btn-block config-select" style="font-size:1.1em; margin-bottom:10px;">
            <option value="none" ${config.eliminationRule === 'none' ? 'selected' : ''}>${APP_TEXT.Config.RuleNone}</option>
            <option value="wrong_only" ${config.eliminationRule === 'wrong_only' ? 'selected' : ''}>${APP_TEXT.Config.RuleWrong}</option>
            <option value="wrong_and_slowest" ${config.eliminationRule === 'wrong_and_slowest' ? 'selected' : ''}>${APP_TEXT.Config.RuleSlow}</option>
        </select>
        <div id="config-elimination-count-area" class="hidden" style="display:flex; align-items:center; gap:10px; background:#fff0f5; padding:10px; border-radius:5px;">
            <span style="font-weight:bold; color:#d00;">${APP_TEXT.Config.LabelElimCount}</span>
            <input type="number" id="config-elimination-count" value="${config.eliminationCount || 1}" min="1" style="width:60px; text-align:center; padding:5px; border:1px solid #d00; border-radius:4px;">
            <span>${APP_TEXT.Config.LabelElimCountSuffix}</span>
        </div>
    </div>`;
    
    html += `</div>`; // End rule section

    // 追加ボタン
    html += `<button id="config-add-playlist-btn" class="btn-block" style="background:#0055ff; color:white; font-weight:bold; padding:15px; border:none; border-radius:8px; box-shadow:0 4px 8px rgba(0,85,255,0.3); font-size:1.1em; margin-top:20px;">${APP_TEXT.Config.BtnAddList}</button>`;

    container.innerHTML = html;

    // イベントリスナー
    const modeSel = document.getElementById('config-mode-select');
    modeSel.addEventListener('change', (e) => updateModeDetails(e.target.value));
    
    const elimSel = document.getElementById('config-elimination-rule');
    elimSel.addEventListener('change', updateEliminationUI);
    
    document.getElementById('config-custom-score-btn').addEventListener('click', toggleCustomScoreArea);
    document.getElementById('config-add-playlist-btn').addEventListener('click', addPeriodToPlaylist);

    document.getElementById('config-bulk-point-btn').addEventListener('click', () => {
        const val = document.getElementById('config-bulk-point-input').value;
        document.querySelectorAll('.q-point-input').forEach(inp => inp.value = val);
    });
    document.getElementById('config-bulk-loss-btn').addEventListener('click', () => {
        const val = document.getElementById('config-bulk-loss-input').value;
        document.querySelectorAll('.q-loss-input').forEach(inp => inp.value = val);
    });

    // 初期化実行
    updateModeDetails(modeSel.value);
    updateEliminationUI();
    applySpecialModeLock(spMode);
}

function applySpecialModeLock(spMode) {
    const modeSelect = document.getElementById('config-mode-select');
    const lockMsg = document.getElementById('config-mode-locked-msg');
    const ruleSec = document.getElementById('config-rule-section');
    
    if (spMode === 'time_attack') {
        modeSelect.value = 'time_attack';
        modeSelect.disabled = true;
        lockMsg.classList.remove('hidden');
        ruleSec.style.display = 'none'; 
        updateModeDetails('time_attack');
    } else if (spMode === 'panel_attack') {
        modeSelect.value = 'panel_attack';
        modeSelect.disabled = true;
        lockMsg.classList.remove('hidden');
        ruleSec.style.display = 'none';
        updateModeDetails('panel_attack');
    } else {
        unlockConfig();
    }
}

function unlockConfig() {
    const modeSelect = document.getElementById('config-mode-select');
    const lockMsg = document.getElementById('config-mode-locked-msg');
    const ruleSec = document.getElementById('config-rule-section');
    
    modeSelect.disabled = false;
    lockMsg.classList.add('hidden');
    ruleSec.style.display = 'block';
    updateModeDetails(modeSelect.value);
}

function updateModeDetails(mode) {
    document.querySelectorAll('.mode-details').forEach(el => el.classList.add('hidden'));
    if (mode === 'normal') document.getElementById('mode-details-normal').classList.remove('hidden');
    else if (mode === 'buzz') document.getElementById('mode-details-buzz').classList.remove('hidden');
    else if (mode === 'turn') document.getElementById('mode-details-turn').classList.remove('hidden');
    else if (mode === 'time_attack') document.getElementById('mode-details-time_attack').classList.remove('hidden');
    else if (mode === 'bomb' || mode === 'panel_attack') document.getElementById('mode-details-bomb').classList.remove('hidden');
}

function updateEliminationUI() {
    const rule = document.getElementById('config-elimination-rule').value;
    const countArea = document.getElementById('config-elimination-count-area');
    if (rule === 'wrong_and_slowest') countArea.classList.remove('hidden');
    else countArea.classList.add('hidden');
}

function toggleCustomScoreArea() {
    const area = document.getElementById('config-custom-points-area');
    const list = document.getElementById('config-questions-list');
    
    if (selectedSetQuestions.length === 0) {
        alert(APP_TEXT.Config.AlertNoSet);
        return;
    }

    if (area.classList.contains('hidden')) {
        list.innerHTML = '';
        selectedSetQuestions.forEach((q, i) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.marginBottom = '5px';
            div.style.borderBottom = '1px solid #eee';
            div.style.paddingBottom = '5px';
            
            const pts = q.points !== undefined ? q.points : 1;
            const loss = q.loss !== undefined ? q.loss : 0;

            div.innerHTML = `
                <div style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-weight:bold;">
                    Q${i+1}. ${q.q}
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <span style="font-size:0.8em; color:#0055ff;">Pt</span>
                    <input type="number" class="q-point-input" data-index="${i}" value="${pts}" min="1" style="width:50px; text-align:center; padding:5px; border:1px solid #0055ff; border-radius:4px; font-weight:bold;">
                    <span style="font-size:0.8em; color:#d00;">Loss</span>
                    <input type="number" class="q-loss-input" data-index="${i}" value="${loss}" min="0" style="width:50px; text-align:center; padding:5px; border:1px solid #d00; border-radius:4px; font-weight:bold;">
                </div>
            `;
            list.appendChild(div);
        });
        area.classList.remove('hidden');
    } else {
        area.classList.add('hidden');
    }
}

function addPeriodToPlaylist() {
    const select = document.getElementById('config-set-select');
    if(!select.value) { alert(APP_TEXT.Config.AlertNoSet); return; }
    
    const setData = JSON.parse(select.value);
    let title = setData.t;
    let questions = JSON.parse(JSON.stringify(setData.q || []));
    
    // カスタムスコア反映
    const area = document.getElementById('config-custom-points-area');
    if (!area.classList.contains('hidden')) {
        document.querySelectorAll('.q-point-input').forEach(inp => {
            const idx = inp.getAttribute('data-index');
            if(questions[idx]) questions[idx].points = parseInt(inp.value) || 1;
        });
        document.querySelectorAll('.q-loss-input').forEach(inp => {
            const idx = inp.getAttribute('data-index');
            if(questions[idx]) questions[idx].loss = parseInt(inp.value) || 0;
        });
    }

    const mode = document.getElementById('config-mode-select').value;
    const elimRule = document.getElementById('config-elimination-rule').value;
    
    const newConfig = {
        mode: mode,
        timeLimit: parseInt(document.getElementById('config-time-limit').value) || 0,
        eliminationRule: elimRule,
        eliminationCount: (elimRule === 'wrong_and_slowest') ? (parseInt(document.getElementById('config-elimination-count').value) || 1) : 1,
        
        normalLimit: document.getElementById('config-normal-limit').value,
        buzzWrongAction: document.getElementById('config-buzz-wrong-action').value,
        buzzTime: parseInt(document.getElementById('config-buzz-timer').value) || 0,
        turnOrder: document.getElementById('config-turn-order').value,
        turnPass: document.getElementById('config-turn-pass').value,
        bombCount: parseInt(document.getElementById('config-bomb-count').value) || 10,
        bombTarget: document.getElementById('config-bomb-target').value,
        
        // ★シャッフル機能削除 (常にoff)
        shuffleChoices: 'off',

        initialStatus: 'revive',
        passCount: 5,
        intermediateRanking: false
    };

    periodPlaylist.push({
        title: title,
        questions: questions,
        config: newConfig
    });
    
    renderConfigPreview();
    if (!area.classList.contains('hidden')) toggleCustomScoreArea();
}

function renderConfigPreview() {
    const container = document.getElementById('config-playlist-preview');
    if(!container) return;
    container.innerHTML = '';
    
    if(periodPlaylist.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#999; font-size:0.8em;">${APP_TEXT.Config.AlertEmptyList}</p>`;
        return;
    }
    
    periodPlaylist.forEach((item, index) => {
        if (index > 0) {
            const arrowDiv = document.createElement('div');
            arrowDiv.className = 'playlist-arrow-container';
            arrowDiv.innerHTML = '<div class="playlist-arrow"></div>';
            container.appendChild(arrowDiv);

            const settingDiv = document.createElement('div');
            settingDiv.className = 'playlist-inter-setting';
            const isRanking = (item.config.initialStatus === 'ranking');
            const isInterRank = item.config.intermediateRanking;
            
            settingDiv.innerHTML = `
                <div style="font-size:0.7em; color:#666; font-weight:bold; margin-bottom:3px;">${APP_TEXT.Config.InterHeading}</div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; gap:5px; align-items:center;">
                        <select class="inter-status-select" data-index="${index}">
                            <option value="revive" ${item.config.initialStatus === 'revive' ? 'selected' : ''}>${APP_TEXT.Config.StatusRevive}</option>
                            <option value="continue" ${item.config.initialStatus === 'continue' ? 'selected' : ''}>${APP_TEXT.Config.StatusContinue}</option>
                            <option value="ranking" ${item.config.initialStatus === 'ranking' ? 'selected' : ''}>${APP_TEXT.Config.StatusRanking}</option>
                        </select>
                        <div class="inter-pass-area ${isRanking ? '' : 'hidden'}" style="display:flex; align-items:center; gap:3px;">
                            <span style="font-size:0.8em;">${APP_TEXT.Config.LabelTop}</span>
                            <input type="number" class="inter-pass-input" data-index="${index}" value="${item.config.passCount}" min="1" style="width:50px; padding:5px; text-align:center;">
                            <span style="font-size:0.8em;">${APP_TEXT.Config.LabelName}</span>
                        </div>
                    </div>
                    <label style="font-size:0.9em; cursor:pointer;">
                        <input type="checkbox" class="inter-ranking-chk" data-index="${index}" ${isInterRank ? 'checked' : ''}>
                        ${APP_TEXT.Config.CheckInterRank}
                    </label>
                </div>
            `;
            container.appendChild(settingDiv);
        }

        const div = document.createElement('div');
        div.className = 'timeline-card';
        div.style.marginBottom = "0"; 
        
        let ruleText = "None";
        if(item.config.eliminationRule === 'wrong_only') ruleText = "WrongOut";
        if(item.config.eliminationRule === 'wrong_and_slowest') ruleText = `Slow${item.config.eliminationCount}Out`;
        
        let modeLabel = item.config.mode.toUpperCase(); 

        div.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:bold; font-size:1.1em;">${index+1}. ${item.title}</div>
                <div style="font-size:0.8em; color:#666;">
                    [${modeLabel}] ${ruleText} / ${item.config.timeLimit}s
                </div>
            </div>
            <button class="delete-btn" onclick="removeFromPlaylist(${index})">Del</button>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.inter-status-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const idx = e.target.getAttribute('data-index');
            const val = e.target.value;
            periodPlaylist[idx].config.initialStatus = val;
            const passArea = e.target.closest('div').querySelector('.inter-pass-area');
            if(passArea) {
                if (val === 'ranking') passArea.classList.remove('hidden');
                else passArea.classList.add('hidden');
            }
        });
    });

    document.querySelectorAll('.inter-pass-input').forEach(inp => {
        inp.addEventListener('change', (e) => {
            const idx = e.target.getAttribute('data-index');
            const val = parseInt(e.target.value) || 5;
            periodPlaylist[idx].config.passCount = val;
        });
    });

    document.querySelectorAll('.inter-ranking-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const idx = e.target.getAttribute('data-index');
            periodPlaylist[idx].config.intermediateRanking = e.target.checked;
        });
    });
}

window.removeFromPlaylist = function(index) {
    periodPlaylist.splice(index, 1);
    renderConfigPreview();
};

function loadSavedProgramsInConfig() {
    const listEl = document.getElementById('config-saved-programs-list');
    if(!listEl) return;
    listEl.innerHTML = `<p style="text-align:center;">${APP_TEXT.Config.SelectLoading}</p>`;

    window.db.ref(`saved_programs/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        listEl.innerHTML = '';
        if(!data) {
            listEl.innerHTML = `<p style="text-align:center; color:#999;">${APP_TEXT.Config.SelectEmpty}</p>`;
            return;
        }
        Object.keys(data).forEach(key => {
            const item = data[key];
            const div = document.createElement('div');
            div.className = 'set-item';
            div.innerHTML = `
                <div>
                    <span style="font-weight:bold;">${item.title}</span>
                    <div style="font-size:0.8em; color:#666;">
                        ${new Date(item.createdAt).toLocaleDateString()} / ${item.playlist ? item.playlist.length : 0} Periods
                    </div>
                </div>
            `;
            const btnArea = document.createElement('div');
            btnArea.style.display = 'flex';
            btnArea.style.gap = '5px';

            const loadBtn = document.createElement('button');
            loadBtn.textContent = APP_TEXT.Config.BtnLoadProg;
            loadBtn.className = 'btn-mini';
            loadBtn.style.backgroundColor = '#0055ff';
            loadBtn.style.color = 'white';
            loadBtn.onclick = () => {
                if(confirm(APP_TEXT.Config.MsgConfirmLoadProg)) {
                    periodPlaylist = item.playlist || [];
                    document.getElementById('config-final-ranking-chk').checked = (item.finalRanking !== false);
                    document.getElementById('config-program-title').value = item.title;
                    renderConfigPreview();
                    alert("Loaded.");
                }
            };

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = APP_TEXT.Config.BtnDelProg;
            delBtn.onclick = () => {
                if(confirm(APP_TEXT.Config.MsgConfirmDelProg)) {
                    window.db.ref(`saved_programs/${currentShowId}/${key}`).remove()
                    .then(() => {
                        div.remove();
                    });
                }
            };

            btnArea.appendChild(loadBtn);
            btnArea.appendChild(delBtn);
            div.appendChild(btnArea);
            listEl.appendChild(div);
        });
    });
}

function saveProgramToCloud() {
    if(periodPlaylist.length === 0) {
        alert(APP_TEXT.Config.AlertEmptyList);
        return;
    }
    const titleInput = document.getElementById('config-program-title');
    const title = titleInput.value.trim();
    if(!title) {
        alert(APP_TEXT.Config.AlertNoTitle);
        return;
    }

    const finalRanking = document.getElementById('config-final-ranking-chk').checked;
    const cleanPlaylist = JSON.parse(JSON.stringify(periodPlaylist));

    const saveObj = {
        title: title,
        playlist: cleanPlaylist, 
        finalRanking: finalRanking,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    window.db.ref(`saved_programs/${currentShowId}`).push(saveObj)
    .then(() => {
        window.showToast(APP_TEXT.Config.MsgSaved);
        titleInput.value = '';
        periodPlaylist = []; 
        renderConfigPreview();
        loadSavedProgramsInConfig(); 
    })
    .catch(err => alert("Error: " + err.message));
}
