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
