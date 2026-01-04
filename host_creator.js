/* =========================================================
 * host_creator.js
 * 役割：問題セットの作成、編集、クラウド保存
 * =======================================================*/

function initCreatorMode() {
    editingSetId = null;
    createdQuestions = [];
    document.getElementById('quiz-set-title').value = '';
    document.getElementById('save-to-cloud-btn').textContent = 'クラウドに保存して完了';
    renderQuestionList();
    window.showView(window.views.creator);
}

function loadSetForEditing(key, item) {
    editingSetId = key;
    createdQuestions = item.questions || [];
    document.getElementById('quiz-set-title').value = item.title;
    document.getElementById('save-to-cloud-btn').textContent = '更新して完了';
    renderQuestionList();
    window.showView(window.views.creator);
}

function addQuestion() {
    const qText = document.getElementById('question-text').value.trim();
    const correctIndex = parseInt(document.getElementById('correct-index').value);
    
    // 選択肢の取得
    const cBlue = document.querySelector('.btn-blue.choice-input').value.trim() || "A";
    const cRed = document.querySelector('.btn-red.choice-input').value.trim() || "B";
    const cGreen = document.querySelector('.btn-green.choice-input').value.trim() || "C";
    const cYellow = document.querySelector('.btn-yellow.choice-input').value.trim() || "D";

    if(!qText) { alert('問題文を入力してください'); return; }

    // 将来的にここに type: 'fastest' (早押し) などのフラグを追加する
    createdQuestions.push({
        q: qText,
        c: [cBlue, cRed, cGreen, cYellow],
        correctIndex: correctIndex
    });

    renderQuestionList();
    document.getElementById('question-text').value = '';
    document.getElementById('question-text').focus();
}

function renderQuestionList() {
    const list = document.getElementById('q-list');
    list.innerHTML = '';
    createdQuestions.forEach((q, index) => {
        const li = document.createElement('li');
        li.textContent = `Q${index + 1}. ${q.q}`;
        const delSpan = document.createElement('span');
        delSpan.textContent = ' [x]';
        delSpan.style.color = 'red';
        delSpan.style.cursor = 'pointer';
        delSpan.style.marginLeft = '10px';
        delSpan.onclick = () => {
            createdQuestions.splice(index, 1);
            renderQuestionList();
        };
        li.appendChild(delSpan);
        list.appendChild(li);
    });
    document.getElementById('q-count').textContent = createdQuestions.length;
}

function saveToCloud() {
    if(createdQuestions.length === 0) { alert('問題がありません'); return; }
    const title = document.getElementById('quiz-set-title').value.trim() || "無題のセット";
    // セット単体にはデフォルト設定だけ持たせておく（設定はconfigで上書きされるため）
    const defaultConf = { eliminationRule: 'none', scoreUnit: 'point', theme: 'light' };
    
    const saveData = {
        title: title,
        config: defaultConf,
        questions: createdQuestions,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    if (editingSetId) {
        window.db.ref(`saved_sets/${currentShowId}/${editingSetId}`).update(saveData)
        .then(() => {
            alert(`「${title}」を更新しました！`);
            enterDashboard();
        });
    } else {
        window.db.ref(`saved_sets/${currentShowId}`).push(saveData)
        .then(() => {
            alert(`「${title}」を新規保存しました！`);
            enterDashboard();
        });
    }
}
