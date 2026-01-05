/* =========================================================
 * viewer.js (v45: Granular Design Apply)
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
        
        // 画面切り替え
        window.showView(window.views.viewerMain);
        startViewerListener(code);
    });
}

function startViewerListener(roomId) {
    const contentDiv = document.getElementById('viewer-content');
    const statusEl = document.getElementById('viewer-status');
    const rankArea = document.getElementById('viewer-ranking-area');
    const mainView = document.getElementById('viewer-main-view');

    // ステータス監視
    window.db.ref(`rooms/${roomId}/status`).on('value', snap => {
        const st = snap.val();
        if(!st) return;

        // ランキング時はエリア切り替え
        if (st.step === 'ranking') {
            statusEl.textContent = "RANKING";
            contentDiv.innerHTML = ""; 
            rankArea.style.display = 'block';
            contentDiv.appendChild(rankArea); 
            renderViewerRanking(roomId, rankArea);
            return;
        }

        rankArea.style.display = 'none';
        
        // コンテンツ再構築
        contentDiv.innerHTML = ""; 
        contentDiv.appendChild(statusEl); 
        
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
            statusEl.textContent = (st.step === 'question') ? "QUESTION" : APP_TEXT.Viewer.AnswerCheck;
            
            // 問題データ取得
            window.db.ref(`rooms/${roomId}/questions/${st.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                
                // ★v45: 詳細デザイン適用
                if(q.design) {
                    // Main
                    mainView.style.setProperty('--main-bg-color', q.design.mainBgColor);
                    if(q.design.bgImage) {
                        mainView.style.setProperty('--bg-image', `url(${q.design.bgImage})`);
                    } else {
                        mainView.style.setProperty('--bg-image', 'none');
                    }
                    
                    // Question Area
                    mainView.style.setProperty('--q-text-color', q.design.qTextColor);
                    mainView.style.setProperty('--q-bg-color', q.design.qBgColor);
                    mainView.style.setProperty('--q-border-color', q.design.qBorderColor);
                    
                    // Choice Area
                    mainView.style.setProperty('--c-text-color', q.design.cTextColor);
                    mainView.style.setProperty('--c-bg-color', q.design.cBgColor);
                    mainView.style.setProperty('--c-border-color', q.design.cBorderColor);
                }

                // レイアウト
                const layoutClass = 'layout-' + (q.layout || 'standard').replace('_', '-'); 
                
                const container = document.createElement('div');
                container.className = `viewer-layout-container ${layoutClass}`;
                
                // 問題文
                const qArea = document.createElement('div');
                qArea.className = 'q-area';
                if(q.align) {
                    qArea.classList.add('text-' + q.align);
                } else {
                    qArea.classList.add('text-center'); 
                }
                qArea.textContent = q.q;
                
                // 選択肢
                const cArea = document.createElement('div');
                cArea.className = 'c-area';
                
                if (q.type === 'choice' || q.type === 'sort') {
                    q.c.forEach((choice, i) => {
                        const item = document.createElement('div');
                        item.className = 'choice-item';
                        const prefix = (q.type === 'choice') ? String.fromCharCode(65 + i) : (i + 1);
                        
                        // 正解表示
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
