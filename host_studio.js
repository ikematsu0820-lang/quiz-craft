/* =========================================================
 * host_studio.js (FULL REPLACE)
 * - Studio (本番) 進行制御
 * - 回答モード別の設定の整形（text_config.js側のキーに寄せる）
 * - 「次へ」進行 / 採点 / 早押し勝者確定 / ピリオド間(復活 or 中間順位)対応
 * =======================================================*/

let currentRoomId = null;
let currentShowId = null;

let periodPlaylist = [];
let currentPeriodIndex = -1;

let studioQuestions = [];
let currentConfig = {};
let currentQIndex = 0;

let buzzWinnerId = null; // 最初に押した人
let isStudioBooted = false;

// -------------------------
// 小物ユーティリティ
// -------------------------
function $(id) { return document.getElementById(id); }

function safeShow(id) { const el = $(id); if (el) el.classList.remove('hidden'); }
function safeHide(id) { const el = $(id); if (el) el.classList.add('hidden'); }
function safeSetText(id, text) { const el = $(id); if (el) el.textContent = text ?? ''; }

function nowTs() { return firebase.database.ServerValue.TIMESTAMP; }

function normalizeStr(s) {
  if (s == null) return '';
  return String(s).trim().toLowerCase();
}

// 配列同値（順不同）
function sameSet(a, b) {
  const aa = (a || []).slice().sort();
  const bb = (b || []).slice().sort();
  if (aa.length !== bb.length) return false;
  for (let i=0;i<aa.length;i++) if (aa[i] !== bb[i]) return false;
  return true;
}

// -------------------------
// config 整形（text_config.js のキーを頼りに）
// -------------------------
function buildRoomConfig(rawConfig = {}) {
  const c = Object.assign({}, rawConfig);

  // mode: normal / buzz / time_attack など
  c.mode = c.mode || 'normal';

  // プレイヤー側が参照してる可能性が高いキーを必ず用意
  // 例: player.js は normalLimit を見ている :contentReference[oaicite:2]{index=2}
  if (!c.normalLimit) {
    // 一斉回答(通常)の回答回数制限: 'one' or 'multi'
    // text_config.js側の既存UIに合わせ、デフォは1回制限に寄せる
    c.normalLimit = 'one';
  }

  // 選択肢シャッフル（既存実装に合わせたキー）
  if (!c.shuffleChoices) c.shuffleChoices = 'off'; // 'on'/'off'

  // 得点系（ピリオド一括のデフォルト）
  // ※問題ごと個別設定があれば q.points / q.loss / q.timeLimit を優先
  if (c.defaultPoints == null) c.defaultPoints = 1;
  if (c.defaultLoss == null) c.defaultLoss = 0;
  if (c.defaultTimeLimit == null) c.defaultTimeLimit = 0; // 0なら無制限

  // 早押し系のルール（buzzモード時）
  // - wrongAction: 'stay'(回答権保持) / 'pass'(次へ) / 'dead'(失格扱い) など
  if (!c.buzzWrongAction) c.buzzWrongAction = 'pass';
  // - falseStart: お手つき(押しただけでペナルティ)をするか
  if (c.buzzFalseStart == null) c.buzzFalseStart = 'off'; // 'on'/'off'
  // - falseStartPenalty: 'loss' or 'dead' or 'none'
  if (!c.buzzFalseStartPenalty) c.buzzFalseStartPenalty = 'loss';
  // - waitMs: お手つき後の待機時間
  if (c.buzzWaitMs == null) c.buzzWaitMs = 1000;

  // タイムショック的（time_attackの制限秒）
  // host_config.js側が timeLimit を入れている :contentReference[oaicite:3]{index=3}
  if (c.mode === 'time_attack' && (c.timeLimit == null)) c.timeLimit = 5;

  // ピリオド開始時の生存状態（revive / keep）
  if (!c.initialStatus) c.initialStatus = 'revive';

  // ピリオド間の処理（あなたが言ってた「第一と第二の間」）
  // - intermissionAction: 'revive'|'midRanking'|'none'
  if (!c.intermissionAction) c.intermissionAction = 'none';

  return c;
}

// -------------------------
// 採点（問題タイプ別）
// -------------------------
function isCorrectAnswer(q, playerAnswer) {
  if (!q) return false;

  // choice: playerAnswer = index (number)
  if (q.type === 'choice') {
    const correct = Array.isArray(q.correct) ? q.correct : [q.correct];
    const ans = Array.isArray(playerAnswer) ? playerAnswer : [playerAnswer];
    // multiなら集合一致、singleなら一致
    if (q.multi) return sameSet(correct, ans);
    return normalizeStr(correct[0]) === normalizeStr(ans[0]);
  }

  // free_oral / free_written: playerAnswer = string
  if (q.type === 'free_oral' || q.type === 'free_written') {
    const correctList = Array.isArray(q.correct) ? q.correct : [q.correct];
    const pa = normalizeStr(playerAnswer);
    return correctList.map(normalizeStr).includes(pa);
  }

  // sort: playerAnswer = array of indices (想定)
  if (q.type === 'sort') {
    const correctOrder = Array.isArray(q.correct) ? q.correct : [];
    const ansOrder = Array.isArray(playerAnswer) ? playerAnswer : [];
    if (correctOrder.length === 0 || ansOrder.length === 0) return false;
    if (correctOrder.length !== ansOrder.length) return false;
    for (let i=0;i<correctOrder.length;i++) {
      if (String(correctOrder[i]) !== String(ansOrder[i])) return false;
    }
    return true;
  }

  // multi(多答・パネル等): ここはプロジェクトごとに違うので保守的に false
  // viewer側の特殊演出は別で実装してるため、必要ならここに判定を足す
  return false;
}

function getPointsForQuestion(q, config) {
  if (q && q.points != null) return Number(q.points);
  return Number(config.defaultPoints ?? 1);
}
function getLossForQuestion(q, config) {
  if (q && q.loss != null) return Number(q.loss);
  return Number(config.defaultLoss ?? 0);
}

// -------------------------
// スタジオ開始（外から呼ばれる想定）
// -------------------------
window.openStudio = function(roomId, showId) {
  currentRoomId = roomId;
  currentShowId = showId;

  // UI初期化
  safeSetText('host-room-id', roomId);
  safeSetText('studio-show-id', showId);

  safeHide('studio-timeline-area');
  safeHide('control-panel');
  safeHide('host-buzz-winner-area');

  // プレイヤー監視（人数/生存 + 早押し勝者確定）
  window.db.ref(`rooms/${roomId}/players`).on('value', function(snap) {
    const players = snap.val() || {};
    const total = Object.keys(players).length;
    const alive = Object.values(players).filter(p => p.isAlive).length;
    safeSetText('host-player-count', total);
    safeSetText('host-alive-count', alive);

    // 早押し勝者は buzzモードのみ
    if ((currentConfig.mode === 'buzz') && (buzzWinnerId == null)) {
      identifyBuzzWinner(players);
    }
  });

  loadProgramsInStudio();
  setupStudioButtons(roomId);
  updateKanpe();

  isStudioBooted = true;
};

// -------------------------
// 保存済み番組（番組構成）を読み込む
// -------------------------
function loadProgramsInStudio() {
  const select = $('studio-program-select');
  const btn = $('studio-load-program-btn');
  if(!select || !btn) return;

  window.db.ref(`saved_programs/${currentShowId}`).once('value', function(snap) {
    const data = snap.val();
    select.innerHTML = `<option value="">${APP_TEXT?.Studio?.SelectProgDefault ?? '番組を選択'}</option>`;
    if(data) {
      Object.keys(data).forEach(function(key) {
        const item = data[key];
        const opt = document.createElement('option');
        opt.value = JSON.stringify(item);
        opt.textContent = item.title;
        select.appendChild(opt);
      });
    }
  });

  btn.onclick = function() {
    if(!select.value) return;
    const prog = JSON.parse(select.value);

    periodPlaylist = prog.playlist || [];
    currentPeriodIndex = -1;

    safeHide('studio-program-loader');
    safeShow('studio-timeline-area');
    renderStudioTimeline();
  };
}

// -------------------------
// タイムライン描画
// -------------------------
function renderStudioTimeline() {
  const container = $('studio-period-timeline');
  if (!container) return;

  container.innerHTML = '';
  periodPlaylist.forEach(function(item, index) {
    const div = document.createElement('div');
    div.className = 'timeline-card';
    if (index === currentPeriodIndex) div.classList.add('active');

    const modeLabel = item?.config?.mode ? String(item.config.mode).toUpperCase() : '---';
    div.innerHTML = `
      <h5>No.${index + 1}: ${item.title ?? '(no title)'}</h5>
      <div class="info">[${modeLabel}]</div>
    `;
    container.appendChild(div);
  });
}

// -------------------------
// スタジオ内ボタン設定
// -------------------------
function setupStudioButtons(roomId) {
  // 全体再生（最初のピリオドへ）
  const btnMasterPlay = $('studio-master-play-btn');
  if (btnMasterPlay) {
    btnMasterPlay.onclick = function() {
      playPeriod(0);
    };
  }

  // 問題開始
  const btnStart = $('host-start-btn');
  if(btnStart) {
    btnStart.onclick = function() {
      window.db.ref(`rooms/${roomId}/status`).update({
        step: 'question',
        qIndex: currentQIndex,
        startTime: nowTs(),
        isBuzzActive: (currentConfig.mode === 'buzz'),
        currentAnswerer: null
      });
      btnStart.classList.add('hidden');
    };
  }

  // 正解発表
  const btnShowAns = $('host-show-answer-btn');
  if(btnShowAns) {
    btnShowAns.onclick = function() {
      window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });
      safeShow('host-next-btn');
    };
  }

  // 次へ（★ここが元ファイルに無く、進行停止してた）
  const btnNext = $('host-next-btn');
  if (btnNext) {
    btnNext.onclick = function() {
      advanceToNext();
    };
  }

  // （任意）中間順位発表ボタンが存在するなら拾う
  const btnMidRank = $('host-mid-ranking-btn');
  if (btnMidRank) {
    btnMidRank.onclick = function() {
      showRanking('mid');
    };
  }

  // （任意）ピリオドへ進むボタンが存在するなら拾う
  const btnNextPeriod = $('host-next-period-btn');
  if (btnNextPeriod) {
    btnNextPeriod.onclick = function() {
      goNextPeriod();
    };
  }

  // スタジオを閉じる
  const btnClose = $('host-close-studio-btn');
  if (btnClose) btnClose.onclick = () => window.showView('host-dashboard-view');
}

// -------------------------
// ピリオド開始処理
// -------------------------
function playPeriod(index) {
  if(!periodPlaylist[index]) return;
  const item = periodPlaylist[index];

  currentPeriodIndex = index;
  studioQuestions = item.questions || [];
  currentConfig = buildRoomConfig(item.config || {});
  currentQIndex = 0;
  buzzWinnerId = null;

  // ピリオド開始時の全員復活など
  applyInitialStatus(currentConfig.initialStatus);

  safeHide('studio-timeline-area');
  safeShow('control-panel');

  safeSetText('current-period-title', item.title ?? `Period ${index+1}`);
  safeShow('host-start-btn');
  safeHide('host-next-btn');

  // ルームへ反映（プレイヤーが参照する）
  window.db.ref(`rooms/${currentRoomId}/config`).set(currentConfig);
  window.db.ref(`rooms/${currentRoomId}/questions`).set(studioQuestions);

  // 状態初期化
  window.db.ref(`rooms/${currentRoomId}/status`).update({
    step: 'standby',
    qIndex: 0,
    isBuzzActive: (currentConfig.mode === 'buzz'),
    currentAnswerer: null,
    startTime: null
  });

  resetAnswersForAllPlayers(); // 前問の回答をクリア
  updateKanpe();
  renderStudioTimeline();
}

function applyInitialStatus(initialStatus) {
  if (initialStatus !== 'revive') return;
  const ref = window.db.ref(`rooms/${currentRoomId}/players`);
  ref.once('value', snap => {
    const players = snap.val() || {};
    const updates = {};
    Object.keys(players).forEach(pid => {
      updates[`${pid}/isAlive`] = true;
      // periodScore/periodTime をリセットしたい場合はここで
      // updates[`${pid}/periodScore`] = 0;
      // updates[`${pid}/periodTime`] = 0;
    });
    if (Object.keys(updates).length > 0) ref.update(updates);
  });
}

function resetAnswersForAllPlayers() {
  const ref = window.db.ref(`rooms/${currentRoomId}/players`);
  ref.once('value', snap => {
    const players = snap.val() || {};
    const updates = {};
    Object.keys(players).forEach(pid => {
      updates[`${pid}/lastAnswer`] = null;
      updates[`${pid}/buzzTime`] = null;
      updates[`${pid}/lastResult`] = null;
    });
    if (Object.keys(updates).length > 0) ref.update(updates);
  });
}

// -------------------------
// カンペ更新
// -------------------------
function updateKanpe() {
  const kanpeArea = $('host-kanpe-area');
  if (!kanpeArea) return;

  if(studioQuestions.length > currentQIndex) {
    const q = studioQuestions[currentQIndex];
    kanpeArea.classList.remove('hidden');
    safeSetText('kanpe-question', `Q${currentQIndex+1}. ${q.q ?? ''}`);

    // 表示用：choiceなら正解選択肢テキストも出す
    let ansText = '';
    if (q.type === 'choice') {
      const correct = Array.isArray(q.correct) ? q.correct : [q.correct];
      const labels = (q.c || []).map((t, i) => `${i}:${t}`);
      ansText = `正解Index: ${correct.join(', ')} / ${labels.join(' | ')}`;
    } else {
      ansText = `正解: ${Array.isArray(q.correct) ? q.correct.join(', ') : (q.correct ?? '')}`;
    }
    safeSetText('kanpe-answer', ansText);
  } else {
    kanpeArea.classList.add('hidden');
  }
}

// -------------------------
// 早押し勝者確定
// -------------------------
function identifyBuzzWinner(players) {
  if (buzzWinnerId) return;

  let winner = null;
  let minTime = Infinity;

  Object.keys(players).forEach(id => {
    const p = players[id];
    if (p && p.isAlive && p.buzzTime && p.buzzTime < minTime) {
      minTime = p.buzzTime;
      winner = { id, name: p.name || id };
    }
  });

  if (winner) {
    buzzWinnerId = winner.id;

    window.db.ref(`rooms/${currentRoomId}/status`).update({
      currentAnswerer: winner.id,
      isBuzzActive: false // 勝者確定したら受付終了
    });

    safeSetText('host-buzz-winner-name', winner.name);
    safeShow('host-buzz-winner-area');
  }
}

// -------------------------
// 次へ（採点→次の問題 or ピリオド終了→(中間処理)→次ピリオド）
// -------------------------
async function advanceToNext() {
  // 現在の問題を採点
  await scoreCurrentQuestion();

  // 次の問題があるなら進める
  if (currentQIndex + 1 < studioQuestions.length) {
    currentQIndex += 1;
    buzzWinnerId = null;

    // UI
    safeHide('host-buzz-winner-area');
    safeHide('host-next-btn');
    safeShow('host-start-btn');

    // 次問準備
    resetAnswersForAllPlayers();
    updateKanpe();

    // ルーム状態更新
    await window.db.ref(`rooms/${currentRoomId}/status`).update({
      step: 'standby',
      qIndex: currentQIndex,
      isBuzzActive: (currentConfig.mode === 'buzz'),
      currentAnswerer: null,
      startTime: null
    });
    return;
  }

  // ピリオド終了
  await finishPeriod();
}

// -------------------------
// 採点本体
// -------------------------
async function scoreCurrentQuestion() {
  const q = studioQuestions[currentQIndex];
  if (!q) return;

  const config = currentConfig || {};
  const points = getPointsForQuestion(q, config);
  const loss = getLossForQuestion(q, config);

  const playersRef = window.db.ref(`rooms/${currentRoomId}/players`);
  const snap = await playersRef.once('value');
  const players = snap.val() || {};

  const updates = {};

  // buzz の場合：回答権者だけ採点（それ以外は無視）
  const isBuzz = (config.mode === 'buzz');
  const answererId = isBuzz ? (buzzWinnerId || null) : null;

  Object.keys(players).forEach(pid => {
    const p = players[pid];
    if (!p || p.isAlive === false) return;

    if (isBuzz && pid !== answererId) {
      // 早押し以外はlastResultだけ「参加なし」にしても良いが、今回は触らない
      return;
    }

    const ans = p.lastAnswer;

    const correct = isCorrectAnswer(q, ans);
    const delta = correct ? points : -loss;

    const prev = Number(p.periodScore ?? 0);
    updates[`${pid}/periodScore`] = prev + delta;
    updates[`${pid}/lastResult`] = correct ? 'correct' : 'wrong';

    // 間違いで失格など（buzzWrongAction / 初期はpass）
    if (isBuzz && !correct) {
      if (config.buzzWrongAction === 'dead') {
        updates[`${pid}/isAlive`] = false;
      }
      // pass は「次に進む」だけなのでここでは特に何もしない
    }
  });

  if (Object.keys(updates).length > 0) {
    await playersRef.update(updates);
  }
}

// -------------------------
// ピリオド終了時の処理
// - 次ピリオドがあるなら intermissionAction に応じて
//   1) 全員復活 2) 中間順位 3) 何もしない
// -------------------------
async function finishPeriod() {
  // いったんランキング表示に移す（存在しないUIでもDB状態だけは整う）
  await showRanking('periodEnd');

  // 次ピリオドがないなら番組終了
  if (currentPeriodIndex + 1 >= periodPlaylist.length) {
    // “最終順位”扱い
    return;
  }

  // 「第一と第二の間に設定できてた」部分：
  // intermissionAction: 'revive' | 'midRanking' | 'none'
  const action = currentConfig.intermissionAction || 'none';

  if (action === 'revive') {
    await reviveAllPlayers();
    // そのまま次ピリオドへ
    await goNextPeriod();
    return;
  }

  if (action === 'midRanking') {
    // すでに showRanking 済み。UIにボタンがあるなら押させる。
    // ボタンが無い構成でも、数秒後に自動進行したいならここに setTimeout を入れる。
    // ここでは“待機”にしておく（ホストが「次ピリオド」操作する前提）
    safeShow('host-next-period-btn');   // ボタンがあれば出る
    safeShow('host-mid-ranking-btn');   // ボタンがあれば出る
    return;
  }

  // none: 何もせず次ピリオドへ
  await goNextPeriod();
}

async function reviveAllPlayers() {
  const ref = window.db.ref(`rooms/${currentRoomId}/players`);
  const snap = await ref.once('value');
  const players = snap.val() || {};
  const updates = {};
  Object.keys(players).forEach(pid => updates[`${pid}/isAlive`] = true);
  if (Object.keys(updates).length > 0) await ref.update(updates);
}

// 次ピリオドへ
async function goNextPeriod() {
  safeHide('host-next-period-btn');
  safeHide('host-mid-ranking-btn');

  const nextIndex = currentPeriodIndex + 1;
  if (nextIndex < periodPlaylist.length) {
    playPeriod(nextIndex);
  }
}

// -------------------------
// ランキング表示（DB状態として step='ranking' を立てる）
// -------------------------
async function showRanking(kind) {
  const ref = window.db.ref(`rooms/${currentRoomId}/players`);
  const snap = await ref.once('value');
  const players = snap.val() || {};

  // ソート用配列
  const arr = Object.keys(players).map(pid => {
    const p = players[pid] || {};
    return {
      id: pid,
      name: p.name || pid,
      score: Number(p.periodScore ?? 0),
      time: Number(p.periodTime ?? 0),
      alive: (p.isAlive !== false)
    };
  });

  // score desc, time asc
  arr.sort((a,b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.time - b.time;
  });

  // viewer/player が参照できるよう rooms/status にスナップショットを置く（無くても動く）
  await window.db.ref(`rooms/${currentRoomId}/status`).update({
    step: 'ranking',
    rankingKind: kind || 'periodEnd',
    rankingSnapshot: arr,
    isBuzzActive: false,
    currentAnswerer: null
  });

  // 次へを出しておく（ランキングから進めたい場合）
  safeShow('host-next-btn');
  safeHide('host-start-btn');
  updateKanpe();
}
