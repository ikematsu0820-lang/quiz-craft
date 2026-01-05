/* =========================================================
 * host_config.js (v49: Multi-Mode Configuration)
 * =======================================================*/

let selectedSetQuestions = [];

function enterConfigMode() {
    window.showView(window.views.config);
    updateBuilderUI();

    const select = document.getElementById('config-set-select');
    if(!select) return;
    
    // ルールプルダウン生成
    const elimRuleSelect = document.getElementById('config-elimination-rule');
    elimRuleSelect.innerHTML = `
        <option value="none">${APP_TEXT.Config.RuleNone}</option>
        <option value="wrong_only">${APP_TEXT.Config.RuleWrong}</option>
        <option value="wrong_and_slowest">${APP_TEXT.Config.RuleSlow}</option>
    `;
    elimRuleSelect.onchange = updateBuilderUI;

    // ★v49: モード選択ロジック（3パターン分岐）
    const modeSelect = document.getElementById('config-mode-select');
    if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
            updateModeDetails(e.target.value);
        });
        updateModeDetails(modeSelect.value); // 初期表示
    }

    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;
    document.getElementById('config-custom-points-area').classList.add('hidden');
    selectedSetQuestions = [];

    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ q: item.questions, c: item.config || {}, t: item.title });
                opt.textContent = item.title;
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = `<option value="">${APP_TEXT.Config.SelectEmpty}</option>`;
        }
    });
    
    select.onchange = () => {
        const val = select.value;
        if(val) {
            const data = JSON.parse(val);
            selectedSetQuestions = data.q || [];
            document.getElementById('config-custom-points-area').classList.add('hidden');
        } else {
            selectedSetQuestions = [];
        }
    };

    const customScoreBtn = document.getElementById('config-custom-score-btn');
    if(customScoreBtn) customScoreBtn.onclick = toggleCustomScoreArea;

    const bulkPtBtn = document.getElementById('config-bulk-point-btn');
    if(bulkPtBtn) {
        bulkPtBtn.onclick = () => {
            const val = document.getElementById('config-bulk-point-input').value;
            document.querySelectorAll('.q-point-input').forEach(input => input.value = val);
        };
    }
    const bulkLossBtn = document.getElementById('config-bulk-loss-btn');
    if(bulkLossBtn) {
        bulkLossBtn.onclick = () => {
            const val = document.getElementById('config-bulk-loss-input').value;
            document.querySelectorAll('.q-loss-input').forEach(input => input.value = val);
        };
    }

    loadSavedProgramsInConfig();
    renderConfigPreview();
}

function updateModeDetails(mode) {
    document.querySelectorAll('.mode-details').forEach(el => el.classList.add('hidden'));
    
    if (mode === 'normal') {
        document.getElementById('config-normal-details').classList.remove('hidden');
    } else if (mode === 'buzz') {
        document.getElementById('config-buzz-details').classList.remove('hidden');
    } else if (mode === 'turn') {
        document.getElementById('config-turn-details').classList.remove('hidden');
    }
}

// ... (loadSavedProgramsInConfig, updateBuilderUI, toggleCustomScoreArea は v48 と同じ) ...
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
            loadBtn.style.backgroundColor = '#0055ff';
            loadBtn.style.color = 'white';
            loadBtn.style.fontSize = '0.8em';
            loadBtn.style.padding = '4px 8px';
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

function updateBuilderUI() {
    const rule = document.getElementById('config-elimination-rule').value;
    const countArea = document.getElementById('config-elimination-count-area');
    if(countArea) {
        if (rule === 'wrong_and_slowest') countArea.classList.remove('hidden');
        else countArea.classList.add('hidden');
    }
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
            
            const pts = q.points || 1;
            const loss = q.loss || 0;

            div.innerHTML = `
                <div style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">
                    <span style="font-weight:bold; color:#666;">Q${i+1}.</span> ${q.q}
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <span style="font-size:0.7em; color:#0055ff;">Pt</span>
                    <input type="number" class="q-point-input" data-index="${i}" value="${pts}" min="1" style="width:40px; text-align:center; padding:5px; border:1px solid #0055ff; border-radius:4px;">
                    <span style="font-size:0.7em; color:#d00;">Loss</span>
                    <input type="number" class="q-loss-input" data-index="${i}" value="${loss}" min="0" style="width:40px; text-align:center; padding:5px; border:1px solid #d00; border-radius:4px;">
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
    const json = select.value;
    if(!json) { alert(APP_TEXT.Config.AlertNoSet); return; }
    
    const data = JSON.parse(json);
    const questionsWithPoints = JSON.parse(JSON.stringify(data.q)); 
    const pointInputs = document.querySelectorAll('.q-point-input');
    const lossInputs = document.querySelectorAll('.q-loss-input');
    
    const area = document.getElementById('config-custom-points-area');
    const isCustomPoints = area && !area.classList.contains('hidden');
    
    if (isCustomPoints && pointInputs.length > 0) {
        pointInputs.forEach(input => {
            const idx = parseInt(input.getAttribute('data-index'));
            const pts = parseInt(input.value) || 1;
            if (questionsWithPoints[idx]) questionsWithPoints[idx].points = pts;
        });
        lossInputs.forEach(input => {
            const idx = parseInt(input.getAttribute('data-index'));
            const lss = parseInt(input.value) || 0;
            if (questionsWithPoints[idx]) questionsWithPoints[idx].loss = lss;
        });
    } else {
        questionsWithPoints.forEach(q => {
            q.points = (q.points || 1);
            q.loss = (q.loss || 0);
        });
    }

    let initialStatus = 'revive'; 
    let passCount = 5;
    let intermediateRanking = false; 

    let elimCount = 1;
    if (document.getElementById('config-elimination-rule').value === 'wrong_and_slowest') {
        elimCount = parseInt(document.getElementById('config-elimination-count').value) || 1;
    }

    const mode = document.getElementById('config-mode-select').value;

    const newConfig = {
        initialStatus: initialStatus,
        passCount: passCount,
        intermediateRanking: intermediateRanking,
        eliminationRule: document.getElementById('config-elimination-rule').value,
        eliminationCount: elimCount,
        lossPoint: 0,
        scoreUnit: 'point',
        theme: 'light',
        timeLimit: parseInt(document.getElementById('config-time-limit').value) || 0,
        mode: mode,
        
        // ★v49: 詳細設定の保存
        normalLimit: document.getElementById('config-normal-limit').value,
        buzzWrongAction: document.getElementById('config-buzz-wrong-action').value,
        buzzTime: parseInt(document.getElementById('config-buzz-timer').value) || 0,
        turnOrder: document.getElementById('config-turn-order').value,
        turnPass: document.getElementById('config-turn-pass').value
    };
    
    periodPlaylist.push({
        title: data.t,
        questions: questionsWithPoints,
        config: newConfig
    });
    
    renderConfigPreview();
    updateBuilderUI();
    if(area) area.classList.add('hidden');
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
        
        // ★v49: モード表示
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

    // ... (イベントリスナー類は変更なし) ...
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
    updateBuilderUI();
};

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
        alert(APP_TEXT.Config.MsgSaved);
        titleInput.value = '';
        periodPlaylist = []; 
        loadSavedProgramsInConfig(); 
        enterDashboard(); 
    })
    .catch(err => alert("Error: " + err.message));
}
