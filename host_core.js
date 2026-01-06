/* =========================================================
 * host_core.js 〔全置換・安定版 v2〕
 * 目的：
 * - 画面遷移の中核
 * - firebase.js の views / showView を破壊しない
 * - 「ダッシュボードに戻る」が必ず効く（今回の修正点）
 * - 読み込み順が前後しても落ちにくい
 * =======================================================*/

(() => {

  /* =====================
   * グローバル状態
   * ===================== */
  window.currentShowId = window.currentShowId ?? null;
  window.currentRoomId = window.currentRoomId ?? null;

  window.createdQuestions = window.createdQuestions ?? [];
  window.editingSetId = window.editingSetId ?? null;

  window.periodPlaylist = window.periodPlaylist ?? [];
  window.currentPeriodIndex = window.currentPeriodIndex ?? -1;

  window.studioQuestions = window.studioQuestions ?? [];
  window.currentConfig = window.currentConfig ?? {};
  window.currentQIndex = window.currentQIndex ?? 0;

  /* =====================
   * showView セーフラッパー
   * （firebase.js に既にあるならそれを使う）
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
      "viewer-room-code": APP_TEXT.Player?.PlaceholderCode,
      "config-program-title": APP_TEXT.Config?.PlaceholderProgName,
      "quiz-set-title": APP_TEXT.Creator?.PlaceholderSetName,
      "question-text": APP_TEXT.Creator?.PlaceholderQ,
    };

    Object.entries(placeholders).forEach(([id, text]) => {
      const el = document.getElementById(id);
      if (el && text) el.placeholder = text;
    });
  };

  /* =====================
   * ダッシュボード遷移
   * ===================== */
  function enterDashboard() {
    // ShowIDが無い状態なら、ダッシュボードに行けないのでメインへ
    if (!window.currentShowId) {
      window.showView("main-view");
      return;
    }

    window.showView("host-dashboard-view");

    const el = document.getElementById("dashboard-show-id");
    if (el) el.textContent = window.currentShowId || "---";

    loadSavedSets();
  }

  // 他ファイルから呼べるように（戻るボタン対策）
  window.enterDashboard = enterDashboard;

  function backToDashboardSafely() {
    if (window.currentShowId) enterDashboard();
    else window.showView("main-view");
  }

  /* =====================
   * 初期化
   * ===================== */
  document.addEventListener("DOMContentLoaded", () => {
    window.applyTextConfig();

    /* --- メイン --- */
    document.getElementById("main-host-btn")
      ?.addEventListener("click", () => window.showView("host-login-view"));

    document.getElementById("main-player-btn")
      ?.addEventListener("click", () => window.showView("respondent-view"));

    /* --- ホストログイン --- */
    document.getElementById("host-login-submit-btn")
      ?.addEventListener("click", () => {
        const v = document.getElementById("show-id-input")?.value?.trim();
        if (!v) {
          alert(APP_TEXT?.Login?.AlertEmpty || "番組IDを入力してください");
          return;
        }
        window.currentShowId = v.toUpperCase();
        enterDashboard();
      });

    /* --- メインへ戻る --- */
    document.querySelectorAll(".back-to-main").forEach(btn => {
      btn.addEventListener("click", () => window.showView("main-view"));
    });

    /* --- ログアウト（ダッシュボード右上など） --- */
    document.querySelector("#host-dashboard-view .btn-logout")
      ?.addEventListener("click", () => window.showView("main-view"));

    /* =====================================================
     * ✅ 今回の肝：ダッシュボードへ戻る（旧ID/新IDどちらも拾う）
     * ===================================================== */
    [
      // Config
      "config-header-back-btn",
      "config-back-btn",
      "config-dashboard-btn",

      // Creator
      "creator-back-btn",
      "creator-dashboard-btn",

      // Studio
      "studio-header-back-btn",
      "studio-back-btn",
      "studio-dashboard-btn",

      // Viewer
      "viewer-header-back-btn",
      "viewer-back-btn",
      "viewer-dashboard-btn",

      // 汎用
      "dash-back-btn",
      "btn-dashboard"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", backToDashboardSafely);
    });

    // 今後の推奨：classで拾う（ID揺れでもOK）
    document.querySelectorAll(".back-to-dashboard").forEach(el => {
      el.addEventListener("click", backToDashboardSafely);
    });

    /* --- ダッシュボード機能ボタン --- */
    document.getElementById("dash-create-btn")
      ?.addEventListener("click", () => {
        if (typeof window.initCreatorMode === "function") window.initCreatorMode();
        else console.warn("initCreatorMode not loaded");
      });

    document.getElementById("dash-config-btn")
      ?.addEventListener("click", () => {
        if (typeof window.enterConfigMode === "function") window.enterConfigMode();
        else console.warn("enterConfigMode not loaded");
      });

    document.getElementById("dash-studio-btn")
      ?.addEventListener("click", () => {
        if (typeof window.startRoom === "function") window.startRoom();
        else console.warn("startRoom not loaded");
      });

    document.getElementById("dash-viewer-btn")
      ?.addEventListener("click", () => window.showView("viewer-login-view"));
  });

  /* =====================
   * 保存済みセット読込（ダッシュボード）
   * ===================== */
  function loadSavedSets() {
    const list = document.getElementById("dash-set-list");
    if (!list) return;

    // Firebase未初期化なら何もしない（落とさない）
    if (!window.db || !window.currentShowId) {
      list.innerHTML = `<p style="text-align:center;color:#999;">(DB未接続)</p>`;
      return;
    }

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
            <div><b>${item.title ?? "(no title)"}</b></div>
            <button class="btn-mini btn-edit">Edit</button>
          `;
          row.querySelector("button").onclick = () => {
            if (typeof window.loadSetForEditing === "function") {
              window.loadSetForEditing(key, item);
            } else {
              console.warn("loadSetForEditing not loaded");
            }
          };
          list.appendChild(row);
        });
      });
  }

})();
