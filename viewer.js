/* =========================================================
 * viewer.js (v54: Multi-Answer Render)
 * =======================================================*/

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('viewer-connect-btn');
    if(btn) btn.addEventListener('click', viewerConnect);
});

function viewerConnect() {
    const code = document.getElementById('viewer-room-code').value.trim().toUpperCase();
    if(!code) { alert("Code Required"); return; }

    window.db.ref(`rooms/${code}`).once('value', snap => {
        if(!snap.exists()) { alert("Room not found"); return; }
        window.showView(window.views.viewerMain);
        startViewerListener(code);
    });
}

function startViewerListener(roomId) {
    const contentDiv = document.getElementById('viewer-content');
    const statusEl = document.getElementById('viewer-status');
    const rankArea = document.getElementById('viewer-ranking-area');
    const mainView = document.getElementById('viewer-main-view');
    const panelGrid = document.getElementById('viewer-panel-grid');
    const bombGrid = document.getElementById('viewer-bomb-grid');
    const multiGrid = document.getElementById('viewer-multi-grid'); 
    let timerInterval = null;

    let currentMode = 'normal';
    window.db.ref(`rooms/${roomId}/config`).on('value', snap => {
        const c = snap.val();
        if(c) currentMode = c.mode;
    });

    window.db.ref(`rooms/${roomId}/status`).on('value', snap => {
        const st = snap.val();
        if(!st) return;

        if(timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        const oldClock = document.querySelector('.clock-container');
        if(oldClock) oldClock.remove();

        contentDiv.appendChild(panelGrid);
        contentDiv.appendChild(bombGrid);
        contentDiv.appendChild(multiGrid);
        panelGrid.classList.add('hidden');
        bombGrid.classList.add('hidden');
        multiGrid.classList.add('hidden');
        contentDiv.innerHTML = ""; 
        contentDiv.appendChild(statusEl);

        if (st.step === 'ranking') {
            statusEl.textContent = "RANKING";
            rankArea.style.display = 'block';
            contentDiv.appendChild(rankArea); 
            renderViewerRanking(roomId, rankArea);
            return;
        }
        rankArea.style.display = 'none';

        if (st.step === 'panel') {
            contentDiv.appendChild(panelGrid);
            panelGrid.classList.remove('hidden');
            panelGrid.innerHTML = '';
            const panels = st.panels || Array(25).fill(0);
            panels.forEach((val, i) => {
                const cell = document.createElement('div');
                cell.className = 'panel-cell';
                cell.textContent = i+1;
                if(val === 1) cell.classList.add('panel-red');
                if(val === 2) cell.classList.add('panel-green');
                if(val === 3) cell.classList.add('panel-white');
                if(val === 4) cell.classList.add('panel-blue');
                panelGrid.appendChild(cell);
            });
            return;
        }

        if (st.step === 'bomb') {
            contentDiv.appendChild(bombGrid);
            bombGrid.classList.remove('hidden');
            bombGrid.innerHTML = '';
            const cards = st.cards || [];
            cards.forEach((c, i) => {
                const item = document.createElement('div');
                item.className = 'card-item';
                if(c.open) item.classList.add('flipped');
                const content = c.type === 1 ? '💥' : 'SAFE';
                const contentClass = c.type === 1 ? 'card-out' : 'card-safe';
                item.innerHTML = `<div class="card-number">${i+1}</div><div class="card-content ${contentClass}">${content}</div>`;
                bombGrid.appendChild(item);
            });
            return;
        }
        
        if (st.step === 'standby') {
            statusEl.textContent = APP_TEXT.Viewer.Waiting;
            const waitDiv = document.createElement('div');
            waitDiv.textContent = "待機中...";
            waitDiv.style.fontSize = "5vh";
            waitDiv.style.marginTop = "20vh";
            waitDiv.style.color = "var(--q-text-color)"; 
            contentDiv.appendChild(waitDiv);
        }
        else if (st.step === 'question' || st.step === 'answer') {
            if (currentMode === 'time_attack') {
                statusEl.textContent = "TIME SHOCK";
                const clock = document.createElement('div');
                clock.className = 'clock-container';
                clock.innerHTML = '<div class="clock-inner">5</div>';
                document.body.appendChild(clock);
                let left = 5.0;
                const inner = clock.querySelector('.clock-inner');
                timerInterval = setInterval(() => {
                    left -= 0.1;
                    if(left <= 0) left = 0;
                    inner.textContent = Math.ceil(left);
                    const percent = ((5 - left) / 5) * 100;
                    clock.style.setProperty('--progress', `${percent}%`);
                    if(left <= 0) clearInterval(timerInterval);
                }, 100);
            } else {
                statusEl.textContent = (st.step === 'question') ? "QUESTION" : APP_TEXT.Viewer.AnswerCheck;
            }
            
            window.db.ref(`rooms/${roomId}/questions/${st.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                if(q.design) {
                    mainView.style.setProperty('--main-bg-color', q.design.mainBgColor);
                    if(q.design.bgImage) mainView.style.setProperty('--bg-image', `url(${q.design.bgImage})`);
                    else mainView.style.setProperty('--bg-image', 'none');
                    mainView.style.setProperty('--q-text-color', q.design.qTextColor);
                    mainView.style.setProperty('--q-bg-color', q.design.qBgColor);
                    mainView.style.setProperty('--q-border-color', q.design.qBorderColor);
                    mainView.style.setProperty('--c-text-color', q.design.cTextColor);
                    mainView.style.setProperty('--c-bg-color', q.design.cBgColor);
                    mainView.style.setProperty('--c-border-color', q.design.cBorderColor);
                }

                if (q.type === 'multi') {
                    contentDiv.appendChild(multiGrid);
                    multiGrid.classList.remove('hidden');
                    multiGrid.innerHTML = '';
                    
                    const states = st.multiState || Array(q.c.length).fill(false);
                    q.c.forEach((ans, i) => {
                        const item = document.createElement('div');
                        item.className = 'card-item multi';
                        if(states[i]) item.classList.add('flipped');
                        
                        item.innerHTML = `
                            <div class="card-number">?</div>
                            <div class="card-content" style="color:#333;">${ans}</div>
                        `;
                        multiGrid.appendChild(item);
                    });
                    
                    const qArea = document.createElement('div');
                    qArea.className = 'q-area text-center';
                    qArea.textContent = q.q;
                    contentDiv.insertBefore(qArea, multiGrid);
                    
                    return;
                }

                const layoutClass = 'layout-' + (q.layout || 'standard').replace('_', '-'); 
                const container = document.createElement('div');
                container.className = `viewer-layout-container ${layoutClass}`;
                
                const qArea = document.createElement('div');
                qArea.className = 'q-area';
                if(q.align) qArea.classList.add('text-' + q.align);
                else qArea.classList.add('text-center'); 
                qArea.textContent = q.q;
                
                const cArea = document.createElement('div');
                cArea.className = 'c-area';
                
                if (q.type === 'choice' || q.type === 'sort') {
                    q.c.forEach((choice, i) => {
                        const item = document.createElement('div');
                        item.className = 'choice-item';
                        const prefix = (q.type === 'choice') ? String.fromCharCode(65 + i) : (i + 1);
                        
                        if (st.step === 'answer') {
                            let isCorrect = false;
                            if (q.type === 'choice') {
                                if (q.correctIndex !== undefined && i === q.correctIndex) isCorrect = true;
                                else if (q.correct && q.correct.includes(i)) isCorrect = true;
                            }
                            if (isCorrect) {
                                item.style.background = "#d00";
                                item.style.borderColor = "gold";
                            } else {
                                item.style.opacity = "0.5";
                            }
                        }

                        item.innerHTML = `<span class="choice-prefix">${prefix}.</span> ${choice}`;
                        cArea.appendChild(item);
                    });
                }

                container.appendChild(qArea);
                container.appendChild(cArea);
                contentDiv.appendChild(container);
            });
        }
    });
}

function renderViewerRanking(roomId, container) {
    container.innerHTML = "集計中...";
    window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
        let list = [];
        snap.forEach(p => {
            const v = p.val();
            list.push({ name: v.name, score: v.periodScore||0, time: v.periodTime||0 });
        });
        list.sort((a,b) => (b.score - a.score) || (a.time - b.time));
        
        const top10 = list.slice(0, 10);
        let html = '<table style="width:100%; font-size:3vw; border-collapse:collapse; color:white; margin-top:20px;">';
        top10.forEach((p, i) => {
            const color = i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? '#cd7f32' : 'white'));
            const rankSize = i < 3 ? '1.2em' : '1em';
            html += `<tr style="border-bottom:1px solid #555;">
                <td style="color:${color}; font-weight:bold; width:15%; text-align:center; font-size:${rankSize};">${i+1}</td>
                <td style="text-align:left; padding-left:20px;">${p.name}</td>
                <td style="text-align:right; font-family:monospace;">${p.score} pt</td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    });
}
