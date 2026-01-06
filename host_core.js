/* =========================================================
 * host_core.js (v60: Nav Fix - Header buttons + Viewer back to Dashboard)
 * =======================================================*/

// グローバル変数
let currentShowId = null;
let currentRoomId = null;
let createdQuestions = [];
let editingSetId = null;
let periodPlaylist = [];
let currentPeriodIndex = -1;
let studioQuestions = [];
let currentConfig = {};
let currentQIndex = 0;

// 画面管理
window.views = {};

window.showView = function (targetView) {
  Object.values(window.views).forEach((v) => {
    if (v) v.classList.add("hidden");
  });
  if (targetView) targetView.classList.remove("hidden");
};

window.applyTextConfig = function () {
  if (typeof APP_TEXT === "undefined") return;

  document.querySelectorAll("[data-text]").forEach((el) => {
    const keys = el.getAttribute("data-text").split(".");
    let val = APP_TEXT;
    keys.forEach((k) => {
      if (val) val = val[k];
    });
    if (val) el.textContent = val;
  });

  const phMap = {
    "show-id-input": APP_TEXT.Login.Placeholder,
    "quiz-set-title": APP_TEXT.Creator.PlaceholderSetName,
    "question-text": APP_TEXT.Creator.PlaceholderQ,
    "config-program-title": APP_TEXT.Config.PlaceholderProgName,
    "room-code-input": APP_TEXT.Player.PlaceholderCode,
    "player-name-input": APP_TEXT.Player.PlaceholderName,
    "viewer-room-code": APP_TEXT.Player.PlaceholderCode,
  };

  for (let id in phMap) {
    const el = document.getElementById(id);
    if (el) el.placeholder = phMap[id];
  }
};

function enterDashboard() {
  if (!currentShowId) {
    window.showView(window.views.hostLogin);
    return;
  }
  const disp = document.getElementById("dashboard-show-id");
  if (disp) disp.textContent = currentShowId;

  // セット一覧の描画など（host_creator / host_config 側に任せる）
  if (typeof window.loadSavedSetsForDashboard === "function") {
    window.loadSavedSetsForDashboard();
  }

  window.showView(window.views.dashboard);
}

function bindNavButtons() {
  // 右上のヘッダーボタン（ホーム/ログアウト/ダッシュボード等）を全部まとめて処理
  document.querySelectorAll(".header-back-btn").forEach((btn) => {
    // 2重登録防止
    if (btn.dataset.navBound === "1") return;
    btn.dataset.navBound = "1";

    btn.addEventListener("click", () => {
      // 1) Dashboardの「ログアウト」= メインへ
      if (btn.closest("#host-dashboard-view")) {
        currentShowId = null;
        currentRoomId = null;
        window.showView(window.views.main);
        return;
      }

      // 2) Hostログイン画面の「ホーム」= メインへ
      if (btn.closest("#host-login-view")) {
        window.showView(window.views.main);
        return;
      }

      // 3) Player入口の「ホーム」= メインへ
      if (btn.closest("#respondent-view")) {
        window.showView(window.views.main);
        return;
      }

      // 4) Viewer(モニター)接続画面：
      //    ここは「ダッシュボードに統一」したいので、showIdがあればダッシュボードへ
      //    showIdが無ければメインへ
      if (btn.closest("#viewer-login-view")) {
        if (currentShowId) enterDashboard();
        else window.showView(window.views.main);
        return;
      }

      // 5) それ以外（Creator/Config/Studioなど）は基本ダッシュボードへ
      enterDashboard();
    });
  });

  // back-to-main だけ付いてる古いボタンが万一あっても動くように保険
  document.querySelectorAll(".back-to-main").forEach((btn) => {
    if (btn.dataset.backMainBound === "1") return;
    btn.dataset.backMainBound = "1";
    btn.addEventListener("click", () => window.showView(window.views.main));
  });
}

function startRoom() {
  if (!currentShowId) {
    alert("Show IDが未設定です。ログインし直してください。");
    window.showView(window.views.hostLogin);
    return;
  }

  // ルームID自動生成（6桁）
  currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Studio 画面へ
  window.showView(window.views.hostControl);

  // 表示更新
  const roomEl = document.getElementById("host-room-id");
  if (roomEl) roomEl.textContent = currentRoomId;
  const showEl = document.getElementById("studio-show-id");
  if (showEl) showEl.textContent = currentShowId;

  // Firebaseの rooms が初期化される前に studio 側が読みに行くと事故るので
  // 先に最低限の初期データを作ってから、studio 側の監視を開始
  if (!window.db) {
    alert("Firebaseが初期化されていません");
    return;
  }

  const roomRef = window.db.ref(`rooms/${currentRoomId}`);

  const baseInit = {
    showId: currentShowId,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    status: { step: "lobby", qIndex: 0 },
    players: {},
    config: {},
    questions: [],
  };

  roomRef
    .set(baseInit)
    .then(() => {
      // studio の各種リスナー開始（host_studio.js 側の想定）
      if (typeof window.initStudioListeners === "function") {
        window.initStudioListeners(currentRoomId);
      }
    })
    .catch((e) => {
      console.error(e);
      alert("ルーム作成に失敗しました");
    });
}

// 起動時処理
document.addEventListener("DOMContentLoaded", () => {
  // 1. テキスト適用
  window.applyTextConfig();

  // 2. ビューの登録
  window.views = {
    main: document.getElementById("main-view"),
    hostLogin: document.getElementById("host-login-view"),
    dashboard: document.getElementById("host-dashboard-view"),
    creator: document.getElementById("creator-view"),
    config: document.getElementById("config-view"),
    hostControl: document.getElementById("host-control-view"),
    ranking: document.getElementById("ranking-view"),
    respondent: document.getElementById("respondent-view"),
    playerGame: document.getElementById("player-game-view"),
    viewerLogin: document.getElementById("viewer-login-view"),
    viewerMain: document.getElementById("viewer-main-view"),
  };

  // 3. 初期表示（main以外を隠す）
  Object.values(window.views).forEach((v) => {
    if (v && v.id !== "main-view") v.classList.add("hidden");
  });

  // 4. ナビボタン登録（ここが今回の修正ポイント）
  bindNavButtons();

  // 5. メインメニュー
  const hostBtn = document.getElementById("main-host-btn");
  if (hostBtn) hostBtn.addEventListener("click", () => window.showView(window.views.hostLogin));

  const playerBtn = document.getElementById("main-player-btn");
  if (playerBtn) playerBtn.addEventListener("click", () => window.showView(window.views.respondent));

  // 6. Hostログイン
  const loginBtn = document.getElementById("host-login-submit-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const input = document.getElementById("show-id-input").value.trim().toUpperCase();
      if (!input) {
        alert(APP_TEXT.Login.AlertEmpty);
        return;
      }
      if (!/^[A-Z0-9_-]+$/.test(input)) {
        alert(APP_TEXT.Login.AlertError);
        return;
      }
      currentShowId = input;
      enterDashboard();
    });
  }

  // 7. Dashboard 各ボタン
  const createBtn = document.getElementById("dash-create-btn");
  if (createBtn) createBtn.addEventListener("click", () => typeof window.initCreatorMode === "function" && window.initCreatorMode());

  const configBtn = document.getElementById("dash-config-btn");
  if (configBtn) {
    configBtn.addEventListener("click", () => {
      periodPlaylist = [];
      if (typeof window.enterConfigMode === "function") window.enterConfigMode();
      else if (typeof enterConfigMode === "function") enterConfigMode();
    });
  }

  const studioBtn = document.getElementById("dash-studio-btn");
  if (studioBtn) studioBtn.addEventListener("click", startRoom);

  const dashViewerBtn = document.getElementById("dash-viewer-btn");
  if (dashViewerBtn) dashViewerBtn.addEventListener("click", () => window.showView(window.views.viewerLogin));
});
