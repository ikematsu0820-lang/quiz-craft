/* =========================================================
 * host_design.js (v58: Design Set Loader)
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

// 画面遷移関数（セットローダー初期化を含む）
window.enterDesignMode = function() {
    // UI初期化 → 保存済みがあれば上書き
    setDefaultDesignUI();
    if(typeof window.loadDesignSettings === 'function') window.loadDesignSettings();
    
    // セット読み込みプルダウンの初期化
    initDesignSetLoader();

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

// ★新規追加: セットからデザインを読み込む機能
function initDesignSetLoader() {
    const select = document.getElementById('design-set-loader-select');
    const btn = document.getElementById('design-set-load-btn');
    if(!select || !btn) return;

    select.innerHTML = '<option>Loading...</option>';

    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = '<option value="">-- Select Set --</option>';
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                let hasDesign = false;
                if(item.questions && item.questions.length > 0 && item.questions[0].design) {
                    hasDesign = true;
                }
                const opt = document.createElement('option');
                opt.value = JSON.stringify(item); 
                opt.textContent = item.title + (hasDesign ? " (Designあり)" : "");
                select.appendChild(opt);
            });
        }
    });

    btn.onclick = () => {
        const val = select.value;
        if(!val) return;
        
        if(!confirm("選択したセットからデザイン設定を読み込みますか？\n（現在の設定は上書きされます）")) return;

        const setItem = JSON.parse(val);
        if(setItem.questions && setItem.questions.length > 0) {
            const d = setItem.questions[0].design; 
            const l = setItem.questions[0].layout;
            const a = setItem.questions[0].align;

            if(d) {
                if(document.getElementById('design-main-bg-color')) document.getElementById('design-main-bg-color').value = d.mainBgColor || "#222222";
                if(document.getElementById('design-bg-image-data')) document.getElementById('design-bg-image-data').value = d.bgImage || "";
                
                if(document.getElementById('design-q-text')) document.getElementById('design-q-text').value = d.qTextColor || "#ffffff";
                if(document.getElementById('design-q-bg')) document.getElementById('design-q-bg').value = d.qBgColor || "#2c5066";
                if(document.getElementById('design-q-border')) document.getElementById('design-q-border').value = d.qBorderColor || "#ffffff";
                
                if(document.getElementById('design-c-text')) document.getElementById('design-c-text').value = d.cTextColor || "#ffffff";
                if(document.getElementById('design-c-bg')) document.getElementById('design-c-bg').value = d.cBgColor || "#365c75";
                if(document.getElementById('design-c-border')) document.getElementById('design-c-border').value = d.cBorderColor || "#ffffff";

                const bgStatus = document.getElementById('design-bg-image-status');
                if(bgStatus) bgStatus.textContent = d.bgImage ? "Image Loaded" : "No Image";
            }
            
            if(l && document.getElementById('creator-set-layout')) document.getElementById('creator-set-layout').value = l;
            if(a && typeof updateAlignUI === 'function') updateAlignUI(a);

            alert("デザインを読み込みました。\n確定するには下の「保存」ボタンを押してください。");
        } else {
            alert("このセットにはデザイン情報が含まれていません。");
        }
    };
}
