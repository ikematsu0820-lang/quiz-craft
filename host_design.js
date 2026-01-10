/* =========================================================
 * host_design.js (v66: Refactored Module)
 * =======================================================*/

App.Design = {
    currentTarget: null, // { type: 'set'|'prog', key: '...', data: ... }
    
    // U-NEXT風デフォルト定義
    defaults: {
        mainBgColor: "#0a0a0a",
        qTextColor: "#ffffff",
        qBgColor: "rgba(255, 255, 255, 0.05)",
        qBorderColor: "#00bfff",
        cTextColor: "#a0a0a0",
        cBgColor: "transparent",
        cBorderColor: "#333333",
        align: "center",
        layout: "standard"
    },

    init: function() {
        App.Ui.showView(App.Ui.views.design);
        this.currentTarget = null;
        this.bindEvents();
        this.loadTargetList();
        
        // 初回プレビュー描画
        this.setDefaultUI();
        this.renderPreview();
    },

    bindEvents: function() {
        // ターゲットロード
        document.getElementById('design-target-load-btn').onclick = () => this.loadTarget();
        
        // 変更検知（すべてのカラーピッカー等）
        document.querySelectorAll('#design-view input, #design-view select').forEach(el => {
            if(el.type !== 'file' && el.id !== 'design-target-select') {
                el.oninput = () => this.renderPreview();
                el.onchange = () => this.renderPreview();
            }
        });

        // 背景画像アップロード
        const imgBtn = document.getElementById('design-bg-image-btn');
        const imgInput = document.getElementById('design-bg-image-file');
        const clearBtn = document.getElementById('design-bg-clear-btn');
        
        if(imgBtn && imgInput) {
            imgBtn.onclick = () => imgInput.click();
            imgInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('design-bg-image-data').value = event.target.result;
                    document.getElementById('design-bg-image-status').textContent = "セット完了";
                    document.getElementById('design-bg-image-status').style.color = "#00ff00";
                    this.renderPreview();
                };
                reader.readAsDataURL(file);
            };
        }
        if(clearBtn) {
            clearBtn.onclick = () => {
                document.getElementById('design-bg-image-data').value = "";
                document.getElementById('design-bg-image-status').textContent = "未選択";
                document.getElementById('design-bg-image-status').style.color = "#aaa";
                imgInput.value = "";
                this.renderPreview();
            };
        }

        // モーダル制御
        this.setupModal('btn-open-text', 'modal-design-text');
        this.setupModal('btn-open-object', 'modal-design-object');
        this.setupModal('btn-open-bg', 'modal-design-bg');

        // 文字配置ボタン
        document.querySelectorAll('.btn-align').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.btn-align').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('creator-set-align').value = btn.dataset.align;
                this.renderPreview();
            };
        });

        // 保存 & リセット
        document.getElementById('design-save-btn').onclick = () => this.save();
        document.getElementById('design-reset-btn').onclick = () => {
            if(confirm("設定を初期値（U-NEXT風）に戻しますか？")) {
                this.setDefaultUI();
                this.renderPreview();
            }
        };
    },

    setupModal: function(btnId, modalId) {
        const btn = document.getElementById(btnId);
        const modal = document.getElementById(modalId);
        if(!btn || !modal) return;
        
        btn.onclick = () => modal.classList.remove('hidden');
        modal.querySelectorAll('.modal-close-btn').forEach(b => b.onclick = () => modal.classList.add('hidden'));
        modal.onclick = (e) => { if(e.target === modal) modal.classList.add('hidden'); };
    },

    loadTargetList: function() {
        const select = document.getElementById('design-target-select');
        select.innerHTML = '<option>Loading...</option>';

        Promise.all([
            window.db.ref(`saved_sets/${App.State.currentShowId}`).once('value'),
            window.db.ref(`saved_programs/${App.State.currentShowId}`).once('value')
        ]).then(([setSnap, progSnap]) => {
            select.innerHTML = '<option value="">-- 編集対象を選択 --</option>';
            const sets = setSnap.val() || {};
            const progs = progSnap.val() || {};

            // グループ化して表示
            const optGroupSet = document.createElement('optgroup');
            optGroupSet.label = "Questions Sets";
            Object.keys(sets).forEach(k => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ type: 'set', key: k });
                opt.textContent = sets[k].title;
                optGroupSet.appendChild(opt);
            });
            select.appendChild(optGroupSet);

            const optGroupProg = document.createElement('optgroup');
            optGroupProg.label = "Programs";
            Object.keys(progs).forEach(k => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ type: 'prog', key: k });
                opt.textContent = progs[k].title;
                optGroupProg.appendChild(opt);
            });
            select.appendChild(optGroupProg);
        });
    },

    loadTarget: function() {
        const val = document.getElementById('design-target-select').value;
        if(!val) return alert("対象を選択してください");
        
        const targetInfo = JSON.parse(val);
        const path = targetInfo.type === 'set' 
            ? `saved_sets/${App.State.currentShowId}/${targetInfo.key}` 
            : `saved_programs/${App.State.currentShowId}/${targetInfo.key}`;

        window.db.ref(path).once('value', snap => {
            const data = snap.val();
            if(!data) return alert("データが見つかりません");
            
            this.currentTarget = { ...targetInfo, data: data };
            
            // データからデザイン抽出（最初の問題の設定、またはプレイリスト設定）
            let design = {};
            let layout = 'standard';
            let align = 'center';

            if (targetInfo.type === 'set' && data.questions && data.questions.length > 0) {
                // セットなら1問目のデザインを採用
                const q = data.questions[0];
                design = q.design || {};
                layout = q.layout || 'standard';
                align = q.align || 'center';
            } else if (targetInfo.type === 'prog' && data.playlist && data.playlist.length > 0) {
                // プログラムなら最初のピリオドの1問目
                const q = data.playlist[0].questions?.[0];
                if(q) {
                    design = q.design || {};
                    layout = q.layout || 'standard';
                    align = q.align || 'center';
                }
            }

            // UIに反映
            this.applyToUI(design, layout, align);
            App.Ui.showToast(`Loaded: ${data.title}`);
            this.renderPreview();
        });
    },

    // UIの入力値を取得してまとめる
    collectSettings: function() {
        return {
            design: {
                mainBgColor: document.getElementById('design-main-bg-color').value,
                bgImage: document.getElementById('design-bg-image-data').value,
                qTextColor: document.getElementById('design-q-text').value,
                qBgColor: document.getElementById('design-q-bg').value,
                qBorderColor: document.getElementById('design-q-border').value,
                cTextColor: document.getElementById('design-c-text').value,
                cBgColor: document.getElementById('design-c-bg').value,
                cBorderColor: document.getElementById('design-c-border').value
            },
            layout: document.getElementById('creator-set-layout').value,
            align: document.getElementById('creator-set-align').value
        };
    },

    // UIに入力値をセットする
    applyToUI: function(design, layout, align) {
        if(!design) design = this.defaults;
        
        const setVal = (id, val) => { 
            const el = document.getElementById(id); 
            if(el) el.value = val || this.defaults[id.replace('design-', '').replace('main-bg-color','mainBgColor').replace('q-text','qTextColor').replace('q-bg','qBgColor').replace('q-border','qBorderColor').replace('c-text','cTextColor').replace('c-bg','cBgColor').replace('c-border','cBorderColor')]; 
        };

        setVal('design-main-bg-color', design.mainBgColor);
        setVal('design-q-text', design.qTextColor);
        setVal('design-q-bg', design.qBgColor);
        setVal('design-q-border', design.qBorderColor);
        setVal('design-c-text', design.cTextColor);
        setVal('design-c-bg', design.cBgColor);
        setVal('design-c-border', design.cBorderColor);
        
        document.getElementById('design-bg-image-data').value = design.bgImage || "";
        const status = document.getElementById('design-bg-image-status');
        if(status) {
            status.textContent = design.bgImage ? "画像あり" : "未選択";
            status.style.color = design.bgImage ? "#00ff00" : "#aaa";
        }

        if(layout) document.getElementById('creator-set-layout').value = layout;
        
        if(align) {
            document.getElementById('creator-set-align').value = align;
            document.querySelectorAll('.btn-align').forEach(b => {
                b.classList.toggle('active', b.dataset.align === align);
            });
        }
    },

    setDefaultUI: function() {
        this.applyToUI(this.defaults, 'standard', 'center');
    },

    // プレビュー画面の描画（実際のモニターと同じHTML/CSS構造を作る）
    renderPreview: function() {
        const frame = document.getElementById('design-monitor-preview-content');
        if(!frame) return;

        const s = this.collectSettings();
        const d = s.design;
        
        // 背景スタイル
        let bgStyle = `background-color: ${d.mainBgColor};`;
        if(d.bgImage) {
            bgStyle += `background-image: url('${d.bgImage}'); background-size: cover; background-position: center;`;
        } else {
            // デフォルトのグラデーション
            bgStyle += `background-image: radial-gradient(circle at center, #1a1a1a 0%, ${d.mainBgColor} 100%);`;
        }

        // レイアウトに応じたHTML構築
        let layoutHtml = '';
        const qStyle = `color:${d.qTextColor}; background:${d.qBgColor}; border:2px solid ${d.qBorderColor}; text-align:${s.align}; padding:20px; border-radius:8px; font-size:1.2em; font-weight:bold; margin-bottom:10px; display:flex; align-items:center; justify-content:${s.align==='center'?'center':(s.align==='right'?'flex-end':'flex-start')}; box-shadow:0 0 15px ${d.qBorderColor}40;`;
        const cStyle = `color:${d.cTextColor}; background:${d.cBgColor}; border:1px solid ${d.cBorderColor}; padding:10px; border-radius:4px; margin-bottom:5px; display:flex; align-items:center;`;
        const labelStyle = `background:${d.cBorderColor}; color:#fff; padding:2px 8px; border-radius:3px; margin-right:10px; font-size:0.8em;`;

        const dummyQ = "これはプレビュー用の問題文です。";
        const dummyChoices = ["選択肢A", "選択肢B", "選択肢C", "選択肢D"];

        if (s.layout === 'split_list' || s.layout === 'split_grid') {
            // 左右分割レイアウト
            layoutHtml = `
                <div style="display:flex; height:100%; gap:15px; padding:20px; box-sizing:border-box;">
                    <div style="flex:1; ${qStyle}; margin:0;">${dummyQ}</div>
                    <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">
                        ${dummyChoices.map((c,i) => `
                            <div style="${cStyle}">
                                <span style="${labelStyle}">${String.fromCharCode(65+i)}</span> ${c}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            // 標準レイアウト (上下)
            layoutHtml = `
                <div style="padding:20px; box-sizing:border-box; display:flex; flex-direction:column; height:100%; justify-content:center;">
                    <div style="${qStyle} min-height:100px;">${dummyQ}</div>
                    <div style="margin-top:10px;">
                         ${dummyChoices.map((c,i) => `
                            <div style="${cStyle}">
                                <span style="${labelStyle}">${String.fromCharCode(65+i)}</span> ${c}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        frame.innerHTML = `
            <div style="width:100%; height:100%; ${bgStyle} font-family:sans-serif; overflow:hidden;">
                ${layoutHtml}
            </div>
        `;
    },

    save: function() {
        if(!this.currentTarget) return alert("編集対象がロードされていません。\n(新規セット作成時はCreator画面で保存時に反映されます)");

        const s = this.collectSettings();
        const t = this.currentTarget;
        let promise;

        // DB更新処理
        if (t.type === 'set') {
            // セット内の全問題のデザインを一括更新
            const questions = t.data.questions.map(q => {
                q.design = s.design;
                q.layout = s.layout;
                q.align = s.align;
                return q;
            });
            promise = window.db.ref(`saved_sets/${App.State.currentShowId}/${t.key}/questions`).set(questions);
        } else {
            // プログラム内の全ピリオドの全問題のデザインを一括更新（強力！）
            const playlist = t.data.playlist.map(period => {
                if(period.questions) {
                    period.questions = period.questions.map(q => {
                        q.design = s.design;
                        q.layout = s.layout;
                        q.align = s.align;
                        return q;
                    });
                }
                return period;
            });
            promise = window.db.ref(`saved_programs/${App.State.currentShowId}/${t.key}/playlist`).set(playlist);
        }

        promise.then(() => {
            App.Ui.showToast("デザインを保存しました！");
        });
    }
};

// Global Bindings (他モジュールからのアクセス用)
window.enterDesignMode = () => App.Design.init();
window.applyDesignToUI = (d, l, a) => App.Design.applyToUI(d, l, a);
window.collectDesignSettings = () => App.Design.collectSettings();
window.resetGlobalSettings = () => App.Design.setDefaultUI();
// loadDesignSettings は Dashboard で使われるかもしれないので一応
window.loadDesignSettings = () => {};
