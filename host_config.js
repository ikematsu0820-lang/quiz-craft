/* host_config.js に以下を追加してください */

// ★不足していた関数を追加: セットリストを読み込む
function loadSetListInConfig() {
    const select = document.getElementById('config-set-select');
    if(!select) return;

    // 一旦リセット
    select.innerHTML = `<option value="">Loading...</option>`;

    if (!currentShowId) {
         select.innerHTML = `<option value="">(ID未設定)</option>`;
         return;
    }

    window.db.ref(`saved_sets/${currentShowId}`).once('value', snap => {
        const data = snap.val();
        select.innerHTML = `<option value="">${APP_TEXT.Config.SelectDefault || "-- セットを選択 --"}</option>`;

        if(data) {
             // 新しい順にソート
             const items = [];
             Object.keys(data).forEach(key => {
                 items.push({ key: key, ...data[key] });
             });
             items.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

             items.forEach(item => {
                 const opt = document.createElement('option');
                 // 読み込み側が期待する形式(t, q, c)に合わせてデータを整形してvalueに入れる
                 const compatibleData = {
                     t: item.title,
                     q: item.questions, // host_creator.jsで保存されたデータ
                     c: item.config,
                     sp: (item.questions && item.questions.length > 0) ? item.questions[0].specialMode : 'none'
                 };
                 
                 opt.value = JSON.stringify(compatibleData);
                 const dateStr = new Date(item.createdAt).toLocaleDateString();
                 opt.textContent = `${item.title} (${dateStr})`;
                 select.appendChild(opt);
             });
        }
    });
}
