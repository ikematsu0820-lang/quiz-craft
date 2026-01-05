/* =========================================================
 * viewer.js (v34: Monitor View Logic)
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
            mainText.textContent = "次の問題を待っています";
            subText.textContent = "";
        }
        else if (st.step === 'question') {
            statusEl.textContent = "QUESTION";
            // 問題文取得
            window.db.ref(`rooms/${roomId}/questions/${st.qIndex}`).once('value', qSnap => {
                const q = qSnap.val();
                mainText.textContent = q.q;
                
                if(q.type === 'choice') {
                    // 選択肢を表示しても良いが、シンプルに問題文だけでもOK
                    subText.textContent = q.c.join(' / ');
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
                if(q.type === 'sort') ansStr = q.c.join('→');
                else if(q.type === 'text') ansStr = q.correct[0];
                else {
                    const cIdx = (q.correctIndex !== undefined) ? q.correctIndex : q.correct[0];
                    ansStr = q.c[cIdx];
                }
                
                subText.innerHTML = `<span style="color:#d00;">正解: ${ansStr}</span>`;
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
        
        // 上位10名を表示
        const top10 = list.slice(0, 10);
        let html = '<table style="width:100%; font-size:1.2em; border-collapse:collapse;">';
        top10.forEach((p, i) => {
            const color = i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? '#cd7f32' : 'white'));
            html += `<tr style="border-bottom:1px solid #555;">
                <td style="color:${color}; font-weight:bold; width:50px;">${i+1}</td>
                <td style="text-align:left;">${p.name}</td>
                <td style="text-align:right;">${p.score} pt</td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    });
}
