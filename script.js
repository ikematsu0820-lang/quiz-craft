/* =========================================================
 * SECTION 5-1: 画面切り替えと共通ユーティリティ
 * =======================================================*/

// 画面要素の参照
const views = {
    main: document.getElementById('main-view'),
    creator: document.getElementById('creator-view'),
    respondent: document.getElementById('respondent-view'),
    quizDisplay: document.getElementById('quiz-display-view')
};

// 画面切り替え
function showView(viewToShow) {
    Object.values(views).forEach(view => view.classList.add('hidden'));
    viewToShow.classList.remove('hidden');

    const roomStatus = document.getElementById('room-status-message');
    const resultMsg    = document.getElementById('result-message');
    const creatorMsg  = document.getElementById('creator-status-message');
    const timerDisp    = document.getElementById('timer-display');
    if (roomStatus) roomStatus.textContent = '';
    if (resultMsg)  resultMsg.innerHTML  = '';
    if (creatorMsg) creatorMsg.textContent = '';
    if (timerDisp)  timerDisp.textContent = '';
}

// 初期表示
showView(views.main);

// ナビゲーションボタン
document.getElementById('show-creator-btn')
    .addEventListener('click', () => showView(views.creator));

document.getElementById('show-respondent-btn')
    .addEventListener('click', () => showView(views.respondent));

document.getElementById('back-to-main-from-creator')
    .addEventListener('click', () => showView(views.main));

document.getElementById('back-to-main-from-respondent')
    .addEventListener('click', () => showView(views.main));

document.getElementById('new-quiz-btn')
    .addEventListener('click', () => showView(views.main));

// 部屋コード生成（6桁程度の英数字）
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* =========================================================
 * SECTION 5-2: ローカルストレージ管理
 * =======================================================*/

function loadQuizzes() {
    try {
        return JSON.parse(localStorage.getItem('quizzes') || '{}');
    } catch (e) {
        console.error('quizzes の JSON が壊れているため初期化します', e);
        localStorage.removeItem('quizzes');
        return {};
    }
}

function saveQuizzes(quizzesObj) {
    localStorage.setItem('quizzes', JSON.stringify(quizzesObj));
}

/* =========================================================
 * SECTION 5-3: 出題者ロジック（問題作成・保存）
 * =======================================================*/

const quizForm             = document.getElementById('quiz-form');
const questionsList        = document.getElementById('questions-list');
const tempQuestionsList    = document.getElementById('temp-questions-list');
const tempCountSpan        = document.getElementById('temp-count');
const saveSetBtn           = document.getElementById('save-set-btn');
const creatorStatusMessage = document.getElementById('creator-status-message');

const quizSetTitleInput    = document.getElementById('quiz-set-title');

const questionTypeSelect   = document.getElementById('question-type');
const choiceEditor         = document.getElementById('type-choice-editor');
const orderEditor          = document.getElementById('type-order-editor');
const textEditor           = document.getElementById('type-text-editor');

const choicesArea          = document.getElementById('choices-area');
const addChoiceBtn         = document.getElementById('add-choice-btn');
const removeChoiceBtn      = document.getElementById('remove-choice-btn');

const orderItemsArea       = document.getElementById('order-items-area');
const addOrderItemBtn      = document.getElementById('add-order-item-btn');
const removeOrderItemBtn   = document.getElementById('remove-order-item-btn');

const MIN_CHOICES = 2;
const MAX_CHOICES = 10;
const DEFAULT_POINTS = 10; // 正解時のデフォルト配点

let tempQuestions = [];

// ★ どの部屋コードを編集しているか（null のときは新規作成）
let editingRoomId = null;
// ★ どの問題を編集しているか（null のときは新規作成）
let editingQuestionIndex = null;

/* ---------------------------------------------------------
 * 5-3-0: フォームのモード表示切り替え（新規 / 編集）
 * ------------------------------------------------------*/
function updateEditingUI(isEditingQuestion) {
    const title    = document.getElementById('creator-form-title');
    const formBox  = document.getElementById('creator-form-box');
    const submitBtn = quizForm
        ? quizForm.querySelector('button[type="submit"]')
        : null;

    if (!title || !formBox || !submitBtn) return;

    if (isEditingQuestion) {
        // 編集モード
        title.textContent = '問題を修正（編集モード）';
        title.style.color = '#d47a1f';

        formBox.classList.remove('creator-mode-new');
        formBox.classList.add('creator-mode-edit');

        submitBtn.textContent = '変更を保存する';
        submitBtn.style.backgroundColor = '#ff9800';
    } else {
        // 新規作成モード
        title.textContent = '新しい問題を追加';
        title.style.color = '#0056b3';

        formBox.classList.remove('creator-mode-edit');
        formBox.classList.add('creator-mode-new');

        submitBtn.textContent = 'この問題をリストに追加';
        submitBtn.style.backgroundColor = '#17a2b8';
    }
}

/* ---------------------------------------------------------
 * 5-3-1: 問題タイプ切り替え表示
 * ------------------------------------------------------*/
if (questionTypeSelect) {
    questionTypeSelect.addEventListener('change', () => {
        const type = questionTypeSelect.value;
        choiceEditor.style.display = (type === 'choice') ? 'block' : 'none';
        orderEditor.style.display  = (type === 'order')  ? 'block' : 'none';
        textEditor.style.display   = (type === 'text')   ? 'block' : 'none';
    });
}

/* ---------------------------------------------------------
 * 5-3-2: choice 用の選択肢増減
 * ------------------------------------------------------*/
function getChoiceContainers() {
    return choicesArea.querySelectorAll('.choice-container');
}
function createChoiceRow(placeholderText = '選択肢') {
    const div = document.createElement('div');
    div.className = 'choice-container';
    div.style.marginBottom = '5px';
    div.innerHTML = `
        <input type="checkbox" class="correct-flag">
        <input type="text" class="choice-input" placeholder="${placeholderText}" style="width:75%;">
    `;
    choicesArea.appendChild(div);
}
if (addChoiceBtn) {
    addChoiceBtn.addEventListener('click', () => {
        const current = getChoiceContainers().length;
        if (current >= MAX_CHOICES) {
            alert(`選択肢は最大 ${MAX_CHOICES} 個までです`);
            return;
        }
        createChoiceRow(`選択肢${current + 1}`);
    });
}
if (removeChoiceBtn) {
    removeChoiceBtn.addEventListener('click', () => {
        const containers = getChoiceContainers();
        const current = containers.length;
        if (current <= MIN_CHOICES) {
            alert(`選択肢は最低 ${MIN_CHOICES} 個必要です`);
            return;
        }
        choicesArea.removeChild(containers[current - 1]);
    });
}
function ensureChoiceRows(count) {
    let current = getChoiceContainers().length;
    while (current < count && current < MAX_CHOICES) {
        createChoiceRow(`選択肢${current + 1}`);
        current++;
    }
}

/* ---------------------------------------------------------
 * 5-3-3: order 用の要素増減
 * ------------------------------------------------------*/
function getOrderItemContainers() {
    return orderItemsArea.querySelectorAll('.choice-container');
}
function renumberOrderLabels() {
    const containers = getOrderItemContainers();
    containers.forEach((div, idx) => {
        const span = div.querySelector('span');
        if (span) span.textContent = `${idx + 1}.`;
    });
}
function createOrderItemRow(placeholderText = '要素') {
    const div = document.createElement('div');
    div.className = 'choice-container';
    div.style.marginBottom = '5px';
    const index = getOrderItemContainers().length + 1;
    div.innerHTML = `
        <span>${index}.</span>
        <input type="text" class="order-item-input" placeholder="${placeholderText}" style="width:80%;">
    `;
    orderItemsArea.appendChild(div);
}
if (addOrderItemBtn) {
    addOrderItemBtn.addEventListener('click', () => {
        const current = getOrderItemContainers().length;
        if (current >= MAX_CHOICES) {
            alert(`要素は最大 ${MAX_CHOICES} 個までです`);
            return;
        }
        createOrderItemRow(`要素${current + 1}`);
    });
}
if (removeOrderItemBtn) {
    removeOrderItemBtn.addEventListener('click', () => {
        const containers = getOrderItemContainers();
        const current = containers.length;
        if (current <= MIN_CHOICES) {
            alert(`要素は最低 ${MIN_CHOICES} 個以上必要です`);
            return;
        }
        orderItemsArea.removeChild(containers[current - 1]);
        renumberOrderLabels();
    });
}
function ensureOrderRows(count) {
    let current = getOrderItemContainers().length;
    while (current < count && current < MAX_CHOICES) {
        createOrderItemRow(`要素${current + 1}`);
        current++;
    }
    renumberOrderLabels();
}

/* ---------------------------------------------------------
 * 5-3-4: 問題追加フォームの送信
 * ------------------------------------------------------*/
if (quizForm) {
    quizForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = questionTypeSelect.value;
        const questionText = document.getElementById('question').value.trim();
        const imageUrl = document.getElementById('question-image-url').value.trim();
        const timeLimitInput = document.getElementById('time-limit').value;
        const explanation = document.getElementById('question-explanation').value.trim();
        const pointsInput = document.getElementById('question-points').value;

        const timeLimitSec = timeLimitInput === '' ? 0 : Number(timeLimitInput) || 0;
        let points = Number(pointsInput);
        if (!points || points <= 0) points = DEFAULT_POINTS;

        if (!questionText) {
            alert('問題文を入力してください');
            return;
        }

        let newQuestion = null;

        if (type === 'choice') {
            const choiceInputs = document.querySelectorAll('#creator-view .choice-input');
            const correctFlags = document.querySelectorAll('#creator-view .correct-flag');

            const choices = [];
            const correctIndexes = [];
            choiceInputs.forEach((input, index) => {
                const text = input.value.trim();
                if (!text) return;
                const idx = choices.length;
                choices.push(text);
                const flag = correctFlags[index];
                if (flag && flag.checked) correctIndexes.push(idx);
            });

            if (choices.length < MIN_CHOICES) {
                alert(`選択肢は最低 ${MIN_CHOICES} 個以上入力してください`);
                return;
            }
            if (choices.length > MAX_CHOICES) {
                alert(`選択肢は最大 ${MAX_CHOICES} 個までです`);
                return;
            }
            if (correctIndexes.length === 0) {
                alert('正解の選択肢を1つ以上チェックしてください');
                return;
            }

            const mode = correctIndexes.length > 1 ? 'multi' : 'single';

            newQuestion = {
                id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                type: 'choice',
                mode,
                q: questionText,
                c: choices,
                correctIndexes,
                explanation,
                timeLimitSec,
                imageUrl,
                points
            };

        } else if (type === 'order') {
            const itemInputs = document.querySelectorAll('#creator-view .order-item-input');
            const items = [];
            itemInputs.forEach(input => {
                const text = input.value.trim();
                if (text) items.push(text);
            });
            if (items.length < MIN_CHOICES) {
                alert(`要素は最低 ${MIN_CHOICES} 個以上入力してください`);
                return;
            }
            if (items.length > MAX_CHOICES) {
                alert(`要素は最大 ${MAX_CHOICES} 個までです`);
                return;
            }
            newQuestion = {
                id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                type: 'order',
                q: questionText,
                items,
                explanation,
                timeLimitSec,
                imageUrl,
                points
            };

        } else if (type === 'text') {
            const raw = document.getElementById('text-answers-input').value;
            const answers = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            if (answers.length === 0) {
                alert('正解とみなす答えを1つ以上入力してください');
                return;
            }
            newQuestion = {
                id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                type: 'text',
                q: questionText,
                answers,
                matchMode: 'loose',
                explanation,
                timeLimitSec,
                imageUrl,
                points
            };
        }

        if (!newQuestion) {
            alert('問題の作成に失敗しました');
            return;
        }

        // ★ ここで「新規か編集か」で分岐する
        if (editingQuestionIndex !== null) {
            // 既存の問題を上書き
            tempQuestions[editingQuestionIndex] = newQuestion;
        } else {
            // 新規追加
            tempQuestions.push(newQuestion);
        }

        // 編集状態リセット
        editingQuestionIndex = null;
        updateTempList();

        // フォームの入力をリセット
        quizForm.reset();

        // 初期状態に戻す
        questionTypeSelect.value = 'choice';
        choiceEditor.style.display = 'block';
        orderEditor.style.display  = 'none';
        textEditor.style.display   = 'none';

        document.getElementById('time-limit').value = 0;
        document.getElementById('question-points').value = DEFAULT_POINTS;

        // 送信後は必ず「新規モード」に戻す
        updateEditingUI(false);

        document.getElementById('question').focus();
    });
}

/* ---------------------------------------------------------
 * 5-3-5: 一時リストの表示（並べ替え・編集・複製・削除）
 * ------------------------------------------------------*/
function updateTempList() {
    tempCountSpan.textContent = tempQuestions.length;

    if (tempQuestions.length === 0) {
        tempQuestionsList.innerHTML =
            '<li style="color:#999; padding:10px;">まだ問題が追加されていません</li>';
        return;
    }

    tempQuestionsList.innerHTML = tempQuestions.map((q, i) => {
        let detail = '';
        if (q.type === 'choice') {
            const correctIndexes = Array.isArray(q.correctIndexes) ? q.correctIndexes
                : (typeof q.a === 'number' ? [q.a] : []);
            const correctTexts = (q.c || []).map((text, idx) =>
                correctIndexes.includes(idx) ? text : null
            ).filter(Boolean);
            const modeLabel = correctIndexes.length > 1 ? '複数解答' : '単一解答';
            detail = `[${modeLabel}] 正解: ${correctTexts.join(' / ')}`;
        } else if (q.type === 'order') {
            detail = `並べ替え: 要素${(q.items || []).length}個`;
        } else if (q.type === 'text') {
            detail = `記述式: 正解パターン${(q.answers || []).length}個`;
        } else {
            detail = '旧形式の問題';
        }

        const points = (typeof q.points === 'number' && !isNaN(q.points))
            ? q.points
            : DEFAULT_POINTS;

        return `
        <li style="margin-bottom:10px; border:1px solid #eee; padding:10px;
                   border-radius:5px; background:#fff;
                   display:flex; justify-content:space-between; align-items:center;">
            <div style="flex-grow:1; margin-right:10px;">
                <strong style="color:#0056b3;">Q${i+1}.</strong> [${q.type}] ${q.q}
                <span style="font-size:0.8em; color:#666; display:block;">
                    ${detail}
                </span>
                <span style="font-size:0.8em; color:#444;">
                    配点: ${points}点
                </span>
            </div>
            <div style="display:flex; gap:5px;">
                <button onclick="moveQuestion(${i}, -1)"
                        title="上に移動" style="padding:5px 8px;"
                        ${i === 0 ? 'disabled' : ''}>↑</button>
                <button onclick="moveQuestion(${i}, 1)"
                        title="下に移動" style="padding:5px 8px;"
                        ${i === tempQuestions.length - 1 ? 'disabled' : ''}>↓</button>
                <button onclick="editQuestion(${i})"
                        title="修正"
                        style="padding:5px 8px; background:#ffc107; border:none;">修正</button>
                <button onclick="duplicateQuestion(${i})"
                        title="複製"
                        style="padding:5px 8px; background:#17a2b8; color:white; border:none;">複製</button>
                <button onclick="removeQuestion(${i})"
                        title="削除"
                        style="padding:5px 8px; background:#dc3545; color:white; border:none;">削除</button>
            </div>
        </li>
        `;
    }).join('');
}

// 並べ替え
window.moveQuestion = function(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= tempQuestions.length) return;
    const tmp = tempQuestions[index];
    tempQuestions[index] = tempQuestions[newIndex];
    tempQuestions[newIndex] = tmp;
    updateTempList();
};

// 編集（フォームに戻す）
window.editQuestion = function(index) {
    const q = tempQuestions[index];

    // ★ 今どの問題を編集しているかを覚える
    editingQuestionIndex = index;
    updateEditingUI(true);

    document.getElementById('question').value = q.q || '';
    document.getElementById('question-image-url').value = q.imageUrl || '';
    document.getElementById('time-limit').value = q.timeLimitSec || 0;
    document.getElementById('question-explanation').value = q.explanation || '';
    document.getElementById('question-points').value =
        (typeof q.points === 'number' && !isNaN(q.points)) ? q.points : DEFAULT_POINTS;

    if (q.type === 'choice') {
        questionTypeSelect.value = 'choice';
        choiceEditor.style.display = 'block';
        orderEditor.style.display  = 'none';
        textEditor.style.display   = 'none';

        const choices = q.c || [];
        ensureChoiceRows(choices.length);
        const choiceInputs = document.querySelectorAll('#creator-view .choice-input');
        const correctFlags = document.querySelectorAll('#creator-view .correct-flag');

        let correctIndexes = Array.isArray(q.correctIndexes) && q.correctIndexes.length > 0
            ? q.correctIndexes
            : (typeof q.a === 'number' ? [q.a] : []);

        choiceInputs.forEach((input, i) => {
            if (i < choices.length) {
                input.value = choices[i];
                if (correctFlags[i]) correctFlags[i].checked = correctIndexes.includes(i);
            } else {
                input.value = '';
                if (correctFlags[i]) correctFlags[i].checked = false;
            }
        });

    } else if (q.type === 'order') {
        questionTypeSelect.value = 'order';
        choiceEditor.style.display = 'none';
        orderEditor.style.display  = 'block';
        textEditor.style.display   = 'none';

        const items = q.items || [];
        ensureOrderRows(items.length);
        const itemInputs = document.querySelectorAll('#creator-view .order-item-input');
        itemInputs.forEach((input, i) => {
            if (i < items.length) {
                input.value = items[i];
            } else {
                input.value = '';
            }
        });
        renumberOrderLabels();

    } else if (q.type === 'text') {
        questionTypeSelect.value = 'text';
        choiceEditor.style.display = 'none';
        orderEditor.style.display  = 'none';
        textEditor.style.display   = 'block';

        const answers = q.answers || [];
        document.getElementById('text-answers-input').value = answers.join('\n');
    }

    document.getElementById('question').focus();
};

// 複製
window.duplicateQuestion = function(index) {
    const copy = JSON.parse(JSON.stringify(tempQuestions[index]));
    copy.id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    tempQuestions.splice(index + 1, 0, copy);
    updateTempList();
};

// 削除
window.removeQuestion = function(index) {
    tempQuestions.splice(index, 1);

    // 編集中だった問題を消した場合は編集状態をクリア
    if (editingQuestionIndex === index) {
        editingQuestionIndex = null;
        updateEditingUI(false);
        quizForm.reset();
    } else if (editingQuestionIndex !== null && index < editingQuestionIndex) {
        // 手前の要素が消えたらインデックスを1つ詰める
        editingQuestionIndex--;
    }

    updateTempList();
};

/* ---------------------------------------------------------
 * 5-3-6: セット保存ボタン処理（新規 or 既存セットの上書き）
 * ------------------------------------------------------*/
if (saveSetBtn) {
    saveSetBtn.addEventListener('click', () => {
        if (tempQuestions.length === 0) {
            alert('問題が1つもありません。まずは「追加」してください。');
            return;
        }

        const quizzes = loadQuizzes();

        // ▼ セット名（あれば）
        const quizSetTitleInput = document.getElementById('quiz-set-title');
        const title = quizSetTitleInput
            ? quizSetTitleInput.value.trim()
            : '';

        let roomId = editingRoomId;
        const isEditing = !!editingRoomId;

        if (!roomId) {
            // 新規作成なら新しい部屋コードを発行
            roomId = generateRoomId();
        }

        const quizSetData = {
            roomId,
            title,
            questions: tempQuestions,
            createdAt: new Date().toISOString()
        };

        quizzes[roomId] = quizSetData;
        saveQuizzes(quizzes);

        if (isEditing) {
            creatorStatusMessage.textContent =
                `部屋コード ${roomId} のクイズセットを上書き保存しました`;
        } else {
            creatorStatusMessage.textContent =
                `保存完了！部屋コード: ${roomId}`;
        }

        // 編集モード解除 & 一時リスト初期化
        editingRoomId = null;
        tempQuestions = [];
        updateTempList();
        updateEditingUI(false);

        // セット名もクリア
        if (quizSetTitleInput) quizSetTitleInput.value = '';

        renderCreatorQuizList();
    });
}


/* ---------------------------------------------------------
 * 5-3-7: 発行済みセット一覧の表示（出題者ビュー & メインメニュー）
 * ------------------------------------------------------*/
function renderCreatorQuizList() {
    if (!questionsList) return;
    questionsList.innerHTML = '';

    const existingQuizzes = loadQuizzes();
    const quizzesArray = Object.values(existingQuizzes).reverse();

    quizzesArray.forEach(quizData => {
        try {
            const qCount = quizData.questions ? quizData.questions.length : 1;
            const title  =
                quizData.title ||
                (quizData.questions && quizData.questions[0]
                    ? quizData.questions[0].q
                    : (quizData.questionText || '（タイトル未設定）'));

            const newItem = document.createElement('div');
            newItem.style.border = "1px solid #ddd";
            newItem.style.padding = "15px";
            newItem.style.marginTop = "15px";
            newItem.style.borderRadius = "8px";
            newItem.style.backgroundColor = "#fff";

            newItem.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;
                            border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:10px;">
                    <span style="font-weight:bold; color:#007bff; font-size:1.1em;">
                        部屋コード: ${quizData.roomId}
                    </span>
                    <span style="background:#eee; padding:3px 10px; border-radius:12px; font-size:0.8em;">
                        全 ${qCount} 問
                    </span>
                    <div style="display:flex; gap:8px;">
                        <button onclick="editQuizSet('${quizData.roomId}')"
                                class="btn-info"
                                style="padding:5px 10px; font-size:0.8em;">
                            編集
                        </button>
                        <button onclick="deleteQuiz('${quizData.roomId}')"
                                class="btn-danger"
                                style="padding:5px 10px; font-size:0.8em;">
                            削除
                        </button>
                    </div>
                </div>
                <p style="font-weight:bold; margin:0;">
                    ${title}
                </p>
            `;
            questionsList.appendChild(newItem);
        } catch (e) {
            console.error('Skip error data', e);
        }
    });

    // メインメニュー側の一覧も同期
    renderMainQuizList();
}

// 発行済みセットを編集モードで読み込む
window.editQuizSet = function(roomId) {
    const quizzes = loadQuizzes();
    const data = quizzes[roomId];
    if (!data || !Array.isArray(data.questions)) {
        alert('このクイズセットのデータが見つからないか、形式が古いため編集できません。');
        return;
    }

    tempQuestions = JSON.parse(JSON.stringify(data.questions));
    editingRoomId = roomId;
    editingQuestionIndex = null;

    updateTempList();
    updateEditingUI(false);

    if (quizSetTitleInput) {
        quizSetTitleInput.value = data.title || '';
    }

    creatorStatusMessage.textContent =
        `部屋コード ${roomId} のクイズセットを編集中です。保存すると上書きされます。`;

    showView(views.creator);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// メインメニュー用の発行済みクイズ一覧
function renderMainQuizList() {
    const container = document.getElementById('main-published-list');
    if (!container) return;

    const existingQuizzes = loadQuizzes();
    const quizzesArray = Object.values(existingQuizzes).reverse();

    if (quizzesArray.length === 0) {
        container.innerHTML =
            '<p style="color:#999; text-align:center;">まだ発行済みクイズはありません</p>';
        return;
    }

    container.innerHTML = quizzesArray.map(quizData => {
        const qCount = quizData.questions ? quizData.questions.length : 1;
        const title =
            quizData.title ||
            (quizData.questions && quizData.questions[0]
                ? quizData.questions[0].q
                : (quizData.questionText || '（タイトル未設定）'));

        return `
            <div class="quiz-card" onclick="openQuizFromMain('${quizData.roomId}')">
                <div class="quiz-card-title">${title}</div>
                <div class="quiz-card-code">コード: ${quizData.roomId}</div>
                <div style="font-size:0.75em; margin-top:6px; opacity:0.9;">
                    全 ${qCount} 問
                </div>
            </div>
        `;
    }).join('');
}

// カードクリック時：回答者画面へ遷移＆コード入力
window.openQuizFromMain = function(roomId) {
    const input = document.getElementById('room-code-input');
    if (input) {
        input.value = roomId;
    }
    showView(views.respondent);
};

// セット削除
window.deleteQuiz = function(roomId) {
    if (!confirm('本当に削除しますか？')) return;
    const quizzes = loadQuizzes();
    delete quizzes[roomId];
    saveQuizzes(quizzes);

    if (editingRoomId === roomId) {
        editingRoomId = null;
        editingQuestionIndex = null;
        tempQuestions = [];
        updateTempList();
        updateEditingUI(false);
        creatorStatusMessage.textContent = '';
        if (quizSetTitleInput) quizSetTitleInput.value = '';
    }

    renderCreatorQuizList();
};

// ★ 初期化時に一覧を表示
renderCreatorQuizList();


/* =========================================================
 * SECTION 5-4: 回答者ロジック（部屋参加）
 * =======================================================*/

const joinRoomBtn       = document.getElementById('join-room-btn');
const roomCodeInput     = document.getElementById('room-code-input');
const roomStatusMessage = document.getElementById('room-status-message');

if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', executeJoin);
}
if (roomCodeInput) {
    roomCodeInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') executeJoin();
    });
}

function executeJoin() {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!code) {
        alert('⚠️ 部屋コードを入力してください');
        return;
    }

    const existingQuizzes = loadQuizzes();
    const targetQuiz = existingQuizzes[code];

    if (!targetQuiz) {
        alert(`❌ 部屋コード「${code}」は見つかりませんでした。\n正しいコードか確認してください。`);
        roomStatusMessage.textContent = '❌ そのコードの部屋は見つかりません';
        return;
    }

    roomStatusMessage.textContent = '';
    try {
        startQuiz(targetQuiz);
        showView(views.quizDisplay);
    } catch (e) {
        alert('⚠️ エラー：この部屋のデータは壊れているため開けません。（作成し直してください）');
        console.error(e);
    }
}

/* =========================================================
 * SECTION 5-5: クイズ進行・採点ロジック
 * =======================================================*/

/* ---------------------------------------------------------
 * 5-5-0: 得点ルール
 * ------------------------------------------------------*/
// 不正解のときの点数変化（減点したくないなら 0）
const SCORE_WRONG    = -5;
// 時間切れのときの点数変化
const SCORE_TIMEOUT  = 0;

// points が未設定の問題のデフォルト配点
const DEFAULT_POINTS_RUNTIME = 10;

function getPointsForQuestion(q) {
    if (q && typeof q.points === 'number' && !isNaN(q.points) && q.points > 0) {
        return q.points;
    }
    return DEFAULT_POINTS_RUNTIME;
}

/* ---------------------------------------------------------
 * 5-5-1: 状態管理とタイマー
 * ------------------------------------------------------*/
let currentQuizSet = [];
let currentQuestionIndex = 0;

// 正解数
let correctCount = 0;
// 総合得点
let score = 0;

let timerId = null;
let remainingSec = 0;

let currentOrderState = []; // order問題用

function clearQuestionTimer() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
    const timerDisp = document.getElementById('timer-display');
    if (timerDisp) timerDisp.textContent = '';
}

function startQuestionTimer(timeLimitSec, onTimeout) {
    clearQuestionTimer();
    if (!timeLimitSec || timeLimitSec <= 0) return;

    remainingSec = timeLimitSec;
    const timerDisp = document.getElementById('timer-display');
    timerDisp.textContent = `残り時間: ${remainingSec} 秒`;

    timerId = setInterval(() => {
        remainingSec--;
        if (remainingSec <= 0) {
            clearQuestionTimer();
            timerDisp.textContent = '時間切れ！';
            if (typeof onTimeout === 'function') onTimeout();
        } else {
            timerDisp.textContent = `残り時間: ${remainingSec} 秒`;
        }
    }, 1000);
}

function normaliseText(str) {
    return (str || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
}

/* ---------------------------------------------------------
 * 5-5-2: クイズ開始処理
 * ------------------------------------------------------*/
function startQuiz(quizData) {
    if (Array.isArray(quizData.questions)) {
        currentQuizSet = quizData.questions.map(q => {
            const base = {
                type: q.type || 'choice',
                q: q.q || q.questionText,
                explanation: q.explanation || '',
                timeLimitSec: q.timeLimitSec || 0,
                imageUrl: q.imageUrl || '',
                points: getPointsForQuestion(q) // 保存されている points を優先
            };

            if (base.type === 'choice') {
                const choices = q.c || q.choices || [];
                let correctIndexes;
                if (Array.isArray(q.correctIndexes) && q.correctIndexes.length > 0) {
                    correctIndexes = q.correctIndexes;
                } else if (typeof q.a === 'number') {
                    correctIndexes = [q.a];
                } else if (typeof q.correctAnswerIndex === 'number') {
                    correctIndexes = [q.correctAnswerIndex];
                } else {
                    correctIndexes = [];
                }
                return {
                    ...base,
                    mode: q.mode || (correctIndexes.length > 1 ? 'multi' : 'single'),
                    c: choices,
                    correctIndexes
                };
            } else if (base.type === 'order') {
                return {
                    ...base,
                    items: q.items || []
                };
            } else if (base.type === 'text') {
                return {
                    ...base,
                    answers: q.answers || [],
                    matchMode: q.matchMode || 'loose'
                };
            } else {
                const choices = q.c || q.choices || [];
                return {
                    ...base,
                    type: 'choice',
                    c: choices,
                    correctIndexes: [q.a ?? q.correctAnswerIndex ?? 0],
                    mode: 'single'
                };
            }
        });
    } else {
        if (!quizData.questionText) {
            throw new Error('無効なデータ形式です');
        }
        currentQuizSet = [{
            type: 'choice',
            q: quizData.questionText,
            c: quizData.choices,
            correctIndexes: [quizData.correctAnswerIndex],
            mode: 'single',
            explanation: '',
            timeLimitSec: 0,
            imageUrl: '',
            points: DEFAULT_POINTS_RUNTIME
        }];
    }

    if (!Array.isArray(currentQuizSet) || currentQuizSet.length === 0) {
        throw new Error('問題セットが空です');
    }

    currentQuestionIndex = 0;
    correctCount = 0;
    score = 0;
    showQuestion();
}

/* ---------------------------------------------------------
 * 5-5-3: 次の問題を表示するコントローラ
 * ------------------------------------------------------*/
function showQuestion() {
    const quizContent = document.getElementById('quiz-content');
    const resultMsg    = document.getElementById('result-message');
    resultMsg.innerHTML = '';

    const q = currentQuizSet[currentQuestionIndex];
    if (!q) {
        quizContent.innerHTML =
            '<p style="color:red;">⚠️ エラー：問題データの読み込みに失敗しました。</p>';
        return;
    }

    const type = q.type || 'choice';

    if (type === 'choice') {
        renderChoiceQuestion(q);
    } else if (type === 'order') {
        renderOrderQuestion(q);
    } else if (type === 'text') {
        renderTextQuestion(q);
    } else {
        quizContent.innerHTML = `
            <p style="color:red;">⚠️ 未対応の問題形式です: ${type}</p>
        `;
    }
}

/* ---------------------------------------------------------
 * 5-5-4: choice 問題の描画と採点
 * ------------------------------------------------------*/
function renderChoiceQuestion(q) {
    const quizContent = document.getElementById('quiz-content');

    if (!Array.isArray(q.c)) {
        quizContent.innerHTML =
            '<p style="color:red;">⚠️ エラー：選択肢データの読み込みに失敗しました。</p>';
        return;
    }
    const correctIndexes = Array.isArray(q.correctIndexes) ? q.correctIndexes : [];
    if (correctIndexes.length === 0) {
        quizContent.innerHTML =
            '<p style="color:red;">⚠️ エラー：正解が設定されていません。</p>';
        return;
    }

    let choicesHtml = '';
    q.c.forEach((choice, index) => {
        choicesHtml += `
            <button onclick="handleChoiceAnswer(${index})"
                    id="btn-${index}"
                    style="display:block; width:100%; margin:10px 0; padding:15px;
                           text-align:left; background:white; border:1px solid #ccc; font-size:1em;">
                ${index + 1}. ${choice}
            </button>
        `;
    });

    const modeLabel = (q.mode === 'multi' || correctIndexes.length > 1)
        ? '複数正解パターンあり'
        : '単一正解';

    const imageHtml = q.imageUrl
        ? `<div style="text-align:center; margin-top:10px;">
               <img src="${q.imageUrl}" alt="" style="max-width:100%; max-height:200px; object-fit:contain;">
           </div>`
        : '';

    const points = getPointsForQuestion(q);

    quizContent.innerHTML = `
        <div style="margin-bottom:10px; color:#666; font-weight:bold;">
            第 ${currentQuestionIndex + 1} 問 / 全 ${currentQuizSet.length} 問
        </div>
        <div style="background:#eef; padding:20px; border-radius:8px; margin-bottom:10px;">
            <h3 style="margin:0;">Q. ${q.q}</h3>
            <div style="font-size:0.8em; color:#555; margin-top:5px;">
                問題タイプ: choice / ${modeLabel} / 正解: ${points}点
            </div>
            ${imageHtml}
        </div>
        <div>${choicesHtml}</div>
    `;

    startQuestionTimer(q.timeLimitSec, handleChoiceTimeout);
}

function setResultMessage(text, color, q) {
    const resultMsg = document.getElementById('result-message');
    let html = `<span>${text}</span>`;
    if (q && q.explanation) {
        html += `<br><span style="font-size:0.9em; color:#555;">解説: ${q.explanation}</span>`;
    }
    resultMsg.style.color = color;
    resultMsg.innerHTML = html;
}

window.handleChoiceAnswer = function(selectedIndex) {
    clearQuestionTimer();
    const q = currentQuizSet[currentQuestionIndex];
    const correctIndexes = Array.isArray(q.correctIndexes) && q.correctIndexes.length > 0
        ? q.correctIndexes
        : (typeof q.a === 'number' ? [q.a] : []);

    const allBtns = document.querySelectorAll('#quiz-content button');
    allBtns.forEach(btn => btn.disabled = true);

    const isCorrect = correctIndexes.includes(selectedIndex);
    const points = getPointsForQuestion(q);

    if (isCorrect) {
        correctCount++;
        score += points;
        setResultMessage(`⭕ 正解！ (+${points}点)`, '#28a745', q);
    } else {
        score += SCORE_WRONG;
        const disp = SCORE_WRONG === 0 ? '' : ` (${SCORE_WRONG}点)`;
        setResultMessage(`❌ 不正解...${disp}`, '#dc3545', q);
        const wrongBtn = document.getElementById(`btn-${selectedIndex}`);
        if (wrongBtn) wrongBtn.style.backgroundColor = '#f8d7da';
    }

    correctIndexes.forEach(idx => {
        const btn = document.getElementById(`btn-${idx}`);
        if (btn) {
            btn.style.backgroundColor = '#d4edda';
            btn.style.fontWeight = 'bold';
            if (!btn.textContent.includes(' (正解)')) {
                btn.textContent += ' (正解)';
            }
        }
    });

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuizSet.length) {
            showQuestion();
        } else {
            showResult();
        }
    }, 1500);
};

function handleChoiceTimeout() {
    const q = currentQuizSet[currentQuestionIndex];
    const correctIndexes = Array.isArray(q.correctIndexes) ? q.correctIndexes : [];
    const allBtns = document.querySelectorAll('#quiz-content button');
    allBtns.forEach(btn => btn.disabled = true);

    score += SCORE_TIMEOUT;
    const disp = SCORE_TIMEOUT === 0 ? '' : ` (${SCORE_TIMEOUT}点)`;
    setResultMessage(`⌛ 時間切れ！${disp}`, '#dc3545', q);

    correctIndexes.forEach(idx => {
        const btn = document.getElementById(`btn-${idx}`);
        if (btn) {
            btn.style.backgroundColor = '#d4edda';
            btn.style.fontWeight = 'bold';
            if (!btn.textContent.includes(' (正解)')) {
                btn.textContent += ' (正解)';
            }
        }
    });

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuizSet.length) {
            showQuestion();
        } else {
            showResult();
        }
    }, 1500);
}

/* ---------------------------------------------------------
 * 5-5-5: order（並べ替え）問題
 * ------------------------------------------------------*/
function renderOrderQuestion(q) {
    const quizContent = document.getElementById('quiz-content');
    const items = q.items || [];
    if (items.length < 2) {
        quizContent.innerHTML =
            '<p style="color:red;">⚠️ エラー：並べ替え要素が足りません。</p>';
        return;
    }

    // ★ 新しい並べ替え問題を表示するタイミングでだけ、state を初期化＆シャッフル
    currentOrderState = items.map((_, idx) => idx);
    for (let i = currentOrderState.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentOrderState[i], currentOrderState[j]] = [currentOrderState[j], currentOrderState[i]];
    }

    // 現在の state に基づいて描画
    renderOrderQuestionView(q);

    // タイマー開始（問題ごとに一度だけ）
    startQuestionTimer(q.timeLimitSec, handleOrderTimeout);
}

// ★ 並び順は currentOrderState をそのまま使い、シャッフルはしない描画専用関数
function renderOrderQuestionView(q) {
    const quizContent = document.getElementById('quiz-content');
    const items = q.items || [];

    let listHtml = '';
    currentOrderState.forEach((idx, pos) => {
        listHtml += `
            <div style="display:flex; align-items:center; margin:6px 0; gap:8px;">
                <span style="width:32px; text-align:right;">${pos + 1}. </span>
                <div style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px; background:#fff;">
                    ${items[idx]}
                </div>
                <div style="display:flex; flex-direction:column; gap:3px;">
                    <button type="button"
                        onclick="moveOrderItem(${pos}, -1)"
                        style="padding:4px 6px;" ${pos === 0 ? 'disabled' : ''}>⬆️</button>
                    <button type="button"
                        onclick="moveOrderItem(${pos}, 1)"
                        style="padding:4px 6px;" ${pos === currentOrderState.length - 1 ? 'disabled' : ''}>⬇️</button>
                </div>
            </div>
        `;
    });

    const imageHtml = q.imageUrl
        ? `<div style="text-align:center; margin-top:10px;">
               <img src="${q.imageUrl}" alt="" style="max-width:100%; max-height:200px; object-fit:contain;">
           </div>`
        : '';

    const points = getPointsForQuestion(q);

    quizContent.innerHTML = `
        <div style="margin-bottom:10px; color:#666; font-weight:bold;">
            第 ${currentQuestionIndex + 1} 問 / 全 ${currentQuizSet.length} 問
        </div>
        <div style="background:#eef; padding:20px; border-radius:8px; margin-bottom:10px;">
            <h3 style="margin:0;">Q. ${q.q}</h3>
            <div style="font-size:0.8em; color:#555; margin-top:5px;">
                問題タイプ: order（正しい順番に並べ替えてください） / 正解: ${points}点
            </div>
            ${imageHtml}
        </div>
        <div>${listHtml}</div>
        <div style="text-align:center; margin-top:15px;">
            <button class="btn-primary" onclick="submitOrderAnswer()">この順番で回答する</button>
        </div>
    `;
}

// ⬆️⬇️ボタンを押したときは state だけ入れ替えて再描画（シャッフルしない・タイマーもリセットしない）
window.moveOrderItem = function(pos, direction) {
    const newPos = pos + direction;
    if (newPos < 0 || newPos >= currentOrderState.length) return;

    const tmp = currentOrderState[pos];
    currentOrderState[pos] = currentOrderState[newPos];
    currentOrderState[newPos] = tmp;

    const q = currentQuizSet[currentQuestionIndex];
    renderOrderQuestionView(q);
};

window.submitOrderAnswer = function() {
    clearQuestionTimer();
    const q = currentQuizSet[currentQuestionIndex];
    const quizContent = document.getElementById('quiz-content');

    const n = currentOrderState.length;
    let allCorrect = true;
    for (let i = 0; i < n; i++) {
        if (currentOrderState[i] !== i) {
            allCorrect = false;
            break;
        }
    }

    const points = getPointsForQuestion(q);

    if (allCorrect) {
        correctCount++;
        score += points;
        setResultMessage(`⭕ 正解！ (+${points}点)`, '#28a745', q);
    } else {
        score += SCORE_WRONG;
        const disp = SCORE_WRONG === 0 ? '' : ` (${SCORE_WRONG}点)`;
        setResultMessage(`❌ 不正解...${disp}`, '#dc3545', q);
    }

    let correctHtml = '';
    q.items.forEach((item, idx) => {
        correctHtml += `<div>${idx + 1}. ${item}</div>`;
    });
    quizContent.innerHTML += `
        <div style="margin-top:15px; padding:10px; border-top:1px dashed #ccc; font-size:0.9em;">
            <strong>✔ 正しい順番</strong>
            ${correctHtml}
        </div>
    `;

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuizSet.length) {
            showQuestion();
        } else {
            showResult();
        }
    }, 2000);
};

function handleOrderTimeout() {
    const q = currentQuizSet[currentQuestionIndex];
    const quizContent = document.getElementById('quiz-content');

    score += SCORE_TIMEOUT;
    const disp = SCORE_TIMEOUT === 0 ? '' : ` (${SCORE_TIMEOUT}点)`;
    setResultMessage(`⌛ 時間切れ！${disp}`, '#dc3545', q);

    let correctHtml = '';
    q.items.forEach((item, idx) => {
        correctHtml += `<div>${idx + 1}. ${item}</div>`;
    });
    quizContent.innerHTML += `
        <div style="margin-top:15px; padding:10px; border-top:1px dashed #ccc; font-size:0.9em;">
            <strong>✔ 正しい順番</strong>
            ${correctHtml}
        </div>
    `;

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuizSet.length) {
            showQuestion();
        } else {
            showResult();
        }
    }, 2000);
}

/* ---------------------------------------------------------
 * 5-5-6: text（記述式）問題
 * ------------------------------------------------------*/
function renderTextQuestion(q) {
    const quizContent = document.getElementById('quiz-content');

    const answers = q.answers || [];
    if (answers.length === 0) {
        quizContent.innerHTML =
            '<p style="color:red;">⚠️ 正解パターンが設定されていません。</p>';
        return;
    }

    const imageHtml = q.imageUrl
        ? `<div style="text-align:center; margin-top:10px;">
               <img src="${q.imageUrl}" alt="" style="max-width:100%; max-height:200px; object-fit:contain;">
           </div>`
        : '';

    const points = getPointsForQuestion(q);

    quizContent.innerHTML = `
        <div style="margin-bottom:10px; color:#666; font-weight:bold;">
            第 ${currentQuestionIndex + 1} 問 / 全 ${currentQuizSet.length} 問
        </div>
        <div style="background:#eef; padding:20px; border-radius:8px; margin-bottom:10px;">
            <h3 style="margin:0;">Q. ${q.q}</h3>
            <div style="font-size:0.8em; color:#555; margin-top:5px;">
                問題タイプ: text（記述式） / 正解: ${points}点
            </div>
            ${imageHtml}
        </div>
        <div style="text-align:center; margin-top:10px;">
            <input type="text" id="text-answer-input" style="width:80%; max-width:400px;">
            <div style="margin-top:10px;">
                <button class="btn-primary" id="text-answer-btn">回答する</button>
            </div>
        </div>
    `;

    const btn = document.getElementById('text-answer-btn');
    const input = document.getElementById('text-answer-input');
    btn.addEventListener('click', submitTextAnswer);
    input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') submitTextAnswer();
    });

    startQuestionTimer(q.timeLimitSec, handleTextTimeout);
}

function submitTextAnswer() {
    clearQuestionTimer();
    const q = currentQuizSet[currentQuestionIndex];
    const input = document.getElementById('text-answer-input');
    const userAns = normaliseText(input.value);

    if (!userAns) {
        alert('答えを入力してください');
        startQuestionTimer(q.timeLimitSec, handleTextTimeout);
        return;
    }

    const answers = (q.answers || []).map(normaliseText);
    const isCorrect = answers.includes(userAns);
    const points = getPointsForQuestion(q);

    if (isCorrect) {
        correctCount++;
        score += points;
        setResultMessage(`⭕ 正解！ (+${points}点)`, '#28a745', q);
    } else {
        score += SCORE_WRONG;
        const disp = SCORE_WRONG === 0 ? '' : ` (${SCORE_WRONG}点)`;
        setResultMessage(`❌ 不正解...${disp}`, '#dc3545', q);
    }

    const quizContent = document.getElementById('quiz-content');
    let answerHtml = '';
    (q.answers || []).forEach((ans, idx) => {
        answerHtml += `<div>${idx + 1}. ${ans}</div>`;
    });
    quizContent.innerHTML += `
        <div style="margin-top:15px; padding:10px; border-top:1px dashed #ccc; font-size:0.9em;">
            <strong>✔ 正解とみなす答えの例</strong>
            ${answerHtml}
        </div>
    `;

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuizSet.length) {
            showQuestion();
        } else {
            showResult();
        }
    }, 2000);
}

function handleTextTimeout() {
    const q = currentQuizSet[currentQuestionIndex];
    const quizContent = document.getElementById('quiz-content');

    score += SCORE_TIMEOUT;
    const disp = SCORE_TIMEOUT === 0 ? '' : ` (${SCORE_TIMEOUT}点)`;
    setResultMessage(`⌛ 時間切れ！${disp}`, '#dc3545', q);

    let answerHtml = '';
    (q.answers || []).forEach((ans, idx) => {
        answerHtml += `<div>${idx + 1}. ${ans}</div>`;
    });
    quizContent.innerHTML += `
        <div style="margin-top:15px; padding:10px; border-top:1px dashed #ccc; font-size:0.9em;">
            <strong>✔ 正解とみなす答えの例</strong>
            ${answerHtml}
        </div>
    `;

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuizSet.length) {
            showQuestion();
        } else {
            showResult();
        }
    }, 2000);
}

/* ---------------------------------------------------------
 * 5-5-7: 結果画面
 * ------------------------------------------------------*/
function showResult() {
    clearQuestionTimer();
    const quizContent = document.getElementById('quiz-content');
    const resultMsg    = document.getElementById('result-message');
    resultMsg.innerHTML = '';

    const totalQuestions = currentQuizSet.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    quizContent.innerHTML = `
        <div style="text-align:center; padding:40px 20px;">
            <h2>🎉 お疲れ様でした！</h2>
            <div style="margin:20px 0;">
                <p style="font-size:1.1em; color:#666;">総合得点</p>
                <p style="font-size:3.2em; margin:10px 0; font-weight:bold; color:#007bff;">
                    ${score} <span style="font-size:0.4em; color:#333;">点</span>
                </p>
            </div>
            <div style="margin:10px 0;">
                <p style="font-size:1em; color:#666; margin:0;">正解数</p>
                <p style="font-size:1.3em; margin:5px 0;">
                    ${correctCount} / ${totalQuestions} 問
                </p>
            </div>
            <p style="font-size:1.3em; font-weight:bold;
                      color:${percentage >= 80 ? 'green' : 'orange'}; margin-top:10px;">
                正解率: ${percentage}%
            </p>
            <p style="margin-top:10px;">
                ${percentage === 100 ? '👑 パーフェクト！！' : 'また挑戦してね！'}
            </p>
            <p style="margin-top:10px; color:#666; font-size:0.9em;">
                ※ 画面下の「トップに戻る」ボタンから別のクイズにも参加できます
            </p>
        </div>
    `;
}