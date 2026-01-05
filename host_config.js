/* =========================================================
 * host_config.js (v56-fix3: Fix Blank Screen)
 * =======================================================*/

let selectedSetQuestions = [];

// グローバルスコープに関数を定義して参照エラーを防ぐ
window.onSetSelectChange = function() {
    updateBuilderUI();
};

function enterConfigMode() {
    // 画面切り替え
    if(window.views && window.views.config) {
        window.showView(window.views.config);
    } else {
        console.error("Config view not found");
        return;
    }
    
    const setSelect = document.getElementById('config-set-select');
    const container = document.getElementById('config-builder-ui');
    
    // UI初期化
    if(setSelect) {
        setSelect.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;
        // リスナー再登録
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

    // 非同期データロード
    loadSetListInConfig();
    loadSavedProgramsInConfig();
    renderConfigPreview();
}

function loadSetListInConfig() {
    const select = document.getElementById('config-set-select');
    if(!select) return;

    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;
    
    if(!window.db) { console.error("Firebase DB not initialized"); return; }

    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
        
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                const firstQ = (item.questions && item.questions.length > 0) ? item.questions[0] : {};
                const spMode = firstQ.specialMode || 'none';
                
                // データ自体をvalueに埋め込む
                opt.value = JSON.stringify({ 
                    q: item.questions || [], 
                    c: item.config || {}, 
                    t: item.title || "No Title", 
                    sp: spMode 
                });
                
                let label = item.title;
                if(spMode !== 'none') label += ` [${spMode}]`;
                opt.textContent = label;
                
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = `<option value="">${APP_TEXT.Config.SelectEmpty}</option>`;
        }
    });
}

// UI構築メイン関数
function updateBuilderUI() {
    const container = document.getElementById('config-builder-ui');
    const select = document.getElementById('config-set-select');
    
    if (!container || !select) return;

    // 選択なしの場合
    if (!select.value) {
        selectedSetQuestions = [];
        container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">セットを選択してください</p>';
        // カスタムエリアも隠す
        document.getElementById('config-custom-points-area')?.classList.add('hidden');
        return;
    }

    let setData;
    try {
        setData = JSON.parse(select.value);
    } catch(e) {
        console.error("JSON Parse Error", e);
        return;
    }

    selectedSetQuestions = setData.q || [];
    const config = setData.c || {};
    const spMode = setData.sp || 'none';

    let html = '';

    // 1. 回答モード
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
            <div style="margin-top:10px;">
                <label class="config-label">${APP_TEXT.Config.LabelShuffle}</label>
                <select id="config-shuffle-choices" class="btn-block config-select">
                    <option value="off">${APP_TEXT.Config.ShuffleOff}</option>
                    <option value="on">${APP_TEXT.Config.ShuffleOn}</option>
                </select>
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
                <label class="config-label">${APP_TEXT.Config.LabelShuffle}</label>
                <select id="config-buzz-shuffle" class="btn-block config-select">
                    <option value="off">${APP_TEXT.Config.ShuffleOff}</option>
                    <option value="on">${APP_TEXT.Config.ShuffleOn}</option>
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
                <label class="config-label">${APP_TEXT.Config.LabelShuffle}</label>
                <select id="config-turn-shuffle" class="btn-block config-select">
                    <option value="off">${APP_TEXT.Config.ShuffleOff}</option>
                    <option value="on">${APP_TEXT.Config.ShuffleOn}</option>
                </select>
            </div>
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

    // 2. ルール設定
    html += `<div id="config-rule-section">`;
    html += `<div class="config-section-title">${APP_TEXT.Config.LabelRule}</div>`;

    // カスタムスコアエリア (v56: 常に表示する形に変更)
    html += `
    <div class="config-item-box">
        <h5 style="margin:0 0 10px 0;">${APP_TEXT.Config.HeadingCustomScore}</h5>
        
        <div style="display:flex; flex-wrap:wrap; justify-content:flex-end; align-items:center; gap:10px; margin-bottom:10px; background:#f9f9f9; padding:5px; font-size:0.8em;">
            <div>
                <span style="color:#333; font-weight:bold;">${APP_TEXT.Config.LabelBulkTime}</span>
                <input type="number" id="config-bulk-time-input" value="0" min="0" style="width:40px; text-align:center; margin:0 5px;">
                <button id="config-bulk-time-btn" class="btn-mini" style="background:#333; color:white;">${APP_TEXT.Config.BtnReflect}</button>
            </div>
            <div>
                <span style="color:#0055ff; font-weight:bold;">${APP_TEXT.Config.LabelBulkPt}</span>
                <input type="number" id="config-bulk-point-input" value="1" min="1" style="width:40px; text-align:center; margin:0 5px;">
                <button id="config-bulk-point-btn" class="btn-mini" style="background:#0055ff; color:white;">${APP_TEXT.Config.BtnReflect}</button>
            </div>
            <div>
                <span style="color:#d00; font-weight:bold;">${APP_TEXT.Config.LabelBulkLoss}</span>
                <input type="number" id="config-bulk-loss-input" value="0" min="0" style="width:40px; text-align:center; margin:0 5px;">
                <button id="config-bulk-loss-btn" class="btn-mini" style="background:#d00; color:white;">${APP_TEXT.Config.BtnReflect}</button>
            </div>
        </div>

        <div id="config-questions-list" style="font-size:0.9em; max-height:300px; overflow-y:auto; border:1px solid #eee; padding:5px;"></div>
    </div>`;

    // 脱落条件
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

    // --- HTML挿入 ---
    container.innerHTML = html;

    // --- イベントリスナー設定 ---
    const modeSel = document.getElementById('config-mode-select');
    if(modeSel) modeSel.addEventListener('change', (e) => updateModeDetails(e.target.value));
    
    const elimSel = document.getElementById('config-elimination-rule');
    if(elimSel) elimSel.addEventListener('change', updateEliminationUI);
    
    const addBtn = document.getElementById('config-add-playlist-btn');
    if(addBtn) addBtn.addEventListener('click', addPeriodToPlaylist);

    // 一括設定ボタン
    document.getElementById('config-bulk-time-btn')?.addEventListener('click', () => {
        const val = document.getElementById('config-bulk-time-input').value;
        document.querySelectorAll('.q-time-input').forEach(inp => inp.value = val);
    });
    document.getElementById('config-bulk-point-btn')?.addEventListener('click', () => {
        const val = document.getElementById('config-bulk-point-input').value;
        document.querySelectorAll('.q-point-input').forEach(inp => inp.value = val);
    });
    document.getElementById('config-bulk-loss-btn')?.addEventListener('click', () => {
        const val = document.getElementById('config-bulk-loss-input').value;
        document.querySelectorAll('.q-loss-input').forEach(inp => inp.value = val);
    });

    // 初期化実行
    if(modeSel) updateModeDetails(modeSel.value);
    updateEliminationUI();
    applySpecialModeLock(spMode);
    
    // リスト描画 (カスタムエリア強制表示)
    renderQuestionsListUI(selectedSetQuestions);
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
            <div style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-weight:bold; font-size:0.9em; margin-right:5px;">
                Q${i+1}. ${q.q}
            </div>
            <div style="display:flex; align-items:center; gap:3px;">
                <span style="font-size:0.7em; color:#333;">${APP_TEXT.Config.LabelHeaderTime}</span>
                <input type="number" class="q-time-input" data-index="${i}" value="${time}" min="0" style="width:40px; text-align:center; padding:3px; border:1px solid #333; border-radius:3px;">
                
                <span style="font-size:0.7em; color:#0055ff; margin-left:3px;">${APP_TEXT.Config.LabelHeaderPt}</span>
                <input type="number" class="q-point-input" data-index="${i}" value="${pts}" min="1" style="width:30px; text-align:center; padding:3px; border:1px solid #0055ff; border-radius:3px; font-weight:bold;">
                
                <span style="font-size:0.7em; color:#d00; margin-left:3px;">${APP_TEXT.Config.LabelHeaderLoss}</span>
                <input type="number" class="q-loss-input" data-index="${i}" value="${loss}" min="0" style="width:30px; text-align:center; padding:3px; border:1px solid #d00; border-radius:3px; font-weight:bold;">
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
    
    if(!modeSelect) return;

    modeSelect.disabled = false;
    lockMsg.classList.add('hidden');
    ruleSec.style.display = 'block';
    
    updateModeDetails(modeSelect.value);
}

function updateModeDetails(mode) {
    document.querySelectorAll('.mode-details').forEach(el => el.classList.add('hidden'));
    
    if (mode === 'normal') document.getElementById('mode-details-normal')?.classList.remove('hidden');
    else if (mode === 'buzz') document.getElementById('mode-details-buzz')?.classList.remove('hidden');
    else if (mode === 'turn') document.getElementById('mode-details-turn')?.classList.remove('hidden');
    else if (mode === 'time_attack') document.getElementById('mode-details-time_attack')?.classList.remove('hidden');
    else if (mode === 'bomb' || mode === 'panel_attack') document.getElementById('mode-details-bomb')?.classList.remove('hidden');
}

function updateEliminationUI() {
    const rule = document.getElementById('config-elimination-rule').value;
    const countArea = document.getElementById('config-elimination-count-area');
    if (rule === 'wrong_and_slowest') countArea?.classList.remove('hidden');
    else countArea?.classList.add('hidden');
}

// 他の関数は変更なしだが、念のため記載
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

    let initialStatus = 'revive'; 
    let passCount = 5;
    let intermediateRanking = false; 

    let elimCount = 1;
    const elimRule = document.getElementById('config-elimination-rule').value;
    if (elimRule === 'wrong_and_slowest') {
        elimCount = parseInt(document.getElementById('config-elimination-count').value) || 1;
    }

    let bombCount = 10;
    let bombTarget = 'bomb1';
    if (mode === 'bomb') {
        bombCount = parseInt(document.getElementById('config-bomb-count').value);
        bombTarget = document.getElementById('config-bomb-target').value;
        title = "Bomb Game";
    } else if (mode === 'panel_attack') {
        title = "Panel Attack";
    }

    let shuffle = 'off';
    if (mode === 'normal') shuffle = document.getElementById('config-shuffle-choices').value;
    else if (mode === 'buzz') shuffle = document.getElementById('config-buzz-shuffle').value;
    else if (mode === 'turn') shuffle = document.getElementById('config-turn-shuffle').value;

    const newConfig = {
        initialStatus: initialStatus,
        passCount: passCount,
        intermediateRanking: intermediateRanking,
        eliminationRule: elimRule,
        eliminationCount: elimCount,
        lossPoint: 0,
        scoreUnit: 'point',
        theme: 'light',
        timeLimit: 0, 
        mode: mode,
        normalLimit: document.getElementById('config-normal-limit').value,
        buzzWrongAction: document.getElementById('config-buzz-wrong-action').value,
        buzzTime: parseInt(document.getElementById('config-buzz-timer').value) || 0,
        turnOrder: document.getElementById('config-turn-order').value,
        turnPass: document.getElementById('config-turn-pass').value,
        shuffleChoices: shuffle,
        bombCount: bombCount,
        bombTarget: bombTarget
    };
    
    periodPlaylist.push({
        title: title,
        questions: questionsWithPoints,
        config: newConfig
    });
    
    renderConfigPreview();
    // UIを初期化
    updateBuilderUI();
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
                    [${modeLabel}] ${ruleText}
                </div>
            </div>
            <button class="delete-btn" onclick="removeFromPlaylist(${index})">Del</button>
        `;
        container.appendChild(div);
    });

    // イベント再バインド
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
    // ... 他省略なし
    document.querySelectorAll('.inter-pass-input').forEach(inp => {
        inp.addEventListener('change', (e) => {
            const idx = e.target.getAttribute('data-index');
            periodPlaylist[idx].config.passCount = parseInt(e.target.value) || 5;
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
    updateBuilderUI();
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
