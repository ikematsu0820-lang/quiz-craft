/* =========================================================
 * viewer.js (v58: Race Display Logic)
 * =======================================================*/

let viewerRoomId = null;
let viewerConfig = {};

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('viewer-connect-btn');
    if(btn) {
        btn.addEventListener('click', () => {
            const code = document.getElementById('viewer-room-code').value.trim().toUpperCase();
            if(!code) return;
            viewerRoomId = code;
            window.db.ref(`rooms/${viewerRoomId}`).once('value', snap => {
                if(snap.exists()) {
                    startViewer(viewerRoomId);
                } else {
                    alert("Room not found");
                }
            });
        });
    }
});

function startViewer(roomId) {
    document.getElementById('viewer-login-view').classList.add('hidden');
    document.getElementById('viewer-main-view').classList.remove('hidden');
    
    // Config監視（モード変更検知）
    window.db.ref(`rooms/${roomId}/config`).on('value', snap => {
        viewerConfig = snap.val() || {};
        updateViewerDisplay(null); // モード切替時にリフレッシュ
    });

    // ステータス監視
    window.db.ref(`rooms/${roomId}/status`).on('value', snap => {
        const status = snap.val();
        updateViewerDisplay(status);
    });
    
    // プレイヤー監視（レース画面更新用）
    window.db.ref(`rooms/${roomId}/players`).on('value', () => {
        if(viewerConfig.gameType === 'race') {
            updateViewerRace();
        }
    });
}

function updateViewerDisplay(status) {
    // statusがnullの場合は既存表示を維持しつつモード切替のみ反映
    // ただし初回ロード時はstatusが必要
    if(!status && !viewerConfig) return;
    
    // status取得
    if (!status) {
        window.db.ref(`rooms/${viewerRoomId}/status`).once('value', snap => {
            if(snap.exists()) updateViewerDisplay(snap.val());
        });
        return;
    }

    const mainText = document.getElementById('viewer-main-text');
    const subText = document.getElementById('viewer-sub-text');
    const statusDiv = document.getElementById('viewer-status');
    const panelGrid = document.getElementById('viewer-panel-grid');
    const bombGrid = document.getElementById('viewer-bomb-grid');
    const multiGrid = document.getElementById('viewer-multi-grid');
    const raceArea = document.getElementById('viewer-race-area');
    const rankingArea = document.getElementById('viewer-ranking-area');

    // 全エリア一旦リセット
    panelGrid.classList.add('hidden');
    bombGrid.classList.add('hidden');
    multiGrid.classList.add('hidden');
    rankingArea.innerHTML = '';
    
    // レースモードなら常時表示
    if(viewerConfig.gameType === 'race') {
        raceArea.classList.remove('hidden');
        updateViewerRace();
    } else {
        raceArea.classList.add('hidden');
    }

    if (status.step === 'standby') {
        statusDiv.textContent = APP_TEXT.Viewer.Waiting;
        mainText.innerHTML = '';
        subText.innerHTML = '';
    } else if (status.step === 'question') {
        statusDiv.textContent = `Q${status.qIndex + 1}`;
        window.db.ref(`rooms/${viewerRoomId}/questions/${status.qIndex}`).once('value', snap => {
            const q = snap.val();
            if(q) {
                mainText.innerHTML = q.q;
                subText.innerHTML = '';
                
                // 選択肢表示
                if(q.type === 'choice') {
                    let html = '<div style="font-size:0.6em; margin-top:20px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">';
                    q.c.forEach((c, i) => {
                        html += `<div style="background:rgba(255,255,255,0.1); padding:10px; border-radius:5px;">${String.fromCharCode(65+i)}. ${c}</div>`;
                    });
                    html += '</div>';
                    mainText.innerHTML += html;
                }
                
                // 多答表示
                if(q.type === 'multi') {
                    renderMultiGrid(q, status.multiState);
                }
            }
        });
    } else if (status.step === 'answer') {
        statusDiv.textContent = APP_TEXT.Viewer.AnswerCheck;
        window.db.ref(`rooms/${viewerRoomId}/questions/${status.qIndex}`).once('value', snap => {
            const q = snap.val();
            if(q) {
                mainText.innerHTML = q.q;
                
                let ansStr = q.correct;
                if (Array.isArray(q.correct)) ansStr = q.correct.join(' / ');
                
                if(q.type === 'choice') {
                    const idx = q.correctIndex !== undefined ? q.correctIndex : q.correct[0];
                    ansStr = q.c[idx];
                } else if(q.type === 'sort') {
                    ansStr = q.c.join(' → ');
                } else if (q.type === 'multi') {
                    ansStr = "CHECK SCREEN";
                }
                
                subText.innerHTML = `<div style="color:#ffeb3b; font-weight:bold; font-size:1.5em; margin-top:20px; text-shadow:2px 2px 0 #000;">ANSWER: ${ansStr}</div>`;
                
                if(q.type === 'multi') renderMultiGrid(q, status.multiState);
            }
        });
    } else if (status.step === 'panel') {
        statusDiv.textContent = "PANEL ATTACK";
        mainText.innerHTML = '';
        subText.innerHTML = '';
        renderPanelGrid(status.panels);
    } else if (status.step === 'bomb') {
        statusDiv.textContent = "BOMB GAME";
        mainText.innerHTML = '';
        subText.innerHTML = '';
        renderBombGrid(status.cards);
    } else if (status.step === 'ranking') {
        statusDiv.textContent = "RANKING";
        mainText.innerHTML = '';
        subText.innerHTML = '';
        // 簡易ランキング表示（必要に応じて実装）
        rankingArea.innerHTML = "<div style='color:white; font-size:2em;'>Check Main Screen</div>";
    }
}

function renderPanelGrid(panels) {
    const grid = document.getElementById('viewer-panel-grid');
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    if(!panels) return;
    const colors = ['#333', '#d32f2f', '#388e3c', '#fff', '#1976d2'];
    panels.forEach((p, i) => {
        const div = document.createElement('div');
        div.textContent = i+1;
        div.className = 'panel-cell';
        div.style.background = colors[p];
        if(p === 3) div.style.color = '#333'; 
        grid.appendChild(div);
    });
}

function renderBombGrid(cards) {
    const grid = document.getElementById('viewer-bomb-grid');
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    if(!cards) return;
    cards.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'bomb-cell';
        if(c.open) {
            div.textContent = (c.type === 1) ? "★" : "";
            div.style.background = (c.type === 1) ? "gold" : "#555";
        } else {
            div.textContent = i+1;
            div.style.background = "#333";
        }
        grid.appendChild(div);
    });
}

function renderMultiGrid(q, state) {
    const grid = document.getElementById('viewer-multi-grid');
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    const states = state || [];
    q.c.forEach((ans, i) => {
        const div = document.createElement('div');
        div.className = 'multi-cell';
        if(states[i]) {
            div.classList.add('opened');
            div.textContent = ans;
        } else {
            div.textContent = "?";
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
            if (p.score >= goal) row.classList.add('goal');
            const percent = Math.min(100, (p.score / goal) * 100);
            
            // モニター用は見やすく調整
            row.innerHTML = `
                <div class="race-name" style="color:#333; font-size:1.2em; width:150px;">${p.name}</div>
                <div class="race-track" style="height:30px;">
                    <div class="race-bar" style="width:${percent}%"></div>
                </div>
                <div class="race-score" style="font-size:1.5em;">${p.score}</div>
            `;
            container.appendChild(row);
        });
    });
}
