/* =========================================================
 * host_config.js (復元・拡張版)
 * 役割：番組構成（プレイリスト）の作成・保存・読込
 * 方針：text_config.js(=APP_TEXT.Config) に存在する項目を正としてUI/保存を復元
 * =======================================================*/

let selectedSetQuestions = [];

// セット選択 change
window.onSetSelectChange = function () {
  window.updateBuilderUI();
};

// 設定モード開始（host_core.jsから呼ばれる）
window.enterConfigMode = function () {
  window.showView("config-view");

  const setSelect = document.getElementById("config-set-select");
  const container = document.getElementById("config-builder-ui");

  if (setSelect) {
    setSelect.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
    setSelect.removeEventListener("change", window.onSetSelectChange);
    setSelect.addEventListener("change", window.onSetSelectChange);
  }

  if (container) {
    container.innerHTML =
      '<p style="text-align:center; color:#666; padding:20px;">セットを選択してください</p>';
  }

  const titleInput = document.getElementById("config-program-title");
  if (titleInput) titleInput.value = "";

  const rankChk = document.getElementById("config-final-ranking-chk");
  if (rankChk) rankChk.checked = true;

  loadSetListInConfig();
  loadSavedProgramsInConfig();
  window.renderConfigPreview();
};

// -------------------------
// helpers
// -------------------------
function getEl(id) {
  return document.getElementById(id);
}
function getElVal(id, def) {
  const el = getEl(id);
  return el ? el.value : def;
}
function getElChecked(id, def) {
  const el = getEl(id);
  return el ? !!el.checked : !!def;
}
function toInt(v, def = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// -------------------------
// set list
// -------------------------
function loadSetListInConfig() {
  const select = getEl("config-set-select");
  if (!select) return;

  select.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;

  window.db.ref(`saved_sets/${currentShowId}`).once("value", function (snap) {
    const data = snap.val();
    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;

    if (data) {
      Object.keys(data).forEach(function (key) {
        const item = data[key];
        const opt = document.createElement("option");

        // 形式ラベル
        let typeLabel = "Mix";
        if (item.questions && item.questions.length > 0) {
          const t = item.questions[0].type;
          if (t === "choice") typeLabel = "選択式";
          else if (t === "sort") typeLabel = "並べ替え";
          else if (t === "free_oral") typeLabel = "口頭";
          else if (t === "free_written") typeLabel = "記述";
          else if (t === "multi") typeLabel = "多答";
        }

        const firstQ = item.questions && item.questions.length > 0 ? item.questions[0] : {};
        const spMode = firstQ.specialMode || "none";

        // configはセット側のdefaultが入ってるが、番組構成側で上書きする想定
        const valObj = { q: item.questions, c: item.config || {}, t: item.title, sp: spMode };
        opt.value = JSON.stringify(valObj);
        opt.textContent = `${item.title} [${typeLabel}]` + (spMode !== "none" ? ` (${spMode})` : "");
        select.appendChild(opt);
      });
    } else {
      select.innerHTML = `<option value="">${APP_TEXT.Config.SelectEmpty}</option>`;
    }
  });
}

// -------------------------
// mode details UI
// -------------------------
window.updateModeDetails = function (mode) {
  document.querySelectorAll(".mode-details").forEach(function (el) {
    el.classList.add("hidden");
  });

  const target = getEl("mode-details-" + mode);
  if (target) target.classList.remove("hidden");
};

// -------------------------
// custom score table
// -------------------------
function buildCustomScoreTable(questions) {
  // bulk
  let html = `
    <div class="config-section-title">${APP_TEXT.Config.HeadingCustomScore}</div>
    <div class="config-item-box">
      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr auto; gap:8px; align-items:end;">
        <div>
          <label class="config-label">${APP_TEXT.Config.LabelBulkTime}</label>
          <input id="bulk-time" type="number" class="btn-block" placeholder="例: 5">
        </div>
        <div>
          <label class="config-label">${APP_TEXT.Config.LabelBulkPt}</label>
          <input id="bulk-pt" type="number" class="btn-block" placeholder="例: 10">
        </div>
        <div>
          <label class="config-label">${APP_TEXT.Config.LabelBulkLoss}</label>
          <input id="bulk-loss" type="number" class="btn-block" placeholder="例: 10">
        </div>
        <button class="btn-mini btn-primary" style="height:44px;" onclick="window.reflectBulkScore()">
          ${APP_TEXT.Config.BtnReflect}
        </button>
      </div>

      <div style="overflow:auto; margin-top:10px;">
        <table style="width:100%; border-collapse:collapse; font-size:0.95em;">
          <thead>
            <tr>
              <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Q</th>
              <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">${APP_TEXT.Config.LabelHeaderTime}</th>
              <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">${APP_TEXT.Config.LabelHeaderPt}</th>
              <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">${APP_TEXT.Config.LabelHeaderLoss}</th>
            </tr>
          </thead>
          <tbody>
  `;

  questions.forEach((q, i) => {
    const t = (q.timeLimit ?? q.time ?? "") + "";
    const pt = (q.pt ?? q.point ?? "") + "";
    const loss = (q.loss ?? q.minus ?? "") + "";

    html += `
      <tr>
        <td style="padding:6px; border-bottom:1px solid #f0f0f0;">${i + 1}</td>
        <td style="padding:6px; border-bottom:1px solid #f0f0f0;">
          <input type="number" id="q-time-${i}" class="btn-block" value="${t}">
        </td>
        <td style="padding:6px; border-bottom:1px solid #f0f0f0;">
          <input type="number" id="q-pt-${i}" class="btn-block" value="${pt}">
        </td>
        <td style="padding:6px; border-bottom:1px solid #f0f0f0;">
          <input type="number" id="q-loss-${i}" class="btn-block" value="${loss}">
        </td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  return html;
}

window.reflectBulkScore = function () {
  const bt = getElVal("bulk-time", "");
  const bp = getElVal("bulk-pt", "");
  const bl = getElVal("bulk-loss", "");

  for (let i = 0; i < selectedSetQuestions.length; i++) {
    if (bt !== "") {
      const el = getEl(`q-time-${i}`);
      if (el) el.value = bt;
    }
    if (bp !== "") {
      const el = getEl(`q-pt-${i}`);
      if (el) el.value = bp;
    }
    if (bl !== "") {
      const el = getEl(`q-loss-${i}`);
      if (el) el.value = bl;
    }
  }
};

// -------------------------
// UI builder
// -------------------------
window.updateBuilderUI = function () {
  const container = getEl("config-builder-ui");
  const select = getEl("config-set-select");
  if (!container || !select) return;

  if (!select.value) {
    selectedSetQuestions = [];
    container.innerHTML =
      '<p style="text-align:center; color:#666; padding:20px;">セットを選択してください</p>';
    return;
  }

  const setData = JSON.parse(select.value);
  selectedSetQuestions = setData.q || [];
  const config = setData.c || {};
  const spMode = setData.sp || "none";
  const firstQ = selectedSetQuestions.length > 0 ? selectedSetQuestions[0] : {};
  const qType = firstQ.type;

  let html = "";

  // ---- 回答モード ----
  html += `<div class="config-section-title">${APP_TEXT.Config.LabelMode}</div>`;
  html += `<div class="config-item-box">`;
  html += `<select id="config-mode-select" class="btn-block config-select highlight-select" onchange="window.updateModeDetails(this.value)">`;

  // free_oral は「通常（入力判定）」を外す、みたいな既存方針を維持
  if (qType !== "free_oral") {
    html += `<option value="normal" ${config.mode === "normal" ? "selected" : ""}>${APP_TEXT.Config.ModeNormal}</option>`;
  }
  html += `<option value="solo" ${config.mode === "solo" ? "selected" : ""}>一人挑戦 (Solo Challenge)</option>`;
  html += `<option value="buzz" ${config.mode === "buzz" ? "selected" : ""}>${APP_TEXT.Config.ModeBuzz}</option>`;
  html += `<option value="turn" ${config.mode === "turn" ? "selected" : ""}>${APP_TEXT.Config.ModeTurn}</option>`;
  if (qType !== "free_oral") {
    // スペシャルモードがタイムアタックなら固定（表示だけ）
    const locked = spMode === "time_attack" ? ` (固定)` : "";
    html += `<option value="time_attack" ${config.mode === "time_attack" || spMode === "time_attack" ? "selected" : ""} style="color:red;">★タイムショック${locked}</option>`;
  }

  html += `</select>`;

  // ---- mode details containers（text_config.js の語彙に寄せる）----
  html += `
    <div id="mode-details-normal" class="mode-details hidden" style="margin-top:10px;">
      <label class="config-label">${APP_TEXT.Config.LabelNormalLimit || "回答回数制限"}</label>
      <select id="config-normal-limit" class="btn-block config-select">
        <option value="unlimited">${APP_TEXT.Config.NormalLimitUnlimited || "何度でも修正可"}</option>
        <option value="one">${APP_TEXT.Config.NormalLimitOne || "1回のみ"}</option>
      </select>
    </div>

    <div id="mode-details-solo" class="mode-details hidden" style="margin-top:10px;">
      <label class="config-label">進行スタイル</label>
      <select id="config-solo-style" class="btn-block config-select">
        <option value="manual">手動進行</option>
        <option value="auto">自動進行</option>
      </select>
    </div>

    <div id="mode-details-buzz" class="mode-details hidden" style="margin-top:10px;">
      <label class="config-label">${APP_TEXT.Config.LabelBuzzWrongAction}</label>
      <select id="config-buzz-wrong-action" class="btn-block config-select">
        <option value="next">${APP_TEXT.Config.BuzzWrongNext}</option>
        <option value="reset">${APP_TEXT.Config.BuzzWrongReset}</option>
        <option value="end">${APP_TEXT.Config.BuzzWrongEnd}</option>
      </select>

      <label class="config-label" style="margin-top:10px;">${APP_TEXT.Config.LabelBuzzTime}</label>
      <select id="config-buzz-time" class="btn-block config-select">
        <option value="0">${APP_TEXT.Config.BuzzTimeNone}</option>
        <option value="3">${APP_TEXT.Config.BuzzTime3}</option>
        <option value="5">${APP_TEXT.Config.BuzzTime5}</option>
        <option value="10">${APP_TEXT.Config.BuzzTime10}</option>
      </select>
    </div>

    <div id="mode-details-turn" class="mode-details hidden" style="margin-top:10px;">
      <label class="config-label">${APP_TEXT.Config.LabelTurnOrder}</label>
      <select id="config-turn-order" class="btn-block config-select">
        <option value="fixed">${APP_TEXT.Config.TurnOrderFixed}</option>
        <option value="random">${APP_TEXT.Config.TurnOrderRandom}</option>
        <option value="rank">${APP_TEXT.Config.TurnOrderRank}</option>
      </select>

      <label class="config-label" style="margin-top:10px;">${APP_TEXT.Config.LabelTurnPass}</label>
      <select id="config-turn-pass" class="btn-block config-select">
        <option value="ok">${APP_TEXT.Config.TurnPassOk}</option>
        <option value="ng">${APP_TEXT.Config.TurnPassNg}</option>
      </select>
    </div>

    <div id="mode-details-time_attack" class="mode-details hidden" style="margin-top:10px;">
      <label class="config-label">1問の秒数</label>
      <input type="number" id="config-ta-seconds" value="5" class="btn-block">
      ${spMode === "time_attack" ? `<div style="color:#c00; margin-top:6px;">${APP_TEXT.Config.MsgLockedMode}</div>` : ""}
    </div>
  `;

  html += `</div>`; // end config-item-box

  // ---- 脱落・時間 ----
  html += `
    <div class="config-section-title">${APP_TEXT.Config.LabelRule}</div>
    <div class="config-item-box">
      <label class="config-label">${APP_TEXT.Config.LabelElim}</label>
      <select id="config-elimination-rule" class="btn-block config-select">
        <option value="none">${APP_TEXT.Config.RuleNone}</option>
        <option value="wrong">${APP_TEXT.Config.RuleWrong}</option>
        <option value="slow">${APP_TEXT.Config.RuleSlow}</option>
      </select>

      <div style="display:flex; gap:8px; align-items:center; margin-top:10px;">
        <label class="config-label" style="margin:0;">${APP_TEXT.Config.LabelElimCount}</label>
        <input id="config-elim-count" type="number" class="btn-block" style="max-width:120px;" value="1">
        <span>${APP_TEXT.Config.LabelElimCountSuffix}</span>
      </div>

      <label class="config-label" style="margin-top:10px;">${APP_TEXT.Config.LabelTime}</label>
      <select id="config-period-time-limit" class="btn-block config-select">
        <option value="0">無制限</option>
        <option value="10">10秒</option>
        <option value="20">20秒</option>
        <option value="30">30秒</option>
      </select>
    </div>
  `;

  // ---- 得点形式（最低限：存在させて保存する）----
  html += `
    <div class="config-section-title">得点形式</div>
    <div class="config-item-box">
      <select id="config-game-type" class="btn-block config-select">
        <option value="score">スコア（加点/減点）</option>
        <option value="territory">陣取り</option>
        <option value="race">レース</option>
      </select>
      <div style="color:#666; font-size:0.9em; margin-top:6px;">
        ※問題別の得点/失点/時間は下で設定できます
      </div>
    </div>
  `;

  // ---- 問題別配点・失点・時間（あなたの要望の核）----
  html += buildCustomScoreTable(selectedSetQuestions);

  // ---- ピリオド間設定（v59復活）----
  html += `
    <div class="config-section-title">${APP_TEXT.Config.InterHeading}</div>
    <div class="config-item-box">
      <label class="config-label">次のステージ開始条件</label>
      <select id="config-initial-status" class="btn-block config-select" onchange="window.onInitialStatusChange(this.value)">
        <option value="revive">${APP_TEXT.Config.StatusRevive}</option>
        <option value="continue">${APP_TEXT.Config.StatusContinue}</option>
        <option value="ranking">${APP_TEXT.Config.StatusRanking}</option>
      </select>

      <div id="config-topn-area" class="hidden" style="margin-top:10px;">
        <label class="config-label">${APP_TEXT.Config.LabelTop}</label>
        <div style="display:flex; gap:8px; align-items:center;">
          <input id="config-topn" type="number" class="btn-block" style="max-width:140px;" value="5">
          <span>${APP_TEXT.Config.LabelName}</span>
        </div>
      </div>

      <label style="display:flex; align-items:center; gap:8px; margin-top:10px;">
        <input id="config-inter-rank-chk" type="checkbox">
        <span>${APP_TEXT.Config.CheckInterRank}</span>
      </label>
    </div>
  `;

  // ---- リストに追加 ----
  html += `
    <button id="config-add-playlist-btn" class="btn-block btn-primary" style="margin-top:20px;" onclick="window.addPeriodToPlaylist()">
      ${APP_TEXT.Config.BtnAddList || "リストに追加"}
    </button>
  `;

  container.innerHTML = html;

  // 初期値反映（モード固定など）
  const modeSelect = getEl("config-mode-select");
  if (modeSelect) {
    if (spMode === "time_attack") {
      modeSelect.value = "time_attack";
      modeSelect.disabled = true;
    } else {
      modeSelect.disabled = false;
    }
    window.updateModeDetails(modeSelect.value);
  }

  // 初期：ピリオド間のUI
  window.onInitialStatusChange(getElVal("config-initial-status", "revive"));
};

window.onInitialStatusChange = function (v) {
  const area = getEl("config-topn-area");
  if (!area) return;
  if (v === "ranking") area.classList.remove("hidden");
  else area.classList.add("hidden");
};

// -------------------------
// リストに追加（保存内容の核）
// -------------------------
window.addPeriodToPlaylist = function () {
  const select = getEl("config-set-select");
  if (!select || !select.value) return;

  const setData = JSON.parse(select.value);
  const mode = getElVal("config-mode-select", "normal");

  // 問題をコピーして「問題別 設定」を埋め込む
  const questions = deepClone(setData.q || []);
  for (let i = 0; i < questions.length; i++) {
    const t = getElVal(`q-time-${i}`, "");
    const pt = getElVal(`q-pt-${i}`, "");
    const loss = getElVal(`q-loss-${i}`, "");

    // 既存コードと衝突しにくいキーに寄せる
    if (t !== "") questions[i].timeLimit = toInt(t, 0);
    if (pt !== "") questions[i].pt = toInt(pt, 0);
    if (loss !== "") questions[i].loss = toInt(loss, 0);
  }

  const initialStatus = getElVal("config-initial-status", "revive");
  const topN = toInt(getElVal("config-topn", "5"), 5);
  const doInterRank = getElChecked("config-inter-rank-chk", false);

  const newPeriod = {
    title: setData.t,
    questions: questions,
    config: {
      // --- mode ---
      mode: mode,

      // normal（一斉回答）に “回答回数制限” を付与（あなたの指定）
      normalLimit: getElVal("config-normal-limit", "unlimited"),

      // buzz（早押し）ルール（あなたの指定）
      buzzWrongAction: getElVal("config-buzz-wrong-action", "next"),
      buzzTimeLimit: toInt(getElVal("config-buzz-time", "0"), 0),

      // turn（順番回答）
      turnOrder: getElVal("config-turn-order", "fixed"),
      turnPass: getElVal("config-turn-pass", "ok"),

      // time shock
      timeLimit: mode === "time_attack" ? toInt(getElVal("config-ta-seconds", "5"), 5) : 0,

      // --- rule ---
      eliminationRule: getElVal("config-elimination-rule", "none"),
      elimCount: toInt(getElVal("config-elim-count", "1"), 1),
      periodTimeLimit: toInt(getElVal("config-period-time-limit", "0"), 0),

      // --- scoring type ---
      gameType: getElVal("config-game-type", "score"),

      // --- inter period ---
      initialStatus: initialStatus, // revive / continue / ranking
      topN: initialStatus === "ranking" ? topN : 0,
      interRanking: !!doInterRank
    }
  };

  periodPlaylist.push(newPeriod);
  window.renderConfigPreview();
};

// -------------------------
// preview
// -------------------------
window.renderConfigPreview = function () {
  const container = getEl("config-playlist-preview");
  if (!container) return;

  container.innerHTML = "";
  periodPlaylist.forEach(function (item, index) {
    const div = document.createElement("div");
    div.className = "timeline-card";

    const mode = (item.config && item.config.mode) ? item.config.mode : "unknown";
    const inter = item.config && item.config.interRanking ? " / 中間発表あり" : "";
    const init =
      item.config && item.config.initialStatus
        ? ` / 次:${item.config.initialStatus}${item.config.initialStatus === "ranking" ? `(上位${item.config.topN})` : ""}`
        : "";

    div.innerHTML = `
      <div><b>${index + 1}. ${item.title}</b> [${mode}]${inter}${init}</div>
      <button class="btn-mini btn-del" onclick="window.removeFromPlaylist(${index})">削除</button>
    `;
    container.appendChild(div);
  });
};

window.removeFromPlaylist = function (index) {
  periodPlaylist.splice(index, 1);
  window.renderConfigPreview();
};

// -------------------------
// saved programs load/save
// -------------------------
function loadSavedProgramsInConfig() {
  const listEl = getEl("config-saved-programs-list");
  if (!listEl) return;

  window.db.ref(`saved_programs/${currentShowId}`).once("value", function (snap) {
    const data = snap.val();
    listEl.innerHTML = "";
    if (data) {
      Object.keys(data).forEach(function (key) {
        const item = data[key];
        const div = document.createElement("div");
        div.className = "set-item";
        div.innerHTML = `<span>${item.title}</span><button class="btn-mini btn-primary" onclick="window.loadProgram('${key}')">読込</button>`;
        listEl.appendChild(div);
      });
    }
  });
}

window.loadProgram = function (key) {
  window.db.ref(`saved_programs/${currentShowId}/${key}`).once("value", function (snap) {
    const item = snap.val();
    if (item) {
      periodPlaylist = item.playlist || [];
      window.renderConfigPreview();
    }
  });
};

window.saveProgramToCloud = function () {
  const title = getElVal("config-program-title", "");
  if (!title || periodPlaylist.length === 0) return alert("名前とリストを確認してください");

  const saveObj = {
    title: title,
    playlist: periodPlaylist,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };

  window.db
    .ref(`saved_programs/${currentShowId}`)
    .push(saveObj)
    .then(function () {
      alert("保存しました");
      loadSavedProgramsInConfig();
    });
};
