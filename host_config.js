/* =========================================================
 * host_config.js (復旧・安定版 / ShowID統一)
 * 役割：番組構成（Period Playlist）の作成・保存・読込
 * 重要：ShowIDは必ず window.currentShowId を参照する
 * =======================================================*/

let selectedSetQuestions = [];

function $id(id){ return document.getElementById(id); }
function val(id, d=""){ const el=$id(id); return el ? el.value : d; }
function chk(id, d=false){ const el=$id(id); return el ? !!el.checked : d; }
function toInt(v, d=0){ const n=parseInt(v,10); return Number.isFinite(n)?n:d; }
function clone(o){ return JSON.parse(JSON.stringify(o)); }

window.onSetSelectChange = function () {
  window.updateBuilderUI();
};

window.enterConfigMode = function () {
  window.showView("config-view");

  const setSelect = $id("config-set-select");
  const container = $id("config-builder-ui");

  if (setSelect) {
    setSelect.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;
    setSelect.removeEventListener("change", window.onSetSelectChange);
    setSelect.addEventListener("change", window.onSetSelectChange);
  }

  if (container) {
    container.innerHTML = `<p style="text-align:center; color:#666; padding:20px;">セットを選択してください</p>`;
  }

  const titleInput = $id("config-program-title");
  if (titleInput) titleInput.value = "";

  const rankChk = $id("config-final-ranking-chk");
  if (rankChk) rankChk.checked = true;

  loadSetListInConfig();
  loadSavedProgramsInConfig();
  window.renderConfigPreview();
};

function loadSetListInConfig() {
  const select = $id("config-set-select");
  if (!select) return;

  // ★ここが肝：ShowIDは window.currentShowId
  const showId = window.currentShowId;
  if (!showId || !window.db) {
    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectEmpty}</option>`;
    return;
  }

  select.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;

  window.db.ref(`saved_sets/${showId}`).once("value", (snap) => {
    const data = snap.val();

    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault}</option>`;

    if (!data) {
      select.innerHTML = `<option value="">${APP_TEXT.Config.SelectEmpty}</option>`;
      return;
    }

    Object.keys(data).forEach((key) => {
      const item = data[key];

      let typeLabel = "Mix";
      if (item.questions && item.questions.length > 0) {
        const t = item.questions[0].type;
        if (t === "choice") typeLabel = "選択式";
        else if (t === "sort") typeLabel = "並べ替え";
        else if (t === "free_oral") typeLabel = "口頭";
        else if (t === "free_written") typeLabel = "記述";
        else if (t === "multi") typeLabel = "多答";
      }

      const firstQ = (item.questions && item.questions[0]) ? item.questions[0] : {};
      const spMode = firstQ.specialMode || "none";

      const valObj = { q: item.questions, c: item.config || {}, t: item.title, sp: spMode, key };
      const opt = document.createElement("option");
      opt.value = JSON.stringify(valObj);
      opt.textContent = `${item.title} [${typeLabel}]` + (spMode !== "none" ? ` (${spMode})` : "");
      select.appendChild(opt);
    });
  });
}

window.updateModeDetails = function (mode) {
  document.querySelectorAll(".mode-details").forEach(el => el.classList.add("hidden"));
  const t = $id("mode-details-" + mode);
  if (t) t.classList.remove("hidden");
};

function buildCustomScoreTable(questions) {
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

  html += `</tbody></table></div></div>`;
  return html;
}

window.reflectBulkScore = function () {
  const bt = val("bulk-time", "");
  const bp = val("bulk-pt", "");
  const bl = val("bulk-loss", "");

  for (let i = 0; i < selectedSetQuestions.length; i++) {
    if (bt !== "") { const el = $id(`q-time-${i}`); if (el) el.value = bt; }
    if (bp !== "") { const el = $id(`q-pt-${i}`); if (el) el.value = bp; }
    if (bl !== "") { const el = $id(`q-loss-${i}`); if (el) el.value = bl; }
  }
};

window.onInitialStatusChange = function (v) {
  const area = $id("config-topn-area");
  if (!area) return;
  if (v === "ranking") area.classList.remove("hidden");
  else area.classList.add("hidden");
};

window.updateBuilderUI = function () {
  const container = $id("config-builder-ui");
  const select = $id("config-set-select");
  if (!container || !select) return;

  if (!select.value) {
    selectedSetQuestions = [];
    container.innerHTML = `<p style="text-align:center; color:#666; padding:20px;">セットを選択してください</p>`;
    return;
  }

  const setData = JSON.parse(select.value);
  selectedSetQuestions = setData.q || [];
  const cfg = setData.c || {};
  const spMode = setData.sp || "none";
  const firstQ = selectedSetQuestions[0] || {};
  const qType = firstQ.type;

  let html = "";

  html += `<div class="config-section-title">${APP_TEXT.Config.LabelMode}</div>`;
  html += `<div class="config-item-box">`;
  html += `<select id="config-mode-select" class="btn-block config-select highlight-select" onchange="window.updateModeDetails(this.value)">`;

  if (qType !== "free_oral") {
    html += `<option value="normal" ${cfg.mode === "normal" ? "selected" : ""}>${APP_TEXT.Config.ModeNormal}</option>`;
  }
  html += `<option value="solo" ${cfg.mode === "solo" ? "selected" : ""}>一人挑戦 (Solo Challenge)</option>`;
  html += `<option value="buzz" ${cfg.mode === "buzz" ? "selected" : ""}>${APP_TEXT.Config.ModeBuzz}</option>`;
  html += `<option value="turn" ${cfg.mode === "turn" ? "selected" : ""}>${APP_TEXT.Config.ModeTurn}</option>`;
  if (qType !== "free_oral") {
    const locked = spMode === "time_attack" ? ` (固定)` : "";
    html += `<option value="time_attack" ${cfg.mode === "time_attack" || spMode === "time_attack" ? "selected" : ""} style="color:red;">★タイムショック${locked}</option>`;
  }
  html += `</select>`;

  html += `
    <div id="mode-details-normal" class="mode-details hidden" style="margin-top:10px;">
      <label class="config-label">${APP_TEXT.Config.LabelNormalLimit || "回答回数制限"}</label>
      <select id="config-normal-limit" class="btn-block config-select">
        <option value="unlimited">${APP_TEXT.Config.NormalLimitUnlimited || "何度でも修正可"}</option>
        <option value="one">${APP_TEXT.Config.NormalLimitOne || "1回のみ"}</option>
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

  html += `</div>`;

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

  html += buildCustomScoreTable(selectedSetQuestions);

  html += `
    <button id="config-add-playlist-btn" class="btn-block btn-primary" style="margin-top:20px;" onclick="window.addPeriodToPlaylist()">
      ${APP_TEXT.Config.BtnAddList || "リストに追加"}
    </button>
  `;

  container.innerHTML = html;

  const modeSelect = $id("config-mode-select");
  if (modeSelect) {
    if (spMode === "time_attack") {
      modeSelect.value = "time_attack";
      modeSelect.disabled = true;
    }
    window.updateModeDetails(modeSelect.value);
  }
  window.onInitialStatusChange(val("config-initial-status", "revive"));
};

window.addPeriodToPlaylist = function () {
  const select = $id("config-set-select");
  if (!select || !select.value) return;

  const setData = JSON.parse(select.value);
  const mode = val("config-mode-select", "normal");

  const questions = clone(setData.q || []);
  for (let i = 0; i < questions.length; i++) {
    const t = val(`q-time-${i}`, "");
    const pt = val(`q-pt-${i}`, "");
    const loss = val(`q-loss-${i}`, "");
    if (t !== "") questions[i].timeLimit = toInt(t, 0);
    if (pt !== "") questions[i].pt = toInt(pt, 0);
    if (loss !== "") questions[i].loss = toInt(loss, 0);
  }

  const initialStatus = val("config-initial-status", "revive");
  const topN = toInt(val("config-topn", "5"), 5);
  const doInterRank = chk("config-inter-rank-chk", false);

  const period = {
    title: setData.t,
    questions,
    config: {
      mode,
      normalLimit: val("config-normal-limit", "unlimited"),
      buzzWrongAction: val("config-buzz-wrong-action", "next"),
      buzzTimeLimit: toInt(val("config-buzz-time", "0"), 0),
      turnOrder: val("config-turn-order", "fixed"),
      turnPass: val("config-turn-pass", "ok"),
      timeLimit: mode === "time_attack" ? toInt(val("config-ta-seconds", "5"), 5) : 0,
      initialStatus,
      topN: initialStatus === "ranking" ? topN : 0,
      interRanking: !!doInterRank
    }
  };

  window.periodPlaylist.push(period);
  window.renderConfigPreview();
};

window.renderConfigPreview = function () {
  const container = $id("config-playlist-preview");
  if (!container) return;

  container.innerHTML = "";
  (window.periodPlaylist || []).forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "timeline-card";

    const mode = item?.config?.mode ?? "unknown";
    const inter = item?.config?.interRanking ? " / 中間発表あり" : "";
    const init = item?.config?.initialStatus
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
  window.periodPlaylist.splice(index, 1);
  window.renderConfigPreview();
};

function loadSavedProgramsInConfig() {
  const listEl = $id("config-saved-programs-list");
  if (!listEl) return;

  const showId = window.currentShowId;
  if (!showId || !window.db) return;

  window.db.ref(`saved_programs/${showId}`).once("value", (snap) => {
    const data = snap.val();
    listEl.innerHTML = "";
    if (data) {
      Object.keys(data).forEach((key) => {
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
  const showId = window.currentShowId;
  if (!showId || !window.db) return;

  window.db.ref(`saved_programs/${showId}/${key}`).once("value", (snap) => {
    const item = snap.val();
    if (item) {
      window.periodPlaylist = item.playlist || [];
      window.renderConfigPreview();
    }
  });
};

window.saveProgramToCloud = function () {
  const title = val("config-program-title", "");
  if (!title || (window.periodPlaylist || []).length === 0) {
    alert("名前とリストを確認してください");
    return;
  }

  const showId = window.currentShowId;
  if (!showId || !window.db) {
    alert("ShowIDまたはDBが未接続です");
    return;
  }

  const saveObj = {
    title,
    playlist: window.periodPlaylist,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };

  window.db.ref(`saved_programs/${showId}`)
    .push(saveObj)
    .then(() => {
      alert("保存しました");
      loadSavedProgramsInConfig();
    });
};
