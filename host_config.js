/* =========================================================
 * host_config.js (v20: Per-Question Point Setting)
 * =======================================================*/

// 選択中のセットの問題を一時保持
let selectedSetQuestions = [];

function enterConfigMode() {
    window.showView(window.views.config);
    updateBuilderUI();

    const select = document.getElementById('config-set-select');
    select.innerHTML = '<option value="">読み込み中...</option>';
    
    // UI初期化
    document.getElementById('config-custom-points-area').classList.add('hidden');
    selectedSetQuestions = [];

    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = '<option value="">-- セットを選択 --</option>';
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                // valueにはJSON全体を入れる
                opt.value = JSON.stringify({ q: item.questions, c: item.config || {}, t: item.title });
                opt.textContent = item.title;
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = '<option value="">セットがありません</option>';
        }
    });
    
    // イベントリスナー設定
    const elimRuleSelect = document.getElementById('config-elimination-rule');
    if(elimRuleSelect) elimRuleSelect.onchange = updateBuilderUI;

    // セット選択時の処理
    select.onchange = () => {
        const val = select.value;
        if(val) {
            const data = JSON.parse(val);
            selectedSetQuestions = data.q || [];
            // セットを変えたら配点エリアはいったん隠す（リセット）
            document.getElementById('config-custom-points-area').classList.add('hidden');
        } else {
            selectedSetQuestions = [];
        }
    };

    // ★追加：個別配点ボタン
    const customScoreBtn = document.getElementById('config-custom-score-btn');
    if(customScoreBtn) {
        customScoreBtn.onclick = toggleCustomScoreArea;
    }

    renderConfigPreview();
}

function updateBuilderUI() {
    const rule = document.getElementById('config-elimination-rule').value;
    const countArea = document.getElementById('config-elimination-count-area');
    if (rule === 'wrong_and_slowest') {
        countArea.classList.remove('hidden');
    } else {
        countArea.classList.add('hidden');
    }
}

// ★追加：配点設定エリアの表示・生成
function toggleCustomScoreArea() {
    const area = document.getElementById('config-custom-points-area');
    const list = document.getElementById('config-questions-list');
    
    if (selectedSetQuestions.length === 0) {
        alert("先にセットを選択してください");
        return;
    }

    if (area.classList.contains('hidden')) {
        // 表示する際にリスト生成
        list.innerHTML = '';
        selectedSetQuestions.forEach((q, i) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.marginBottom = '5px';
            div.style.borderBottom = '1px solid #eee';
            div.style.paddingBottom = '5px';
            
            div.innerHTML = `
                <div style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">
                    <span style="font-weight:bold; color:#666;">Q${i+1}.</span> ${q.q}
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <input type="number" class="q-point-input" data-index="${i}" value="1" min="1" style="width:50px; text-align:center; padding:5px; border:1px solid #aaa; border-radius:4px;">
                    <span style="font-size:0.8em;">点</span>
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
    
    // ★ここが重要：個別配点を読み取って問題データにマージする
    const questionsWithPoints = JSON.parse(JSON.stringify(data.q)); // 深いコピー
    const pointInputs = document.querySelectorAll('.q-point-input');
    
    // 配点エリアが開いている場合のみ適用（閉じていればデフォルト1点）
    const isCustomPoints = !document.getElementById('config-custom-points-area').classList.contains('hidden');
    
    if (isCustomPoints && pointInputs.length > 0) {
        pointInputs.forEach(input => {
            const idx = parseInt(input.getAttribute('data-index'));
            const pts = parseInt(input.value) || 1;
            if (questionsWithPoints[idx]) {
                questionsWithPoints[idx].points = pts;
            }
        });
    } else {
        // デフォルト1点
        questionsWithPoints.forEach(q => q.points = 1);
    }

    let initialStatus = 'revive';
    let passCount = 5;
    if (periodPlaylist.length > 0) {
        initialStatus = document.getElementById('config-initial-status').value;
        if(initialStatus === 'ranking') {
            passCount = parseInt(document.getElementById('config-pass-count').value) || 5;
        }
    }

    let elimCount = 1;
    if (document.getElementById('config-elimination-rule').value === 'wrong_and_slowest') {
        elimCount = parseInt(document.getElementById('config-elimination-count').value) || 1;
    }

    const newConfig = {
        initialStatus: initialStatus,
        passCount: passCount,
        eliminationRule: document.getElementById('config-elimination-rule').value,
        eliminationCount: elimCount,
        scoreUnit: document.getElementById('config-score-unit').value,
        theme: 'light',
        timeLimit: parseInt(document.getElementById('config-time-limit').value) || 0
    };
    
    periodPlaylist.push({
        title: data.t,
        questions: questionsWithPoints, // ★配点付きの問題リスト
        config: newConfig
    });
    
    // リセット
    renderConfigPreview();
    updateBuilderUI();
    document.getElementById('config-custom-points-area').classList.add('hidden');
}

function renderConfigPreview() {
    const container = document.getElementById('config-playlist-preview');
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
                    ${ruleText} / ${item.config.timeLimit}秒
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
            if (val === 'ranking') passArea.classList.remove('hidden');
            else passArea.classList.add('hidden');
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

    const saveObj = {
        title: title,
        playlist: periodPlaylist, 
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
