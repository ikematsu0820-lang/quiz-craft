/* =========================================================
 * host_studio.js (v81: Robust Loading & State Machine)
 * =======================================================*/

App.Studio = {
    timer: null,
    buzzWinner: null,
    isQuick: false,
    currentStepId: 0,
    
    soloState: {
        lives: 3,
        timeBank: 60,
        challengerIndex: 0
    },

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
            this.enterHostMode();
        });
    },

    enterHostMode: function() {
        App.Ui.showView(App.Ui.views.hostControl);
        
        this.currentStepId = 0;
        this.updateHeaderInfo();
        
        window.db.ref(`rooms/${App.State.currentRoomId}/players`).on('value', snap => {
            const players = snap.val() || {};
            const count = Object.keys(players).length;
            document.getElementById('studio-player-count-display').textContent = count;
            
            if(App.Data.currentConfig.mode === 'buzz' && this.currentStepId === 3) {
                this.checkBuzz(players);
            }
        });

        if (this.isQuick && App.Data.periodPlaylist.length > 0) {
            this.renderTimeline();
            setTimeout(() => this.setupPeriod(0), 500);
        } else {
            document.getElementById('studio-question-panel').classList.add('hidden');
            document.getElementById('studio-standby-panel').classList.remove('hidden');
            document.getElementById('studio-loader-ui').classList.remove('hidden');
            this.loadProgramList();
        }
    },

    loadProgramList: function() {
        const select = document.getElementById('studio-program-select');
        const btn = document.getElementById('studio-load-program-btn');
        
        if (!select || !btn) {
            console.error("Studio elements not found!");
            return;
        }

        // 初期化
        select.innerHTML = '<option value="">読み込み中...</option>';
        select.disabled = true;
        btn.disabled = true;
        
        if (!App.State.currentShowId) {
            select.innerHTML = '<option value="">(Error: ID未設定)</option>';
            return;
        }

        console.log("Loading programs for:", App.State.currentShowId);

        window.db.ref(`saved_programs/${App.State.currentShowId}`).once('value', snap => {
            const data = snap.val();
            select.innerHTML = '';
            
            // デフォルト選択肢
            const defaultOpt = document.createElement('option');
            defaultOpt.value = "";
            defaultOpt.textContent = "-- プログラムを選択してください --";
            select.appendChild(defaultOpt);

            if(data) {
                console.log("Programs found:", Object.keys(data).length);
                Object.values(data).forEach(p => {
                    const opt = document.createElement('option');
                    try {
                        opt.value = JSON.stringify(p);
                        opt.textContent = p.title || "(タイトルなし)";
                        select.appendChild(opt);
                    } catch (e) {
                        console.error("JSON Stringify Error:", e);
                    }
                });
                select.disabled = false;
            } else {
                console.log("No programs found.");
                const opt = document.createElement('option');
                opt.textContent = "(保存されたプログラムがありません)";
                opt.disabled = true;
                select.appendChild(opt);
            }
        }).catch(error => {
            console.error("Firebase Error:", error);
            select.innerHTML = '<option value="">(読み込みエラー)</option>';
        });
        
        select.onchange = () => {
            btn.disabled = (select.value === "");
        };

        btn.onclick = () => {
            const val = select.value;
            if(!val) return;
            try {
                const prog = JSON.parse(val);
                App.Data.periodPlaylist = prog.playlist || [];
                document.getElementById('studio-loader-ui').classList.add('hidden');
                
                const infoEl = document.getElementById('studio-program-info');
                if (infoEl) infoEl.textContent = prog.title;

                this.renderTimeline();
            } catch(e) {
                console.error("Parse Error:", e);
                alert("データの読み込みに失敗しました");
            }
        };
    },

    renderTimeline: function() {
        const area = document.getElementById('studio-period-timeline');
        area.innerHTML = '';
        App.Data.periodPlaylist.forEach((item, i) => {
            const btn = document.createElement('button');
            btn.className = `btn-block ${i===App.State.currentPeriodIndex ? 'btn-info' : 'btn-dark'}`;
            btn.textContent = `${i+1}. ${item.title} [${item.config.mode}]`;
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
        
        if (item.config.mode === 'solo') {
            this.soloState.lives = item.config.soloLife || 3;
            this.soloState.timeBank = item.config.soloTimeVal || 60;
            document.getElementById('studio-solo-info').classList.remove('hidden');
            document.getElementById('studio-life-display').textContent = this.soloState.lives;
        } else {
            document.getElementById('studio-solo-info').classList.add('hidden');
        }

        document.getElementById('studio-standby-panel').classList.add('hidden');
        document.getElementById('studio-question-panel').classList.remove('hidden');
        
        this.setStep(0);
    },

    setStep: function(stepId) {
        this.currentStepId = stepId;
        const conf = App.Data.currentConfig;
        const roomId = App.State.currentRoomId;
        const q = App.Data.studioQuestions[App.State.currentQIndex];

        this.updateHeaderInfo();

        const btnMain = document.getElementById('btn-phase-main');
        const subControls = document.getElementById('studio-sub-controls');
        
        btnMain.className = 'btn-block btn-large-action';
        subControls.classList.add('hidden');

        switch(stepId) {
            case 0: // Standby
                btnMain.textContent = "GAME START";
                btnMain.onclick = () => this.setStep(1);
                this.renderQuestionMonitor(q);
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'standby', qIndex: App.State.currentQIndex });
                break;

            case 1: // Ready
                btnMain.textContent = "SKIP READY";
                btnMain.classList.add('action-ready');
                btnMain.onclick = () => this.setStep(2);
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'ready' });
                break;

            case 2: // Question
                btnMain.textContent = "OPEN QUESTION";
                btnMain.onclick = () => this.setStep(3);
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'question', startTime: firebase.database.ServerValue.TIMESTAMP });
                break;

            case 3: // Answering
                btnMain.textContent = "STOP & JUDGE";
                btnMain.classList.add('action-stop');
                
                if (conf.mode === 'buzz' || conf.mode === 'solo') {
                    subControls.classList.remove('hidden');
                    btnMain.classList.add('hidden');
                    btnMain.onclick = () => this.setStep(4);
                } else {
                    btnMain.onclick = () => {
                        this.judgeSimultaneous();
                        this.setStep(4);
                    };
                }
                
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'answering', isBuzzActive: (conf.mode === 'buzz') });
                break;

            case 4: // Result
                btnMain.textContent = "SHOW ANSWER";
                btnMain.onclick = () => this.setStep(5);
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'result', isBuzzActive: false });
                break;

            case 5: // Answer
                btnMain.textContent = "NEXT QUESTION >>";
                btnMain.classList.add('action-next');
                btnMain.onclick = () => this.setStep(6);
                document.getElementById('studio-correct-display').classList.remove('hidden');
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });
                break;

            case 6: // Next
                this.goNext();
                break;
        }
    },

    goNext: function() {
        if (App.State.currentQIndex < App.Data.studioQuestions.length - 1) {
            App.State.currentQIndex++;
            this.setStep(2);
        } else {
            alert("Period Complete!");
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
        
        document.getElementById('studio-correct-text').textContent = Array.isArray(q.correct) ? "Multiple" : (q.c ? q.c[q.correct] : q.correct);
        document.getElementById('studio-correct-display').classList.add('hidden');
    },

    updateHeaderInfo: function() {
        const steps = ['STANDBY', 'READY', 'QUESTION', 'ANSWERING', 'RESULT', 'ANSWER', 'NEXT'];
        document.getElementById('studio-mode-display').textContent = App.Data.currentConfig.mode.toUpperCase();
        document.getElementById('studio-q-num-display').textContent = `${App.State.currentQIndex + 1}/${App.Data.studioQuestions.length}`;
        document.getElementById('studio-step-display').textContent = steps[this.currentStepId];
    },

    checkBuzz: function(players) {
        if(this.currentStepId !== 3 || this.buzzWinner) return;
        
        const candidates = Object.entries(players)
            .filter(([_, p]) => p.buzzTime && !p.lastResult)
            .sort((a, b) => a[1].buzzTime - b[1].buzzTime);

        if(candidates.length > 0) {
            const [id, p] = candidates[0];
            this.buzzWinner = id;
            
            const info = document.getElementById('studio-sub-info');
            info.classList.remove('hidden');
            info.innerHTML = `<span style="color:orange">BUZZ: ${p.name}</span>`;
            
            window.db.ref(`rooms/${App.State.currentRoomId}/status`).update({ currentAnswerer: id, isBuzzActive: false });
        }
    },
    
    judgeBuzz: function(isCorrect) {
        if (App.Data.currentConfig.mode === 'solo') {
            this.judgeSolo(isCorrect);
            return;
        }

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
        if (isCorrect) {
            this.setStep(5);
        } else {
            this.soloState.lives--;
            document.getElementById('studio-life-display').textContent = this.soloState.lives;
            if (this.soloState.lives <= 0) {
                alert("GAME OVER");
            } else {
                alert(`Wrong! Lives: ${this.soloState.lives}`);
            }
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
    
    toggleAns: function() {
        document.getElementById('studio-correct-display').classList.toggle('hidden');
    },
    
    quickStart: function(setData) {
         const unextDesign = { mainBgColor: "#0a0a0a", qTextColor: "#fff", qBgColor: "rgba(255,255,255,0.05)", qBorderColor: "#00bfff" };
         const questions = (setData.questions||[]).map(q => { if(!q.design) q.design = unextDesign; return q; });
         
         App.Data.periodPlaylist = [{
             title: setData.title || "Quick Play",
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
