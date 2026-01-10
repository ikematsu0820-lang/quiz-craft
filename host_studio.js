/* =========================================================
 * host_studio.js (v66: Refactored Module)
 * =======================================================*/

App.Studio = {
    timer: null,
    buzzWinner: null,
    isQuick: false,

    // スタジオ起動 (Dashボタンから)
    startRoom: function(isQuick = false) {
        this.isQuick = isQuick;
        App.Data.studioQuestions = [];
        
        // Quickじゃないならプレイリストは空にしない（Configから来た場合のため）
        // ただしDashから直接来た場合は空にすべきだが、今回はConfig連携を優先
        
        App.State.currentQIndex = 0;
        App.State.currentPeriodIndex = 0;
        App.Data.currentConfig = { theme: 'light', scoreUnit: 'point', mode: 'normal' };
        
        // RoomID生成
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        App.State.currentRoomId = code;
        
        // DB初期化
        window.db.ref(`rooms/${code}`).set({
            questions: [],
            status: { step: 'standby', qIndex: 0 },
            config: App.Data.currentConfig,
            players: {}
        }).then(() => {
            this.enterHostMode();
        });
    },

    enterHostMode: function() {
        const roomId = App.State.currentRoomId;
        App.Ui.showView(App.Ui.views.hostControl);
        
        document.getElementById('host-room-id').textContent = roomId;
        document.getElementById('studio-show-id').textContent = App.State.currentShowId;
        
        // パネル初期化
        ['studio-program-loader', 'studio-timeline-area', 'control-panel'].forEach(id => document.getElementById(id).classList.add('hidden'));
        ['host-buzz-winner-area', 'host-kanpe-area'].forEach(id => document.getElementById(id).classList.add('hidden'));

        // プレイヤー監視
        window.db.ref(`rooms/${roomId}/players`).on('value', snap => {
            const players = snap.val() || {};
            document.getElementById('host-player-count').textContent = Object.keys(players).length;
            document.getElementById('host-alive-count').textContent = Object.values(players).filter(p=>p.isAlive).length;
            if(App.Data.currentConfig.mode === 'buzz') this.checkBuzz(players);
        });

        // Quick Start分岐
        if (this.isQuick && App.Data.periodPlaylist.length > 0) {
            this.renderTimeline();
            setTimeout(() => this.playPeriod(0), 500); // 自動再生
            App.Ui.showToast("🚀 Quick Start!");
        } else {
            document.getElementById('studio-program-loader').classList.remove('hidden');
            this.loadProgramList();
        }
    },

    loadProgramList: function() {
        const select = document.getElementById('studio-program-select');
        select.innerHTML = '<option>Loading...</option>';
        window.db.ref(`saved_programs/${App.State.currentShowId}`).once('value', snap => {
            const data = snap.val();
            select.innerHTML = '<option value="">Select Program...</option>';
            if(data) {
                Object.values(data).forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = JSON.stringify(p);
                    opt.textContent = p.title;
                    select.appendChild(opt);
                });
            }
        });
        
        document.getElementById('studio-load-program-btn').onclick = () => {
            const val = select.value;
            if(!val) return;
            const prog = JSON.parse(val);
            App.Data.periodPlaylist = prog.playlist || [];
            document.getElementById('studio-program-loader').classList.add('hidden');
            this.renderTimeline();
        };
    },

    renderTimeline: function() {
        const area = document.getElementById('studio-period-timeline');
        area.innerHTML = '';
        document.getElementById('studio-timeline-area').classList.remove('hidden');
        
        App.Data.periodPlaylist.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = `timeline-card ${i===App.State.currentPeriodIndex ? 'active' : ''}`;
            div.innerHTML = `
                <div>
                    <h5 class="m-0">${i+1}. ${item.title}</h5>
                    <div class="text-sm text-gray">[${item.config.mode}]</div>
                </div>
            `;
            area.appendChild(div);
        });
        document.getElementById('studio-master-play-btn').onclick = () => this.playPeriod(App.State.currentPeriodIndex);
    },

    playPeriod: function(index) {
        const item = App.Data.periodPlaylist[index];
        if(!item) return;
        
        App.State.currentPeriodIndex = index;
        App.Data.studioQuestions = item.questions;
        App.Data.currentConfig = item.config;
        App.State.currentQIndex = 0;
        
        if(this.timer) clearTimeout(this.timer);

        // UI切り替え
        document.getElementById('studio-timeline-area').classList.add('hidden');
        document.getElementById('control-panel').classList.remove('hidden');
        document.getElementById('current-period-title').textContent = item.title;
        
        // パネル等のリセット
        ['host-panel-control-area','host-bomb-control-area','host-multi-control-area'].forEach(id => document.getElementById(id).classList.add('hidden'));

        // Config反映
        const roomId = App.State.currentRoomId;
        window.db.ref(`rooms/${roomId}/config`).set(App.Data.currentConfig);
        window.db.ref(`rooms/${roomId}/questions`).set(App.Data.studioQuestions);
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'standby', qIndex: 0 });

        // 各種モード初期化
        if(App.Data.currentConfig.gameType === 'territory') this.initPanel(roomId);
        else if(App.Data.currentConfig.mode === 'bomb') this.initBomb(roomId);
        
        this.updateKanpe();
        this.updateStatusText("Ready...");
        
        // ボタン表示制御
        const isTA = App.Data.currentConfig.mode === 'time_attack';
        document.getElementById('host-start-btn').classList.toggle('hidden', isTA);
        document.getElementById('host-start-ta-btn').classList.toggle('hidden', !isTA);
    },

    // 進行操作
    startQ: function() {
        const roomId = App.State.currentRoomId;
        const now = firebase.database.ServerValue.TIMESTAMP;
        const update = { step: 'question', qIndex: App.State.currentQIndex, startTime: now };
        
        if (App.Data.currentConfig.mode === 'buzz') {
            update.isBuzzActive = true; 
            this.buzzWinner = null;
            document.getElementById('host-buzz-winner-area').classList.add('hidden');
        }
        
        window.db.ref(`rooms/${roomId}/status`).update(update);
        document.getElementById('host-start-btn').classList.add('hidden');
        document.getElementById('host-show-answer-btn').classList.remove('hidden');
        this.updateStatusText("Active...");
    },

    showAns: function() {
        // 一斉採点 (Normal/Score)
        if(App.Data.currentConfig.mode === 'normal') this.judgeSimultaneous();
        
        const roomId = App.State.currentRoomId;
        window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer', isBuzzActive: false });
        
        document.getElementById('host-show-answer-btn').classList.add('hidden');
        const btnNext = document.getElementById('host-next-btn');
        btnNext.classList.remove('hidden');
        
        if (App.State.currentQIndex >= App.Data.studioQuestions.length - 1) {
            btnNext.textContent = APP_TEXT.Studio.BtnNextPeriod;
            btnNext.onclick = () => this.playPeriod(App.State.currentPeriodIndex + 1);
        } else {
            btnNext.textContent = APP_TEXT.Studio.BtnNextQ;
            btnNext.onclick = () => this.nextQ();
        }
    },

    nextQ: function() {
        App.State.currentQIndex++;
        const roomId = App.State.currentRoomId;
        
        // プレイヤー状態リセット
        window.db.ref(`rooms/${roomId}/players`).once('value', snap => {
            snap.forEach(p => p.ref.update({ lastAnswer: null, lastResult: null, buzzTime: null }));
        });

        this.updateKanpe();
        document.getElementById('host-next-btn').classList.add('hidden');
        document.getElementById('host-start-btn').classList.remove('hidden');
        this.updateStatusText(`Q${App.State.currentQIndex+1} Standby`);
    },

    // 早押し判定
    checkBuzz: function(players) {
        if (this.buzzWinner) return;
        const candidates = Object.entries(players)
            .filter(([_, p]) => p.buzzTime && !p.lastResult) // 誤答者は除外
            .sort((a, b) => a[1].buzzTime - b[1].buzzTime);
            
        if (candidates.length > 0) {
            const [id, p] = candidates[0];
            this.buzzWinner = id;
            
            window.db.ref(`rooms/${App.State.currentRoomId}/status`).update({ currentAnswerer: id, isBuzzActive: false });
            
            const area = document.getElementById('host-buzz-winner-area');
            area.classList.remove('hidden');
            document.getElementById('host-buzz-winner-name').textContent = p.name;
            document.getElementById('host-manual-judge-area').classList.remove('hidden');
        }
    },

    judgeBuzz: function(isCorrect) {
        if(!this.buzzWinner) return;
        const roomId = App.State.currentRoomId;
        const pts = App.Data.studioQuestions[App.State.currentQIndex].points || 1;
        
        window.db.ref(`rooms/${roomId}/players/${this.buzzWinner}`).once('value', snap => {
            const p = snap.val();
            if(isCorrect) {
                snap.ref.update({ periodScore: (p.periodScore||0) + pts, lastResult: 'win' });
                this.showAns(); // 正解なら終了
            } else {
                snap.ref.update({ lastResult: 'lose', buzzTime: null }); // 不正解フラグ
                this.buzzWinner = null;
                document.getElementById('host-buzz-winner-area').classList.add('hidden');
                // 続行 (Buzz再開)
                window.db.ref(`rooms/${roomId}/status`).update({ currentAnswerer: null, isBuzzActive: true });
            }
        });
        document.getElementById('host-manual-judge-area').classList.add('hidden');
    },

    // 一斉採点ロジック
    judgeSimultaneous: function() {
        const q = App.Data.studioQuestions[App.State.currentQIndex];
        if(!q) return;
        window.db.ref(`rooms/${App.State.currentRoomId}/players`).once('value', snap => {
            snap.forEach(pSnap => {
                const p = pSnap.val();
                let isCorrect = false;
                // 簡易判定 (Choice index OR text match)
                if(q.type === 'choice') {
                    const ans = parseInt(p.lastAnswer);
                    if(Array.isArray(q.correct) ? q.correct.includes(ans) : ans === q.correct) isCorrect = true;
                } else if (q.correct && p.lastAnswer) {
                     // フリー記述など
                     if(Array.isArray(q.correct) && q.correct.includes(p.lastAnswer)) isCorrect = true;
                }
                
                if(isCorrect) pSnap.ref.update({ periodScore: (p.periodScore||0) + (q.points||1), lastResult: 'win' });
                else pSnap.ref.update({ lastResult: 'lose' });
            });
        });
    },

    // ユーティリティ
    updateKanpe: function() {
        const q = App.Data.studioQuestions[App.State.currentQIndex];
        const area = document.getElementById('host-kanpe-area');
        if(!q) { area.classList.add('hidden'); return; }
        
        area.classList.remove('hidden');
        document.getElementById('kanpe-question').textContent = `Q${App.State.currentQIndex+1}. ${q.q}`;
        document.getElementById('kanpe-answer').textContent = `A. ${q.correct}`;
    },
    updateStatusText: function(txt) {
        document.getElementById('host-status-area').textContent = txt;
    },
    
    // Quick Start Entry
    quickStart: function(setData) {
        // デザイン強制注入 (U-NEXT)
        const unextDesign = { mainBgColor: "#0a0a0a", qTextColor: "#fff", qBgColor: "rgba(255,255,255,0.05)", qBorderColor: "#00bfff" };
        const questions = (setData.questions||[]).map(q => { if(!q.design) q.design = unextDesign; return q; });
        
        App.Data.periodPlaylist = [{
            title: setData.title || "Quick Play",
            questions: questions,
            config: { mode: 'normal', gameType: 'score', theme: 'dark' }
        }];
        this.startRoom(true); // Quick flag ON
    },
    
    // --- パネル・ボム初期化 (省略実装) ---
    initPanel: function(rid) { /* (Phase 1コード参照) */ },
    initBomb: function(rid) { /* (Phase 1コード参照) */ }
};

// Global Bindings
window.startRoom = () => App.Studio.startRoom();
window.quickStartSet = (d) => App.Studio.quickStart(d);

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('host-start-btn')?.addEventListener('click', () => App.Studio.startQ());
    document.getElementById('host-show-answer-btn')?.addEventListener('click', () => App.Studio.showAns());
    document.getElementById('host-judge-correct-btn')?.addEventListener('click', () => App.Studio.judgeBuzz(true));
    document.getElementById('host-judge-wrong-btn')?.addEventListener('click', () => App.Studio.judgeBuzz(false));
    document.getElementById('host-close-studio-btn')?.addEventListener('click', () => App.Dashboard.enter());
});
