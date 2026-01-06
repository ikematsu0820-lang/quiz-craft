/* =========================================================
 * host_config.js (修正版)
 * 役割：番組構成（プレイリスト）の作成・保存・読込
 * =======================================================*/

let selectedSetQuestions = [];

// セット選択が変更された時の処理（windowに登録して外部から呼べるようにする）
window.onSetSelectChange = function() {
    window.updateBuilderUI();
};

// 設定モード開始（host_core.jsから呼ばれる）
window.enterConfigMode = function() {
    window.showView('config-view');
    
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
    window.renderConfigPreview();
};

// ヘルパー: 要素から値を安全に取得
function getElVal(id, def) {
    const el = document.getElementById(id);
    return el ? el.value : def;
}

// 選択肢用のセット一覧を読み込む
function loadSetListInConfig() {
    const select = document.getElementById('config-set-select');
    if(!select) return;

    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;
    
    window.db.ref(`saved_sets/${currentShowId}`).once('value', function(snap) {
        const data = snap.val();
        select.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
        if(data) {
            Object.keys(data).forEach(function(key) {
                const item = data[key];
                const opt = document.createElement('option');
                
                // 形式ラベルの作成
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

// モードに応じた詳細設定の表示切り替え
window.updateModeDetails = function(mode) {
    document.querySelectorAll('.mode-details').forEach(function(el) { el.classList.add('hidden'); });
    
    const targetId = 'mode-details-' + mode;
    const targetEl = document.getElementById(targetId);
    if(targetEl) {
        targetEl.classList.remove('hidden');
    }
};

// 設定ビルダーUIの更新
window.updateBuilderUI = function() {
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

    // 基本HTML構築
    let html = '';

    // 回答モードセクション
    html += `<div class="config-section-title">${APP_TEXT.Config.LabelMode}</div>`;
    html += `<div class="config-item-box">`;
    html += `<select id="config-mode-select" class="btn-block config-select highlight-select" onchange="window.updateModeDetails(this.value)">`;
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
    
    // 詳細エリア（動的に表示を切り替える場所）
    html += `<div id="mode-details-normal" class="mode-details hidden">
                <label class="config-label">回答回数制限</label>
                <select id="config-normal-limit" class="btn-block config-select">
                    <option value="unlimited">何度でも修正可</option>
                    <option value="one">1回のみ</option>
                </select>
            </div>
            <div id="mode-details-solo" class="mode-details hidden">
                <label class="config-label">進行スタイル</label>
                <select id="config-solo-style" class="btn-block config-select">
                    <option value="manual">手動進行</option>
                    <option value="auto">自動進行</option>
                </select>
            </div>
            <div id="mode-details-buzz" class="mode-details hidden">
                <label class="config-label">制限時間</label>
                <select id="config-buzz-timer" class="btn-block config-select">
                    <option value="0">無制限</option><option value="5">5秒</option><option value="10">10秒</option>
                </select>
            </div>
            <div id="mode-details-time_attack" class="mode-details hidden">
                <label class="config-label">1問の秒数</label>
                <input type="number" id="config-ta-seconds" value="5" class="btn-block">
            </div>`;
    html += `</div>`;

    // ルール・配点セクション（省略しつつボタンのみ確実に配置）
    html += `<div class="config-section-title">ゲームルール</div>
             <div class="config-item-box">
                <select id="config-game-type" class="btn-block config-select"><option value="score">得点形式</option></select>
                <select id="config-win-cond" class="btn-block config-select"><option value="all">全問消化</option></select>
                <select id="config-elimination-rule" class="btn-block config-select"><option value="none">脱落なし</option></select>
             </div>`;

    html += `<button id="config-add-playlist-btn" class="btn-block btn-primary" style="margin-top:20px;" onclick="window.addPeriodToPlaylist()">リストに追加</button>`;

    container.innerHTML = html;
    window.updateModeDetails(document.getElementById('config-mode-select').value);
};

// リストに追加
window.addPeriodToPlaylist = function() {
    const select = document.getElementById('config-set-select');
    if(!select.value) return;

    const setData = JSON.parse(select.value);
    const mode = getElVal('config-mode-select', 'normal');
    
    const newPeriod = {
        title: setData.t,
        questions: setData.q,
        config: {
            mode: mode,
            gameType: getElVal('config-game-type', 'score'),
            initialStatus: 'revive',
            timeLimit: mode === 'time_attack' ? parseInt(getElVal('config-ta-seconds', 5)) : 0
        }
    };

    periodPlaylist.push(newPeriod);
    window.renderConfigPreview();
};

// プレビュー表示
window.renderConfigPreview = function() {
    const container = document.getElementById('config-playlist-preview');
    if(!container) return;
    container.innerHTML = '';

    periodPlaylist.forEach(function(item, index) {
        const div = document.createElement('div');
        div.className = 'timeline-card';
        div.innerHTML = `<div><b>${index+1}. ${item.title}</b> [${item.config.mode}]</div>
                         <button class="btn-mini btn-del" onclick="window.removeFromPlaylist(${index})">削除</button>`;
        container.appendChild(div);
    });
};

window.removeFromPlaylist = function(index) {
    periodPlaylist.splice(index, 1);
    window.renderConfigPreview();
};

// 保存済みプログラムの読込
function loadSavedProgramsInConfig() {
    const listEl = document.getElementById('config-saved-programs-list');
    if(!listEl) return;

    window.db.ref(`saved_programs/${currentShowId}`).once('value', function(snap) {
        const data = snap.val();
        listEl.innerHTML = '';
        if(data) {
            Object.keys(data).forEach(function(key) {
                const item = data[key];
                const div = document.createElement('div');
                div.className = 'set-item';
                div.innerHTML = `<span>${item.title}</span><button class="btn-mini btn-primary" onclick="window.loadProgram('${key}')">読込</button>`;
                listEl.appendChild(div);
            });
        }
    });
}

window.loadProgram = function(key) {
    window.db.ref(`saved_programs/${currentShowId}/${key}`).once('value', function(snap) {
        const item = snap.val();
        if(item) {
            periodPlaylist = item.playlist || [];
            window.renderConfigPreview();
        }
    });
};

// 保存処理
window.saveProgramToCloud = function() {
    const title = getElVal('config-program-title', '');
    if(!title || periodPlaylist.length === 0) return alert("名前とリストを確認してください");

    const saveObj = {
        title: title,
        playlist: periodPlaylist,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    window.db.ref(`saved_programs/${currentShowId}`).push(saveObj).then(function() {
        alert("保存しました");
        loadSavedProgramsInConfig();
    });
};
