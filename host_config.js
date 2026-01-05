/* =========================================================
 * host_config.js (v25: Crash Prevention Fix)
 * =======================================================*/

let selectedSetQuestions = [];

function enterConfigMode() {
    window.showView(window.views.config);
    updateBuilderUI();

    const select = document.getElementById('config-set-select');
    if(select) select.innerHTML = '<option value="">読み込み中...</option>';
    
    const pointArea = document.getElementById('config-custom-points-area');
    if(pointArea) pointArea.classList.add('hidden');
    selectedSetQuestions = [];

    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        if(!select) return; // 安全策
        select.innerHTML = '<option value="">-- セットを選択 --</option>';
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ q: item.questions, c: item.config || {}, t: item.title });
                opt.textContent = item.title;
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = '<option value="">セットがありません</option>';
        }
    });
    
    const elimRuleSelect = document.getElementById('config-elimination-rule');
    if(elimRuleSelect) elimRuleSelect.onchange = updateBuilderUI;

    if(select) {
        select.onchange = () => {
            const val = select.value;
            if(val) {
                const data = JSON.parse(val);
                selectedSetQuestions = data.q || [];
                if(pointArea) pointArea.classList.add('hidden');
            } else {
                selectedSetQuestions = [];
            }
        };
    }

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

    renderConfigPreview();
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
    
    if(!area || !list) return; // 安全策

    if (selectedSetQuestions.length === 0) {
        alert("先にセットを選択してください");
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
                    <span style="font-size:0.7em; color:#0055ff;">得</span>
                    <input type="number" class="q-point-input" data-index="${i}" value="${pts}" min="1" style="width:40px; text-align:center; padding:5px; border:1px solid #0055ff; border-radius:4px;">
                    <span style="font-size:0.7em; color:#d00;">失</span>
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
    if(!json) { alert("セットを選んでください"); return; }
    
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
    let elimCount = 1;
    if (document.getElementById('config-elimination-rule').value === 'wrong_and_slowest') {
        elimCount = parseInt(document.getElementById('config-elimination-count').value) || 1;
    }

    let lossPoint = document.getElementById('config-loss-point').value;
    if (lossPoint !== 'reset') lossPoint = parseInt(lossPoint);

    const newConfig = {
        initialStatus: initialStatus,
        passCount: passCount,
        eliminationRule: document.getElementById('config-elimination-rule').value,
        eliminationCount: elimCount,
        lossPoint: lossPoint,
        scoreUnit: document.getElementById('config-score-unit').value,
        theme: 'light',
        timeLimit: parseInt(document.getElementById('config-time-limit').value) || 0
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
    if(!container) return; // 安全策
    container.innerHTML = '';
    
    if(periodPlaylist.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; font-size:0.8em;">まだ追加されていません</p>';
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
            
            settingDiv.innerHTML = `
                <div style="font-size:0.7em; color:#666; font-weight:bold; margin-bottom:3px;">開始時の参加者設定</div>
                <div style="display:flex; gap:5px; align-items:center;">
                    <select class="inter-status-select" data-index="${index}">
                        <option value="revive" ${item.config.initialStatus === 'revive' ? 'selected' : ''}>全員復活してスタート</option>
                        <option value="continue" ${item.config.initialStatus === 'continue' ? 'selected' : ''}>生存者のみで継続</option>
                        <option value="ranking" ${item.config.initialStatus === 'ranking' ? 'selected' : ''}>成績上位者が進出</option>
                    </select>
                    <div class="inter-pass-area ${isRanking ? '' : 'hidden'}" style="display:flex; align-items:center; gap:3px;">
                        <span style="font-size:0.8em;">上位</span>
                        <input type="number" class="inter-pass-input" data-index="${index}" value="${item.config.passCount}" min="1" style="width:50px; padding:5px; text-align:center;">
                        <span style="font-size:0.8em;">名</span>
                    </div>
                </div>
            `;
            container.appendChild(settingDiv);
        }

        const div = document.createElement('div');
        div.className = 'timeline-card';
        div.style.marginBottom = "0"; 
        
        let ruleText = "脱落なし";
        if(item.config.eliminationRule === 'wrong_only') ruleText = "不正解脱落";
        if(item.config.eliminationRule === 'wrong_and_slowest') ruleText = `遅い${item.config.eliminationCount}人脱落`;

        div.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:bold; font-size:1.1em;">${index+1}. ${item.title}</div>
                <div style="font-size:0.8em; color:#666;">
                    ${ruleText} / ${item.config.timeLimit}秒 / 失点:${item.config.lossPoint}
                </div>
            </div>
            <button class="delete-btn" onclick="removeFromPlaylist(${index})">削除</button>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.inter-status-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const idx = e.target.getAttribute('data-index');
            const val = e.target.value;
            periodPlaylist[idx].config.initialStatus = val;
            const passArea = e.target.nextElementSibling;
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
}

window.removeFromPlaylist = function(index) {
    periodPlaylist.splice(index, 1);
    renderConfigPreview();
    updateBuilderUI();
};

function saveProgramToCloud() {
    if(periodPlaylist.length === 0) {
        alert("構成リストが空です");
        return;
    }
    const titleInput = document.getElementById('config-program-title');
    const title = titleInput.value.trim();
    if(!title) {
        alert("プログラム名を入力してください");
        return;
    }

    const cleanPlaylist = JSON.parse(JSON.stringify(periodPlaylist));

    const saveObj = {
        title: title,
        playlist: cleanPlaylist, 
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    window.db.ref(`saved_programs/${currentShowId}`).push(saveObj)
    .then(() => {
        alert(`プログラム「${title}」を保存しました！\nダッシュボードに戻ります。`);
        titleInput.value = '';
        periodPlaylist = []; 
        enterDashboard(); 
    })
    .catch(err => alert("保存エラー: " + err.message));
}
