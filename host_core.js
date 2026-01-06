/* =========================================================
 * host_core.js 〔全置換・安定版〕
 * 目的：
 * - 画面遷移の中核
 * - firebase.js の views / showView を破壊しない
 * - 真っ白事故を防ぐ
 * =======================================================*/

(() => {

  /* =====================
   * グローバル状態
   * ===================== */
  window.currentShowId = null;
  window.currentRoomId = null;

  window.createdQuestions = [];
  window.editingSetId = null;

  window.periodPlaylist = [];
  window.currentPeriodIndex = -1;

  window.studioQuestions = [];
  window.currentConfig = {};
  window.currentQIndex = 0;

  /* =====================
   * showView セーフラッパー
   * ===================== */
  if (typeof window.showView !== "function") {
    window.showView = function (targetId) {
      document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));

      const target = document.getElementById(targetId);
      if (target) {
        target.classList.remove("hidden");
      } else {
        console.warn("[showView] target not found:", targetId);
        const fallback = document.getElementById("main-view");
        if (fallback) fallback.classList.remove("hidden");
      }

      document.body.classList.remove("dark-theme");
    };
  }

  /* =====================
   * テキスト設定反映
   * ===================== */
  window.applyTextConfig = function () {
    if (typeof APP_TEXT === "undefined") return;

    document.querySelectorAll("[data-text]").forEach(el => {
      const keys = el.dataset.text.split(".");
      let v = APP_TEXT;
      keys.forEach(k => v = v ? v[k] : null);
      if (v) el.textContent = v;
    });

    const placeholders = {
      "show-id-input": APP_TEXT.Login?.Placeholder,
      "room-code-input": APP_TEXT.Player?.PlaceholderCode,
      "player-name-input": APP_TEXT.Player?.PlaceholderName,
      "viewer-room-code": APP_TEXT.Player?.PlaceholderCode
    };

    Object.entries(placeholders).forEach(([id, text]) => {
      const el = document.getElementById(id);
      if (el && text) el.placeholder = text;
    });
  };

  /* =====================
   * 初期化
   * ===================== */
  document.addEventListener("DOMContentLoaded", () => {
    window.applyTextConfig();

    /* --- メイン --- */
    document.getElementById("main-host-btn")
      ?.addEventListener("click", () => showView("host-login-view"));

    document.getElementById("main-player-btn")
      ?.addEventListener("click", () => showView("respondent-view"));

    /* --- ホストログイン --- */
    document.getElementById("host-login-submit-btn")
      ?.addEventListener("click", () => {
        const v = document.getElementById("show-id-input").value.trim();
        if (!v) {
          alert(APP_TEXT?.Login?.AlertEmpty || "番組IDを入力してください");
          return;
        }
        window.currentShowId = v.toUpperCase();
        enterDashboard();
      });

    /* --- 戻る系 --- */
    document.querySelectorAll(".back-to-main").forEach(btn => {
      btn.addEventListener("click", () => showView("main-view"));
    });

    document.querySelector("#host-dashboard-view .btn-logout")
      ?.addEventListener("click", () => showView("main-view"));

    /* --- ダッシュボード --- */
    document.getElementById("dash-create-btn")
      ?.addEventListener("click", () => {
        if (typeof window.initCreatorMode === "function") {
          window.initCreatorMode();
        } else {
          console.warn("initCreatorMode not loaded");
        }
      });

    document.getElementById("dash-config-btn")
      ?.addEventListener("click", () => {
        if (typeof window.enterConfigMode === "function") {
          window.enterConfigMode();
        } else {
          console.warn("enterConfigMode not loaded");
        }
      });

    document.getElementById("dash-studio-btn")
      ?.addEventListener("click", () => {
        if (typeof window.startRoom === "function") {
          window.startRoom();
        } else {
          console.warn("startRoom not loaded");
        }
      });

    document.getElementById("dash-viewer-btn")
      ?.addEventListener("click", () => showView("viewer-login-view"));
  });

  /* =====================
   * ダッシュボード表示
   * ===================== */
  function enterDashboard() {
    showView("host-dashboard-view");

    const el = document.getElementById("dashboard-show-id");
    if (el) el.textContent = window.currentShowId || "---";

    loadSavedSets();
  }

  /* =====================
   * 保存済みセット読込
   * ===================== */
  function loadSavedSets() {
    const list = document.getElementById("dash-set-list");
    if (!list || !window.db) return;

    list.innerHTML = `<p style="text-align:center;">Loading...</p>`;

    window.db.ref(`saved_sets/${window.currentShowId}`)
      .once("value", snap => {
        list.innerHTML = "";
        const data = snap.val();
        if (!data) {
          list.innerHTML = `<p style="text-align:center;color:#999;">セットはありません</p>`;
          return;
        }

        Object.entries(data).forEach(([key, item]) => {
          const row = document.createElement("div");
          row.className = "set-item";
          row.innerHTML = `
            <div><b>${item.title}</b></div>
            <button class="btn-mini btn-edit">Edit</button>
          `;
          row.querySelector("button").onclick = () => {
            if (typeof window.loadSetForEditing === "function") {
              window.loadSetForEditing(key, item);
            }
          };
          list.appendChild(row);
        });
      });
  }

})();
