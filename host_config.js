{
type: uploaded file
fileName: host_config.js
fullContent:
/* =========================================================
 * host_config.js (v65: Fixed All Syntax Errors)
 * =======================================================*/

let selectedSetQuestions = [];

window.onSetSelectChange = function() {
    updateBuilderUI();
};

function enterConfigMode() {
    window.showView(window.views.config);
    
    const setSelect = document.getElementById('config-set-select');
    const container = document.getElementById('config-builder-ui');
    
    if(setSelect) {
        setSelect.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
        setSelect.removeEventListener('change', window.onSetSelectChange);
        setSelect.addEventListener('change', window.onSetSelectChange);
    }
    
    if(container) {
        container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">セットを選択してください</p>';
    }
    
    const titleInput = document.getElementById('config-program-title');
    if(titleInput) titleInput.value = '';
    
    const rankChk = document.getElementById('config-final-ranking-chk');
    if(rankChk) rankChk.checked = true;

    loadSetListInConfig();
    loadSavedProgramsInConfig();
    renderConfigPreview();
}

// ヘルパー: 安全に値を取得する関数
function getElValue(id, defaultValue) {
    const el = document.getElementById(id);
    return el ? el.value : defaultValue;
}

function loadSetListInConfig() {
    const select = document.getElementById('config-set-select');
    if(!select) return;

    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;
    
    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                let typeLabel = "Mix";
                if(item.questions && item.questions.length > 0) {
                     const t = item.questions[0].type;
                     if(t === 'choice') typeLabel = "選択式";
                     else if(t === 'sort') typeLabel = "並べ替え";
                     else if(t === 'free_oral') typeLabel = "口頭";
                     else if(t === 'free_written') typeLabel = "記述";
                     else if(t === 'multi') typeLabel = "多答";
                }
                const firstQ = (item.questions && item.questions.length > 0) ? item.questions[0] : {};
                const spMode = firstQ.specialMode || 'none';
                
                const valObj = { q: item.questions, c: item.config || {}, t: item.title, sp: spMode };
                opt.value = JSON.stringify(valObj);
                opt.textContent = `${item.title} [${typeLabel}]` + (spMode !== 'none' ? ` (${spMode})` : '');
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = `<option value="">${APP_TEXT.Config.SelectEmpty}</option>`;
        }
    });
}

function updateBuilderUI() {
    const container = document.getElementById('config-builder-ui');
    const select = document.getElementById('config-set-select');
    if (!container || !select) return;

    if (!select.value) {
        selectedSetQuestions = [];
        container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">セットを選択してください</p>';
        return;
    }

    const setData = JSON.parse(select.value);
    selectedSetQuestions = setData.q || [];
    const config = setData.c || {};
    const spMode = setData.sp || 'none';
    
    const firstQ = selectedSetQuestions.length > 0 ? selectedSetQuestions[0] : {};
    const qType = firstQ.type;

    if (qType === 'free_oral' && config.mode === 'normal') {
        config.mode = 'buzz'; 
    }

    let html = '';

    // 1. 回答モード
    html += `<div class="config-section-title">${APP_TEXT.Config.LabelMode}</div>`;
    html += `<div class="config-item-box">`;
    
    html += `<select id="config-mode-select" class="btn-block config-select highlight-select">`;
    
    if (qType !== 'free_oral') {
        html += `<option value="normal" ${config.mode === 'normal' ? 'selected' : ''}>${APP_TEXT.Config.ModeNormal}</option>`;
    }
    
    html += `<option value="solo" ${config.mode === 'solo' ? 'selected' : ''}>一人挑戦 (Solo Challenge)</option>`;
    html += `<option value="buzz" ${config.mode === 'buzz' ? 'selected' : ''}>${APP_TEXT.Config.ModeBuzz}</option>`;
    html += `<option value="turn" ${config.mode === 'turn' ? 'selected' : ''}>${APP_TEXT.Config.ModeTurn}</option>`;
    
    if (qType !== 'free_oral') {
        html += `<option value="time_attack" ${config.mode === 'time_attack' ? 'selected' : ''} style="color:red;">★タイムショック (固定)</option>`;
    }
    html += `</select>`;
    
    if (qType === 'free_oral') {
        html += `<p style="font-size:0.8em; color:#d00; margin-top:5px;">※口頭回答のため「一斉回答」は選択できません</p>`;
    }

    html += `<p id="config-mode-locked-msg" class="hidden" style="color:#d00; font-size:0.8em; margin-top:5px; font-weight:bold;">${APP_TEXT.Config.MsgLockedMode}</p>`;

    // 詳細設定エリア
    html += `
        <div id="mode-details-normal" class="mode-details hidden" style="margin-top:15px;">
            <label class="config-label">${APP_TEXT.Config.LabelNormalLimit}</label>
            <select id="config-normal-limit" class="btn-block config-select">
                <option value="one">${APP_TEXT.Config.NormalLimitOne}</option>
                <option value="unlimited">${APP_TEXT.Config.NormalLimitUnlimited}</option>
            </select>
            <div style="margin-top:10px;">
                <label class="config-label">${APP_TEXT.Config.LabelShuffleQ}</label>
                <select id="config-shuffle-q" class="btn-block config-select">
                    <option value="off">${APP_TEXT.Config.ShuffleQOff}</option>
                    <option value="on">${APP_TEXT.Config.ShuffleQOn}</option>
                </select>
            </div>
        </div>

        <div id="mode-details-solo" class="mode-details hidden" style="margin-top:15px; background:#f0f8ff; padding:10px; border-radius:5px; border:1px solid #add8e6;">
            <label class="config-label">進行スタイル (Progression)</label>
            <select id="config-solo-style" class="btn-block config-select" style="margin-bottom:10px;">
                <option value="manual">手動進行 (自分のペース)</option>
                <option value="auto">自動進行 (タイムショック風)</option>
            </select>
            <div id="config-solo-auto-settings" class="hidden" style="margin-top:10px; border-top:1px dashed #99c; padding-top:10px;">
                <label class="config-label">1問あたりの制限時間 (秒)</label>
                <input type="number" id="config-solo-seconds" value="5" min="1" max="60" class="btn-block" style="font-size:1.2em; text-align:center; font-weight:bold;">
                <p style="font-size:0.8em; margin:5px 0 0 0; color:#0055ff;">※時間切れで次へ進みます</p>
            </div>
        </div>

        <div id="mode-details-buzz" class="mode-details hidden" style="margin-top:15px;">
            <label class="config-label">${APP_TEXT.Config.LabelBuzzWrongAction}</label>
            <select id="config-buzz-wrong-action" class="btn-block config-select" style="margin-bottom:10px;">
                <option value="next">${APP_TEXT.Config.BuzzWrongNext}</option>
                <option value="reset">${APP_TEXT.Config.BuzzWrongReset}</option>
                <option value="end">${APP_TEXT.Config.BuzzWrongEnd}</option>
            </select>
            <label class="config-label">${APP_TEXT.Config.LabelBuzzTime}</label>
            <select id="config-buzz-timer" class="btn-block config-select" style="margin-bottom:10px;">
                <option value="0">${APP_TEXT.Config.BuzzTimeNone}</option>
                <option value="3">${APP_TEXT.Config.BuzzTime3}</option>
                <option value="5">${APP_TEXT.Config.BuzzTime5}</option>
                <option value="10">${APP_TEXT.Config.BuzzTime10}</option>
            </select>
            <div style="margin-top:10px;">
                <label class="config-label">${APP_TEXT.Config.LabelShuffleQ}</label>
                <select id="config-buzz-shuffle" class="btn-block config-select">
                    <option value="off">${APP_TEXT.Config.ShuffleQOff}</option>
                    <option value="on">${APP_TEXT.Config.ShuffleQOn}</option>
                </select>
            </div>
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
            <div style="margin-top:10px;">
                <label class="config-label">${APP_TEXT.Config.LabelShuffleQ}</label>
                <select id="config-turn-shuffle" class="btn-block config-select">
                    <option value="off">${APP_TEXT.Config.ShuffleQOff}</option>
                    <option value="on">${APP_TEXT.Config.ShuffleQOn}</option>
                </select>
            </div>
        </div>
        
        <div id="mode-details-time_attack" class="mode-details hidden" style="margin-top:15px; background:#fff5e6; padding:10px; border-radius:5px;">
            <label class="config-label">1問あたりの制限時間 (秒)</label>
            <input type="number" id="config-ta-seconds" value="${config.timeLimit || 5}" min="1" max="60" class="btn-block" style="font-size:1.2em; text-align:center; font-weight:bold;">
            <p style="font-size:0.8em; margin:5px 0 0 0; color:#d32f2f;">※自動で次の問題へ進みます</p>
        </div>
    </div>`;

    // 2. ルール設定
    html += `<div id="config-rule-section">`;
    html += `<div class="config-section-title">${APP_TEXT.Config.LabelRule}</div>`;
    
    html += `
    <div class="config-item-box">
        <label class="config-label-large">${APP_TEXT.Config.LabelGameType}</label>
        <select id="config-game-type" class="btn-block config-select" style="font-size:1.1em; margin-bottom:10px;">
            <option value="score">${APP_TEXT.Config.GameTypeScore}</option>
            <option value="territory">${APP_TEXT.Config.GameTypeTerritory}</option>
            <option value="race">${APP_TEXT.Config.GameTypeRace}</option>
        </select>

        <label class="config-label-large" style="margin-top:15px;">${APP_TEXT.Config.LabelWinCond}</label>
        <select id="config-win-cond" class="btn-block config-select" style="font-size:1.1em; margin-bottom:10px;">
            <option value="all">${APP_TEXT.Config.WinAll}</option>
            <option value="score">${APP_TEXT.Config.WinScore}</option>
            <option value="survivor">${APP_TEXT.Config.WinSurvivor}</option>
        </select>
        
        <div id="config-win-target-area" class="hidden" style="margin-top:10px; background:#f9f9f9; padding:5px; border-radius:4px; border:1px dashed #ccc;">
            <label style="font-size:0.9em; font-weight:bold;">${APP_TEXT.Config.LabelWinTarget}</label>
            <input type="number" id="config-win-target" value="10" min="1" style="width:60px; text-align:center; padding:5px; margin-left:10px; border:1px solid #aaa; border-radius:4px;">
        </div>
    </div>`;

    // 3. 一括設定エリア（スリム化）
    html += `
    <div class="config-item-box">
        <h5 style="margin:0 0 10px 0;">${APP_TEXT.Config.HeadingCustomScore}</h5>
        
        <div style="background:#f0f4f8; padding:10px; border-radius:5px; border:1px solid #ccc; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:10px; margin-bottom:10px;">
                <div style="text-align:center;">
                    <label style="font-size:0.8em; color:#333; font-weight:bold; display:block; margin-bottom:3px;">制限時間</label>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <input type="number" id="config-bulk-time-input" placeholder="0" min="0" style="width:60px; padding:5px; text-align:center; border:1px solid #ccc; border-radius:4px;">
                        <label style="font-size:0.8em; cursor:pointer; white-space:nowrap; display:flex; align-items:center;">
                            <input type="checkbox" id="config-bulk-time-unlimited"> 無制限
                        </label>
                    </div>
                </div>
                <div style="text-align:center;">
                    <label style="font-size:0.8em; color:#0055ff; font-weight:bold; display:block; margin-bottom:3px;">得点</label>
                    <input type="number" id="config-bulk-point-input" placeholder="1" min="1" style="width:60px; padding:5px; text-align:center; border:1px solid #ccc; border-radius:4px;">
                </div>
                <div style="text-align:center;">
                    <label style="font-size:0.8em; color:#d00; font-weight:bold; display:block; margin-bottom:3px;">失点</label>
                    <input type="number" id="config-bulk-loss-input" placeholder="0" min="0" style="width:60px; padding:5px; text-align:center; border:1px solid #ccc; border-radius:4px;">
                </div>
            </div>
            <button id="config-bulk-reflect-btn" class="btn-block" style="background:#333; color:white; padding:8px; font-weight:bold; border-radius:4px; font-size:0.9em;">一括反映</button>
        </div>

        <div id="config-questions-list" style="font-size:0.9em; max-height:300px; overflow-y:auto; border:1px solid #eee; padding:5px;"></div>
    </div>`;

    // 4. 脱落条件
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

    html += `<button id="config-add-playlist-btn" class="btn-block" style="background:#0055ff; color:white; font-weight:bold; padding:15px; border:none; border-radius:8px; box-shadow:0 4px 8px rgba(0,85,255,0.3); font-size:1.1em; margin-top:20px;">${APP_TEXT.Config.BtnAddList}</button>`;

    container.innerHTML = html;

    // イベントリスナー設定
    const modeSel = document.getElementById('config-mode-select');
    if(modeSel) modeSel.addEventListener('change', (e) => updateModeDetails(e.target.value));
    
    const soloStyleSel = document.getElementById('config-solo-style');
    if(soloStyleSel) {
        soloStyleSel.addEventListener('change', (e) => {
            const autoSettings = document.getElementById('config-solo-auto-settings');
            if(autoSettings) {
                if(e.target.value === 'auto') autoSettings.classList.remove('hidden');
                else autoSettings.classList.add('hidden');
            }
        });
    }

    const elimSel = document.getElementById('config-elimination-rule');
    if(elimSel) elimSel.addEventListener('change', updateEliminationUI);
    
    const gameTypeSel = document.getElementById('config-game-type');
    const winCondSel = document.getElementById('config-win-cond');
    
    if(gameTypeSel) {
        gameTypeSel.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'race') {
                if(winCondSel) winCondSel.value = 'score';
                const area = document.getElementById('config-win-target-area');
                if(area) area.classList.remove('hidden');
            }
        });
    }
    
    if(winCondSel) {
        winCondSel.addEventListener('change', (e) => {
            const val = e.target.value;
            const targetArea = document.getElementById('config-win-target-area');
            if(targetArea) {
                if (val === 'score') targetArea.classList.remove('hidden');
                else targetArea.classList.add('hidden');
            }
        });
    }
    
    const addBtn = document.getElementById('config-add-playlist-btn');
    if(addBtn) addBtn.addEventListener('click', addPeriodToPlaylist);

    // 一括反映処理
    const reflectBtn = document.getElementById('config-bulk-reflect-btn');
    if(reflectBtn) {
        reflectBtn.addEventListener('click', () => {
            const timeVal = document.getElementById('config-bulk-time-input').value;
            const ptVal = document.getElementById('config-bulk-point-input').value;
            const lossVal = document.getElementById('config-bulk-loss-input').value;
            const isUnlimited = document.getElementById('config-bulk-time-unlimited').checked;

            if (isUnlimited || timeVal !== '') {
                const applyTime = isUnlimited ? 0 : parseInt(timeVal);
                document.querySelectorAll('.q-time-input').forEach(inp => inp.value = applyTime);
            }
            if (ptVal !== '') {
                document.querySelectorAll('.q-point-input').forEach(inp => inp.value = ptVal);
            }
            if (lossVal !== '') {
                document.querySelectorAll('.q-loss-input').forEach(inp => inp.value = lossVal);
            }
        });
    }
    
    // 無制限チェックボックス制御
    const unlimitedChk = document.getElementById('config-bulk-time-unlimited');
    const timeInput = document.getElementById('config-bulk-time-input');
    if(unlimitedChk && timeInput) {
        unlimitedChk.addEventListener('change', (e) => {
            if(e.target.checked) {
                timeInput.value = '';
                timeInput.disabled = true;
                timeInput.placeholder = "∞";
            } else {
                timeInput.disabled = false;
                timeInput.placeholder = "0";
            }
        });
    }

    if(modeSel) updateModeDetails(modeSel.value);
    
    updateEliminationUI();
    renderQuestionsListUI(selectedSetQuestions);
    applySpecialModeLock(spMode);
}

function renderQuestionsListUI(questions) {
    const list = document.getElementById('config-questions-list');
    if(!list) return;
    list.innerHTML = '';
    questions.forEach((q, i) => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.marginBottom = '5px';
        div.style.borderBottom = '1px solid #eee';
        div.style.paddingBottom = '5px';
        const pts = q.points !== undefined ? q.points : 1;
        const loss = q.loss !== undefined ? q.loss : 0;
        const time = q.timeLimit !== undefined ? q.timeLimit : 0;
        div.innerHTML = `
            <div style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-weight:bold; font-size:0.9em; margin-right:5px;">Q${i+1}. ${q.q}</div>
            <div style="display:flex; align-items:center; gap:3px;">
                <span style="font-size:0.7em; color:#333;">${APP_TEXT.Config.LabelHeaderTime}</span>
                <input type="number" class="q-time-input" data-index="${i}" value="${time}" min="0" style="width:50px; text-align:center; padding:5px; border:1px solid #333; border-radius:3px;">
                <span style="font-size:0.7em; color:#0055ff; margin-left:3px;">${APP_TEXT.Config.LabelHeaderPt}</span>
                <input type="number" class="q-point-input" data-index="${i}" value="${pts}" min="1" style="width:50px; text-align:center; padding:5px; border:1px solid #0055ff; border-radius:3px; font-weight:bold;">
                <span style="font-size:0.7em; color:#d00; margin-left:3px;">${APP_TEXT.Config.LabelHeaderLoss}</span>
                <input type="number" class="q-loss-input" data-index="${i}" value="${loss}" min="0" style="width:50px; text-align:center; padding:5px; border:1px solid #d00; border-radius:3px; font-weight:bold;">
            </div>
        `;
        list.appendChild(div);
    });
}

function applySpecialModeLock(spMode) {
    const modeSelect = document.getElementById('config-mode-select');
    const lockMsg = document.getElementById('config-mode-locked-msg');
    const ruleSec = document.getElementById('config-rule-section');
    if(!modeSelect) return;
    if (spMode === 'time_attack') {
        modeSelect.value = 'time_attack';
        modeSelect.disabled = true;
        lockMsg.classList.remove('hidden');
        if(ruleSec) ruleSec.style.display = 'none'; 
        updateModeDetails('time_attack');
    } else if (spMode === 'panel_attack') {
        const gameType = document.getElementById('config-game-type');
        if(gameType) {
            gameType.value = 'territory';
            gameType.disabled = true;
        }
        unlockConfig();
    } else {
        unlockConfig();
    }
}

function unlockConfig() {
    const modeSelect = document.getElementById('config-mode-select');
    const lockMsg = document.getElementById('config-mode-locked-msg');
    const ruleSec = document.getElementById('config-rule-section');
    const gameType = document.getElementById('config-game-type');
    if(!modeSelect) return;
    modeSelect.disabled = false;
    lockMsg.classList.add('hidden');
    if(ruleSec) ruleSec.style.display = 'block';
    if(gameType) gameType.disabled = false;
    updateModeDetails(modeSelect.value);
}

function updateModeDetails(mode) {
    document.querySelectorAll('.mode-details').forEach(el => el.classList.add('hidden'));
    if (mode === 'normal') document.getElementById('mode-details-normal')?.classList.remove('hidden');
    else if (mode === 'buzz') document.getElementById('mode-details-buzz')?.classList.remove('hidden');
    else if (mode === 'turn') document.getElementById('mode-details-turn')?.classList.remove('hidden');
    else if (mode === 'time_attack') document.getElementById('mode-details-time_attack')?.classList.remove('hidden');
    else if (mode === 'solo') document.getElementById('mode-details-solo')?.classList.remove('hidden');
}

function updateEliminationUI() {
    const rule = document.getElementById('config-elimination-rule').value;
    const countArea = document.getElementById('config-elimination-count-area');
    if(countArea) {
        if (rule === 'wrong_and_slowest') countArea.classList.remove('hidden');
        else countArea.classList.add('hidden');
    }
}

function addPeriodToPlaylist() {
    const select = document.getElementById('config-set-select');
    const mode = document.getElementById('config-mode-select').value;
    if(!select.value && mode !== 'panel_attack' && mode !== 'bomb') {
         alert(APP_TEXT.Config.AlertNoSet); return; 
    }
    
    let questionsWithPoints = [];
    let title = "New Period";
    if (select.value) {
        const data = JSON.parse(select.value);
        title = data.t;
        questionsWithPoints = JSON.parse(JSON.stringify(data.q || []));
        const pointInputs = document.querySelectorAll('.q-point-input');
        const lossInputs = document.querySelectorAll('.q-loss-input');
        const timeInputs = document.querySelectorAll('.q-time-input');
        if (pointInputs.length > 0) {
            pointInputs.forEach(input => {
                const idx = parseInt(input.getAttribute('data-index'));
                if (questionsWithPoints[idx]) questionsWithPoints[idx].points = parseInt(input.value) || 1;
            });
            lossInputs.forEach(input => {
                const idx = parseInt(input.getAttribute('data-index'));
                if (questionsWithPoints[idx]) questionsWithPoints[idx].loss = parseInt(input.value) || 0;
            });
            timeInputs.forEach(input => {
                const idx = parseInt(input.getAttribute('data-index'));
                if (questionsWithPoints[idx]) questionsWithPoints[idx].timeLimit = parseInt(input.value) || 0;
            });
        }
    }

    let elimCount = 1;
    if (document.getElementById('config-elimination-rule').value === 'wrong_and_slowest') {
        elimCount = parseInt(document.getElementById('config-elimination-count').value) || 1;
    }

    const gameType = document.getElementById('config-game-type').value;
    const winCond = document.getElementById('config-win-cond').value;
    
    let winTarget = 0;
    if (winCond === 'score') {
        winTarget = parseInt(document.getElementById('config-win-target').value) || 10;
    }

    let shuffle = 'off';
    if (mode === 'normal') shuffle = document.getElementById('config-shuffle-q').value;
    else if (mode === 'buzz') shuffle = document.getElementById('config-buzz-shuffle').value;
    else if (mode === 'turn') shuffle = document.getElementById('config-turn-shuffle').value;
    
    if(shuffle === 'on') {
        for (let i = questionsWithPoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questionsWithPoints[i], questionsWithPoints[j]] = [questionsWithPoints[j], questionsWithPoints[i]];
        }
    }
    
    let taSeconds = 5;
    if (mode === 'time_attack') {
        taSeconds = parseInt(getElValue('config-ta-seconds', 5));
    }
    const soloStyle = getElValue('config-solo-style', 'manual');
    if (mode === 'solo' && soloStyle === 'auto') {
         taSeconds = parseInt(getElValue('config-solo-seconds', 5));
    }

    const newConfig = {
        initialStatus: 'revive', passCount: 5, intermediateRanking: false,
        eliminationRule: document.getElementById('config-elimination-rule').value,
        eliminationCount: elimCount,
        lossPoint: 0, scoreUnit: 'point', theme: 'light',
        timeLimit: (mode === 'time_attack' || (mode === 'solo' && soloStyle === 'auto')) ? taSeconds : 0, 
        mode: mode,
        gameType: gameType,
        winCondition: winCond, 
        winTarget: winTarget, 
        
        normalLimit: getElValue('config-normal-limit', 'unlimited'),
        buzzWrongAction: getElValue('config-buzz-wrong-action', 'next'),
        buzzTime: parseInt(getElValue('config-buzz-timer', 0)),
        turnOrder: getElValue('config-turn-order', 'fixed'),
        turnPass: getElValue('config-turn-pass', 'ok'),
        
        soloStyle: soloStyle,

        shuffleChoices: 'off',
        bombCount: 10,
        bombTarget: 'bomb1'
    };
    
    periodPlaylist.push({
        title: title,
        questions: questionsWithPoints,
        config: newConfig
    });
    
    renderConfigPreview();
    updateBuilderUI();
}

}
