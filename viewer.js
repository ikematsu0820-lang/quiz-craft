/* =========================================================
 * style_viewer.css (v45: Granular Design Variables)
 * =======================================================*/

/* デフォルトのデザイン変数 */
:root {
    /* Main */
    --main-bg-color: #222222;
    --bg-image: none;
    
    /* Question Area */
    --q-text-color: #ffffff;
    --q-bg-color: #2c5066;
    --q-border-color: #ffffff;

    /* Choice Area */
    --c-text-color: #ffffff;
    --c-bg-color: #365c75;
    --c-border-color: #ffffff;
}

#viewer-main-view {
    font-family: "Helvetica Neue", Arial, sans-serif;
    
    /* 全体背景 */
    background-color: var(--main-bg-color);
    background-image: var(--bg-image);
    background-size: cover;
    background-position: center;
    
    width: 100vw;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    padding: 0;
    margin: 0;
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
}

#viewer-content {
    width: 95%;
    height: 90%;
    display: flex;
    flex-direction: column;
}

#viewer-status {
    height: 10%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4vh;
    color: gold;
    font-weight: bold;
    letter-spacing: 0.2em;
    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
}

.viewer-layout-container {
    flex: 1;
    display: flex;
    width: 100%;
    box-sizing: border-box;
    padding: 10px;
}

.text-left { justify-content: flex-start !important; text-align: left !important; }
.text-center { justify-content: center !important; text-align: center !important; }
.text-right { justify-content: flex-end !important; text-align: right !important; }

/* ★共通：問題エリア (変数を適用) */
.q-area {
    background: var(--q-bg-color);
    color: var(--q-text-color);
    border: 4px solid var(--q-border-color);
    
    box-shadow: 0 0 15px rgba(0,0,0,0.5);
    margin-bottom: 20px;
    padding: 20px;
    font-size: 5vh;
    font-weight: bold;
}

/* ★共通：選択肢アイテム (変数を適用) */
.choice-item {
    background: var(--c-bg-color);
    color: var(--c-text-color);
    border: 2px solid var(--c-border-color);
    
    padding: 1.5vh 2vw;
    font-size: 3.5vh;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

/* --- レイアウト別配置 --- */
.layout-standard { flex-direction: column; }
.layout-standard .q-area {
    flex: 1;
    display: flex;
    align-items: center;
}
.layout-standard .c-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 15px;
}

.layout-split-list { flex-direction: row-reverse; gap: 20px; }
.layout-split-list .q-area {
    width: 25%;
    writing-mode: vertical-rl;
    text-orientation: upright;
    display: flex;
    align-items: center;
}
.layout-split-list .c-area {
    width: 75%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 15px;
}

.layout-split-grid { flex-direction: row-reverse; gap: 20px; }
.layout-split-grid .q-area {
    width: 25%;
    writing-mode: vertical-rl;
    text-orientation: upright;
    display: flex;
    align-items: center;
}
.layout-split-grid .c-area {
    width: 75%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: minmax(100px, 1fr);
    gap: 15px;
    align-content: center;
}

.choice-prefix {
    color: gold;
    font-weight: bold;
    margin-right: 15px;
    font-family: 'Arial Black', sans-serif;
}
