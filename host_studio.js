/* =========================================================
 * host_studio.js (v63: Instant Quick Start)
 * =======================================================*/

let currentProgramConfig = { finalRanking: true };
let buzzWinnerId = null;
let turnQueue = [];
let taTimer = null;

// ★追加: クイックスタート用の一時保存変数
let tempQuickPlaylist = [];
let isQuickStartMode = false;

function startRoom() {
    studioQuestions = [];
    
    // ★変更: Quickモードじゃない時だけリセットする（データ保持のため）
    if (!isQuickStartMode) {
        periodPlaylist = [];
    }
    
    currentQIndex = 0;
    currentPeriodIndex = 0;
    currentConfig = { theme: 'light', scoreUnit: 'point', mode: 'normal' };
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    window.db.ref(`rooms/${currentRoomId}`).set({
        questions: [],
        status: { step: 'standby', qIndex: 0, currentAnswerer: null, isBuzzActive: false },
        config: currentConfig,
        players: {}
    }).then(() => {
        enterHostMode(currentRoomId);
    });
}

function enterHostMode(roomId) {
    window.showView(window.views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;
    document.getElementById('studio-show-id').textContent = currentShowId;
    
    // 一旦全エリアを隠す
    document.getElementById('studio-program-loader').classList.add('hidden');
    document.getElementById('studio-timeline-area').classList.add('hidden');
    document.getElementById('control-panel').classList.add('hidden');
    
    document.getElementById('host-buzz-winner-area').classList.add('hidden');
    document.getElementById('host-manual-judge-area').classList.add('hidden');
    document.getElementById('host-panel-control-area').classList.add('hidden');
    document.getElementById('host-bomb-control-area').classList.add('hidden');
    document.getElementById('host-multi-control-area').classList.add('hidden');
    
    updateKanpe(); 
    loadProgramsInStudio();

    window.db.ref(`rooms/${roomId}/players`).on('value', snap => {
        const players = snap.val() || {};
        const total = Object.keys(players).length;
        const alive = Object.values(players).filter(p => p.isAlive).length;
        document.getElementById('host-player-count').textContent = total;
        document.getElementById('host-alive-count').textContent = alive;
        if (currentConfig.mode === 'buzz') identifyBuzzWinner(players);
    });
    setupStudioButtons(roomId);

    // ★★★ ここが修正ポイント：Quickモードなら即座に再生する ★★★
    if (isQuickStartMode) {
        // 1. データを復元
        periodPlaylist = tempQuickPlaylist;
        
        // 2. タイムラインを描画（裏で動かすために必要）
        renderStudioTimeline();
        
        // 3. 即座に「再生(Play)」を実行！ → これで2枚目の画像（Ready画面）へ飛びます
        playPeriod(0);
        
        // 4. フラグを戻す
        isQuickStartMode = false;
        tempQuickPlaylist = [];
        
        window.showToast("🚀 Quick Start Ready!");
    } else {
        // 通常モード：ローダーを表示
        document.getElementById('studio-program-loader').classList.remove('hidden');
    }
}

function identifyBuzzWinner(players) {
    if (buzzWinnerId) return;
    let candidates = [];
    Object.keys(players).forEach(key => {
        const p = players[key];
        if (p.buzzTime && !p.isLocked && p.lastResult !== 'lose') {
            candidates.push({ id: key, time: p.buzzTime, name: p.name });
        }
    });
    if (candidates.length > 0) {
        candidates.sort((a, b) => a.time - b.time);
        const winner = candidates[0];
        buzzWinnerId = winner.id;
        window.db.ref(`rooms/${currentRoomId}/status`).update({ currentAnswerer: winner.id, isBuzzActive: false });
        document.getElementById('host-buzz-winner-name').textContent = winner.name;
        document.getElementById('host-buzz-winner-area').classList.remove('hidden');
        document.getElementById('host-manual-judge-area').classList.remove('hidden');
        if(document.getElementById('host-show-answer-btn')) document.getElementById('host-show-answer-btn').classList.add('hidden');
    }
}

function loadProgramsInStudio() {
    const select = document.getElementById('studio-program-select');
    const btn = document.getElementById('studio-load-program-btn');
    if(!select || !btn) return;
    select.innerHTML = `<option value="">${APP_TEXT.Config.SelectLoading}</option>`;
    
    window.db.ref(`saved_programs/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = `<option value="">${APP_TEXT.Studio.SelectProgDefault}</option>`;
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                opt.value = JSON.stringify(item);
                opt.textContent = item.title;
                select.appendChild(opt);
            });
        }
    });

    btn.onclick = () => {
        const val = select.value;
        if(!val) return;
        const prog = JSON.parse(val);
        if(confirm(APP_TEXT.Studio.MsgConfirmLoad)) {
            periodPlaylist = prog.playlist || [];
            currentProgramConfig.finalRanking = (prog.finalRanking !== false);
            currentPeriodIndex = 0;
            document.getElementById('studio-program-loader').classList.add('hidden');
            document.getElementById('studio-timeline-area').classList.remove('hidden');
            renderStudioTimeline();
            alert(APP_TEXT.Studio.MsgLoaded);
        }
    };
}

function renderStudioTimeline() {
    const container = document.getElementById('studio-period-timeline');
    container.innerHTML = '';
    if(periodPlaylist.length === 0) return;
    document.getElementById('studio-footer-controls').classList.remove('hidden');

    periodPlaylist.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'timeline-card';
        if (index === currentPeriodIndex) div.classList.add('active');
        
        let statusText = "START";
        let interText = "";
        let modeText = item.config.mode ? item.config.mode.toUpperCase() : "NORMAL";
        if (item.config.gameType === 'territory') modeText += " (PANEL)";

        div.innerHTML = `
            <div>
                <h5 style="margin:0;">No.${index + 1}: ${item.title}${interText}</h5>
                <div class="info" style="margin-top:5px;">
                    <span style="color:#d00; font-weight:bold;">[${modeText}]</span> ${statusText}
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function playCurrentPeriod() {
    if(!periodPlaylist[currentPeriodIndex]) { alert(APP_TEXT.Studio.MsgNoPeriod); return; }
    playPeriod(currentPeriodIndex);
}

window.playPeriod = function(index) {
    if(!periodPlaylist[index]) return;
    const item = periodPlaylist[index];
    
    currentPeriodIndex = index;
    studioQuestions = item.questions;
    currentConfig = item.config;
    currentQIndex = 0;
    turnQueue = [];
    if(taTimer) clearTimeout(taTimer);
    
    document.getElementById('studio-timeline-area').classList.add('hidden');
    document.getElementById('control-panel').classList.remove('hidden');
    document.getElementById('host-panel-control-area').classList.add('hidden');
    document.getElementById('host-bomb-control-area').classList.add('hidden');
    document.getElementById('host-multi-control-area').classList.add('hidden');
    
    if (currentConfig.mode === 'time_attack') currentConfig.timeLimit = 5;

    // 陣取りならパネル起動
    if (currentConfig.gameType === 'territory') {
        startPanelGame(currentRoomId);
    }
    
    if (currentConfig.mode === 'bomb') {
        startBombGame(currentRoomId);
    } else {
        window.db.ref(`rooms/${currentRoomId}/questions`).set(studioQuestions);
        window.db.ref(`rooms/${currentRoomId}/status`).update({ step: 'standby', qIndex: 0, currentAnswerer: null, isBuzzActive: false, multiState: [] });
        updateKanpe();
    }

    window.db.ref(`rooms/${currentRoomId}/config`).set(currentConfig);
    
    window.db.ref(`rooms/${currentRoomId}/players`).once('value', snap => {
        let players = [];
        snap.forEach(p => {
            const val = p.val();
            players.push({ key: p.key, isAlive: val.isAlive, score: val.periodScore||0, time: val.periodTime||0, name: val.name });
        });
        
        if (currentConfig.mode === 'time_attack' && players.length > 0) {
            buzzWinnerId = players[0].key; 
            document.getElementById('host-buzz-winner-name').textContent = players[0].name;
            document.getElementById('host-buzz-winner-area').classList.remove('hidden');
        }
        
        snap.forEach(p => {
            p.ref.update({ periodScore: 0, periodTime: 0, lastTime: 99999, lastResult: null, buzzTime: null, isLocked: false });
        });
    });

    document.getElementById('current-period-title').textContent = `${item.title}`;
    
    const btnStart = document.getElementById('host-start-btn');
    const btnStartTA = document.getElementById('host-start-ta-btn');
    if(btnStart) btnStart.classList.add('hidden');
    if(btnStartTA) btnStartTA.classList.add('hidden');
    document.getElementById('host-manual-judge-area').classList.add('hidden');

    if (currentConfig.mode === 'time_attack') {
        if(btnStartTA) btnStartTA.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = APP_TEXT.Studio.MsgTimeAttackReady;
    } else if (currentConfig.mode !== 'bomb') {
        if(btnStart) btnStart.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = "Ready...";
    }
    
    if(currentConfig.mode !== 'time_attack') {
        buzzWinnerId = null;
        document.getElementById('host-buzz-winner-area').classList.add('hidden');
    }
};

function startPanelGame(roomId) {
    const panels = Array(25).fill(0);
    window.db.ref(`rooms/${roomId}/status`).update({
        step: 'panel',
        panels: panels
    });
    const grid = document.getElementById('host-panel-grid');
    document.getElementById('host-panel-control-area').classList.remove('hidden');
    grid.innerHTML = '';
    for(let i=0; i<25; i++) {
        const btn = document.createElement('button');
        btn.textContent = i+1;
        btn.style.height = "40px";
        btn.onclick = () => {
            window.db.ref(`rooms/${roomId}/status/panels/${i}`).once('value', snap => {
                let val = snap.val() || 0;
                val = (val + 1) % 5;
                window.db.ref(`rooms/${roomId}/status/panels/${i}`).set(val);
                updateHostPanelColor(btn, val);
            });
        };
        grid.appendChild(btn);
    }
}
function updateHostPanelColor(btn, val) {
    const colors = ['#ddd', '#ffaaaa', '#aaffaa', '#ffffff', '#aaaaff'];
    btn.style.background = colors[val];
}
function startBombGame(roomId) { 
    const count = currentConfig.bombCount || 10;
    const cards = [];
    for(let i=0; i<count; i++) cards.push({ type: 0, open: false });
    const targetIdx = Math.floor(Math.random() * count);
    cards[targetIdx].type = 1; 
    window.db.ref(`rooms/${roomId}/status`).update({ step: 'bomb', cards: cards });
    const grid = document.getElementById('host-bomb-grid');
    document.getElementById('host-bomb-control-area').classList.remove('hidden');
    grid.innerHTML = '';
    for(let i=0; i<count; i++) {
        const btn = document.createElement('button');
        btn.textContent = i+1;
        if(i === targetIdx) btn.textContent += " (★)"; 
        btn.style.height = "40px";
        btn.onclick = () => {
            window.db.ref(`rooms/${roomId}/status/cards/${i}/open`).set(true);
            btn.disabled = true;
            btn.style.background = "#555";
        };
        grid.appendChild(btn);
    }
}

function setupStudioButtons(roomId) {
    // --- ★ここから追加 ---
    const btnMasterPlay = document.getElementById('studio-master-play-btn');
    if(btnMasterPlay) {
        btnMasterPlay.onclick = () => {
            // 現在選択されているピリオドを開始する関数を呼ぶ
            playCurrentPeriod();
        };
    }
    // --- ★ここまで追加 ---

    const btnClose = document.getElementById('host-close-studio-btn');
    if (btnClose) {
        btnClose.onclick = () => {
            periodPlaylist = [];
            currentRoomId = null;
            if(taTimer) clearTimeout(taTimer);
            enterDashboard();
        };
    }
    
    const btnStart = document.getElementById('host-start-btn');
    if(btnStart) btnStart.onclick = () => {
        const now = firebase.database.ServerValue.TIMESTAMP;
        let updateData = { step: 'question', qIndex: currentQIndex, startTime: now };
        if (currentConfig.mode === 'buzz') {
            updateData.isBuzzActive = true;
            updateData.currentAnswerer = null;
            buzzWinnerId = null; 
            window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
                snap.forEach(p => p.ref.update({ buzzTime: null, lastResult: null }));
            });
        }
        window.db.ref(`rooms/${roomId}/status`).update(updateData);
        btnStart.classList.add('hidden');
        document.getElementById('host-status-area').textContent = "Active...";
    };

    const btnStartTA = document.getElementById('host-start-ta-btn');
    if(btnStartTA) btnStartTA.onclick = () => {
        btnStartTA.classList.add('hidden');
        if(document.getElementById('host-manual-judge-area')) {
            document.getElementById('host-manual-judge-area').classList.remove('hidden');
        }
        startTaLoop(roomId);
    };

    const btnCorrect = document.getElementById('host-judge-correct-btn');
    if(btnCorrect) btnCorrect.onclick = () => {
        if (currentConfig.mode === 'time_attack') {
            if(buzzWinnerId) {
                window.db.ref(`rooms/${roomId}/players/${buzzWinnerId}`).once('value', snap => {
                    const val = snap.val();
                    snap.ref.update({ periodScore: (val.periodScore||0) + 1 });
                });
            }
            clearTimeout(taTimer);
            nextTaQuestion(roomId);
            return;
        }

        if (!buzzWinnerId) return;
        const q = studioQuestions[currentQIndex];
        const points = parseInt(q.points) || 1;

        window.db.ref(`rooms/${roomId}/players/${buzzWinnerId}`).once('value', snap => {
            const val = snap.val();
            snap.ref.update({ periodScore: (val.periodScore||0) + points, lastResult: 'win' });
        });

        finishQuestion(roomId);
    };

    const btnWrong = document.getElementById('host-judge-wrong-btn');
    if(btnWrong) btnWrong.onclick = () => {
        if (currentConfig.mode === 'time_attack') {
            clearTimeout(taTimer);
            nextTaQuestion(roomId);
            return;
        }
        if (!buzzWinnerId) return;
        const q = studioQuestions[currentQIndex];
        const loss = parseInt(q.loss) || 0;
        window.db.ref(`rooms/${roomId}/players/${buzzWinnerId}`).once('value', snap => {
            const val = snap.val();
            let newScore = (val.periodScore||0);
            if(loss > 0) newScore -= loss;
            snap.ref.update({ periodScore: newScore, lastResult: 'lose', buzzTime: null });
        });
        const action = currentConfig.buzzWrongAction;
        buzzWinnerId = null;
        document.getElementById('host-buzz-winner-area').classList.add('hidden');
        if (action === 'end') finishQuestion(roomId);
        else window.db.ref(`rooms/${roomId}/status`).update({ currentAnswerer: null, isBuzzActive: true });
    };

    const btnPass = document.getElementById('host-judge-pass-btn');
    if(btnPass) btnPass.onclick = () => { /* Turn mode pass logic if needed */ };

   const btnShowAns = document.getElementById('host-show-answer-btn');
    if(btnShowAns) btnShowAns.onclick = () => {
        // ★ここに追加：正解発表のタイミングで一斉採点を行う
        judgeSimultaneousAnswers(roomId);
        
        // その後、画面を「正解表示」に切り替える（元の処理）
        finishQuestion(roomId);
    };
    const btnNext = document.getElementById('host-next-btn');
    if(btnNext) btnNext.onclick = (e) => {
        const action = e.target.dataset.action;
        if (action === "next") { playPeriod(currentPeriodIndex + 1); return; }
        if (action === "end") { alert(APP_TEXT.Studio.MsgAllEnd); btnNext.classList.add('hidden'); return; }
        currentQIndex++;
        buzzWinnerId = null;
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ lastAnswer: null, lastTime: 99999, lastResult: null, buzzTime: null, isLocked: false }));
        });
        updateKanpe();
        if(btnStart) btnStart.classList.remove('hidden');
        btnNext.classList.add('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} Standby...`;
    };
    
    // 省略: Rankingボタン等は既存維持でOKですが、念のため
    const btnRanking = document.getElementById('host-ranking-btn');
    if(btnRanking) btnRanking.onclick = () => {
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'ranking' });
        // ... Ranking Logic ...
    };
}

function finishQuestion(roomId) {
    window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer', isBuzzActive: false });
    if(document.getElementById('host-show-answer-btn')) document.getElementById('host-show-answer-btn').classList.add('hidden');
    if(document.getElementById('host-manual-judge-area')) document.getElementById('host-manual-judge-area').classList.add('hidden');
    
    const btnNext = document.getElementById('host-next-btn');
    if(btnNext) {
        btnNext.classList.remove('hidden');
        if (currentQIndex >= studioQuestions.length - 1) {
            btnNext.textContent = APP_TEXT.Studio.BtnNextPeriod; 
            btnNext.dataset.action = "next";
        } else {
            btnNext.textContent = APP_TEXT.Studio.BtnNextQ;
            btnNext.dataset.action = "nextQ";
        }
    }
}

function startTaLoop(roomId) { currentQIndex = -1; nextTaQuestion(roomId); }
function nextTaQuestion(roomId) {
    currentQIndex++;
    if (currentQIndex >= studioQuestions.length) {
        document.getElementById('host-status-area').textContent = "FINISHED";
        return;
    }
    updateKanpe();
    window.db.ref(`rooms/${roomId}/status`).update({ step: 'question', qIndex: currentQIndex, startTime: firebase.database.ServerValue.TIMESTAMP });
    document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} (5s)`;
    taTimer = setTimeout(() => { nextTaQuestion(roomId); }, 5000);
}

function updateKanpe() {
    const kanpeArea = document.getElementById('host-kanpe-area');
    if(studioQuestions.length === 0) { kanpeArea.classList.add('hidden'); return; }
    if(studioQuestions.length > currentQIndex) {
        const q = studioQuestions[currentQIndex];
        kanpeArea.classList.remove('hidden');
        let questionHtml = `Q${currentQIndex+1}. ${q.q}`;
        if (q.type === 'multi') {
            document.getElementById('host-multi-control-area').classList.remove('hidden');
            const mGrid = document.getElementById('host-multi-grid');
            mGrid.innerHTML = '';
            window.db.ref(`rooms/${currentRoomId}/status/multiState`).once('value', snap => {
                const states = snap.val() || Array(q.c.length).fill(false);
                q.c.forEach((ans, i) => {
                    const btn = document.createElement('div');
                    btn.className = 'multi-ans-btn';
                    if(states[i]) btn.classList.add('opened');
                    btn.textContent = ans;
                    btn.onclick = () => {
                        window.db.ref(`rooms/${currentRoomId}/status/multiState/${i}`).set(!states[i]);
                        states[i] = !states[i];
                        if(states[i]) btn.classList.add('opened'); else btn.classList.remove('opened');
                    };
                    mGrid.appendChild(btn);
                });
            });
        } else {
            document.getElementById('host-multi-control-area').classList.add('hidden');
        }
        document.getElementById('kanpe-question').innerHTML = questionHtml; 
        document.getElementById('kanpe-answer').textContent = (q.type === 'multi') ? `全${q.c.length}項目` : `正解: ${q.correct}`;
    } else {
        kanpeArea.classList.add('hidden');
    }
}
/* --- 以下を host_studio.js の一番下に追加 --- */

function judgeSimultaneousAnswers(roomId) {
    // 早押し(buzz)やタイムアタック(time_attack)なら、この自動採点はしない（手動判定だから）
    if (currentConfig.mode === 'buzz' || currentConfig.mode === 'time_attack') return;

    const q = studioQuestions[currentQIndex];
    
    // まだ問題データがない、またはプレイヤー情報が取れない場合は何もしない安全策
    if (!q) return;

    window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
        snap.forEach(pSnap => {
            const player = pSnap.val();
            let isCorrect = false;

            // 1. 選択式 (Choice) の判定
            // プレイヤーの答え(index)と、正解(correctIndex)が一致するか
            if (q.type === 'choice') {
                // 配列形式の正解データにも対応できるように柔軟にチェック
                const ans = parseInt(player.lastAnswer);
                if (Array.isArray(q.correct)) {
                     if (q.correct.includes(ans)) isCorrect = true;
                } else {
                     if (ans === q.correctIndex || ans === q.correct) isCorrect = true;
                }
            }
            // 2. 記述 (Free Written / Sort / Multi) などの判定
            // 正解文字列リスト(q.correct)に、プレイヤーの答えが含まれているか
            else if (q.correct && Array.isArray(q.correct)) {
                // 完全一致で判定（必要なら表記揺れ対応ロジックをここに追加）
                if (q.correct.includes(player.lastAnswer)) isCorrect = true;
            }

            // 正解なら加点、不正解なら記録のみ
            if (isCorrect) {
                const points = parseInt(q.points) || 1;
                pSnap.ref.update({
                    periodScore: (player.periodScore || 0) + points,
                    lastResult: 'win'
                });
            } else {
                pSnap.ref.update({ lastResult: 'lose' });
            }
        });
    });
}
/* host_studio.js の一番下に追加 */

/* =========================================================
 * Quick Start Logic (Set -> Studio Direct)
 * =======================================================*/

// ダッシュボードの「Quick Play」ボタンから呼ばれる関数
window.quickStartSet = function(setData) {
    if(!setData || !setData.questions) return;
    
    // 1. U-NEXT風デザインプリセット（強制注入）
    const unextDesign = {
        mainBgColor: "#0a0a0a",       // 漆黒
        bgImage: "",
        qTextColor: "#ffffff",        // 白
        qBgColor: "rgba(255, 255, 255, 0.05)", // 透過ガラス風
        qBorderColor: "#00bfff",      // シアンのアクセント
        cTextColor: "#a0a0a0",        // グレー文字
        cBgColor: "transparent",      // 背景なし
        cBorderColor: "#333333"       // 薄い境界線
    };

    // 2. ルールプリセット（出題形式からよしなに決定）
    // 基本は「ノーマル（一斉回答）」、スペシャルモードならそれに従う
    const firstQ = setData.questions[0] || {};
    let mode = 'normal';
    let timeLimit = 0;

    if (firstQ.specialMode === 'time_attack') {
        mode = 'time_attack';
        timeLimit = 5;
    }

    const autoConfig = {
        mode: mode,
        gameType: 'score',      // 基本は得点制
        initialStatus: 'revive',
        eliminationRule: 'none',
        timeLimit: timeLimit,
        shuffleChoices: 'off',
        
        // 演出系
        theme: 'dark',
        scoreUnit: 'Pt'
    };

    // 3. 質問データにデザインを結合
    // (元データにデザインがなくても、ここでU-NEXT風にする)
    const readyQuestions = setData.questions.map(q => {
        // 既存のデザインがあれば優先、なければU-NEXTプリセット
        const d = q.design || unextDesign;
        // ただし、今回は「プリセットでカッコよく」が目的なので、
        // 色設定がない場合（デフォルトの白等）は強制的に上書きするロジックもアリだが、
        // ここでは「未設定ならU-NEXT」とする。
        if(!q.design) {
            q.design = unextDesign;
        }
        return q;
    });

    // 4. プレイリストを即席で作成
    periodPlaylist = [{
        title: setData.title || "Quick Play",
        questions: readyQuestions,
        config: autoConfig
    }];

    // 5. スタジオ起動（自動再生フラグを立てる）
    window.isQuickStartMode = true; 
    startRoom(); 
    // startRoom完了後に、enterHostMode内で自動的にplayPeriod(0)させる連携が必要
    // ※今回は startRoom() -> enterHostMode() の流れの中で
    //   periodPlaylist が入っていれば、リストには表示される。
    //   さらに「自動で1問目の待機状態」まで持っていく処理を追加します。
};

// 既存の enterHostMode を少し拡張して、Quick Startなら即座に準備完了にする
const originalEnterHostMode = window.enterHostMode;
window.enterHostMode = function(roomId) {
    // 元の処理を実行
    if(originalEnterHostMode) originalEnterHostMode(roomId);
    else {
        // 万が一のフォールバック（通常はありえないが念のため）
        window.showView(window.views.hostControl);
        // ... (省略: 元のロジックが必要な場合はここには書かず、元の関数を生かす)
    }

    // Quick Startの場合、自動で最初のセットを「セット」する
    if (window.isQuickStartMode && periodPlaylist.length > 0) {
        setTimeout(() => {
            // 自動でロードして
            renderStudioTimeline();
            // 自動で「再生（Play）」ボタンを押したことにする
            playPeriod(0);
            
            window.showToast("🚀 Quick Start: Ready!");
            window.isQuickStartMode = false; // フラグ回収
        }, 1000); // DB初期化待ちで少しだけ遅延
    }
};
