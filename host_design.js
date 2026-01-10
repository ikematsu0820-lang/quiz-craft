/* =========================================================
 * host_design.js (v3: Target Edit & Top Preview)
 * =======================================================*/

let currentDesignTarget = null; // { type: 'set'|'prog', key: '...', data: ... }

// 初期化
window.enterDesignMode = function() {
    setDefaultDesignUI();
    currentDesignTarget = null;
    
    // ターゲットリストの読み込み
    loadDesignTargetList();
    
    // イベントリスナー設定
    setupLivePreviewListeners();
    renderDesignPreview();
    
    if(window.views && window.views.design) window.showView(window.views.design);
};

// 編集対象リストの読み込み
function loadDesignTargetList() {
    const select = document.getElementById('design-target-select');
    const btn = document.getElementById('design-target-load-btn');
    if(!select || !btn) return;

    select.innerHTML = `<option value="">Loading...</option>`;

    Promise.all([
        window.db.ref(`saved_sets/${currentShowId}`).once('value'),
        window.db.ref(`saved_programs/${currentShowId}`).once('value')
    ]).then(([setSnap, progSnap]) => {
        select.innerHTML = `<option value="">-- 編集するセットを選択 --</option>`;
        
        const sets = setSnap.val() || {};
        const progs = progSnap.val() || {};
        
        // セット一覧
        Object.keys(sets).forEach(key => {
            const item = sets[key];
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ type: 'set', key: key, title: item.title });
            opt.textContent = `[SET] ${item.title}`;
            select.appendChild(opt);
        });

        // プログラム一覧
        Object.keys(progs).forEach(key => {
            const item = progs[key];
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ type: 'prog', key: key, title: item.title });
            opt.textContent = `[PROG] ${item.title}`;
            select.appendChild(opt);
        });
    });

    // Loadボタン動作
    btn.onclick = () => {
        const val = select.value;
        if(!val) { alert("対象を選択してください"); return; }
        
        const target = JSON.parse(val);
        loadTargetDesign(target);
    };
}

// 選択したターゲットのデザイン（と問題データ）を読み込む
function loadTargetDesign(target) {
    let path = "";
    if (target.type === 'set') path = `saved_sets/${currentShowId}/${target.key}`;
    else path = `saved_programs/${currentShowId}/${target.key}`;

    window.db.ref(path).once('value', snap => {
        const data = snap.val();
        if(!data) { alert("データが見つかりません"); return; }

        // データ保持
        currentDesignTarget = { ...target, data: data };
        
        // デザイン情報の抽出
        // セットなら data.questions[0].design
        // プログラムなら data.playlist[0].questions[0].design (代表値)
        let d = null;
        let layout = 'standard';
        let align = 'center';

        // プレビュー用に問題文を1つ取得
        let previewQ = { q: "Sample Question", c: ["Choice A","Choice B","Choice C","Choice D"] };

        if (target.type === 'set' && data.questions && data.questions.length > 0) {
            const q = data.questions[0];
            d = q.design;
            layout = q.layout || 'standard';
            align = q.align || 'center';
            previewQ = q; // 実データをプレビューに使う
        } else if (target.type === 'prog' && data.playlist && data.playlist.length > 0) {
            const q = data.playlist[0].questions[0];
            if(q) {
                d = q.design;
                layout = q.layout || 'standard';
                align = q.align || 'center';
                previewQ = q;
            }
        }

        // UIに適用
        if(d) {
            applyDesignToUI(d, layout, align);
        } else {
            setDefaultDesignUI(); // なければ初期値
        }
        
        // プレビュー更新（実データを使って）
        renderDesignPreview(previewQ);
        
        window.showToast(`「${data.title}」を読み込みました`);
    });
}

// 保存処理（ここが重要：対象データへ書き込む）
function saveDesignSettings() {
    if(!currentDesignTarget) {
        if(!confirm("編集対象が選択されていません。\nグローバル設定（新規作成時のデフォルト）として保存しますか？")) return;
        // グローバル保存
        const path = `show_settings/${currentShowId}/design`;
        const data = collectDesignSettings();
        window.db.ref(path).set(data).then(() => window.showToast("デフォルト設定を保存しました"));
        return;
    }

    const designData = collectDesignSettings(); // { layout, align, design: {...} }
    
    // DB更新
    // セットの場合: questions配列内の全要素のdesignを更新する
    // プログラムの場合: playlist内の全questionsのdesignを更新する
    
    const updates = {};
    const d = designData.design;
    const l = designData.layout;
    const a = designData.align;

    if (currentDesignTarget.type === 'set') {
        const questions = currentDesignTarget.data.questions || [];
        questions.forEach((q, i) => {
            updates[`questions/${i}/design`] = d;
            updates[`questions/${i}/layout`] = l;
            updates[`questions/${i}/align`] = a;
        });
        
        const basePath = `saved_sets/${currentShowId}/${currentDesignTarget.key}`;
        window.db.ref(basePath).update(updates).then(() => {
            window.showToast(`セット「${currentDesignTarget.data.title}」のデザインを更新・完了しました！`);
        });

    } else {
        // プログラムの場合（全ピリオド更新）
        const playlist = currentDesignTarget.data.playlist || [];
        playlist.forEach((period, pIdx) => {
            if(period.questions) {
                period.questions.forEach((q, qIdx) => {
                    updates[`playlist/${pIdx}/questions/${qIdx}/design`] = d;
                    updates[`playlist/${pIdx}/questions/${qIdx}/layout`] = l;
                    updates[`playlist/${pIdx}/questions/${qIdx}/align`] = a;
                });
            }
        });

        const basePath = `saved_programs/${currentShowId}/${currentDesignTarget.key}`;
        window.db.ref(basePath).update(updates).then(() => {
            window.showToast(`構成「${currentDesignTarget.data.title}」のデザインを更新・完了しました！`);
        });
    }
}


/* --- 既存のヘルパー関数群（一部修正なし） --- */

function setDefaultDesignUI() {
    // ... (既存コードと同じ：各IDのvalueを初期値にする)
    const layoutEl = document.getElementById('creator-set-layout');
    if(layoutEl) layoutEl.value = 'standard';
    updateAlignUI('center');
    
    document.getElementById('design-main-bg-color').value = "#222222";
    document.getElementById('design-bg-image-data').value = "";
    document.getElementById('design-bg-image-status').textContent = "画像なし";

    document.getElementById('design-q-text').value = "#ffffff";
    document.getElementById('design-q-bg').value = "#2c5066";
    document.getElementById('design-q-border').value = "#ffffff";
    
    document.getElementById('design-c-text').value = "#ffffff";
    document.getElementById('design-c-bg').value = "#365c75";
    document.getElementById('design-c-border').value = "#ffffff";
}

function updateAlignUI(align) {
    document.getElementById('creator-set-align').value = align;
    document.querySelectorAll('.btn-align').forEach(btn => {
        if(btn.getAttribute('data-align') === align) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function collectDesignSettings() {
    return {
        layout: document.getElementById('creator-set-layout').value,
        align: document.getElementById('creator-set-align').value,
        design: {
            mainBgColor: document.getElementById('design-main-bg-color').value,
            bgImage: document.getElementById('design-bg-image-data').value,
            qTextColor: document.getElementById('design-q-text').value,
            qBgColor: document.getElementById('design-q-bg').value,
            qBorderColor: document.getElementById('design-q-border').value,
            cTextColor: document.getElementById('design-c-text').value,
            cBgColor: document.getElementById('design-c-bg').value,
            cBorderColor: document.getElementById('design-c-border').value
        }
    };
}

function applyDesignToUI(d, layout, align) {
    document.getElementById('creator-set-layout').value = layout;
    updateAlignUI(align);
    
    document.getElementById('design-main-bg-color').value = d.mainBgColor || "#222222";
    document.getElementById('design-bg-image-data').value = d.bgImage || "";
    const bgStatus = document.getElementById('design-bg-image-status');
    if(d.bgImage) { bgStatus.textContent = "画像あり"; bgStatus.style.color = "#00aa00"; }
    else { bgStatus.textContent = "画像なし"; bgStatus.style.color = "#666"; }

    document.getElementById('design-q-text').value = d.qTextColor || "#ffffff";
    document.getElementById('design-q-bg').value = d.qBgColor || "#2c5066";
    document.getElementById('design-q-border').value = d.qBorderColor || "#ffffff";

    document.getElementById('design-c-text').value = d.cTextColor || "#ffffff";
    document.getElementById('design-c-bg').value = d.cBgColor || "#365c75";
    document.getElementById('design-c-border').value = d.cBorderColor || "#ffffff";
}

function setupLivePreviewListeners() {
    const ids = [
        'creator-set-layout', 'design-main-bg-color', 'design-bg-image-data',
        'design-q-text', 'design-q-bg', 'design-q-border',
        'design-c-text', 'design-c-bg', 'design-c-border'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', () => renderDesignPreview());
            el.addEventListener('change', () => renderDesignPreview());
        }
    });
    document.querySelectorAll('.btn-align').forEach(btn => {
        btn.addEventListener('click', (e) => {
             updateAlignUI(e.target.getAttribute('data-align'));
             renderDesignPreview();
        });
    });
    document.getElementById('design-bg-clear-btn').addEventListener('click', () => {
        document.getElementById('design-bg-image-data').value = "";
        document.getElementById('design-bg-image-status').textContent = "画像なし";
        renderDesignPreview();
    });
    document.getElementById('design-save-btn').addEventListener('click', saveDesignSettings);
    document.getElementById('design-reset-btn').addEventListener('click', () => {
        setDefaultDesignUI();
        renderDesignPreview();
    });
}

// プレビュー描画（引数 qData があればそれを使う）
function renderDesignPreview(qData = null) {
    const container = document.getElementById('design-monitor-preview-content');
    if(!container) return;

    // スケール計算 (親枠の幅に合わせて縮小)
    const frame = document.querySelector('.design-preview-frame');
    if(frame) {
        const scale = frame.clientWidth / 1920;
        container.style.transform = `scale(${scale})`;
    }

    // 現在の設定値を取得
    const d = collectDesignSettings().design;
    const layout = document.getElementById('creator-set-layout').value;
    const align = document.getElementById('creator-set-align').value;

    // プレビューする文字データ (実データ優先)
    let qText = "これは問題文のプレビューです。";
    let choices = ["選択肢 A", "選択肢 B", "選択肢 C", "選択肢 D"];
    
    // 読み込み済みデータのキャッシュがあればそれを使う
    if(!qData && currentDesignTarget && currentDesignTarget.data) {
        // 簡易的に先頭データを再利用
        if(currentDesignTarget.type === 'set' && currentDesignTarget.data.questions.length > 0) {
            qData = currentDesignTarget.data.questions[0];
        }
    }

    if(qData) {
        qText = qData.q;
        if(qData.c) choices = qData.c;
    }

    // 背景
    container.style.backgroundColor = d.mainBgColor;
    if(d.bgImage) {
        container.style.backgroundImage = `url(${d.bgImage})`;
        container.style.backgroundSize = "cover";
        container.style.backgroundPosition = "center";
    } else {
        container.style.backgroundImage = "radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)";
    }

    // スタイル構築
    const qStyle = `
        color: ${d.qTextColor}; background: ${d.qBgColor}; border: 6px solid ${d.qBorderColor};
        ${align === 'left' ? 'text-align:left;' : align === 'right' ? 'text-align:right;' : 'text-align:center;'}
        ${layout === 'standard' ? 'border-left-width: 30px;' : ''}
    `;
    const cStyle = `color: ${d.cTextColor}; background: ${d.cBgColor}; border-bottom-color: ${d.cBorderColor};`;
    const pStyle = `color: ${d.qBorderColor}; margin-right: 30px; font-weight:900;`;

    let html = '';
    
    if (layout === 'standard') {
        container.style.flexDirection = 'column';
        html += `<div class="preview-q-area" style="${qStyle}">${qText}</div>`;
        html += `<div class="preview-c-area">`;
        choices.forEach((c, i) => {
            html += `<div class="preview-choice-item" style="${cStyle}"><span style="${pStyle}">${String.fromCharCode(65+i)}</span> ${c}</div>`;
        });
        html += `</div>`;
    } else if (layout === 'split_list' || layout === 'split_grid') {
        container.style.flexDirection = 'row-reverse';
        const qStyleVert = `
            color: ${d.qTextColor}; background: ${d.qBgColor}; border: 6px solid ${d.qBorderColor};
            writing-mode: vertical-rl; text-orientation: upright;
            width: 400px; height: 900px; display:flex; align-items:center; justify-content:center;
            font-size: 70px; font-weight:bold; margin-left: 50px; border-radius:15px;
        `;
        html += `<div style="${qStyleVert}">${qText}</div>`;
        html += `<div class="preview-c-area" style="width:50%;">`;
        choices.forEach((c, i) => {
            html += `<div class="preview-choice-item" style="${cStyle}"><span style="${pStyle}">${String.fromCharCode(65+i)}</span> ${c}</div>`;
        });
        html += `</div>`;
    }

    container.innerHTML = html;
}

// リサイズ追従
window.addEventListener('resize', () => renderDesignPreview());
