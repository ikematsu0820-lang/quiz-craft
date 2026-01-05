/* =========================================================
 * host_config.js (v17: Save & Transition Fix)
 * =======================================================*/

function enterConfigMode() {
    window.showView(window.views.config);
    updateBuilderUI();

    const select = document.getElementById('config-set-select');
    select.innerHTML = '<option value="">読み込み中...</option>';
    
    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
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
    renderConfigPreview();
}

function updateBuilderUI() {
    const settingArea = document.getElementById('participation-setting-area');
    if (periodPlaylist.length === 0) {
        settingArea.classList.add('hidden');
    } else {
        settingArea.classList.remove('hidden');
        const val = document.getElementById('config-initial-status').value;
        const passArea = document.getElementById('config-pass-count-area');
        if (val === 'ranking') {
            passArea.classList.remove('hidden');
        } else {
            passArea.classList.add('hidden');
        }
    }
}

function addPeriodToPlaylist() {
    const select = document.getElementById('config-set-select');
    const json = select.value;
    if(!json) { alert("セットを選んでください"); return; }
    
    const data = JSON.parse(json);
    
    let initialStatus = 'revive';
    let passCount = 0;

    if (periodPlaylist.length > 0) {
        initialStatus = document.getElementById('config-initial-status').value;
        if(initialStatus === 'ranking') {
            passCount = parseInt(document.getElementById('config-pass-count').value) || 5;
        }
    }

    const newConfig = {
        initialStatus: initialStatus,
        passCount: passCount,
        eliminationRule: document.getElementById('config-elimination-rule').value,
        scoreUnit: document.getElementById('config-score-unit').value,
        theme: 'light',
        timeLimit: parseInt(document.getElementById('config-time-limit').value) || 0
    };
    
    periodPlaylist.push({
        title: data.t,
        questions: data.q,
        config: newConfig
    });
    
    renderConfigPreview();
    updateBuilderUI(); 
}

function renderConfigPreview() {
    const container = document.getElementById('config-playlist-preview');
    container.innerHTML = '';
    if(periodPlaylist.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; font-size:0.8em;">まだ追加されていません</p>';
        return;
    }
    
    periodPlaylist.forEach((item, index) => {
        const div = document.createElement('div');
        div.style.background = "white";
        div.style.marginBottom = "5px";
        div.style.padding = "5px 10px";
        div.style.borderRadius = "4px";
        div.style.fontSize = "0.9em";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        
        let statusText = "START";
        if (index > 0) {
            if(item.config.initialStatus === 'continue') statusText = '継続';
            else if(item.config.initialStatus === 'ranking') statusText = `上位${item.config.passCount}名`;
            else statusText = '復活';
        }
        
        let ruleText = "脱落なし";
        if(item.config.eliminationRule === 'wrong_only') ruleText = "不正解脱落";
        if(item.config.eliminationRule === 'wrong_and_slowest') ruleText = "最遅も脱落";

        div.innerHTML = `
            <span><b>${index+1}. ${item.title}</b> [${statusText}] <small>(${ruleText})</small></span>
            <span style="color:#d00; cursor:pointer;" onclick="removeFromPlaylist(${index})">[削除]</span>
        `;
        container.appendChild(div);
    });
}

window.removeFromPlaylist = function(index) {
    periodPlaylist.splice(index, 1);
    renderConfigPreview();
    updateBuilderUI();
};

// ★修正：保存ボタンの処理
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
        periodPlaylist = []; // 保存したらクリアして戻る
        enterDashboard(); // ダッシュボードへ戻る
    })
    .catch(err => alert("保存エラー: " + err.message));
}
