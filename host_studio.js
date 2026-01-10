/* =========================================================
 * host_studio.js (v73: State Machine & Solo Flow)
 * =======================================================*/

App.Studio = {
    // 状態管理
    timer: null,
    buzzWinner: null,
    isQuick: false,
    
    // 現在のステップ (0:standby, 1:ready, 2:question, 3:answering, 4:result, 5:answer, 6:next)
    currentStepId: 0,
    
    // Solo用ステータス
    soloState: {
        lives: 3,
        timeBank: 60,
        challengerIndex: 0 // プレイヤーリストのインデックス
    },

    // --- 初期化 & 起動 ---
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
            config: { mode: 'normal' }, // 初期値
            players: {}
        }).then(() => {
            this.enterHostMode();
        });
    },

    enterHostMode: function() {
        App.Ui.showView(App.Ui.views.hostControl);
        
        // パネル初期化
        this.currentStepId = 0;
        this.updateHeaderInfo();
        
        // プレイヤー監視
        window.db.ref(`rooms/${App.State.currentRoomId}/players`).on('value', snap => {
            const players = snap.val() || {};
            const count = Object.keys(players).length;
            document.getElementById('studio-player-count-display').textContent = count;
            
            // Buzz判定
            if(App.Data.currentConfig.mode === 'buzz' && this.currentStepId === 3) {
                this.checkBuzz(players);
            }
        });

        // Quick Start or Load
        if (this.isQuick && App.Data.periodPlaylist.length > 0) {
            this.renderTimeline();
            // 自動で最初のピリオドをセット
            setTimeout(() => this.setupPeriod(0), 500);
        } else {
            // プログラムローダー表示
            document.getElementById('studio-question-panel').classList.add('hidden');
            document.getElementById('studio-standby-panel').classList.remove('hidden');
            document.getElementById('studio-loader-ui').classList.remove('hidden');
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
            document.getElementById('studio-loader-ui').classList.add('hidden');
            document.getElementById('studio-program-info').textContent = prog.title;
            this.renderTimeline();
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

    // --- ピリオド開始処理 (Step 0) ---
    setupPeriod: function(index) {
        const item = App.Data.periodPlaylist[index];
        if(!item) return;

        App.State.currentPeriodIndex = index;
        App.Data.studioQuestions = item.questions;
        App.Data.currentConfig = item.config;
        App.State.currentQIndex = 0;

        // DB同期
        const roomId = App.State.currentRoomId;
        window.db.ref(`rooms/${roomId}/config`).set(App.Data.currentConfig);
        window.db.ref(`rooms/${roomId}/questions`).set(App.Data.studioQuestions);
        
        // Solo初期化
        if (item.config.mode === 'solo') {
            this.soloState.lives = item.config.soloLife || 3;
            this.soloState.timeBank = item.config.soloTimeVal || 60;
            document.getElementById('studio-solo-info').classList.remove('hidden');
            document.getElementById('studio-life-display').textContent = this.soloState.lives;
        } else {
            document.getElementById('studio-solo-info').classList.add('hidden');
        }

        // 画面切り替え
        document.getElementById('studio-standby-panel').classList.add('hidden');
        document.getElementById('studio-question-panel').classList.remove('hidden');
        
        // 最初の問題へセット
        this.setStep(0); // Standby
    },

    // --- ★ メインステートマシン (0~6) ---
    setStep: function(stepId) {
        this.currentStepId = stepId;
        const conf = App.Data.currentConfig;
        const roomId = App.State.currentRoomId;
        const q = App.Data.studioQuestions[App.State.currentQIndex];

        // 1. ヘッダー更新
        this.updateHeaderInfo();

        // 2. メインボタン更新
        const btnMain = document.getElementById('btn-phase-main');
        const subControls = document.getElementById('studio-sub-controls');
        
        btnMain.className = 'btn-block btn-large-action'; // Reset class
        subControls.classList.add('hidden'); // Default hidden

        // --- ステップ別処理 ---
        switch(stepId) {
            case 0: // Standby (準備)
                btnMain.textContent = "GAME START";
                btnMain.onclick = () => this.setStep(1);
                
                // 画面表示更新
                this.renderQuestionMonitor(q);
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'standby', qIndex: App.State.currentQIndex });
                break;

            case 1: // Ready (演出)
                btnMain.textContent = "SKIP READY";
                btnMain.classList.add('action-ready');
                btnMain.onclick = () => this.setStep(2);

                // 3秒後に自動でQuestionへ（演出用）
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'ready' });
                // setTimeout(() => this.setStep(2), 3000); // 自動遷移させたい場合
                break;

            case 2: // Question (出題)
                btnMain.textContent = "OPEN QUESTION";
                btnMain.onclick = () => this.setStep(3);
                
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'question', startTime: firebase.database.ServerValue.TIMESTAMP });
                break;

            case 3: // Answering (回答中)
                btnMain.textContent = "STOP & JUDGE";
                btnMain.classList.add('action-stop');
                
                // モード別挙動
                if (conf.mode === 'buzz' || conf.mode === 'solo') {
                    // 早押し・ソロ: 判定ボタンを出す
                    subControls.classList.remove('hidden');
                    btnMain.classList.add('hidden'); // STOPボタンを隠して判定ボタンのみにする手もあるが、一旦STOPも残す
                    btnMain.onclick = () => this.setStep(4); // 強制終了
                } else {
                    // 一斉回答: STOPボタンで締め切り
                    btnMain.onclick = () => {
                        this.judgeSimultaneous(); // 自動採点
                        this.setStep(4);
                    };
                }
                
                // DB更新
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'answering', isBuzzActive: (conf.mode === 'buzz') });
                break;

            case 4: // Result (結果確定)
                btnMain.textContent = "SHOW ANSWER";
                btnMain.onclick = () => this.setStep(5);
                
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'result', isBuzzActive: false });
                break;

            case 5: // Answer (正解表示)
                btnMain.textContent = "NEXT QUESTION >>";
                btnMain.classList.add('action-next');
                btnMain.onclick = () => this.setStep(6);
                
                document.getElementById('studio-correct-display').classList.remove('hidden');
                window.db.ref(`rooms/${roomId}/status`).update({ step: 'answer' });
                break;

            case 6: // Next (遷移判定)
                this.goNext();
                break;
        }
    },

    // --- 内部ロジック群 ---

    goNext: function() {
        // 次の問題があるか？
        if (App.State.currentQIndex < App.Data.studioQuestions.length - 1) {
            App.State.currentQIndex++;
            this.setStep(2); // Questionへ戻る (Readyは省略)
        } else {
            // ピリオド終了
            alert("Period Complete!");
            // 次のピリオドがあれば timeline 表示に戻るなどの処理
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
        
        // 正解（隠しておく）
        document.getElementById('studio-correct-text').textContent = Array.isArray(q.correct) ? "Multiple" : (q.c ? q.c[q.correct] : q.correct);
        document.getElementById('studio-correct-display').classList.add('hidden');
    },

    updateHeaderInfo: function() {
        const steps = ['STANDBY', 'READY', 'QUESTION', 'ANSWERING', 'RESULT', 'ANSWER', 'NEXT'];
        document.getElementById('studio-mode-display').textContent = App.Data.currentConfig.mode.toUpperCase();
        document.getElementById('studio-q-num-display').textContent = `${App.State.currentQIndex + 1}/${App.Data.studioQuestions.length}`;
        document.getElementById('studio-step-display').textContent = steps[this.currentStepId];
    },

    // --- 判定ロジック ---
    checkBuzz: function(players) {
        // 早押し勝者がいないかチェック (Step 3のみ)
        if(this.currentStepId !== 3 || this.buzzWinner) return;
        
        const candidates = Object.entries(players)
            .filter(([_, p]) => p.buzzTime && !p.lastResult)
            .sort((a, b) => a[1].buzzTime - b[1].buzzTime);

        if(candidates.length > 0) {
            const [id, p] = candidates[0];
            this.buzzWinner = id;
            
            // 画面に表示
            const info = document.getElementById('studio-sub-info');
            info.classList.remove('hidden');
            info.innerHTML = `<span style="color:orange">BUZZ: ${p.name}</span>`;
            
            // DBロック
            window.db.ref(`rooms/${App.State.currentRoomId}/status`).update({ currentAnswerer: id, isBuzzActive: false });
        }
    },
    
    judgeBuzz: function(isCorrect) {
        // Soloモード分岐
        if (App.Data.currentConfig.mode === 'solo') {
            this.judgeSolo(isCorrect);
            return;
        }

        // 通常早押し分岐
        if(!this.buzzWinner) return;
        const roomId = App.State.currentRoomId;
        const pts = App.Data.studioQuestions[App.State.currentQIndex].points || 1;
        
        window.db.ref(`rooms/${roomId}/players/${this.buzzWinner}`).once('value', snap => {
            const p = snap.val();
            if(isCorrect) {
                snap.ref.update({ periodScore: (p.periodScore||0) + pts, lastResult: 'win' });
                this.buzzWinner = null;
                document.getElementById('studio-sub-info').classList.add('hidden');
                this.setStep(4); // Resultへ
            } else {
                snap.ref.update({ lastResult: 'lose', buzzTime: null });
                this.buzzWinner = null;
                document.getElementById('studio-sub-info').classList.add('hidden');
                // 再開
                window.db.ref(`rooms/${roomId}/status`).update({ currentAnswerer: null, isBuzzActive: true });
            }
        });
    },

    judgeSolo: function(isCorrect) {
        // Solo判定処理（ライフ減少など）
        if (isCorrect) {
            // 正解 -> 次へ
            this.setStep(5); // Answerフェーズ（演出）を経てNextへ
        } else {
            // 不正解 -> ライフ減
            this.soloState.lives--;
            document.getElementById('studio-life-display').textContent = this.soloState.lives;
            if (this.soloState.lives <= 0) {
                alert("GAME OVER");
            } else {
                // 続行するか選ばせるUIが必要だが、一旦続行
                alert(`Wrong! Lives: ${this.soloState.lives}`);
            }
        }
    },
    
    judgeSimultaneous: function() {
        // 一斉回答の採点（簡易版）
        const q = App.Data.studioQuestions[App.State.currentQIndex];
        window.db.ref(`rooms/${App.State.currentRoomId}/players`).once('value', snap => {
            snap.forEach(pSnap => {
                const p = pSnap.val();
                let isCor = false;
                // ※正誤判定ロジックは前のバージョンと同じ
                if(q.type === 'choice' && p.lastAnswer == q.correct) isCor = true;
                
                if(isCor) pSnap.ref.update({ periodScore: (p.periodScore||0) + 1, lastResult: 'win' });
                else pSnap.ref.update({ lastResult: 'lose' });
            });
        });
    },
    
    // --- ツールボタン ---
    toggleAns: function() {
        document.getElementById('studio-correct-display').classList.toggle('hidden');
    },
    
    quickStart: function(setData) {
         // (前と同じ)
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

// Global Bindings
window.startRoom = () => App.Studio.startRoom();
window.quickStartSet = (d) => App.Studio.quickStart(d);

document.addEventListener('DOMContentLoaded', () => {
    // 判定ボタン
    document.getElementById('btn-judge-correct')?.addEventListener('click', () => App.Studio.judgeBuzz(true));
    document.getElementById('btn-judge-wrong')?.addEventListener('click', () => App.Studio.judgeBuzz(false));
    
    // ツールボタン
    document.getElementById('btn-toggle-ans')?.addEventListener('click', () => App.Studio.toggleAns());
    document.getElementById('btn-force-next')?.addEventListener('click', () => App.Studio.goNext());
    
    // 閉じる
    document.getElementById('host-close-studio-btn')?.addEventListener('click', () => App.Dashboard.enter());
});
