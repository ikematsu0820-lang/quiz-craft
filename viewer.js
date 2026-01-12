/* =========================================================
 * viewer.js (v134: Full Features + Smart Standby)
 * =======================================================*/

// --- Monitor App ---
window.App = window.App || {};
window.App.Viewer = {
    roomId: null,
    config: {},
    questions: [],

    init: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('id');
        
        if(code) {
            document.getElementById('viewer-login-view').classList.add('hidden');
            this.connect(code);
        } else {
            const btn = document.getElementById('viewer-connect-btn');
            if(btn) {
                btn.onclick = () => {
                    const input = document.getElementById('viewer-room-code');
                    if(input && input.value.trim()) this.connect(input.value.trim());
                };
            }
        }
        
        const dashBtn = document.querySelector('#viewer-login-view .back-to-main');
        if(dashBtn) {
            dashBtn.addEventListener('click', () => {
               if(window.enterDashboard) window.enterDashboard();
            });
        }
    },

    connect: function(code) {
        this.roomId = code.toUpperCase();
        const btn = document.getElementById('viewer-connect-btn');
        if(btn) { btn.disabled = true; btn.textContent = "Connecting..."; }

        window.db.ref(`rooms/${this.roomId}`).once('value', snap => {
            if(snap.exists()) {
                document.getElementById('viewer-login-view').classList.add('hidden');
                document.getElementById('viewer-main-view').classList.remove('hidden');
                this.startListener();
            } else {
                alert("Room not found");
                if(btn) { btn.disabled = false; btn.textContent = "接続する"; }
            }
        });
    },

    startListener: function() {
        const refs = {
            config: window.db.ref(`rooms/${this.roomId}/config`),
            status: window.db.ref(`rooms/${this.roomId}/status`),
            questions: window.db.ref(`rooms/${this.roomId}/questions`),
            players: window.db.ref(`rooms/${this.roomId}/players`)
        };

        refs.config.on('value', snap => {
            this.config = snap.val() || {};
            // 背景設定などを即時反映したい場合はここに記述
        });

        refs.questions.on('value', snap => {
            this.questions = snap.val() || [];
        });

        refs.status.on('value', snap => {
            const st = snap.val();
            if(!st) return;
            this.render(st);
        });
        
        refs.players.on('value', () => {
            if(this.config.gameType === 'race') this.updateViewerRace();
        });
    },

    render: function(st) {
        const mainText = document.getElementById('viewer-main-text');
        const statusDiv = document.getElementById('viewer-status');
        const viewContainer = document.getElementById('viewer-main-view');
        
        // エリア初期化
        ['viewer-panel-grid', 'viewer-bomb-grid', 'viewer-multi-grid', 'viewer-race-area', 'viewer-timer-bar-area'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
        document.getElementById('viewer-sub-text').innerHTML = '';

        // レースモードの場合の表示
        if(this.config.gameType === 'race') {
            document.getElementById('viewer-race-area').classList.remove('hidden');
            this.updateViewerRace();
        }

        // --- 1. STANDBY (待機中) ---
        if (st.step === 'standby') {
            statusDiv.textContent = "STANDBY";
            this.applyDefaultDesign(viewContainer, null);
            
            if (st.qIndex === 0) {
                // ★1問目: 番組タイトル表示
                const title = st.programTitle || this.config.periodTitle || "Quiz Studio";
                mainText.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%;">
                        <div style="font-size:5vw; font-weight:900; color:#ffd700; text-shadow:0 0 30px rgba(255,215,0,0.5); margin-bottom:20px; text-align:center; padding:0 20px;">
                            ${title}
                        </div>
                        <div style="font-size:2vw; color:#fff; font-family:monospace; letter-spacing:5px;">ID: ${this.roomId}</div>
                        <div style="margin-top:50px; font-size:1.5vw; color:#00bfff; animation:pulse 2s infinite;">WAITING FOR ENTRY...</div>
                    </div>
                    <style>@keyframes pulse { 0%{opacity:0.6;} 50%{opacity:1;} 100%{opacity:0.6;} }</style>
                `;
            } else {
                // ★2問目以降: NEXT QUESTION 表示
                mainText.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%;">
                        <div style="font-size:4vw; font-weight:bold; color:#00bfff; letter-spacing:0.1em; margin-bottom:10px;">NEXT QUESTION</div>
                        <div style="font-size:10vw; font-weight:900; color:#fff; text-shadow:0 0 30px rgba(0,191,255,0.5);">Q.${st.qIndex + 1}</div>
                        <div style="font-size:2vw; color:#aaa; margin-top:30px; letter-spacing:5px;">STANDBY...</div>
                    </div>
                `;
            }
        } 
        // --- 2. READY (開始直前) ---
        else if (st.step === 'ready') {
            statusDiv.textContent = "READY";
            const q = this.questions[st.qIndex] || {};
            this.applyDefaultDesign(viewContainer, q.design);
            mainText.innerHTML = `
                <div style="text-align:center;">
                    <div style="color:#fff; font-size:15vh; font-weight:900; letter-spacing:0.1em; text-shadow:0 10px 30px rgba(0,0,0,0.8);">
                        Q.${st.qIndex + 1}
                    </div>
                    <div style="color:#00bfff; font-size:4vh; font-weight:bold; letter-spacing:5px; margin-top:20px;">READY...</div>
                </div>
            `;
        }
        // --- 3. QUESTION / ANSWERING (出題中) ---
        else if (st.step === 'question' || st.step === 'answering') {
            statusDiv.textContent = `Q${st.qIndex + 1}`;
            
            // タイマーバー
            if (st.timeLimit) {
                const timerArea = document.getElementById('viewer-timer-bar-area');
                const timerBar = document.getElementById('viewer-timer-bar');
                timerArea.classList.remove('hidden');
                timerBar.className = '';
                timerBar.style.width = '100%';
                setTimeout(() => {
                    timerBar.className = 'timer-animate';
                    timerBar.style.transition = `width ${st.timeLimit}s linear`;
                    timerBar.style.width = '0%';
                }, 50);
            }
            // 早押し受付表示
            if (st.step === 'answering' && this.config.mode === 'buzz') {
                 statusDiv.textContent = "早押し受付中！";
                 statusDiv.style.color = "#ff9800";
            }

            const q = this.questions[st.qIndex];
            if(q) {
                this.renderQuestionLayout(viewContainer, mainText, q);
                if(q.type === 'multi') this.renderMultiGrid(q, st.multiState);
            }
        } 
        // --- 4. ANSWER / RESULT (正解発表) ---
        else if (st.step === 'answer' || st.step === 'result') {
            statusDiv.textContent = "ANSWER";
            const q = this.questions[st.qIndex];
            if(q) {
                this.renderQuestionLayout(viewContainer, mainText, q);
                
                if (st.step === 'answer') {
                    const accent = q.design?.qBorderColor || '#00bfff';
                    let ansStr = this.getAnswerString(q);
                    
                    const answerBox = document.createElement('div');
                    Object.assign(answerBox.style, {
                        position: 'absolute', bottom: '5%', left: '50%', transform: 'translateX(-50%)',
                        zIndex: '200', background: 'rgba(0,0,0,0.9)', border: `4px solid ${accent}`,
                        borderRadius: '15px', padding: '20px 50px', color: accent,
                        fontSize: '5vh', fontWeight: '900', boxShadow: '0 0 50px rgba(0,0,0,0.8)',
                        textAlign: 'center', minWidth: '50vw'
                    });
                    answerBox.innerHTML = `<span style="font-size:0.6em; display:block; color:#fff;">ANSWER</span>${ansStr}`;
                    mainText.appendChild(answerBox);
                }
            }
        } 
        // --- 5. PANEL / BOMB (特殊モード) ---
        else if (st.step === 'panel') {
            statusDiv.textContent = "PANEL";
            this.applyDefaultDesign(viewContainer, null);
            mainText.innerHTML = '';
            this.renderPanelGrid(st.panels);
        } 
        else if (st.step === 'bomb') {
            statusDiv.textContent = "BOMB";
            this.applyDefaultDesign(viewContainer, null);
            mainText.innerHTML = '';
            this.renderBombGrid(st.cards);
        }
    },

    renderQuestionLayout: function(container, contentBox, q) {
        const d = q.design || {};
        const layout = q.layout || 'standard';
        const align = q.align || 'center';
        
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

        if (q.type === 'free_oral' || q.type === 'free_written') {
            contentBox.style.flexDirection = 'column';
            contentBox.style.justifyContent = 'center';
            contentBox.style.alignItems = 'center';
            html += `<div style="${qStyleBase} width:80%; height:60%; display:flex; align-items:center; justify-content:${align==='left'?'flex-start':align==='right'?'flex-end':'center'}; font-size:8vh; font-weight:bold; border-radius:20px; padding:50px;">${q.q}</div>`;
            let typeLabel = (q.type==='free_oral') ? "フリー（口頭回答）" : "フリー（記述式）";
            html += `<div style="color:${d.cTextColor||'#aaa'}; font-size:3vh; margin-top:30px;">[ ${typeLabel} ]</div>`;
        } else {
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
    },

    getAnswerString: function(q) {
        if (!q) return "";
        if (q.type === 'choice' && q.c) {
            if (Array.isArray(q.correct)) {
                return q.correct.map(idx => q.c[idx]).join(' / ');
            }
            const idx = q.correctIndex !== undefined ? q.correctIndex : q.correct;
            return q.c[idx];
        }
        if (Array.isArray(q.correct)) {
            return q.correct.join(' / ');
        }
        return q.correct;
    },

    applyDefaultDesign: function(container, design) {
        const d = design || { mainBgColor: '#0a0a0a' };
        container.style.backgroundColor = d.mainBgColor || '#0a0a0a';
        if (d.bgImage) {
            container.style.backgroundImage = `url(${d.bgImage})`;
            container.style.backgroundSize = "cover";
            container.style.backgroundPosition = "center";
        } else {
            container.style.backgroundImage = (d.mainBgColor === '#0a0a0a') ? "radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)" : "none";
        }
    },

    renderPanelGrid: function(panels) {
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
    },

    renderBombGrid: function(cards) {
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
    },

    renderMultiGrid: function(q, state) {
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
    },

    updateViewerRace: function() {
        const container = document.getElementById('viewer-race-area');
        if(!container) return;
        window.db.ref(`rooms/${this.roomId}/players`).once('value', snap => {
            const players = snap.val() || {};
            container.innerHTML = '';
            const activePlayers = [];
            Object.keys(players).forEach(key => {
                if(players[key].isAlive) activePlayers.push({ name: players[key].name, score: players[key].periodScore || 0 });
            });
            activePlayers.sort((a,b) => b.score - a.score);
            const goal = this.config.passCount || 10;
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
};

document.addEventListener('DOMContentLoaded', () => window.App.Viewer.init());
