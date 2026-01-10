/* =========================================================
 * host_design.js (v2: Monitor Preview Added)
 * =======================================================*/

function getDesignPath() {
    if(!currentShowId) return null;
    return `show_settings/${currentShowId}/design`;
}

function setDefaultDesignUI() {
    const layoutEl = document.getElementById('creator-set-layout');
    if(layoutEl) layoutEl.value = 'standard';

    if(typeof updateAlignUI === 'function') updateAlignUI('center');

    const mainBg = document.getElementById('design-main-bg-color');
    if(mainBg) mainBg.value = "#222222";

    const bgData = document.getElementById('design-bg-image-data');
    if(bgData) bgData.value = "";

    const bgStatus = document.getElementById('design-bg-image-status');
    if(bgStatus && typeof APP_TEXT !== 'undefined') bgStatus.textContent = APP_TEXT.Creator.MsgNoImage;

    const qText = document.getElementById('design-q-text');
    const qBg = document.getElementById('design-q-bg');
    const qBorder = document.getElementById('design-q-border');
    const cText = document.getElementById('design-c-text');
    const cBg = document.getElementById('design-c-bg');
    const cBorder = document.getElementById('design-c-border');

    if(qText) qText.value = "#ffffff";
    if(qBg) qBg.value = "#2c5066";
    if(qBorder) qBorder.value = "#ffffff";
    if(cText) cText.value = "#ffffff";
    if(cBg) cBg.value = "#365c75";
    if(cBorder) cBorder.value = "#ffffff";
    
    renderDesignPreview(); // 初期値でプレビュー
}

window.loadDesignSettings = function() {
    const path = getDesignPath();
    if(!path || !window.db) return;

    window.db.ref(path).once('value', snap => {
        const val = snap.val();
        if(!val) return;

        if(val.layout && document.getElementById('creator-set-layout')) {
            document.getElementById('creator-set-layout').value = val.layout;
        }
        if(val.align && typeof updateAlignUI === 'function') {
            updateAlignUI(val.align);
        }
        if(val.design) {
            const d = val.design;
            if(document.getElementById('design-main-bg-color')) document.getElementById('design-main-bg-color').value = d.mainBgColor || "#222222";
            if(document.getElementById('design-bg-image-data')) document.getElementById('design-bg-image-data').value = d.bgImage || "";
            if(document.getElementById('design-q-text')) document.getElementById('design-q-text').value = d.qTextColor || "#ffffff";
            if(document.getElementById('design-q-bg')) document.getElementById('design-q-bg').value = d.qBgColor || "#2c5066";
            if(document.getElementById('design-q-border')) document.getElementById('design-q-border').value = d.qBorderColor || "#ffffff";
            if(document.getElementById('design-c-text')) document.getElementById('design-c-text').value = d.cTextColor || "#ffffff";
            if(document.getElementById('design-c-bg')) document.getElementById('design-c-bg').value = d.cBgColor || "#365c75";
            if(document.getElementById('design-c-border')) document.getElementById('design-c-border').value = d.cBorderColor || "#ffffff";
            
            // 画像ステータス更新
            const bgStatus = document.getElementById('design-bg-image-status');
            if(bgStatus) {
                if(d.bgImage) {
                    bgStatus.textContent = "画像あり (読込済)";
                    bgStatus.style.color = "#00aa00";
                } else {
                    bgStatus.textContent = "画像なし";
                }
            }
        }
        renderDesignPreview(); // 読み込み後にプレビュー更新
    });
};

function collectDesignSettings() {
    return {
        layout: document.getElementById('creator-set-layout')?.value || 'standard',
        align: document.getElementById('creator-set-align')?.value || 'center',
        design: {
            mainBgColor: document.getElementById('design-main-bg-color')?.value || "#222222",
            bgImage: document.getElementById('design-bg-image-data')?.value || "",
            qTextColor: document.getElementById('design-q-text')?.value || "#ffffff",
            qBgColor: document.getElementById('design-q-bg')?.value || "#2c5066",
            qBorderColor: document.getElementById('design-q-border')?.value || "#ffffff",
            cTextColor: document.getElementById('design-c-text')?.value || "#ffffff",
            cBgColor: document.getElementById('design-c-bg')?.value || "#365c75",
            cBorderColor: document.getElementById('design-c-border')?.value || "#ffffff"
        },
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
}

function saveDesignSettings() {
    const path = getDesignPath();
    if(!path || !window.db) return;

    const data = collectDesignSettings();
    window.db.ref(path).set(data).then(() => {
        if(typeof window.showToast === 'function') window.showToast("デザインを保存しました");
    });
}

window.enterDesignMode = function() {
    // UI初期化 → 保存済みがあれば上書き
    setDefaultDesignUI();
    if(typeof window.loadDesignSettings === 'function') window.loadDesignSettings();
    
    loadProgramListInDesign();
    setupLivePreviewListeners(); // ★イベントリスナー設定
    renderDesignPreview();

    if(window.views && window.views.design) window.showView(window.views.design);
};

// ★変更イベントを監視してプレビュー更新
function setupLivePreviewListeners() {
    const ids = [
        'creator-set-layout', 'design-main-bg-color', 'design-bg-image-data',
        'design-q-text', 'design-q-bg', 'design-q-border',
        'design-c-text', 'design-c-bg', 'design-c-border'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.removeEventListener('input', renderDesignPreview);
            el.addEventListener('input', renderDesignPreview);
            el.removeEventListener('change', renderDesignPreview); // select用
            el.addEventListener('change', renderDesignPreview);
        }
    });

    // 文字配置ボタン
    document.querySelectorAll('.btn-align').forEach(btn => {
        btn.addEventListener('click', () => {
            // 少し遅延させて値がセットされてから描画
            setTimeout(renderDesignPreview, 50);
        });
    });
    
    // 画像クリア時
    const clearBtn = document.getElementById('design-bg-clear-btn');
    if(clearBtn) {
        clearBtn.addEventListener('click', () => setTimeout(renderDesignPreview, 100));
    }
    
    // 画像選択時（handleImageUpload内で値セットされるのを待つためMutationObserverが理想だが、簡易的にinput監視）
    const hiddenImg = document.getElementById('design-bg-image-data');
    if(hiddenImg) {
        // 値がJSで書き換わったのを検知するのは難しいので、handleImageUpload側で呼ぶか、定期チェック
    }
}

// ★プレビュー描画のメイン関数
function renderDesignPreview() {
    const previewContainer = document.getElementById('design-monitor-preview-content');
    if(!previewContainer) return;
    
    // 親枠に合わせてスケール計算 (親の幅 / 1920)
    const frame = document.querySelector('.design-preview-frame');
    if(frame) {
        const scale = frame.clientWidth / 1920;
        previewContainer.style.transform = `scale(${scale})`;
    }

    // 値の取得
    const layout = document.getElementById('creator-set-layout')?.value || 'standard';
    const align = document.getElementById('creator-set-align')?.value || 'center';
    
    const d = {
        mainBg: document.getElementById('design-main-bg-color')?.value,
        bgImg: document.getElementById('design-bg-image-data')?.value,
        qText: document.getElementById('design-q-text')?.value,
        qBg: document.getElementById('design-q-bg')?.value,
        qBorder: document.getElementById('design-q-border')?.value,
        cText: document.getElementById('design-c-text')?.value,
        cBg: document.getElementById('design-c-bg')?.value,
        cBorder: document.getElementById('design-c-border')?.value
    };

    // 背景適用
    previewContainer.style.backgroundColor = d.mainBg;
    if(d.bgImg) {
        previewContainer.style.backgroundImage = `url(${d.bgImg})`;
        previewContainer.style.backgroundSize = "cover";
        previewContainer.style.backgroundPosition = "center";
    } else {
        previewContainer.style.backgroundImage = "none";
        // デフォルトグラデーション(U-NEXT風)を再現したければここで条件分岐
        if(d.mainBg === '#0a0a0a') {
            previewContainer.style.backgroundImage = "radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)";
        }
    }

    // コンテンツ構築
    let html = '';
    
    // Qエリアのスタイル
    const qStyle = `
        color: ${d.qText};
        background: ${d.qBg};
        border: 4px solid ${d.qBorder}; 
        ${align === 'left' ? 'text-align:left;' : align === 'right' ? 'text-align:right;' : 'text-align:center;'}
        ${layout === 'standard' ? 'border-left-width: 20px;' : ''} /* U-NEXT風アクセント */
    `;

    // Cエリアのスタイル
    const cItemStyle = `
        color: ${d.cText};
        background: ${d.cBg};
        border-bottom-color: ${d.cBorder};
    `;
    const prefixStyle = `color: ${d.qBorder}; margin-right: 30px; font-weight:900;`;

    // レイアウト分岐
    if (layout === 'standard') {
        html += `<div class="preview-q-area" style="${qStyle}">ここに問題文が入ります。文字サイズや配色は設定に従います。</div>`;
        
        html += `<div class="preview-c-area">`;
        ['A. 選択肢サンプル１', 'B. 選択肢サンプル２', 'C. 選択肢サンプル３'].forEach((txt, i) => {
            html += `<div class="preview-choice-item" style="${cItemStyle}">
                <span style="${prefixStyle}">${String.fromCharCode(65+i)}</span> ${txt.split('. ')[1]}
            </div>`;
        });
        html += `</div>`;
        
        previewContainer.style.flexDirection = 'column';

    } else if (layout === 'split_list') {
        // 左右分割（右に縦書きQ、左にリスト）
        previewContainer.style.flexDirection = 'row-reverse'; // 右にQ
        previewContainer.style.justifyContent = 'center';
        
        const qStyleVert = `
            color: ${d.qText}; background: ${d.qBg}; border: 4px solid ${d.qBorder};
            writing-mode: vertical-rl; text-orientation: upright;
            width: 300px; height: 800px; display:flex; align-items:center; justify-content:center;
            font-size: 60px; font-weight:bold; margin-left: 50px; border-radius:10px;
        `;
        
        html += `<div style="${qStyleVert}">縦書き問題文</div>`;
        
        html += `<div class="preview-c-area" style="width:50%;">`;
        ['選択肢１', '選択肢２', '選択肢３', '選択肢４'].forEach((txt, i) => {
             html += `<div class="preview-choice-item" style="${cItemStyle}">
                <span style="${prefixStyle}">${String.fromCharCode(65+i)}</span> ${txt}
            </div>`;
        });
        html += `</div>`;
    }

    previewContainer.innerHTML = html;
}


document.addEventListener('DOMContentLoaded', () => {
    const btnSave = document.getElementById('design-save-btn');
    if(btnSave) btnSave.addEventListener('click', saveDesignSettings);

    const btnReset = document.getElementById('design-reset-btn');
    if(btnReset) btnReset.addEventListener('click', () => {
        setDefaultDesignUI();
        if(typeof window.showToast === 'function') window.showToast("初期値に戻しました");
    });
    
    // リサイズ時にプレビューのスケールを調整
    window.addEventListener('resize', renderDesignPreview);
});

function loadProgramListInDesign() {
    const select = document.getElementById('design-prog-select');
    const btn = document.getElementById('design-load-prog-btn');
    if(!select || !btn) return;

    select.innerHTML = `<option value="">Reading...</option>`;
    
    window.db.ref(`saved_programs/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = `<option value="">-- 構成を選択 --</option>`;
        if(data) {
            const items = [];
            Object.keys(data).forEach(key => {
                items.push({ key: key, ...data[key] });
            });
            items.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

            items.forEach(item => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(item); 
                const dateStr = new Date(item.createdAt).toLocaleDateString();
                opt.textContent = `${item.title} (${dateStr})`;
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = `<option value="">(保存データなし)</option>`;
        }
    });

    btn.onclick = () => {
        const val = select.value;
        if(!val) return;
        
        if(!confirm("この構成のデザイン設定を適用しますか？")) return;

        const prog = JSON.parse(val);
        const playlist = prog.playlist || [];
        
        let targetDesign = null;
        let targetLayout = 'standard';
        let targetAlign = 'center';

        if (playlist.length > 0 && playlist[0].questions && playlist[0].questions.length > 0) {
            const firstQ = playlist[0].questions[0];
            targetDesign = firstQ.design;
            targetLayout = firstQ.layout || 'standard';
            targetAlign = firstQ.align || 'center';
        }

        if (targetDesign) {
            applyDesignToUI(targetDesign, targetLayout, targetAlign);
            alert("デザインを適用しました。");
        } else {
            alert("デザイン情報が見つかりませんでした。");
        }
    };
}

function applyDesignToUI(d, layout, align) {
    const layoutEl = document.getElementById('creator-set-layout');
    if(layoutEl) layoutEl.value = layout;
    
    if(typeof updateAlignUI === 'function') updateAlignUI(align);

    if(document.getElementById('design-main-bg-color')) document.getElementById('design-main-bg-color').value = d.mainBgColor || "#222222";
    if(document.getElementById('design-q-text')) document.getElementById('design-q-text').value = d.qTextColor || "#ffffff";
    if(document.getElementById('design-q-bg')) document.getElementById('design-q-bg').value = d.qBgColor || "#2c5066";
    if(document.getElementById('design-q-border')) document.getElementById('design-q-border').value = d.qBorderColor || "#ffffff";
    if(document.getElementById('design-c-text')) document.getElementById('design-c-text').value = d.cTextColor || "#ffffff";
    if(document.getElementById('design-c-bg')) document.getElementById('design-c-bg').value = d.cBgColor || "#365c75";
    if(document.getElementById('design-c-border')) document.getElementById('design-c-border').value = d.cBorderColor || "#ffffff";

    const bgData = document.getElementById('design-bg-image-data');
    const bgStatus = document.getElementById('design-bg-image-status');
    
    if(bgData) {
        bgData.value = d.bgImage || "";
        if(bgStatus) {
            if(d.bgImage) {
                bgStatus.textContent = "画像あり (適用済)";
                bgStatus.style.color = "#00aa00";
            } else {
                bgStatus.textContent = "画像なし";
                bgStatus.style.color = "#666";
            }
        }
    }
    
    renderDesignPreview(); // 適用後にプレビュー更新
}
