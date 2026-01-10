/* =========================================================
 * viewer.js (v81: Sync with Design Preview)
 * =======================================================*/

let viewerRoomId = null;
let viewerConfig = {};

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
    document.getElementById('viewer-login-view').classList.add('hidden');
    document.getElementById('viewer-main-view').classList.remove('hidden');
    
    document.getElementById('viewer-main-text').innerHTML = '<div style="font-size:3vh; color:#aaa;">Loading...</div>';

    window.db.ref(`rooms/${roomId}/config`).on('value', snap => {
        viewerConfig = snap.val() || {};
    });

    window.db.ref(`rooms/${roomId}/status`).on('value', snap => {
        const status = snap.val();
        updateViewerDisplay(status);
    });
    
    window.db.ref(`rooms/${roomId}/players`).on('value', () => {
        if(viewerConfig.gameType === 'race') updateViewerRace();
    });
}

function updateViewerDisplay(status) {
    if (!status) return;

    const mainText = document.getElementById('viewer-main-text');
    const statusDiv = document.getElementById('viewer-status');
    const viewContainer = document.getElementById('viewer-main-view');
    
    ['viewer-panel-grid', 'viewer-bomb-grid', 'viewer-multi-grid', 'viewer-race-area', 'viewer-timer-bar-area'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });

    if(viewerConfig.gameType === 'race') {
        document.getElementById('viewer-race-area').classList.remove('hidden');
        updateViewerRace();
    }

    if (status.step === 'standby') {
        statusDiv.textContent = "WAITING";
        applyDefaultDesign(viewContainer);
        mainText.innerHTML = `
            <div style="text-align:center;">
                <div style="color:#00bfff; font-size:4vh; font-weight:bold; letter-spacing:2px; margin-bottom:20px;">ROOM: ${viewerRoomId}</div>
                <div style="color:rgba(255,255,255,0.5); font-size:3vh;">READY...</div>
            </div>
        `;
    } 
    else if (status.step === 'question') {
        statusDiv.textContent = `Q${status.qIndex + 1}`;
        
        if ((viewerConfig.mode === 'time_attack' || viewerConfig.mode === 'solo') && status.timeLimit) {
            const timerArea = document.getElementById('viewer-timer-bar-area');
            const timerBar = document.getElementById('viewer-timer-bar');
            timerArea.classList.remove('hidden');
            timerBar.className = '';
            timerBar.style.width = '100%';
            setTimeout(() => {
                timerBar.className = 'timer-animate';
                timerBar.style.transition = `width ${status.timeLimit}s linear`;
                timerBar.style.width = '0%';
            }, 50);
        }

        window.db.ref(`rooms/${viewerRoomId}/questions/${status.qIndex}`).once('value', snap => {
            const q = snap.val();
            if(q) {
                renderQuestionLayout(viewContainer, mainText, q);
                if(q.type === 'multi') renderMultiGrid(q, status.multiState);
            }
        });
    } 
    else if (status.step === 'answer') {
        statusDiv.textContent = "ANSWER";
        window.db.ref(`rooms/${viewerRoomId}/questions/${status.qIndex}`).once('value', snap => {
            const q = snap.val();
            if(q) {
                renderQuestionLayout(viewContainer, mainText, q);
                
                const d = q.design || {};
                const accent = d.qBorderColor || '#00bfff';
                let ansStr = getAnswerString(q);

                const overlay = document.createElement('div');
                overlay.style.position = 'absolute';
                overlay.style.zIndex = '200';
                overlay.style.background = 'rgba(0,0,0,0.85)';
                overlay.style.border = `4px solid ${accent}`;
                overlay.style.borderRadius = '15px';
                overlay.style.padding = '30px 60px';
                overlay.style.color = accent;
                overlay.style.fontSize = '6vh';
                overlay.style.fontWeight = '900';
                overlay.style.textShadow = `0 0 30px ${accent}`;
                overlay.style.boxShadow = '0 0 50px rgba(0,0,0,0.8)';
                overlay.textContent = ansStr;
                
                mainText.appendChild(overlay);
            }
        });
    } 
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

// ★ デザインプレビューと同じロジック
function renderQuestionLayout(container, contentBox, q) {
    const d = q.design || {};
    const layout = q.layout || 'standard';
    const align = q.align || 'center';
    
    // 背景
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
    const pStyle = `color:${d.qBorderColor||'#00bfff'}; margin-right:20px; font-weight:900; font-size:1.2em;`;

    let html = '';

    if (q.type === 'free_oral' || q.type === 'free_written') {
        contentBox.style.flexDirection = 'column';
        contentBox.style.justifyContent = 'center';
        contentBox.style.alignItems = 'center';
        
        html += `<div style="${qStyleBase} width:80%; height:60%; display:flex; align-items:center; justify-content:${align==='left'?'flex-start':align==='right'?'flex-end':'center'}; font-size:8vh; font-weight:bold; border-radius:20px; padding:50px;">${q.q}</div>`;
        let typeLabel = (q.type==='free_oral') ? "フリー（口頭回答）" : "フリー（記述式）";
        html += `<div style="color:${d.cTextColor||'#aaa'}; font-size:3vh; margin-top:30px;">[ ${typeLabel} ]</div>`;
    } 
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
    if (Array.isArray(q.correct)) return q.correct.join(' / ');
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

// サブ機能
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
