/* =========================================================
 * host_studio.js (v92: Japanese UI Text)
 * =======================================================*/

App.Studio = {
    timer: null,
    buzzWinner: null,
    isQuick: false,
    currentStepId: 0,
    
    soloState: { lives: 3, timeBank: 60, challengerIndex: 0 },

    startRoom: function(isQuick = false) {
        this.isQuick = isQuick;
        App.Data.studioQuestions = [];
        App.State.currentQIndex = 0;
        App.State.currentPeriodIndex = 0;
        
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        App.State.currentRoomId = code;
        
        window.db.ref(`rooms/${code}`).set({
            questions: [],
            status: { step: 'standby', qIndex: 0 },
            config: { mode: 'normal' },
            players: {}
        }).then(() => {
            console.log("Room Created:", code);
            this.enterHostMode(isQuick);
        });
    },

    enterHostMode: function(isQuick) {
        App.Ui.showView(App.Ui.views.hostControl);
        const code = App.State.currentRoomId;
        
        const targets = ['studio-header-room-id', 'studio-big-room-id'];
        targets.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.textContent = code;
                el.onclick = () => {
                    navigator.clipboard.writeText(code).then(() => {
                        App.Ui.showToast("📋 部屋IDをコピーしました！");
                    });
                };
            }
        });

        window.db.ref(`rooms/${code}/players`).on('value', snap => {
            const players = snap.val() || {};
            const count = Object.keys(players).length;
            document.getElementById('studio-player-count-display').textContent = count;
            if(App.Data.currentConfig?.mode === 'buzz' && this.currentStepId === 3) {
                this.checkBuzz(players);
            }
        });

        if (isQuick && App.Data.periodPlaylist.length > 0) {
            this.renderTimeline();
            setTimeout(() => this.setupPeriod(0), 500);
        } else {
            document.getElementById('studio-question-panel').classList.add('hidden');
            document.getElementById('studio-standby-panel').classList.remove('hidden');
            document.getElementById('studio-loader-ui').classList.remove('hidden');
            
            const btnMain = document.getElementById('btn-phase-main');
            btnMain.classList.add('hidden');
            
            this.loadProgramList();
        }
    },

    loadProgramList: function() {
        const select = document.getElementById('studio-program-select');
        const btn = document.getElementById('studio-load-program-btn');
        const showId = App.State.currentShowId;

        if (!select || !btn) return;
        if (!showId) { select.innerHTML = '<option>エラー: ID未設定</option>'; return; }

        select.innerHTML = '<option>読込中...</option>';
        btn.disabled = true;

        window.db.ref(`saved_programs/${showId}`).once('value', snap => {
            const data = snap.val();
            select.innerHTML = '';
            
            const def = document.createElement('option');
            def.value = "";
            def.textContent = "-- 読み込むプログラムを選択 --";
            select.appendChild(def);

            if (data) {
                Object.keys(data).forEach(key => {
                    const prog = data[key];
                    const opt = document.createElement('option');
                    try {
                        opt.value = JSON.stringify(prog);
                        opt.textContent = prog.title;
                        select.appendChild(opt);
                    } catch(e) { console.error(e); }
                });
                select.disabled = false;
            } else {
                const opt = document.createElement('option');
                opt.textContent = "(保存されたプログラムがありません)";
                select.appendChild(opt);
            }
        });

        select.onchange = () => { btn.disabled = (select.value === ""); };

        btn.onclick = () => {
            const val = select.value;
            if (!val) return;
            try {
                const prog = JSON.parse(val);
                App.Data.periodPlaylist = prog.playlist || [];
                document.getElementById('studio-loader-ui').classList.add('hidden');
                
                const titleEl = document.getElementById('studio-program-info');
                if(titleEl) titleEl.textContent = "読込完了: " + prog.title;
                
                this.renderTimeline();

                const btnMain = document.getElementById('btn-phase-main');
                btnMain.textContent = "番組を開始 (START PROGRAM)";
                btnMain.classList.remove('hidden');
                btnMain.className = 'btn-block btn-large-action action-ready';
                btnMain.onclick = () => this.setupPeriod(0);

            } catch(e) { alert("データの読み込みに失敗しました"); }
        };
    },

    renderTimeline: function() {
        const area = document.getElementById('studio-period-timeline');
        area.innerHTML = '';
        App.Data.periodPlaylist.forEach((item, i) => {
            const btn = document.createElement('button');
            const isActive = (i === App.State.currentPeriodIndex);
            btn.className = `btn-block ${isActive ? 'btn-info' : 'btn-dark'}`;
            btn.textContent = `${i+1}. ${item.title} [${this.translateMode(item.config.mode)}]`;
            btn.style.textAlign = 'left';
            btn.onclick = () => this.setupPeriod(i);
            area.appendChild(btn);
        });
    },

    setupPeriod: function(index) {
        const item = App.Data.periodPlaylist[index];
        if(!item) return;

        App.State.currentPeriodIndex = index;
        App.Data.studioQuestions = item.questions;
        App.Data.currentConfig = item.config;
        App.State.currentQIndex = 0;

        const roomId = App.State.currentRoomId;
        window.db.ref(`rooms/${roomId}/config`).set(App.Data.currentConfig);
        window.db.ref(`rooms/${roomId}/questions`).set(App.Data.studioQuestions);
        
        document.getElementById('studio-standby-panel').classList.add('hidden');
        document.getElementById('studio-question-panel').classList.remove('hidden');
        
        this.renderTimeline();

        const isSolo = (item.config.mode === 'solo');
        if (isSolo) {
            document.getElementById('studio-solo-info').classList.remove('hidden');
            this.soloState.lives = item.config.soloLife || 3;
            document.getElementById('studio-life-display').textContent = this.soloState.lives;
        } else {
            document.getElementById('studio-solo-info').classList.add('hidden');
        }

        this.setStep(0);
    },

    setStep: function(stepId) {
        this.currentStepId = stepId;
        const btnMain = document.getElementById('btn-phase-main');
        const subControls = document.getElementById('studio-sub-controls');
        
        btnMain.className = 'btn-block btn-large-action';
        subControls.classList.add('hidden');
        btnMain.classList.remove('hidden');

        // 日本語ラベル用配列
        const stepsJA = ['待機中', '準備中', '出題中', '回答中', '結果表示', '正解表示', '次へ'];
        document.getElementById('studio-step-display').textContent = stepsJA[stepId];
        
        document.getElementById('studio-q-num-display').textContent = `${App.State.currentQIndex + 1}/${App.Data.studioQuestions.length}`;
        document.getElementById('studio-mode-display').textContent = this.translateMode(App.Data.currentConfig.mode);

        const q = App.Data.studioQuestions[App.State.currentQIndex];
        const roomId = App.State.currentRoomId;

        switch(stepId) {
            case 0: // STANDBY
                btnMain.textContent = `Q${App.State.currentQIndex + 1} ゲーム開始 (START)`;
                btnMain.onclick = () => this.setStep(1);
                this.renderQuestionMonitor(q);
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'standby', qIndex: App.State.currentQIndex });
                break;
            case 1: // READY
                btnMain.textContent = "準備完了 (SKIP)";
                btnMain.classList.add('action-ready');
                btnMain.onclick = () => this.setStep(2);
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'ready' });
                break;
            case 2: // QUESTION
                btnMain.textContent = "問題を表示 (OPEN)";
                btnMain.onclick = () => this.setStep(3);
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'question', startTime: firebase.database.ServerValue.TIMESTAMP });
                break;
            case 3: // ANSWERING
                btnMain.textContent = "回答締め切り / 判定";
                btnMain.classList.add('action-stop');
                if(App.Data.currentConfig.mode === 'buzz' || App.Data.currentConfig.mode === 'solo') {
                    subControls.classList.remove('hidden');
                    btnMain.classList.add('hidden'); 
                } else {
                    btnMain.onclick = () => { this.judgeSimultaneous(); this.setStep(4); };
                }
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'answering', isBuzzActive: (App.Data.currentConfig.mode === 'buzz') });
                break;
            case 4: // RESULT
                btnMain.textContent = "正解を発表 (SHOW ANSWER)";
                btnMain.onclick = () => this.setStep(5);
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'result', isBuzzActive: false });
                break;
            case 5: // ANSWER
                btnMain.textContent = "次の問題へ (NEXT) >>";
                btnMain.classList.add('action-next');
                btnMain.onclick = () => this.setStep(6);
                document.getElementById('studio-correct-display').classList.remove('hidden');
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });
                break;
            case 6: // NEXT
                this.goNext();
                break;
        }
    },

    goNext: function() {
        if (App.State.currentQIndex < App.Data.studioQuestions.length - 1) {
            App.State.currentQIndex++;
            this.setStep(0);
        } else {
            const nextIdx = App.State.currentPeriodIndex + 1;
            if (nextIdx < App.Data.periodPlaylist.length) {
                if(confirm("このセットは終了です。次のセットへ進みますか？")) {
                    this.setupPeriod(nextIdx);
                } else {
                    document.getElementById('studio-question-panel').classList.add('hidden');
                    document.getElementById('studio-standby-panel').classList.remove('hidden');
                    const btn = document.getElementById('btn-phase-main');
                    btn.textContent = `次のセットを開始 (${App.Data.periodPlaylist[nextIdx].title})`;
                    btn.classList.remove('hidden');
                    btn.className = 'btn-block btn-large-action action-ready';
                    btn.onclick = () => this.setupPeriod(nextIdx);
                }
            } else {
                alert("全てのプログラムが終了しました！");
                document.getElementById('studio-question-panel').classList.add('hidden');
                document.getElementById('studio-standby-panel').classList.remove('hidden');
                document.getElementById('btn-phase-main').classList.add('hidden');
            }
        }
    },

    renderQuestionMonitor: function(q) {
        if(!q) return;
        document.getElementById('studio-q-text').textContent = q.q;
        document.getElementById('studio-q-type-badge').textContent = q.type.toUpperCase();
        
        const cContainer = document.getElementById('studio-choices-container');
        cContainer.innerHTML = '';
        if(q.c) {
            q.c.forEach((c, i) => {
                const div = document.createElement('div');
                div.className = 'monitor-choice-item';
                div.textContent = `${String.fromCharCode(65+i)}. ${c}`;
                cContainer.appendChild(div);
            });
        }
        
        document.getElementById('studio-correct-text').textContent = Array.isArray(q.correct) ? "複数正解" : (q.c ? q.c[q.correct] : q.correct);
        document.getElementById('studio-correct-display').classList.add('hidden');
    },

    checkBuzz: function(players) {
        if(this.currentStepId !== 3 || this.buzzWinner) return;
        const candidates = Object.entries(players).filter(([_, p]) => p.buzzTime && !p.lastResult).sort((a, b) => a[1].buzzTime - b[1].buzzTime);
        if(candidates.length > 0) {
            this.buzzWinner = candidates[0][0];
            const name = candidates[0][1].name;
            const info = document.getElementById('studio-sub-info');
            info.classList.remove('hidden');
            info.innerHTML = `<span style="color:orange; font-weight:bold;">早押し: ${name}</span>`;
            window.db.ref(`rooms/${App.State.currentRoomId}/status`).update({ currentAnswerer: this.buzzWinner, isBuzzActive: false });
        }
    },
    
    judgeBuzz: function(isCorrect) {
        if (App.Data.currentConfig.mode === 'solo') { this.judgeSolo(isCorrect); return; }
        if(!this.buzzWinner) return;
        const roomId = App.State.currentRoomId;
        const pts = App.Data.studioQuestions[App.State.currentQIndex].points || 1;
        window.db.ref(`rooms/${roomId}/players/${this.buzzWinner}`).once('value', snap => {
            const p = snap.val();
            if(isCorrect) {
                snap.ref.update({ periodScore: (p.periodScore||0) + pts, lastResult: 'win' });
                this.buzzWinner = null;
                document.getElementById('studio-sub-info').classList.add('hidden');
                this.setStep(4);
            } else {
                snap.ref.update({ lastResult: 'lose', buzzTime: null });
                this.buzzWinner = null;
                document.getElementById('studio-sub-info').classList.add('hidden');
                window.db.ref(`rooms/${roomId}/status`).update({ currentAnswerer: null, isBuzzActive: true });
            }
        });
    },

    judgeSolo: function(isCorrect) {
        if (isCorrect) { this.setStep(5); } else {
            this.soloState.lives--;
            document.getElementById('studio-life-display').textContent = this.soloState.lives;
            if (this.soloState.lives <= 0) alert("ゲームオーバー");
        }
    },

    judgeSimultaneous: function() {
        const q = App.Data.studioQuestions[App.State.currentQIndex];
        window.db.ref(`rooms/${App.State.currentRoomId}/players`).once('value', snap => {
            snap.forEach(pSnap => {
                const p = pSnap.val();
                let isCor = false;
                if(q.type === 'choice' && p.lastAnswer == q.correct) isCor = true;
                if(isCor) pSnap.ref.update({ periodScore: (p.periodScore||0) + 1, lastResult: 'win' });
                else pSnap.ref.update({ lastResult: 'lose' });
            });
        });
    },

    toggleAns: function() { document.getElementById('studio-correct-display').classList.toggle('hidden'); },
    
    translateMode: function(mode) {
        const map = { 'normal': '一斉回答', 'buzz': '早押し', 'time_attack': 'タイムアタック', 'solo': 'ソロ' };
        return map[mode] || mode.toUpperCase();
    },

    quickStart: function(setData) {
        const unextDesign = { mainBgColor: "#0a0a0a", qTextColor: "#fff", qBgColor: "rgba(255,255,255,0.05)", qBorderColor: "#00bfff" };
        const questions = (setData.questions||[]).map(q => { if(!q.design) q.design = unextDesign; return q; });
        App.Data.periodPlaylist = [{
            title: setData.title || "クイックプレイ",
            questions: questions,
            config: { mode: 'normal', gameType: 'score', theme: 'dark' }
        }];
        this.startRoom(true); 
    }
};

window.startRoom = () => App.Studio.startRoom();
window.quickStartSet = (d) => App.Studio.quickStart(d);

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-judge-correct')?.addEventListener('click', () => App.Studio.judgeBuzz(true));
    document.getElementById('btn-judge-wrong')?.addEventListener('click', () => App.Studio.judgeBuzz(false));
    document.getElementById('btn-toggle-ans')?.addEventListener('click', () => App.Studio.toggleAns());
    document.getElementById('btn-force-next')?.addEventListener('click', () => App.Studio.goNext());
    document.getElementById('host-close-studio-btn')?.addEventListener('click', () => App.Dashboard.enter());
});
