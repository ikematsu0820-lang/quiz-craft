/* =========================================================
 * host_core.js 〔全置換・安定版 v3〕
 * 目的：
 * - firebase.js の views / showView を破壊しない
 * - 「ダッシュボードへ戻る」「メインへ戻る」が
 *   “後から生成されたボタン”でも必ず効く（イベント委譲）
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
   * ===================== */
  if (typeof window.showView !== "function") {
    window.showView = function (targetId) {
      document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
      const target = document.getElementById(targetId);
      if (target) target.classList.remove("hidden");
      else {
        console.warn("[showView] target not found:", targetId);
        document.getElementById("main-view")?.classList.remove("hidden");
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
      keys.forEach(k => (v = v ? v[k] : null));
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
    if (!window.currentShowId) {
      window.showView("main-view");
      return;
    }
    window.showView("host-dashboard-view");
    document.getElementById("dashboard-show-id")?.textContent = window.currentShowId || "---";
    loadSavedSets();
  }
  window.enterDashboard = enterDashboard;

  function backToDashboardSafely() {
    if (window.currentShowId) enterDashboard();
    else window.showView("main-view");
  }

  /* =====================
   * 保存済みセット読込（ダッシュボード）
   * ===================== */
  function loadSavedSets() {
    const list = document.getElementById("dash-set-list");
    if (!list) return;

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

  /* =====================================================
   * ✅ 最重要：イベント委譲（後から生成されたボタンでも効く）
   * ===================================================== */
  function isDashboardButton(el) {
    if (!el) return false;

    // 1) 推奨：class / data属性
    if (el.closest(".back-to-dashboard")) return true;
    if (el.closest('[data-action="dashboard"]')) return true;
    if (el.closest('[data-nav="dashboard"]')) return true;

    // 2) よくあるID候補（多少増えても問題なし）
    const id = el.id || "";
    const idHit = [
      "config-header-back-btn", "config-back-btn", "config-dashboard-btn",
      "creator-back-btn", "creator-dashboard-btn",
      "studio-back-btn", "studio-dashboard-btn",
      "viewer-back-btn", "viewer-dashboard-btn",
      "btn-dashboard", "dash-back-btn"
    ].includes(id);
    if (idHit) return true;

    // 3) 最終手段：ヘッダー内でボタン文言が「ダッシュボード / Dashboard」
    const btn = el.closest("button, a");
    if (!btn) return false;
    const txt = (btn.textContent || "").trim();
    if (!txt) return false;
    const inHeader = !!btn.closest(".view-header");
    if (!inHeader) return false;
    return (txt === "ダッシュボード" || txt === "Dashboard");
  }

  function isMainBackButton(el) {
    if (!el) return false;
    if (el.closest(".back-to-main")) return true;
    if (el.closest('[data-action="main"]')) return true;

    const btn = el.closest("button, a");
    if (!btn) return false;
    const txt = (btn.textContent || "").trim();
    const inHeader = !!btn.closest(".view-header");
    if (!inHeader) return false;
    return (txt === "ホーム" || txt === "戻る" || txt === "Home");
  }

  function isLogoutButton(el) {
    if (!el) return false;
    if (el.closest(".btn-logout")) return true;

    const btn = el.closest("button, a");
    if (!btn) return false;
    const txt = (btn.textContent || "").trim();
    const inHeader = !!btn.closest(".view-header");
    if (!inHeader) return false;
    return (txt === "ログアウト" || txt === "Logout");
  }

  document.addEventListener("click", (e) => {
    const t = e.target;

    // ダッシュボードへ
    if (isDashboardButton(t)) {
      e.preventDefault();
      backToDashboardSafely();
      return;
    }

    // メインへ戻る
    if (isMainBackButton(t)) {
      e.preventDefault();
      window.showView("main-view");
      return;
    }

    // ログアウト
    if (isLogoutButton(t)) {
      e.preventDefault();
      window.showView("main-view");
      return;
    }
  }, true); // captureで拾う（他のonclickより先に動かせる）

  /* =====================
   * 初期化
   * ===================== */
  document.addEventListener("DOMContentLoaded", () => {
    window.applyTextConfig();

    document.getElementById("main-host-btn")
      ?.addEventListener("click", () => window.showView("host-login-view"));

    document.getElementById("main-player-btn")
      ?.addEventListener("click", () => window.showView("respondent-view"));

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

    // ダッシュボード内の機能ボタン（存在すれば）
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

})();
