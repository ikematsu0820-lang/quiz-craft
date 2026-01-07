/* =========================================================
 * host_design.js (v1: Extracted Design Settings)
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
        }
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
    
    // ★追加: プログラムリストの読み込み
    loadProgramListInDesign();

    if(window.views && window.views.design) window.showView(window.views.design);
};

document.addEventListener('DOMContentLoaded', () => {
    const btnSave = document.getElementById('design-save-btn');
    if(btnSave) btnSave.addEventListener('click', saveDesignSettings);

    const btnReset = document.getElementById('design-reset-btn');
    if(btnReset) btnReset.addEventListener('click', () => {
        setDefaultDesignUI();
        if(typeof window.showToast === 'function') window.showToast("初期値に戻しました");
    });
});
function loadProgramListInDesign() {
    const select = document.getElementById('design-prog-select');
    const btn = document.getElementById('design-load-prog-btn');
    if(!select || !btn) return;

    select.innerHTML = `<option value="">Reading...</option>`;
    
    // 保存済みプログラムを取得
    window.db.ref(`saved_programs/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = `<option value="">-- 構成を選択 --</option>`;
        
        if(data) {
            const items = [];
            Object.keys(data).forEach(key => {
                items.push({ key: key, ...data[key] });
            });
            // 新しい順
            items.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

            items.forEach(item => {
                const opt = document.createElement('option');
                // valueにデータを丸ごと入れる（簡易実装）
                opt.value = JSON.stringify(item); 
                const dateStr = new Date(item.createdAt).toLocaleDateString();
                opt.textContent = `${item.title} (${dateStr})`;
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = `<option value="">(保存データなし)</option>`;
        }
    });

    // Loadボタンの動作
    btn.onclick = () => {
        const val = select.value;
        if(!val) return;
        
        if(!confirm("この構成のデザイン設定を適用しますか？\n（現在の入力内容は上書きされます）")) return;

        const prog = JSON.parse(val);
        const playlist = prog.playlist || [];
        
        // デザイン抽出ロジック:
        // プログラム内の「最初のピリオド」の「最初の問題」のデザインを採用する
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
            alert("デザインを適用しました。\n「保存」ボタンを押すと確定されます。");
        } else {
            alert("この構成にはデザイン情報が含まれていないか、標準設定のままです。");
        }
    };
}

function applyDesignToUI(d, layout, align) {
    // 1. レイアウトと配置
    const layoutEl = document.getElementById('creator-set-layout');
    if(layoutEl) layoutEl.value = layout;
    
    if(typeof updateAlignUI === 'function') updateAlignUI(align);

    // 2. カラー設定
    if(document.getElementById('design-main-bg-color')) document.getElementById('design-main-bg-color').value = d.mainBgColor || "#222222";
    if(document.getElementById('design-q-text')) document.getElementById('design-q-text').value = d.qTextColor || "#ffffff";
    if(document.getElementById('design-q-bg')) document.getElementById('design-q-bg').value = d.qBgColor || "#2c5066";
    if(document.getElementById('design-q-border')) document.getElementById('design-q-border').value = d.qBorderColor || "#ffffff";
    if(document.getElementById('design-c-text')) document.getElementById('design-c-text').value = d.cTextColor || "#ffffff";
    if(document.getElementById('design-c-bg')) document.getElementById('design-c-bg').value = d.cBgColor || "#365c75";
    if(document.getElementById('design-c-border')) document.getElementById('design-c-border').value = d.cBorderColor || "#ffffff";

    // 3. 画像設定
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
}
