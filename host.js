/* =========================================================
 * host.js
 * 役割：司会者（Host）のロジック。作成、保存、スタジオ進行
 * =======================================================*/

let currentShowId = null;
let createdQuestions = [];
let studioQuestions = [];
let currentRoomId = null;
let currentQIndex = 0;
let currentConfig = { penalty: 'none', scoreUnit: 'point', theme: 'light' };

/* --- 1. ログイン & ダッシュボード --- */
document.addEventListener('DOMContentLoaded', () => {
    // トップ画面のボタン
    const hostBtn = document.getElementById('main-host-btn');
    if(hostBtn) {
        hostBtn.addEventListener('click', () => window.showView(window.views.hostLogin));
    }

    // ログイン実行
    const loginBtn = document.getElementById('host-login-submit-btn');
    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            const input = document.getElementById('show-id-input').value.trim().toUpperCase();
            if(!input) { alert("番組IDを入力してください"); return; }
            if(!/^[A-Z0-9_-]+$/.test(input)) { alert("ID文字種エラー"); return; }
            
            currentShowId = input;
            enterDashboard();
        });
    }

    // ダッシュボードのボタン
    const createBtn = document.getElementById('dash-create-btn');
    if(createBtn) createBtn.addEventListener('click', initCreatorMode);

    const studioBtn = document.getElementById('dash-studio-btn');
    if(studioBtn) studioBtn.addEventListener('click', startRoom);
});

function enterDashboard() {
    window.showView(window.views.dashboard);
    document.getElementById('dashboard-show-id').textContent = currentShowId;
    loadSavedSets();
}

// 保存済みセットの読み込み
function loadSavedSets() {
    const listEl = document.getElementById('dash-set-list');
    listEl.innerHTML = '<p style="text-align:center;">読み込み中...</p>';

    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        listEl.innerHTML = '';
        
        if(!data) {
            listEl.innerHTML = '<p style="text-align:center; color:#999;">保存されたセットはありません</p>';
            return;
        }

        Object.keys(data).forEach(key => {
            const item = data[key];
            const div = document.createElement('div');
            div.className = 'set-item';
            
            // 設定情報の表示
            const conf = item.config || {};
            const themeName = conf.theme === 'dark' ? '💰ミリオネア風' : '🌈感謝祭風';
            
            div.innerHTML = `
                <div>
                    <span>${item.title}</span> <span style="font-size:0.8em; background:#eee; padding:2px 5px; border-radius:3px;">${themeName}</span>
                    <div style="font-size:0.8em; color:#666;">
                        ${new Date(item.createdAt).toLocaleDateString()} / 全${item.questions.length}問
                    </div>
                </div>
            `;
            
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = '削除';
            delBtn.onclick = () => {
                if(confirm(`「${item.title}」を削除しますか？`)) {
                    window.db.ref(`saved_sets/${currentShowId}/${key}`).remove();
                    div.remove();
                }
            };
            div.appendChild(delBtn);
            listEl.appendChild(div);
        });
    });
}

/* --- 2. 問題作成モード --- */
function initCreatorMode() {
    createdQuestions = [];
    document.getElementById('q-list').innerHTML = '';
    document.getElementById('q-count').textContent = '0';
    document.getElementById('quiz-set-title').value = '';
    window.showView(window.views.creator);
}

document.getElementById('creator-back-btn').addEventListener('click', () => enterDashboard());

document.getElementById('add-question-btn').addEventListener('click', () => {
    const qText = document.getElementById('question-text').value.trim();
    const correctIndex = parseInt(document.getElementById('correct-index').value);
    
    const cBlue = document.querySelector('.btn-blue.choice-input').value.trim() || "A";
    const cRed = document.querySelector('.btn-red.choice-input').value.trim() || "B";
    const cGreen = document.querySelector('.btn-green.choice-input').value.trim() || "C";
    const cYellow = document.querySelector('.btn-yellow.choice-input').value.trim() || "D";

    if(!qText) { alert('問題文を入力してください'); return; }

    createdQuestions.push({
        q: qText,
        c: [cBlue, cRed, cGreen, cYellow],
        correctIndex: correctIndex
    });

    // リスト更新
    const list = document.getElementById('q-list');
    const li = document.createElement('li');
    li.textContent = `Q${createdQuestions.length}. ${qText}`;
    list.appendChild(li);
    document.getElementById('q-count').textContent = createdQuestions.length;

    // フォームクリア
    document.getElementById('question-text').value = '';
    document.getElementById('question-text').focus();
});

// クラウド保存
document.getElementById('save-to-cloud-btn').addEventListener('click', () => {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }
    const title = document.getElementById('quiz-set-title').value.trim() || "無題のセット";
    
    // 設定値の取得
    const config = {
        penalty: document.getElementById('config-penalty').value,
        scoreUnit: document.getElementById('config-score-unit').value,
        theme: document.getElementById('config-theme').value
    };

    window.db.ref(`saved_sets/${currentShowId}`).push({
        title: title,
        config: config,
        questions: createdQuestions,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert(`保存しました！`);
        enterDashboard();
    }).catch(err => alert("保存エラー: " + err.message));
});

/* --- 3. スタジオ進行モード --- */
function startRoom() {
    currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 部屋初期化
    window.db.ref(`rooms/${currentRoomId}`).set({
        questions: [],
        status: { step: 'standby', qIndex: 0 },
        config: { theme: 'light', scoreUnit: 'point' }, // デフォルト
        players: {}
    }).then(() => {
        enterHostMode(currentRoomId);
    });
}

function enterHostMode(roomId) {
    window.showView(window.views.hostControl);
    document.getElementById('host-room-id').textContent = roomId;
    document.getElementById('studio-show-id').textContent = currentShowId;
    
    // セット一覧をロード用プルダウンにセット
    const select = document.getElementById('period-select');
    select.innerHTML = '<option value="">読み込み中...</option>';
    
    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = '<option value="">-- セットを選択 --</option>';
        if(data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                // 設定と問題をJSONにしてvalueに入れる
                const payload = { q: item.questions, c: item.config || { theme:'light' } };
                const icon = (payload.c.theme === 'dark') ? '💰' : '🌈';
                
                const opt = document.createElement('option');
                opt.value = JSON.stringify(payload);
                opt.textContent = `${icon} ${item.title}`;
                select.appendChild(opt);
            });
        }
    });

    // プレイヤー人数監視
    window.db.ref(`rooms/${roomId}/players`).on('value', snap => {
        const players = snap.val() || {};
        const total = Object.keys(players).length;
        const alive = Object.values(players).filter(p => p.isAlive).length;
        document.getElementById('host-player-count').textContent = total;
        document.getElementById('host-alive-count').textContent = alive;
    });

    setupStudioButtons(roomId);
}

function setupStudioButtons(roomId) {
    const btnLoad = document.getElementById('host-load-period-btn');
    const btnNewPeriod = document.getElementById('host-new-period-btn');
    const btnStart = document.getElementById('host-start-btn');
    const btnShowAns = document.getElementById('host-show-answer-btn');
    const btnEliminate = document.getElementById('host-eliminate-slowest-btn');
    const btnNext = document.getElementById('host-next-btn');
    const btnRanking = document.getElementById('host-ranking-btn');
    const btnClose = document.getElementById('host-close-studio-btn');
    
    // ロード
    btnLoad.onclick = () => {
        const json = document.getElementById('period-select').value;
        if(!json) return;
        if(studioQuestions.length > 0 && !confirm("問題を読み込み直しますか？")) return;

        const data = JSON.parse(json);
        studioQuestions = data.q;
        currentConfig = data.c; // 設定更新
        currentQIndex = 0;

        // Firebase同期
        window.db.ref(`rooms/${roomId}/questions`).set(studioQuestions);
        window.db.ref(`rooms/${roomId}/config`).set(currentConfig);
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'standby', qIndex: 0 });

        alert(`セット完了！\nテーマ: ${currentConfig.theme}\n単位: ${currentConfig.scoreUnit}`);
        updateKanpe();
        
        btnStart.classList.add('hidden');
        btnNewPeriod.classList.remove('hidden'); // 開始ボタン出現
        document.getElementById('period-load-area').classList.add('hidden');
    };

    // 全員復活＆開始
    btnNewPeriod.onclick = () => {
        if(!studioQuestions.length) return;
        if(!confirm("全員を復活させて開始しますか？")) return;

        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ isAlive: true, periodScore:0, periodTime:0, lastTime:99999 }));
        });
        currentQIndex = 0;
        updateKanpe();

        btnStart.classList.remove('hidden');
        btnNewPeriod.classList.add('hidden');
        document.getElementById('host-status-area').textContent = "スタンバイ...";
    };

    // START
    btnStart.onclick = () => {
        const now = firebase.database.ServerValue.TIMESTAMP;
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'question', qIndex: currentQIndex, startTime: now });
        btnStart.classList.add('hidden');
        btnShowAns.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = "Thinking Time...";
    };

    // 正解発表
    btnShowAns.onclick = () => {
        const q = studioQuestions[currentQIndex];
        const correctIdx = q.correctIndex;
        
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => {
                const val = p.val();
                if(!val.isAlive) return;
                
                if(val.lastAnswer === correctIdx) {
                    const t = val.lastTime || 99999;
                    p.ref.update({ periodScore: (val.periodScore||0)+1, periodTime: (val.periodTime||0)+t });
                } else {
                    // 設定が即死なら脱落させる
                    if(currentConfig.penalty === 'immediate') {
                        p.ref.update({ isAlive: false });
                    }
                }
            });
        });
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });
        btnShowAns.classList.add('hidden');
        btnEliminate.classList.remove('hidden');
        btnNext.classList.remove('hidden');
        document.getElementById('host-status-area').textContent = "正解発表";
    };

    // 予選落ち
    btnEliminate.onclick = () => {
        if(!confirm("最も遅い1名を脱落させますか？")) return;
        const correctIdx = studioQuestions[currentQIndex].correctIndex;
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let target = null, maxT = -1;
            snap.forEach(p => {
                const v = p.val();
                if(v.isAlive && v.lastAnswer === correctIdx) {
                    if(v.lastTime > maxT) { maxT = v.lastTime; target = p.key; }
                }
            });
            if(target) {
                window.db.ref(`rooms/${roomId}/players/${target}`).update({ isAlive: false });
                alert(`脱落: ${(maxT/1000).toFixed(2)}秒`);
            } else { alert("対象なし"); }
        });
    };

    // 次へ
    btnNext.onclick = () => {
        currentQIndex++;
        if(currentQIndex >= studioQuestions.length) {
            alert("終了！");
            btnNext.classList.add('hidden');
            document.getElementById('period-load-area').classList.remove('hidden');
            return;
        }
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ lastAnswer: -1, lastTime: 99999 }));
        });
        updateKanpe();
        btnStart.classList.remove('hidden');
        btnNext.classList.add('hidden');
        btnEliminate.classList.add('hidden');
        document.getElementById('host-status-area').textContent = `Q${currentQIndex+1} スタンバイ...`;
    };

    // ランキング
    btnRanking.onclick = () => {
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            let ranking = [];
            snap.forEach(p => {
                const v = p.val();
                if(v.isAlive) ranking.push({ name: v.name, score: v.periodScore, time: v.periodTime });
            });
            ranking.sort((a,b) => (b.score - a.score) || (a.time - b.time));
            
            let msg = "🏆 ランキング 🏆\n";
            ranking.slice(0,10).forEach((r,i) => {
                msg += `${i+1}. ${r.name} (${r.score}pt / ${(r.time/1000).toFixed(2)}s)\n`;
            });
            alert(msg);
        });
    };
    
    // 閉じる
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
    } else {
        kanpeArea.classList.add('hidden');
    }
}