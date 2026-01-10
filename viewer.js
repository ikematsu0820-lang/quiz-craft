/* =========================================================
 * viewer.js (v72: Connection Feedback & Standby Info)
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
            
            // ボタンを一時的に無効化してフィードバック
            btn.disabled = true;
            btn.textContent = "Connecting...";
            
            viewerRoomId = code;
            
            // 接続確認
            window.db.ref(`rooms/${viewerRoomId}`).once('value', snap => {
                if(snap.exists()) {
                    startViewer(viewerRoomId);
                } else {
                    alert("Room not found (部屋が見つかりません)");
                    btn.disabled = false;
                    btn.textContent = "Connect";
                }
            });
        });
    }
});

function startViewer(roomId) {
    // 画面切り替え
    document.getElementById('viewer-login-view').classList.add('hidden');
    const mainView = document.getElementById('viewer-main-view');
    mainView.classList.remove('hidden');
    
    // 初期表示（ローディング）
    document.getElementById('viewer-main-text').innerHTML = '<div style="font-size:3vh; color:#aaa;">Loading...</div>';

    // Config監視
    window.db.ref(`rooms/${roomId}/config`).on('value', snap => {
        viewerConfig = snap.val() || {};
        // Configが変わったら表示更新が必要かもしれないが、基本はStatus監視で更新される
    });

    // ステータス監視（ここがメイン）
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
    // ステータスがまだ無い（部屋作成直後など）場合のガード
    if (!status) {
        // 再取得を試みる
        if(viewerRoomId) {
            window.db.ref(`rooms/${viewerRoomId}/status`).once('value', snap => {
                if(snap.exists()) updateViewerDisplay(snap.val());
            });
        }
        return;
    }

    const mainText = document.getElementById('viewer-main-text');
    const statusDiv = document.getElementById('viewer-status');
    const viewContainer = document.getElementById('viewer-main-view');
    
    // サブエリアの取得とリセット
    const subAreas = [
        'viewer-panel-grid', 'viewer-bomb-grid', 'viewer-multi-grid',
        'viewer-race-area', 'viewer-timer-bar-area'
    ];
    subAreas.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    // レースモードの場合はエリアを表示
    if(viewerConfig.gameType === 'race' && document.getElementById('viewer-race-area')) {
        document.getElementById('viewer-race-area').classList.remove('hidden');
        updateViewerRace();
    }

    // --- 状態ごとの表示分岐 ---
    
    if (status.step === 'standby') {
        // ★修正: 待機画面でROOM IDを表示する
        statusDiv.textContent = "WAITING";
        applyDefaultDesign(viewContainer);
        mainText.innerHTML = `
            <div style="text-align:center;">
                <div style="color:#00bfff; font-size:4vh; font-weight:bold; letter-spacing:2px; margin-bottom:20px;">ROOM: ${viewerRoomId}</div>
                <div style="color:rgba(255,255,255,0.5); font-size:3vh; letter-spacing:0.1em;">司会者が準備中です...</div>
            </div>
        `;
        
    } 
    else if (status.step === 'question') {
        statusDiv.textContent = `Q${status.qIndex + 1}`;
        
        // タイマーバー表示
        if (viewerConfig.mode === 'time_attack' || viewerConfig.mode === 'solo') {
            const timerArea = document.getElementById('viewer-timer-bar-area');
            const timerBar = document.getElementById('viewer-timer-bar');
            if(timerArea && timerBar) {
                timerArea.classList.remove('hidden');
                const duration = status.timeLimit || 5; 
                // アニメーションリセット
                timerBar.style.transition = 'none';
                timerBar.style.width = '100%';
                setTimeout(() => {
                    timerBar.style.transition = `width ${duration}s linear`;
                    timerBar.style.width = '0%';
                }, 50);
            }
        }

        window.db.ref(`rooms/${viewerRoomId}/questions/${status.qIndex}`).once('value', snap => {
            const q = snap.val();
            if(q) {
                applyCustomDesign(viewContainer, q.design);
                const layout = q.layout || 'standard';
                const align = q.align || 'center';
                const d = q.design || {};
                
                // スタイル定義
                const qStyle = `color:${d.qTextColor||'#fff'}; background:${d.qBgColor||'rgba(255,255,255,0.1)'}; border:6px solid ${d.qBorderColor||'#fff'}; text-align:${align}; ${layout==='standard'?'border-left-width:30px;':''}`;
                const cStyle = `color:${d.cTextColor||'#ccc'}; background:${d.cBgColor||'transparent'}; border-bottom-color:${d.cBorderColor||'#555'};`;
                const pStyle = `color:${d.qBorderColor||'#00bfff'};`;

                let html = `<div class="viewer-layout-container layout-${layout}">`;
                
                // 問題文
                html += `<div class="q-area" style="${qStyle}">${q.q}</div>`;
                
                // 選択肢 (記述式などは表示しない)
                if (q.type === 'choice' || q.type === 'multi') {
                    html += `<div class="c-area">`;
                    (q.c || []).forEach((c, i) => {
                        html += `<div class="choice-item" style="${cStyle}">
                                    <span class="choice-prefix" style="${pStyle}">${String.fromCharCode(65+i)}</span>
                                    <span class="choice-text">${c}</span>
                                 </div>`;
                    });
                    html += `</div>`;
                }
                else if (q.type === 'sort') {
                    html += `<div style="color:#aaa; font-size:2vh;">(お手元の端末で並べ替えてください)</div>`;
                }
                
                html += `</div>`;
                mainText.innerHTML = html;
                
                if(q.type === 'multi') renderMultiGrid(q, status.multiState);
            }
        });
        
    } 
    else if (status.step === 'answer') {
        statusDiv.textContent = "ANSWER";
        window.db.ref(`rooms/${viewerRoomId}/questions/${status.qIndex}`).once('value', snap => {
            const q = snap.val();
            if(q) {
                applyCustomDesign(viewContainer, q.design);
                const accent = (q.design && q.design.qBorderColor) ? q.design.qBorderColor : '#00bfff';
                
                let ansStr = q.correct;
                // 正解の表示形式調整
                if (q.type === 'choice' && q.c) {
                    if (Array.isArray(q.correct)) {
                        ansStr = q.correct.map(idx => q.c[idx]).join(' / ');
                    } else {
                        const idx = q.correctIndex !== undefined ? q.correctIndex : q.correct;
                        ansStr = q.c[idx];
                    }
                } else if (Array.isArray(q.correct)) {
                    ansStr = q.correct.join(' / ');
                }

                mainText.innerHTML = `
                    <div class="q-area" style="opacity:0.4; transform:scale(0.8);">${q.q}</div>
                    <div style="
                        position:absolute; z-index:100;
                        background:rgba(0,0,0,0.9); border:4px solid ${accent};
                        padding:30px 60px; border-radius:15px;
                        color:${accent}; font-size:6vh; font-weight:900;
                        text-shadow:0 0 30px ${accent}80; box-shadow:0 0 50px rgba(0,0,0,0.8);
                    ">
                        ${ansStr}
                    </div>
                `;
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

// デザイン適用関数
function applyCustomDesign(container, d) {
    if (!d) return;
    container.style.backgroundColor = d.mainBgColor || '#0a0a0a';
    if (d.bgImage) {
        container.style.backgroundImage = `url(${d.bgImage})`;
        container.style.backgroundSize = "cover";
        container.style.backgroundPosition = "center";
    } else {
        container.style.backgroundImage = (d.mainBgColor === '#0a0a0a' || d.mainBgColor === '#222222') 
            ? "radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)" : "none";
    }
}

function applyDefaultDesign(container) {
    container.style.backgroundColor = '#0a0a0a';
    container.style.backgroundImage = "radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)";
}

// サブ機能の描画
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
