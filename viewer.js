/* =========================================================
 * viewer.js (v61: Fix for U-NEXT Style UI)
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
            
            // 接続確認
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
    
    // Config監視
    window.db.ref(`rooms/${roomId}/config`).on('value', snap => {
        viewerConfig = snap.val() || {};
        updateViewerDisplay(null);
    });

    // ステータス監視
    window.db.ref(`rooms/${roomId}/status`).on('value', snap => {
        const status = snap.val();
        updateViewerDisplay(status);
    });
    
    // レース用監視
    window.db.ref(`rooms/${roomId}/players`).on('value', () => {
        if(viewerConfig.gameType === 'race') {
            updateViewerRace();
        }
    });
}

function updateViewerDisplay(status) {
    // ステータス未取得時の再取得処理
    if (!status) {
        if(viewerRoomId) {
            window.db.ref(`rooms/${viewerRoomId}/status`).once('value', snap => {
                if(snap.exists()) updateViewerDisplay(snap.val());
            });
        }
        return;
    }

    const mainText = document.getElementById('viewer-main-text');
    const statusDiv = document.getElementById('viewer-status');
    const panelGrid = document.getElementById('viewer-panel-grid');
    const bombGrid = document.getElementById('viewer-bomb-grid');
    const multiGrid = document.getElementById('viewer-multi-grid');
    const raceArea = document.getElementById('viewer-race-area');
    const timerArea = document.getElementById('viewer-timer-bar-area');
    const timerBar = document.getElementById('viewer-timer-bar');

    // --- エリアのリセット ---
    if(panelGrid) panelGrid.classList.add('hidden');
    if(bombGrid) bombGrid.classList.add('hidden');
    if(multiGrid) multiGrid.classList.add('hidden');
    if(timerArea) timerArea.classList.add('hidden');
    
    // レースエリア
    if(viewerConfig.gameType === 'race') {
        if(raceArea) {
            raceArea.classList.remove('hidden');
            updateViewerRace();
        }
    } else {
        if(raceArea) raceArea.classList.add('hidden');
    }

    // --- 画面状態ごとの表示 ---
    
    // 1. 待機中 (Standby)
    if (status.step === 'standby') {
        statusDiv.textContent = "WAITING";
        // ここで白い文字色を強制指定して表示
        mainText.innerHTML = '<div style="color:rgba(255,255,255,0.5); font-size:3vh; letter-spacing:0.1em;">司会者が準備中です...</div>';
        
    } 
    // 2. 出題中 (Question)
    else if (status.step === 'question') {
        statusDiv.textContent = `Q${status.qIndex + 1}`;
        
        // タイムアタックバー
        if (viewerConfig.mode === 'time_attack' && timerArea && timerBar) {
            timerArea.classList.remove('hidden');
            const duration = status.timeLimit || 5; 
            // アニメーションのリセットと開始
            timerBar.className = '';
            timerBar.style.width = '100%';
            setTimeout(() => {
                timerBar.className = 'timer-animate';
                timerBar.style.transition = `width ${duration}s linear`;
                timerBar.style.width = '0%';
            }, 50);
        }

        // 問題データを取得して表示
        window.db.ref(`rooms/${viewerRoomId}/questions/${status.qIndex}`).once('value', snap => {
            const q = snap.val();
            if(q) {
                // レイアウト用コンテナ作成
                const layout = q.layout || 'standard';
                let html = `<div class="viewer-layout-container layout-${layout}">`;
                
                // 問題文エリア (class="q-area" が重要！)
                html += `<div class="q-area">${q.q}</div>`;
                
                // 選択肢エリア
                if(q.type === 'choice') {
                    html += `<div class="c-area">`;
                    q.c.forEach((c, i) => {
                        html += `<div class="choice-item">
                                    <span class="choice-prefix">${String.fromCharCode(65+i)}</span>
                                    <span class="choice-text">${c}</span>
                                 </div>`;
                    });
                    html += `</div>`;
                } 
                else if (q.type === 'sort') {
                    html += `<div style="color:#aaa; margin-top:20px;">(手元の端末で並べ替えてください)</div>`;
                }

                html += `</div>`; // end container
                mainText.innerHTML = html;
                
                if(q.type === 'multi') renderMultiGrid(q, status.multiState);
            }
        });
        
    } 
    // 3. 正解発表 (Answer)
    else if (status.step === 'answer') {
        statusDiv.textContent = "ANSWER";
        window.db.ref(`rooms/${viewerRoomId}/questions/${status.qIndex}`).once('value', snap => {
            const q = snap.val();
            if(q) {
                let ansStr = q.correct;
                if (Array.isArray(q.correct)) ansStr = q.correct.join(' / ');
                if(q.type === 'choice') {
                    const idx = q.correctIndex !== undefined ? q.correctIndex : q.correct[0];
                    ansStr = q.c[idx];
                }

                // 正解表示デザイン
                mainText.innerHTML = `
                    <div class="q-area" style="opacity:0.3; transform:scale(0.9);">${q.q}</div>
                    <div style="
                        color: #00bfff; 
                        font-size: 6vh; 
                        font-weight: 900; 
                        text-shadow: 0 0 20px rgba(0,191,255,0.8);
                        margin-top: -20px; 
                        z-index: 100;
                    ">
                        ${ansStr}
                    </div>
                `;
            }
        });
        
    } 
    // 4. その他モード
    else if (status.step === 'panel') {
        statusDiv.textContent = "PANEL";
        mainText.innerHTML = '';
        renderPanelGrid(status.panels);
        
    } else if (status.step === 'bomb') {
        statusDiv.textContent = "BOMB";
        mainText.innerHTML = '';
        renderBombGrid(status.cards);
        
    } else if (status.step === 'ranking') {
        statusDiv.textContent = "RANKING";
        mainText.innerHTML = '<div style="color:#aaa;">(Check Main Screen)</div>';
    }
}

// --- サブ機能の描画関数 ---

function renderPanelGrid(panels) {
    const grid = document.getElementById('viewer-panel-grid');
    if(!grid) return;
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    if(!panels) return;
    
    panels.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'panel-cell';
        if(p === 1) div.className += ' panel-red';
        else if(p === 2) div.className += ' panel-green';
        else if(p === 3) div.className += ' panel-white';
        else if(p === 4) div.className += ' panel-blue';
        
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
            if(c.type === 1) {
                div.innerHTML = '<span class="card-content card-out">★</span>';
            } else {
                div.innerHTML = '<span class="card-content card-safe">SAFE</span>';
            }
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
                <div class="race-name" style="width:150px; font-weight:bold; overflow:hidden; white-space:nowrap;">${p.name}</div>
                <div style="flex:1; height:12px; background:rgba(255,255,255,0.1); border-radius:6px; margin:0 15px; position:relative;">
                    <div class="race-bar" style="width:${percent}%; position:absolute; top:0; left:0; height:100%;"></div>
                </div>
                <div class="race-score">${p.score}</div>
            `;
            container.appendChild(row);
        });
    });
}
