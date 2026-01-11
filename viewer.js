/* =========================================================
 * viewer.js (v98: Full Features + Title Display)
 * =======================================================*/

let viewerRoomId = null;
let viewerConfig = {};
let viewerQuestions = [];

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('viewer-connect-btn');
    if(btn) {
        btn.addEventListener('click', () => {
            const input = document.getElementById('viewer-room-code');
            const code = input.value.trim().toUpperCase();
            if(!code) { alert("Please enter Room Code"); return; }
            
            btn.disabled = true;
            btn.textContent = "Connecting...";
            
            viewerRoomId = code;
            
            window.db.ref(`rooms/${viewerRoomId}`).once('value', snap => {
                if(snap.exists()) {
                    startViewer(viewerRoomId);
                } else {
                    alert("Room not found");
                    btn.disabled = false;
                    btn.textContent = "Connect";
                }
            });
        });
    }
});

function startViewer(roomId) {
    // 画面切り替え
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
    document.getElementById('viewer-main-view').classList.remove('hidden');
    
    document.getElementById('viewer-main-text').innerHTML = '<div style="font-size:3vh; color:#aaa;">Loading...</div>';

    // 監視開始
    const refs = {
        config: window.db.ref(`rooms/${roomId}/config`),
        status: window.db.ref(`rooms/${roomId}/status`),
        questions: window.db.ref(`rooms/${roomId}/questions`),
        players: window.db.ref(`rooms/${roomId}/players`)
    };

    refs.config.on('value', snap => {
        viewerConfig = snap.val() || {};
        // 背景の即時適用（待機画面でもデザイン反映するため）
        if(viewerConfig.baseDesign) applyBaseDesign(viewerConfig.baseDesign);
    });

    refs.questions.on('value', snap => {
        viewerQuestions = snap.val() || [];
    });

    refs.status.on('value', snap => {
        const status = snap.val();
        updateViewerDisplay(status);
    });
    
    refs.players.on('value', () => {
        if(viewerConfig.gameType === 'race') updateViewerRace();
    });
}

function updateViewerDisplay(status) {
    if (!status) return;

    const mainText = document.getElementById('viewer-main-text');
    const subText = document.getElementById('viewer-sub-text'); // 正解表示用エリア
    const statusDiv = document.getElementById('viewer-status');
    const viewContainer = document.getElementById('viewer-main-view');
    
    // 一旦リセット
    subText.innerHTML = '';
    ['viewer-panel-grid', 'viewer-bomb-grid', 'viewer-multi-grid', 'viewer-race-area', 'viewer-timer-bar-area'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });

    // レースモード表示
    if(viewerConfig.gameType === 'race') {
        document.getElementById('viewer-race-area').classList.remove('hidden');
        updateViewerRace();
    }

    // --- ステップごとの表示分岐 ---

    // 1. 待機中 (タイトル表示)
    if (status.step === 'standby') {
        statusDiv.textContent = "STANDBY";
        applyDefaultDesign(viewContainer);
        const title = viewerConfig.periodTitle || "Quiz Studio";
        mainText.innerHTML = `
            <div style="text-align:center;">
                <div style="color:#ffd700; font-size:8vh; font-weight:900; letter-spacing:2px; margin-bottom:20px; text-shadow:0 0 30px rgba(255, 215, 0, 0.6); animation: pulseTitle 2s infinite;">
                    ${title}
                </div>
                <div style="color:rgba(255,255,255,0.5); font-size:3vh; margin-top:20px;">ID: ${viewerRoomId}</div>
                <style>@keyframes pulseTitle { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }</style>
            </div>
        `;
    } 
    // 2. 準備中 (問題番号表示)
    else if (status.step === 'ready') {
        statusDiv.textContent = "READY";
        applyDefaultDesign(viewContainer);
        mainText.innerHTML = `
            <div style="text-align:center;">
                <div style="color:#fff; font-size:15vh; font-weight:900; letter-spacing:0.1em; text-shadow:0 10px 30px rgba(0,0,0,0.8);">
                    Q.${status.qIndex + 1}
                </div>
                <div style="color:#00bfff; font-size:4vh; font-weight:bold; letter-spacing:5px; margin-top:20px;">READY...</div>
            </div>
        `;
    }
    // 3. 出題中 (デザイン適用レイアウト)
    else if (status.step === 'question' || status.step === 'answering') {
        statusDiv.textContent = `Q${status.qIndex + 1}`;
        
        // タイムアタックバー
        if ((viewerConfig.mode === 'time_attack' || viewerConfig.mode === 'solo') && status.timeLimit) {
            const timerArea = document.getElementById('viewer-timer-bar-area');
            const timerBar = document.getElementById('viewer-timer-bar');
            timerArea.classList.remove('hidden');
            timerBar.className = '';
            timerBar.style.width = '100%';
            // アニメーション開始
            setTimeout(() => {
                timerBar.className = 'timer-animate';
                timerBar.style.transition = `width ${status.timeLimit}s linear`;
                timerBar.style.width = '0%';
            }, 50);
        }

        // 早押し受付中表示
        if (status.step === 'answering' && viewerConfig.mode === 'buzz') {
             statusDiv.textContent = "早押し受付中！";
             statusDiv.style.color = "#ff9800";
        }

        const q = viewerQuestions[status.qIndex];
        if(q) {
            renderQuestionLayout(viewContainer, mainText, q);
            if(q.type === 'multi') renderMultiGrid(q, status.multiState);
        }
    } 
    // 4. 正解表示 (オーバーレイ)
    else if (status.step === 'answer' || status.step === 'result') {
        statusDiv.textContent = "ANSWER";
        const q = viewerQuestions[status.qIndex];
        if(q) {
            renderQuestionLayout(viewContainer, mainText, q);
            
            // 正解オーバーレイの表示
            if (status.step === 'answer') {
                const accent = q.design?.qBorderColor || '#00bfff';
                let ansStr = getAnswerString(q);
                
                // 下部に正解を出す
                const answerBox = document.createElement('div');
                answerBox.style.position = 'absolute';
                answerBox.style.bottom = '5%';
                answerBox.style.left = '50%';
                answerBox.style.transform = 'translateX(-50%)';
                answerBox.style.zIndex = '200';
                answerBox.style.background = 'rgba(0,0,0,0.9)';
                answerBox.style.border = `4px solid ${accent}`;
                answerBox.style.borderRadius = '15px';
                answerBox.style.padding = '20px 50px';
                answerBox.style.color = accent;
                answerBox.style.fontSize = '5vh';
                answerBox.style.fontWeight = '900';
                answerBox.style.boxShadow = '0 0 50px rgba(0,0,0,0.8)';
                answerBox.style.textAlign = 'center';
                answerBox.style.minWidth = '50vw';
                answerBox.innerHTML = `<span style="font-size:0.6em; display:block; color:#fff;">ANSWER</span>${ansStr}`;
                
                mainText.appendChild(answerBox);
            }
        }
    } 
    // 5. パネル・爆弾
    else if (status.step === 'panel') {
        statusDiv.textContent = "PANEL";
        applyDefaultDesign(viewContainer);
        mainText.innerHTML = '';
        renderPanelGrid(status.panels);
    } 
    else if (status.step === 'bomb') {
        statusDiv.textContent = "BOMB";
        applyDefaultDesign(viewContainer);
        mainText.innerHTML = '';
        renderBombGrid(status.cards);
    }
}

// ★ デザイン再現ロジック (Design Studioと同じ)
function renderQuestionLayout(container, contentBox, q) {
    const d = q.design || {};
    const layout = q.layout || 'standard';
    const align = q.align || 'center';
    
    // 背景適用
    container.style.backgroundColor = d.mainBgColor || '#0a0a0a';
    if (d.bgImage) {
        container.style.backgroundImage = `url(${d.bgImage})`;
        container.style.backgroundSize = "cover";
        container.style.backgroundPosition = "center";
    } else {
        container.style.backgroundImage = (d.mainBgColor === '#0a0a0a') ? "radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)" : "none";
    }

    const qStyleBase = `color:${d.qTextColor||'#fff'}; background:${d.qBgColor||'rgba(255,255,255,0.1)'}; border:6px solid ${d.qBorderColor||'#fff'}; text-align:${align}; box-shadow:0 10px 40px rgba(0,0,0,0.5);`;
    const cStyle = `color:${d.cTextColor||'#ccc'}; background:${d.cBgColor||'transparent'}; border-bottom:2px solid ${d.cBorderColor||'#555'}; padding:1.5vh 2vw; font-size:3vh; display:flex; align-items:center;`;
    const pStyle = `color:${d.qBorderColor||'#00bfff'}; margin-right:20px; font-weight:900; font-size:1.2em; font-family:monospace;`;

    let html = '';

    // フリー記述・口頭
    if (q.type === 'free_oral' || q.type === 'free_written') {
        contentBox.style.flexDirection = 'column';
        contentBox.style.justifyContent = 'center';
        contentBox.style.alignItems = 'center';
        
        html += `<div style="${qStyleBase} width:80%; height:60%; display:flex; align-items:center; justify-content:${align==='left'?'flex-start':align==='right'?'flex-end':'center'}; font-size:8vh; font-weight:bold; border-radius:20px; padding:50px;">${q.q}</div>`;
        let typeLabel = (q.type==='free_oral') ? "フリー（口頭回答）" : "フリー（記述式）";
        html += `<div style="color:${d.cTextColor||'#aaa'}; font-size:3vh; margin-top:30px;">[ ${typeLabel} ]</div>`;
    } 
    // 選択式・並べ替え
    else {
        if (layout === 'standard') {
            contentBox.style.flexDirection = 'column';
            contentBox.style.justifyContent = 'center';
            contentBox.style.alignItems = 'center';
            html += `<div style="${qStyleBase} width:85%; margin-bottom:5vh; padding:4vh; font-size:5vh; font-weight:bold; border-radius:10px;">${q.q}</div>`;
            if (q.c) {
                html += `<div style="width:75%; display:flex; flex-direction:column; gap:2vh;">`;
                q.c.forEach((c, i) => {
                    html += `<div style="${cStyle}"><span style="${pStyle}">${String.fromCharCode(65+i)}</span> ${c}</div>`;
                });
                html += `</div>`;
            }
        } else {
            // Split Layout
            contentBox.style.flexDirection = 'row-reverse';
            contentBox.style.justifyContent = 'center';
            contentBox.style.alignItems = 'center';
            html += `<div style="${qStyleBase} writing-mode:vertical-rl; text-orientation:upright; width:20vw; height:85vh; display:flex; align-items:center; justify-content:center; font-size:6vh; font-weight:bold; margin-left:5vw; border-radius:15px;">${q.q}</div>`;
            if (q.c) {
                html += `<div style="width:50vw; display:flex; flex-direction:column; gap:3vh;">`;
                q.c.forEach((c, i) => {
                    html += `<div style="${cStyle}"><span style="${pStyle}">${String.fromCharCode(65+i)}</span> ${c}</div>`;
                });
                html += `</div>`;
            }
        }
    }
    contentBox.innerHTML = html;
}

function getAnswerString(q) {
    if (!q) return "";
    if (Array.isArray(q.correct)) return "複数正解 (Multi)";
    if (q.type === 'choice' && q.c) {
        const idx = q.correctIndex !== undefined ? q.correctIndex : q.correct;
        return q.c[idx];
    }
    return q.correct;
}

function applyDefaultDesign(container) {
    container.style.backgroundColor = '#0a0a0a';
    container.style.backgroundImage = "radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)";
}

function applyBaseDesign(design) {
    // 待機画面などに共通デザインを適用する場合の予備関数
}

// --- サブ機能 (Grid, Race) ---
function renderPanelGrid(panels) {
    const grid = document.getElementById('viewer-panel-grid');
    if(!grid) return;
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    if(!panels) return;
    panels.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'panel-cell';
        if(p===1) div.classList.add('panel-red');
        else if(p===2) div.classList.add('panel-green');
        else if(p===3) div.classList.add('panel-white');
        else if(p===4) div.classList.add('panel-blue');
        div.textContent = i+1;
        grid.appendChild(div);
    });
}

function renderBombGrid(cards) {
    const grid = document.getElementById('viewer-bomb-grid');
    if(!grid) return;
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    if(!cards) return;
    cards.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'card-item';
        if(c.open) {
            div.classList.add('flipped');
            div.innerHTML = c.type === 1 ? '<span class="card-content card-out">★</span>' : '<span class="card-content card-safe">SAFE</span>';
        } else {
            div.innerHTML = `<span class="card-number">${i+1}</span>`;
        }
        grid.appendChild(div);
    });
}

function renderMultiGrid(q, state) {
    const grid = document.getElementById('viewer-multi-grid');
    if(!grid) return;
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    const states = state || [];
    q.c.forEach((ans, i) => {
        const div = document.createElement('div');
        div.className = 'card-item multi';
        if(states[i]) {
            div.classList.add('flipped');
            div.innerHTML = `<span class="card-content" style="font-size:3vh;">${ans}</span>`;
        } else {
            div.innerHTML = `<span class="card-number">?</span>`;
        }
        grid.appendChild(div);
    });
}

function updateViewerRace() {
    const container = document.getElementById('viewer-race-area');
    if(!container) return;
    window.db.ref(`rooms/${viewerRoomId}/players`).once('value', snap => {
        const players = snap.val() || {};
        container.innerHTML = '';
        const activePlayers = [];
        Object.keys(players).forEach(key => {
            if(players[key].isAlive) activePlayers.push({ name: players[key].name, score: players[key].periodScore || 0 });
        });
        activePlayers.sort((a,b) => b.score - a.score);
        const goal = viewerConfig.passCount || 10;
        activePlayers.forEach(p => {
            const row = document.createElement('div');
            row.className = 'race-lane';
            const percent = Math.min(100, (p.score / goal) * 100);
            row.innerHTML = `
                <div class="race-name" style="width:15vw; font-size:3vh; font-weight:bold;">${p.name}</div>
                <div style="flex:1; height:2vh; background:rgba(255,255,255,0.1); border-radius:1vh; margin:0 2vw; position:relative;">
                    <div class="race-bar" style="width:${percent}%; position:absolute; top:0; left:0; height:100%;"></div>
                </div>
                <div class="race-score" style="font-size:3vh;">${p.score}</div>
            `;
            container.appendChild(row);
        });
    });
}
