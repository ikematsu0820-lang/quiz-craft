/* =========================================================
 * host_config.js
 * 役割：セットのルール設定、番組構成リスト(プレイリスト)の構築
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
                // JSONに固めてvalueに入れる
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
        theme: 'light', // テーマ選択は削除したので固定
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
