/* =========================================================
 * host_studio.js (v29: Studio Program Load & Ranking Sync)
 * =======================================================*/

let currentProgramConfig = { finalRanking: true }; // デフォルト

function startRoom() {
    if(periodPlaylist.length === 0) {
        if(!confirm("プレイリストが空です。スタジオへ移動しますか？")) return;
    }
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    currentPeriodIndex = 0; 
    
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
    
    document.getElementById('studio-timeline-area').classList.remove('hidden');
    document.getElementById('control-panel').classList.add('hidden');
    
    // ★追加：スタジオ内でプログラムをロードする機能
    loadProgramsInStudio();

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

// ★追加：スタジオ内プログラムローダー
function loadProgramsInStudio() {
    const select = document.getElementById('studio-program-select');
    const btn = document.getElementById('studio-load-program-btn');
    if(!select || !btn) return;

    select.innerHTML = '<option value="">読み込み中...</option>';
    
    window.db.ref(`saved_programs/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = '<option value="">保存済みプログラムを選択...</option>';
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const opt = document.createElement('option');
                // JSONで持たせる
                opt.value = JSON.stringify(item);
                opt.textContent = item.title;
                select.appendChild(opt);
            });
        }
    });

    btn.onclick = () => {
        const val = select.value;
        if(!val) { alert("プログラムを選択してください"); return; }
        
        const prog = JSON.parse(val);
        if(confirm(`プログラム「${prog.title}」を読み込んでセットしますか？\n（現在の進行内容はリセットされます）`)) {
            periodPlaylist = prog.playlist || [];
            currentProgramConfig.finalRanking = (prog.finalRanking !== false); // デフォルトtrue
            currentPeriodIndex = 0;
            renderStudioTimeline();
            alert("セットしました。再生ボタンで開始してください。");
        }
    };
}

function renderStudioTimeline() {
    const container = document.getElementById('studio-period-timeline');
    container.innerHTML = '';
    
    if(periodPlaylist.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; font-size:0.9em;">セット設定画面でリストを作成するか、上のメニューからプログラムを読み込んでください</p>';
        document.getElementById('studio-footer-controls').classList.add('hidden');
        return;
    }
    document.getElementById('studio-footer-controls').classList.remove('hidden');

    periodPlaylist.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'timeline-card';
        if (index === currentPeriodIndex) {
            div.classList.add('active');
        }
        
        let statusText = "START";
        if (index > 0) {
            if(item.config.initialStatus === 'continue') statusText = '継続';
            else if(item.config.initialStatus === 'ranking') statusText = `上位${item.config.passCount}名`;
            else statusText = '復活';
        }
        
        // 中間発表表示
        let interText = "";
        if (item.config.intermediateRanking) interText = " <span style='color:blue; font-weight:bold;'>[中間発表あり]</span>";

        div.innerHTML = `
            <div>
                <h5 style="margin:0;">第${index + 1}ピリオド: ${item.title}${interText}</h5>
                <div class="info" style="margin-top:5px;">
                    ${statusText} / 全${item.questions.length}問 / ${item.config.timeLimit}s
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

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
    
    document.getElementById('studio-timeline-area').classList.add('hidden');
    document.getElementById('control-panel').classList.remove('hidden');
    document.getElementById('studio-program-loader').classList.add('hidden'); // ローダーも隠す
    
    window.db.ref(`rooms/${currentRoomId}/questions`).set(studioQuestions);
    window.db.ref(`rooms/${currentRoomId}/config`).set(currentConfig);
    window.db.ref(`rooms/${currentRoomId}/status`).update({ step: 'standby', qIndex: 0 });
    
    window.db.ref(`rooms/${currentRoomId}/players`).once('value', snap => {
        // ... (生存判定ロジックはv26と同じ) ...
        let players = [];
        snap.forEach(p => {
            const val = p.val();
            players.push({ key: p.key, isAlive: val.isAlive, score: val.periodScore||0, time: val.periodTime||0 });
        });
        
        let survivorsKeys = [];
        if (currentConfig.initialStatus === 'ranking') {
            let alivePlayers = players.filter(p => p.isAlive);
            alivePlayers.sort((a,b) => (b.score - a.score) || (a.time - b.time));
            const limit = currentConfig.passCount || 5;
            survivorsKeys = alivePlayers.slice(0, limit).map(p => p.key);
        }

        snap.forEach(p => {
            let updateData = { periodScore: 0, periodTime: 0, lastTime: 99999, lastResult: null };
            let newIsAlive = p.val().isAlive;
            if (index === 0 || currentConfig.initialStatus === 'revive') newIsAlive = true;
            else if (currentConfig.initialStatus === 'ranking') newIsAlive = survivorsKeys.includes(p.key);
            
            updateData.isAlive = newIsAlive;
            p.ref.update(updateData);
        });
    });

    document.getElementById('current-period-title').textContent = `Now Playing: 第${index+1}ピリオド (${item.title})`;
    
    document.getElementById('host-start-btn').classList.remove('hidden');
    document.getElementById('host-show-answer-btn').classList.add('hidden');
    document.getElementById('host-next-btn').classList.add('hidden');
    document.getElementById('host-ranking-btn').classList.remove('hidden'); // 通常表示
    
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
    
    if(btnMasterPlay) btnMasterPlay.onclick = playCurrentPeriod;

    btnStart.onclick = () => {
        const now = firebase.database.ServerValue.TIMESTAMP;
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'question', qIndex: currentQIndex, startTime: now });
        btnStart.classList.add('hidden');
        btnShowAns.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = "Thinking Time...";
    };

    btnShowAns.onclick = () => {
        // ... (正解判定ロジック v26と同じ) ...
        const q = studioQuestions[currentQIndex];
        const points = parseInt(q.points) || 1;
        const loss = parseInt(q.loss) || 0;
        
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let slowestId = null;
            let maxTime = -1;
            snap.forEach(p => {
                const val = p.val();
                if(!val.isAlive) return;
                const ans = val.lastAnswer;
                let isCorrect = false;
                if (q.type === 'sort') {
                    if (Array.isArray(ans) && JSON.stringify(ans) === JSON.stringify(q.correct)) isCorrect = true;
                } else if (q.type === 'text') {
                    if (ans && q.correct.some(c => c.trim().toLowerCase() === ans.trim().toLowerCase())) isCorrect = true;
                } else {
                    if (q.correctIndex !== undefined) isCorrect = (ans == q.correctIndex);
                    else if (q.correct) isCorrect = (ans == q.correct[0]); 
                }
                
                if(isCorrect) {
                    const t = val.lastTime || 99999;
                    p.ref.update({ 
                        periodScore: (val.periodScore||0) + points, 
                        periodTime: (val.periodTime||0) + t,
                        lastResult: 'win'
                    });
                    if (currentConfig.eliminationRule === 'wrong_and_slowest') {
                        if (t > maxTime) { maxTime = t; slowestId = p.key; }
                    }
                } else {
                    let newScore = val.periodScore || 0;
                    if (loss > 0) newScore -= loss;
                    else if (currentConfig.lossPoint) {
                        if (currentConfig.lossPoint === 'reset') newScore = 0;
                        else newScore += parseInt(currentConfig.lossPoint);
                    }
                    p.ref.update({ periodScore: newScore, lastResult: 'lose' });
                    if (currentConfig.eliminationRule !== 'none') p.ref.update({ isAlive: false });
                }
            });
            if (currentConfig.eliminationRule === 'wrong_and_slowest' && slowestId) {
                window.db.ref(`rooms/${roomId}/players/${slowestId}`).update({ isAlive: false, lastResult: 'lose' });
            }
        });
        
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });
        btnShowAns.classList.add('hidden');
        btnNext.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = "正解発表";

        // ★ボタンの文言制御（中間発表・最終発表への分岐）
        if (currentQIndex >= studioQuestions.length - 1) {
            // 次のピリオドがあるか確認
            if (currentPeriodIndex < periodPlaylist.length - 1) {
                // 次のピリオドの中間発表フラグをチェック
                const nextPeriod = periodPlaylist[currentPeriodIndex + 1];
                if (nextPeriod.config.intermediateRanking) {
                    btnNext.textContent = "中間発表へ";
                    btnNext.className = "btn-success btn-block";
                    // データ属性でフラグを立てる
                    btnNext.dataset.action = "ranking"; 
                } else {
                    btnNext.textContent = "次のピリオドへ進む";
                    btnNext.className = "btn-warning btn-block";
                    btnNext.dataset.action = "next";
                }
            } else {
                // 最終ピリオド終了後
                if (currentProgramConfig.finalRanking) {
                    btnNext.textContent = "最終結果発表へ";
                    btnNext.className = "btn-danger btn-block";
                    btnNext.dataset.action = "final";
                } else {
                    btnNext.textContent = "全工程終了";
                    btnNext.className = "btn-dark btn-block";
                    btnNext.dataset.action = "end";
                }
            }
        } else {
            btnNext.textContent = "次の問題へ";
            btnNext.className = "btn-info btn-block";
            btnNext.dataset.action = "nextQ";
        }
    };

    btnNext.onclick = (e) => {
        const action = e.target.dataset.action;

        if (action === "ranking" || action === "final") {
            // ランキング画面へ（自動的にボタンを押したことにする）
            btnRanking.click();
            
            // アラートの代わりに、ランキング画面から「次へ」進めるようにする
            // 今回は簡易的に、ランキングを見た後「スタジオに戻る」と
            // 自動的に次のピリオドへ進む準備ができている状態にする必要があるが、
            // 構造上難しいので、ランキング画面から戻ったら手動で「次へ（playPeriod）」を呼ぶUIにするか、
            // ここで一旦処理を止めてホストに任せる。
            
            // ★改良：ランキング表示中はボタンを「次へ進む」に変えておく
            if (action === "ranking") {
                btnNext.textContent = "ランキングを終了して次へ";
                btnNext.className = "btn-warning btn-block";
                btnNext.dataset.action = "next"; // 次回クリック時は次へ
            } else {
                btnNext.textContent = "全工程終了";
                btnNext.className = "btn-dark btn-block";
                btnNext.dataset.action = "end";
            }
            return;
        }

        if (action === "next") {
            playPeriod(currentPeriodIndex + 1);
            return;
        }
        
        if (action === "end") {
            alert("全てのピリオドが終了しました！お疲れ様でした！");
            btnNext.classList.add('hidden');
            return;
        }

        // nextQ
        currentQIndex++;
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ lastAnswer: null, lastTime: 99999, lastResult: null }));
        });
        updateKanpe();
        btnStart.classList.remove('hidden');
        btnNext.classList.add('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} スタンバイ...`;
    };

    // ★ランキング表示・同期
    btnRanking.onclick = () => {
        // ステータスを 'ranking' に更新して回答者画面を切り替える
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'ranking' });

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
        // 戻る時にステータスを戻す？今回はそのまま standby に戻す
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'standby' });
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
        
        let ansText = "";
        if (q.type === 'sort') ansText = `正解順: ${q.c.join(' → ')}`;
        else if (q.type === 'text') ansText = `正解: ${q.correct.join(' / ')}`;
        else {
            const labels = (currentConfig.theme === 'dark') ? ["A","B","C","D"] : ["青","赤","緑","黄"];
            const cIdx = (q.correctIndex !== undefined) ? q.correctIndex : q.correct[0];
            ansText = `正解: ${labels[cIdx]} (${q.c[cIdx]})`;
        }
        document.getElementById('kanpe-answer').textContent = ansText;
        
        const timeLimit = currentConfig.timeLimit || 0;
        const timeText = timeLimit > 0 ? `制限 ${timeLimit}秒` : '制限なし';
        const points = q.points || 1;
        const loss = q.loss || 0;
        document.getElementById('kanpe-point').textContent = `配点:${points} / 失点:-${loss}`;
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
        let scoreText = `${r.score}点`;
        if (isCurrency) scoreText = `¥${r.score.toLocaleString()}`;
        
        div.innerHTML = `
            <div style="display:flex; align-items:center;">
                <span class="rank-badge">${rank}</span>
                <span>${r.name}</span>
            </div>
            <div class="rank-score">${scoreText}</div>
        `;
        list.appendChild(div);
    });
}
