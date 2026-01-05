/* =========================================================
 * host_config.js (v18: Inter-Period Settings UI)
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
    // リストが空の時だけ表示を隠す（初回は自動設定なので）
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
    let passCount = 5;

    // 2つ目以降は、画面上の選択値をデフォルトとして採用
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

// ★UI変更：ピリオド間に設定パネルを挟む
function renderConfigPreview() {
    const container = document.getElementById('config-playlist-preview');
    container.innerHTML = '';
    
    if(periodPlaylist.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; font-size:0.8em;">まだ追加されていません</p>';
        return;
    }
    
    periodPlaylist.forEach((item, index) => {
        // --- 1. 接続部分 (2つ目以降に表示) ---
        if (index > 0) {
            // 矢印
            const arrowDiv = document.createElement('div');
            arrowDiv.className = 'playlist-arrow-container';
            arrowDiv.innerHTML = '<div class="playlist-arrow"></div>';
            container.appendChild(arrowDiv);

            // 設定パネル（黄色い枠）
            const settingDiv = document.createElement('div');
            settingDiv.className = 'playlist-inter-setting';
            
            // HTML生成：プルダウンと数値入力（ランキング時のみ表示）
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

        // --- 2. ピリオドカード ---
        const div = document.createElement('div');
        div.className = 'timeline-card'; // 既存のスタイルを流用
        div.style.marginBottom = "0"; // 隙間調整
        
        let ruleText = "脱落なし";
        if(item.config.eliminationRule === 'wrong_only') ruleText = "不正解脱落";
        if(item.config.eliminationRule === 'wrong_and_slowest') ruleText = "最遅も脱落";

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

    // イベントリスナー登録（プルダウン変更時にデータを更新）
    document.querySelectorAll('.inter-status-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const idx = e.target.getAttribute('data-index');
            const val = e.target.value;
            // データ更新
            periodPlaylist[idx].config.initialStatus = val;
            
            // UI表示切替（ランキング入力欄）
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
