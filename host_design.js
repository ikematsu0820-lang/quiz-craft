/* =========================================================
 * host_design.js (v3.1: Fix & Top Preview)
 * =======================================================*/

let currentDesignTarget = null; // { type: 'set'|'prog', key: '...', data: ... }

// デザインモード開始
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
            previewQ = q; 
        } else if (target.type === 'prog' && data.playlist && data.playlist.length > 0) {
            const pl = data.playlist[0];
            if(pl.questions && pl.questions.length > 0) {
                const q = pl.questions[0];
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
        
        if(window.showToast) window.showToast(`「${data.title}」を読み込みました`);
    });
}

// 保存処理
function saveDesignSettings() {
    if(!currentDesignTarget) {
        if(!confirm("編集対象が選択されていません。\nグローバル設定（新規作成時のデフォルト）として保存しますか？")) return;
        // グローバル保存
        const path = `show_settings/${currentShowId}/design`;
        const data = collectDesignSettings();
        window.db.ref(path).set(data).then(() => {
            if(window.showToast) window.showToast("デフォルト設定を保存しました");
        });
        return;
    }

    const designData = collectDesignSettings(); 
    
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
            if(window.showToast) window.showToast(`セット「${currentDesignTarget.data.title}」のデザインを更新・完了しました！`);
        });

    } else {
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
            if(window.showToast) window.showToast(`構成「${currentDesignTarget.data.title}」のデザインを更新・完了しました！`);
        });
    }
}

/* --- ヘルパー関数 --- */

function setDefaultDesignUI() {
    const layoutEl = document.getElementById('creator-set-layout');
    if(layoutEl) layoutEl.value = 'standard';
    updateAlignUI('center');
    
    const mainBg = document.getElementById('design-main-bg-color');
    if(mainBg) mainBg.value = "#222222";
    
    const bgData = document.getElementById('design-bg-image-data');
    if(bgData) bgData.value = "";
    
    const bgStatus = document.getElementById('design-bg-image-status');
    if(bgStatus) {
         bgStatus.textContent = "画像なし";
         bgStatus.style.color = "#666";
    }

    const qText = document.getElementById('design-q-text');
    if(qText) qText.value = "#ffffff";
    const qBg = document.getElementById('design-q-bg');
    if(qBg) qBg.value = "#2c5066";
    const qBorder = document.getElementById('design-q-border');
    if(qBorder) qBorder.value = "#ffffff";
    
    const cText = document.getElementById('design-c-text');
    if(cText) cText.value = "#ffffff";
    const cBg = document.getElementById('design-c-bg');
    if(cBg) cBg.value = "#365c75";
    const cBorder = document.getElementById('design-c-border');
    if(cBorder) cBorder.value = "#ffffff";
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
    
    const clearBtn = document.getElementById('design-bg-clear-btn');
    if(clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.getElementById('design-bg-image-data').value = "";
            const bgStatus = document.getElementById('design-bg-image-status');
            if(bgStatus) {
                bgStatus.textContent = "画像なし";
                bgStatus.style.color = "#666";
            }
            renderDesignPreview();
        });
    }
    
    const imgBtn = document.getElementById('design-bg-image-btn');
    const imgInput = document.getElementById('design-bg-image-file');
    if(imgBtn && imgInput) {
        imgBtn.onclick = () => imgInput.click();
        imgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                const dataUrl = event.target.result;
                document.getElementById('design-bg-image-data').value = dataUrl;
                const bgStatus = document.getElementById('design-bg-image-status');
                if(bgStatus) {
                     bgStatus.textContent = "画像あり (適用済)";
                     bgStatus.style.color = "#00aa00";
                }
                renderDesignPreview();
            };
            reader.readAsDataURL(file);
        };
    }

    const saveBtn = document.getElementById('design-save-btn');
    if(saveBtn) saveBtn.onclick = saveDesignSettings; // リスナー重複防止のためonclick使用

    const resetBtn = document.getElementById('design-reset-btn');
    if(resetBtn) resetBtn.onclick = () => {
        setDefaultDesignUI();
        renderDesignPreview();
    };
}

// プレビュー描画
function renderDesignPreview(qData = null) {
    const container = document.getElementById('design-monitor-preview-content');
    if(!container) return;

    const frame = document.querySelector('.design-preview-frame');
    if(frame) {
        const scale = frame.clientWidth / 1920;
        container.style.transform = `scale(${scale})`;
    }

    const d = collectDesignSettings().design;
    const layout = document.getElementById('creator-set-layout').value;
    const align = document.getElementById('creator-set-align').value;

    let qText = "これは問題文のプレビューです。";
    let choices = ["選択肢 A", "選択肢 B", "選択肢 C", "選択肢 D"];
    
    if(!qData && currentDesignTarget && currentDesignTarget.data) {
        if(currentDesignTarget.type === 'set' && currentDesignTarget.data.questions && currentDesignTarget.data.questions.length > 0) {
            qData = currentDesignTarget.data.questions[0];
        } else if (currentDesignTarget.type === 'prog' && currentDesignTarget.data.playlist && currentDesignTarget.data.playlist.length > 0) {
             const pl = currentDesignTarget.data.playlist[0];
             if(pl.questions && pl.questions.length > 0) qData = pl.questions[0];
        }
    }

    if(qData) {
        qText = qData.q;
        if(qData.c) choices = qData.c;
    }

    container.style.backgroundColor = d.mainBgColor;
    if(d.bgImage) {
        container.style.backgroundImage = `url(${d.bgImage})`;
        container.style.backgroundSize = "cover";
        container.style.backgroundPosition = "center";
    } else {
        if(d.mainBgColor === '#0a0a0a' || d.mainBgColor === '#222222') {
             container.style.backgroundImage = "radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)";
        } else {
             container.style.backgroundImage = "none";
        }
    }

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
