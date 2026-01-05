/* =========================================================
 * viewer.js (v35: New Monitor View Logic)
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
                
                if(q.type === 'choice') {
                    // 選択肢を表示 (大画面用に改行など入れる)
                    subText.textContent = q.c.join('  /  ');
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
                
                // 大画面用に装飾
                subText.innerHTML = `<span style="color:#d00; background:white; padding:5px 20px; border-radius:10px;">正解: ${ansStr}</span>`;
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
        
        // 大画面用テーブル（vw単位で調整）
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
