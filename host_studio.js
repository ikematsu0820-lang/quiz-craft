/* =========================================================
 * host_studio.js (v14: Single Master Play Button)
 * =======================================================*/

function startRoom() {
    if(periodPlaylist.length === 0) {
        if(!confirm("プレイリストが空です。スタジオへ移動しますか？")) return;
    }
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    currentPeriodIndex = 0; // 最初は0番目をセット
    
    window.db.ref(`rooms/${currentRoomId}`).set({
        questions: [],
        status: { step: 'standby', qIndex: 0 },
        config: { theme: 'light', scoreUnit: 'point' },
        players: {}
    }).then(() => {
        enterHostMode(currentRoomId);
    });
}

function enterHostMode(roomId) {
    window.showView(window.views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;
    document.getElementById('studio-show-id').textContent = currentShowId;
    
    // UI初期化：リストを表示、コントロールパネルを隠す
    document.getElementById('studio-timeline-area').classList.remove('hidden');
    document.getElementById('control-panel').classList.add('hidden');
    
    renderStudioTimeline();

    window.db.ref(`rooms/${roomId}/players`).on('value', snap => {
        const players = snap.val() || {};
        const total = Object.keys(players).length;
        const alive = Object.values(players).filter(p => p.isAlive).length;
        document.getElementById('host-player-count').textContent = total;
        document.getElementById('host-alive-count').textContent = alive;
    });

    setupStudioButtons(roomId);
}

function renderStudioTimeline() {
    const container = document.getElementById('studio-period-timeline');
    container.innerHTML = '';
    
    if(periodPlaylist.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; font-size:0.9em;">セット設定画面でリストを作成してください</p>';
        // プレイリストがないなら再生ボタンも隠す
        document.getElementById('studio-footer-controls').classList.add('hidden');
        return;
    }
    document.getElementById('studio-footer-controls').classList.remove('hidden');

    periodPlaylist.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'timeline-card';
        // 現在のピリオドをハイライト
        if (index === currentPeriodIndex) {
            div.classList.add('active');
        }
        
        let statusText = "START";
        if (index > 0) {
            if(item.config.initialStatus === 'continue') statusText = '継続';
            else if(item.config.initialStatus === 'ranking') statusText = `上位${item.config.passCount}名`;
            else statusText = '復活';
        }
        
        div.innerHTML = `
            <div>
                <h5 style="margin:0;">第${index + 1}ピリオド: ${item.title}</h5>
                <div class="info" style="margin-top:5px;">
                    ${statusText} / 全${item.questions.length}問 / 制限${item.config.timeLimit}秒
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// ★マスター再生ボタンから呼ばれる
function playCurrentPeriod() {
    if(!periodPlaylist[currentPeriodIndex]) {
        alert("再生するピリオドがありません");
        return;
    }
    playPeriod(currentPeriodIndex);
}

window.playPeriod = function(index) {
    if(!periodPlaylist[index]) return;
    const item = periodPlaylist[index];
    
    currentPeriodIndex = index;
    studioQuestions = item.questions;
    currentConfig = item.config;
    currentQIndex = 0;
    
    // リストエリアを隠して、コントロールパネルを表示
    document.getElementById('studio-timeline-area').classList.add('hidden');
    document.getElementById('control-panel').classList.remove('hidden');
    
    window.db.ref(`rooms/${currentRoomId}/questions`).set(studioQuestions);
    window.db.ref(`rooms/${currentRoomId}/config`).set(currentConfig);
    window.db.ref(`rooms/${currentRoomId}/status`).update({ step: 'standby', qIndex: 0 });
    
    // 参加者状態更新
    window.db.ref(`rooms/${currentRoomId}/players`).once('value', snap => {
        let players = [];
        snap.forEach(p => {
            const val = p.val();
            players.push({
                key: p.key,
                isAlive: val.isAlive,
                score: val.periodScore || 0,
                time: val.periodTime || 0
            });
        });

        let survivorsKeys = [];
        if (currentConfig.initialStatus === 'ranking') {
            let alivePlayers = players.filter(p => p.isAlive);
            alivePlayers.sort((a,b) => (b.score - a.score) || (a.time - b.time));
            const limit = currentConfig.passCount || 5;
            survivorsKeys = alivePlayers.slice(0, limit).map(p => p.key);
        }

        snap.forEach(p => {
            let updateData = { periodScore: 0, periodTime: 0, lastTime: 99999 };
            let newIsAlive = p.val().isAlive;

            if (index === 0 || currentConfig.initialStatus === 'revive') {
                newIsAlive = true;
            } else if (currentConfig.initialStatus === 'ranking') {
                newIsAlive = survivorsKeys.includes(p.key);
            }

            updateData.isAlive = newIsAlive;
            p.ref.update(updateData);
        });
    });

    document.getElementById('current-period-title').textContent = `Now Playing: 第${index+1}ピリオド (${item.title})`;
    
    document.getElementById('host-start-btn').classList.remove('hidden');
    document.getElementById('host-show-answer-btn').classList.add('hidden');
    document.getElementById('host-next-btn').classList.add('hidden');
    
    alert(`第${index+1}ピリオドをセットしました`);
    updateKanpe();
};

function setupStudioButtons(roomId) {
    const btnMasterPlay = document.getElementById('studio-master-play-btn');
    const btnStart = document.getElementById('host-start-btn');
    const btnShowAns = document.getElementById('host-show-answer-btn');
    const btnNext = document.getElementById('host-next-btn');
    const btnRanking = document.getElementById('host-ranking-btn');
    const btnClose = document.getElementById('host-close-studio-btn');
    const rankingBackBtn = document.getElementById('ranking-back-btn');
    
    // ★マスター再生ボタン
    if(btnMasterPlay) btnMasterPlay.onclick = playCurrentPeriod;

    btnStart.onclick = () => {
        const now = firebase.database.ServerValue.TIMESTAMP;
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'question', qIndex: currentQIndex, startTime: now });
        btnStart.classList.add('hidden');
        btnShowAns.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = "Thinking Time...";
    };

    btnShowAns.onclick = () => {
        const q = studioQuestions[currentQIndex];
        const correctIdx = q.correctIndex;
        
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let slowestId = null;
            let maxTime = -1;

            snap.forEach(p => {
                const val = p.val();
                if(!val.isAlive) return;

                const isCorrect = (val.lastAnswer === correctIdx);
                
                if(isCorrect) {
                    const t = val.lastTime || 99999;
                    p.ref.update({ periodScore: (val.periodScore||0)+1, periodTime: (val.periodTime||0)+t });
                    
                    if (currentConfig.eliminationRule === 'wrong_and_slowest') {
                        if (t > maxTime) {
                            maxTime = t;
                            slowestId = p.key;
                        }
                    }
                } 
                else {
                    if (currentConfig.eliminationRule !== 'none') {
                        p.ref.update({ isAlive: false });
                    }
                }
            });

            if (currentConfig.eliminationRule === 'wrong_and_slowest' && slowestId) {
                window.db.ref(`rooms/${roomId}/players/${slowestId}`).update({ isAlive: false });
            }
        });
        
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });
        btnShowAns.classList.add('hidden');
        btnNext.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = "正解発表";

        if (currentQIndex >= studioQuestions.length - 1) {
            if (currentPeriodIndex < periodPlaylist.length - 1) {
                btnNext.textContent = "このピリオドを終了して次へ";
                btnNext.classList.remove('btn-info');
                btnNext.classList.add('btn-warning');
            } else {
                btnNext.textContent = "全工程終了";
                btnNext.classList.remove('btn-info');
                btnNext.classList.add('btn-dark');
            }
        } else {
            btnNext.textContent = "次の問題へ";
            btnNext.classList.remove('btn-warning', 'btn-dark');
            btnNext.classList.add('btn-info');
        }
    };

    btnNext.onclick = () => {
        // ピリオド終了時の処理
        if (currentQIndex >= studioQuestions.length - 1) {
            if (currentPeriodIndex < periodPlaylist.length - 1) {
                if(confirm("このピリオドを終了し、番組リストに戻りますか？")) {
                    // 次のピリオドへインデックスを進める
                    currentPeriodIndex++;
                    // リスト画面に戻る（ハイライトが次に移る）
                    document.getElementById('control-panel').classList.add('hidden');
                    document.getElementById('studio-timeline-area').classList.remove('hidden');
                    renderStudioTimeline();
                }
            } else {
                alert("全てのピリオドが終了しました！お疲れ様でした！");
                btnNext.classList.add('hidden');
            }
            return;
        }

        // 通常の問題進行
        currentQIndex++;
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ lastAnswer: -1, lastTime: 99999 }));
        });
        updateKanpe();
        btnStart.classList.remove('hidden');
        btnNext.classList.add('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} スタンバイ...`;
    };

    btnRanking.onclick = () => {
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let ranking = [];
            snap.forEach(p => {
                const v = p.val();
                ranking.push({ name: v.name, score: v.periodScore, time: v.periodTime, isAlive: v.isAlive });
            });
            ranking.sort((a,b) => (b.score - a.score) || (a.time - b.time));
            renderRankingView(ranking);
            window.showView(window.views.ranking);
        });
    };

    rankingBackBtn.onclick = () => {
        window.showView(window.views.hostControl);
    };
    
    btnClose.onclick = () => {
        if(confirm("ダッシュボードに戻りますか？")) enterDashboard();
    };
}

function updateKanpe() {
    const kanpeArea = document.getElementById('host-kanpe-area');
    if(studioQuestions.length > currentQIndex) {
        const q = studioQuestions[currentQIndex];
        kanpeArea.classList.remove('hidden');
        document.getElementById('kanpe-question').textContent = `Q${currentQIndex+1}. ${q.q}`;
        const labels = (currentConfig.theme === 'dark') ? ["A","B","C","D"] : ["青","赤","緑","黄"];
        document.getElementById('kanpe-answer').textContent = `正解: ${labels[q.correctIndex]} (${q.c[q.correctIndex]})`;
        
        const timeLimit = currentConfig.timeLimit || 0;
        const timeText = timeLimit > 0 ? `制限 ${timeLimit}秒` : '制限なし';
        const limitEl = document.getElementById('kanpe-time-limit');
        if(!limitEl) {
            const div = document.createElement('div');
            div.id = 'kanpe-time-limit';
            div.style.fontSize = "0.8em";
            div.style.color = "#666";
            div.style.marginTop = "5px";
            kanpeArea.appendChild(div);
        }
        document.getElementById('kanpe-time-limit').textContent = timeText;

    } else {
        kanpeArea.classList.add('hidden');
    }
}

function renderRankingView(data) {
    const list = document.getElementById('ranking-list');
    list.innerHTML = '';
    if (data.length === 0) { list.innerHTML = '<p style="padding:20px;">参加者がいません</p>'; return; }
    const isCurrency = (currentConfig.scoreUnit === 'currency');
    data.forEach((r, i) => {
        const rank = i + 1;
        const div = document.createElement('div');
        let rankClass = 'rank-row';
        if (rank === 1) rankClass += ' rank-1';
        else if (rank === 2) rankClass += ' rank-2';
        else if (rank === 3) rankClass += ' rank-3';
        if (!r.isAlive && currentConfig.eliminationRule !== 'none') {
            div.style.opacity = "0.6"; div.style.background = "#eee";
        }
        div.className = rankClass;
        let scoreText = `${r.score}問`;
        if (isCurrency) {
            const amount = (r.score > 0) ? RANKING_MONEY_TREE[Math.min(r.score-1, RANKING_MONEY_TREE.length-1)] : 0;
            scoreText = `¥${amount.toLocaleString()}`;
        }
        const timeText = `${(r.time/1000).toFixed(2)}s`;
        div.innerHTML = `
            <div style="display:flex; align-items:center;">
                <span class="rank-badge">${rank}</span>
                <span>${r.name}</span>
            </div>
            <div class="rank-score">${scoreText}<br><small>${timeText}</small></div>
        `;
        list.appendChild(div);
    });
}
