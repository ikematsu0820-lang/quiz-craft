/* =========================================================
 * viewer.js (v36: Choices Display)
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
    const statusEl = document.getElementById('viewer-status');
    const mainText = document.getElementById('viewer-main-text');
    const subText = document.getElementById('viewer-sub-text');
    const rankArea = document.getElementById('viewer-ranking-area');

    // ステータス監視
    window.db.ref(`rooms/${roomId}/status`).on('value', snap => {
        const st = snap.val();
        if(!st) return;

        rankArea.style.display = 'none'; // デフォルト非表示
        
        if (st.step === 'standby') {
            statusEl.textContent = APP_TEXT.Viewer.Waiting;
            mainText.textContent = "待機中...";
            subText.textContent = "";
        }
        else if (st.step === 'question') {
            statusEl.textContent = "QUESTION";
            // 問題文取得
            window.db.ref(`rooms/${roomId}/questions/${st.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                mainText.textContent = q.q;
                
                // ★変更: 選択肢の表示 (Choice & Sort)
                if(q.type === 'choice' || q.type === 'sort') {
                    let choicesHtml = '<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:30px; margin-top:30px;">';
                    q.c.forEach((choice, i) => {
                        const prefix = (q.type === 'choice') ? String.fromCharCode(65 + i) : (i + 1);
                        choicesHtml += `
                            <div style="background:rgba(255,255,255,0.15); padding:15px 30px; border-radius:10px; border:2px solid #777; font-size:0.8em; min-width:200px;">
                                <span style="color:gold; font-weight:bold; font-size:1.2em; margin-right:10px;">${prefix}.</span>
                                <span>${choice}</span>
                            </div>
                        `;
                    });
                    choicesHtml += '</div>';
                    subText.innerHTML = choicesHtml;
                } else {
                    subText.textContent = "";
                }
            });
        }
        else if (st.step === 'answer') {
            statusEl.textContent = APP_TEXT.Viewer.AnswerCheck;
            // 正解を表示
            window.db.ref(`rooms/${roomId}/questions/${st.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                mainText.textContent = q.q;
                
                let ansStr = "";
                if(q.type === 'sort') ansStr = q.c.join(' → ');
                else if(q.type === 'text') ansStr = q.correct[0];
                else {
                    const cIdx = (q.correctIndex !== undefined) ? q.correctIndex : q.correct[0];
                    const prefix = String.fromCharCode(65 + cIdx);
                    ansStr = `${prefix}. ${q.c[cIdx]}`;
                }
                
                subText.innerHTML = `<span style="color:#ff3333; background:white; padding:10px 40px; border-radius:15px; font-weight:bold;">正解: ${ansStr}</span>`;
            });
        }
        else if (st.step === 'ranking') {
            statusEl.textContent = "RANKING";
            mainText.textContent = "";
            subText.textContent = "";
            rankArea.style.display = 'block';
            
            // ランキング取得して表示
            renderViewerRanking(roomId, rankArea);
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
        
        let html = '<table style="width:100%; font-size:3vw; border-collapse:collapse; color:white;">';
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
