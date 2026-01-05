/* =========================================================
 * text_config.js (v34: Viewer on Dashboard)
 * =======================================================*/

const APP_TEXT = {
    // 共通
    AppTitle: "Quiz Studio",
    Version: "Cloud Edition v34",
    
    // メインメニュー
    Main: {
        HostBtn: "司会者 (Host)",
        PlayerBtn: "回答者 (Player)"
    },

    // ホストログイン
    Login: {
        Title: "番組IDを入力",
        Placeholder: "例: QUIZ2026",
        SubmitBtn: "ログイン / 新規作成",
        BackBtn: "戻る",
        AlertEmpty: "番組IDを入力してください",
        AlertError: "ID文字種エラー"
    },

    // ダッシュボード
    Dashboard: {
        Logout: "ログアウト",
        BtnCreate: "セット作成",
        BtnConfig: "セット設定",
        BtnStudio: "スタジオ",
        BtnViewer: "モニター (Viewer)", // ★追加
        SetListTitle: "保存済みセット (素材)",
        DeleteConfirm: "削除しますか？"
    },

    // セット作成
    Creator: {
        Title: "問題作成",
        BackBtn: "ダッシュボードへ",
        LabelSetName: "セット名",
        PlaceholderSetName: "例: 第1ステージ",
        HeadingNewQ: "新規問題追加",
        LabelType: "問題形式",
        TypeChoice: "🔳 選択式 (Choice)",
        TypeSort: "🔢 並べ替え (Sort)",
        TypeText: "✍️ 自由入力 (Free Input)",
        PlaceholderQ: "問題文を入力",
        BtnAdd: "リストに追加",
        ListHeading: "作成中のリスト",
        BtnSave: "クラウドに保存して完了",
        BtnUpdate: "更新して完了",
        OptMulti: "複数回答可",
        OptPartial: "部分点あり",
        BtnAddChoice: "＋ 選択肢を追加",
        BtnAddSort: "＋ 項目を追加",
        AlertNoQ: "問題文を入力してください",
        AlertLessChoice: "選択肢は2つ以上必要です",
        AlertNoCorrect: "正解を選んでください",
        AlertNoTextAns: "正解を入力してください"
    },

    // セット設定
    Config: {
        Title: "セット設定",
        BackBtn: "戻る",
        HeadingAdd: "ピリオド（セット）を構成に追加",
        LabelSet: "1. セットを選択",
        SelectDefault: "-- セットを選択 --",
        SelectLoading: "読み込み中...",
        SelectEmpty: "セットがありません",
        LabelRule: "2. ルール設定",
        LabelElim: "▼ 脱落条件",
        RuleNone: "脱落なし（ランキング戦）",
        RuleWrong: "不正解者のみ脱落",
        RuleSlow: "不正解 ＋ 一番遅い人も脱落",
        LabelElimCount: "遅い順に",
        LabelElimCountSuffix: "名が脱落",
        LabelTime: "制限時間",
        LabelScore: "スコア",
        LabelLoss: "不正解時の失点 (Penalty)",
        LossNone: "なし (0点)",
        LossReset: "0点にリセット",
        HeadingCustomScore: "問題別配点・失点設定",
        LabelBulkPt: "得点一括:",
        LabelBulkLoss: "失点一括:",
        BtnReflect: "反映",
        BtnAddList: "リストに追加",
        HeadingList: "現在の番組構成リスト",
        LabelFinalRank: "最後に最終結果発表を行う",
        PlaceholderProgName: "構成に名前をつけて保存",
        BtnSaveProg: "保存",
        BtnGoStudio: "保存してスタジオへ",
        InterHeading: "ピリオド間設定",
        StatusRevive: "全員復活してスタート",
        StatusContinue: "生存者のみで継続",
        StatusRanking: "成績上位者が進出",
        LabelTop: "上位",
        LabelName: "名",
        CheckInterRank: "この前に中間発表を行う",
        HeadingSavedProg: "保存済みプログラムリスト",
        BtnLoadProg: "読込",
        BtnDelProg: "削除",
        MsgConfirmLoadProg: "このプログラムを読み込みますか？\n（現在の編集内容は破棄されます）",
        MsgConfirmDelProg: "本当にこのプログラムを削除しますか？",
        AlertNoSet: "セットを選んでください",
        AlertEmptyList: "構成リストが空です",
        AlertNoTitle: "プログラム名を入力してください",
        MsgSaved: "プログラムを保存しました！"
    },

    // スタジオ
    Studio: {
        OnAir: "ON AIR",
        LabelPlayer: "参加",
        LabelAlive: "生存",
        LabelKanpe: "司会者用カンペ",
        StatusReady: "準備中...",
        HeadingList: "番組構成リスト",
        HeadingLoad: "📂 プログラム読込",
        SelectProgDefault: "保存済みプログラムを選択...",
        BtnLoad: "読み込んでセット",
        BtnMasterPlay: "再生 ▶",
        BtnStart: "問題 START！",
        BtnAnswer: "正解発表",
        BtnNextQ: "次の問題へ",
        BtnNextPeriod: "次のピリオドへ進む",
        BtnInterRanking: "中間発表へ",
        BtnFinalRanking: "最終結果発表へ",
        BtnEnd: "全工程終了",
        BtnRanking: "中間順位",
        BtnClose: "スタジオを閉じて戻る",
        BtnBackRanking: "スタジオに戻る",
        MsgConfirmLoad: "プログラムを読み込んでセットしますか？\n（現在の進行内容はリセットされます）",
        MsgLoaded: "セットしました。再生ボタンで開始してください。",
        MsgThinking: "Thinking Time...",
        MsgAnswerCheck: "正解発表",
        MsgAllEnd: "全てのピリオドが終了しました！お疲れ様でした！",
        MsgConfirmBack: "ダッシュボードに戻りますか？"
    },

    // プレイヤー
    Player: {
        TitleEntry: "エントリー",
        PlaceholderCode: "部屋コード (6桁)",
        PlaceholderName: "名前を入力",
        BtnJoin: "参加する",
        LabelNameDefault: "名無し",
        BadgeAlive: "STAND UP",
        BadgeDead: "DEAD",
        MsgLobbyHead: "Ready?",
        MsgLobbyBody: "画面を注視してください",
        MsgAnswered: "ANSWERED!<br>祈ってお待ちください...",
        MsgCorrect: "正解！",
        MsgWrong: "不正解...",
        MsgWait: "集計中...",
        MsgDead: "GAME OVER",
        MsgDeadBody: "脱落...",
        RankTitle: "RANKING",
        RankYou: "あなたは...",
        RankUnit: "位",
        ScoreUnit: "点",
        RankBoardTitle: "上位リーダーボード"
    },

    // モニター
    Viewer: {
        Title: "モニター接続",
        BtnConnect: "接続する",
        Waiting: "WAITING...",
        AnswerCheck: "ANSWER CHECK"
    }
};
