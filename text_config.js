/* =========================================================
 * text_config.js (v44: Design Customization)
 * =======================================================*/

const APP_TEXT = {
    // 共通
    AppTitle: "Quiz Studio",
    Version: "Cloud Edition v44",
    
    // メインメニュー
    Main: {
        HostBtn: "クイズを作る",
        PlayerBtn: "クイズに答える"
    },

    // ホストログイン
    Login: {
        Title: "番組IDを入力",
        Placeholder: "例: QUIZ2026",
        SubmitBtn: "ログイン / 新規作成",
        BackBtn: "ホーム",
        AlertEmpty: "番組IDを入力してください",
        AlertError: "ID文字種エラー"
    },

    // ダッシュボード
    Dashboard: {
        Logout: "ログアウト",
        BtnCreate: "問題作成",
        BtnConfig: "セット設定",
        BtnStudio: "スタジオ",
        BtnViewer: "モニター",
        SetListTitle: "保存済みセット",
        DeleteConfirm: "削除しますか？"
    },

    // 問題作成
    Creator: {
        Title: "問題作成",
        BackBtn: "ダッシュボード",
        LabelSetName: "セット名",
        PlaceholderSetName: "例: なぞなぞ",
        HeadingNewQ: "新規問題追加",
        LabelType: "問題形式",
        TypeChoice: "選択式",
        TypeSort: "並べ替え",
        TypeText: "自由入力",
        PlaceholderQ: "問題文を入力",
        BtnAdd: "リストに追加",
        ListHeading: "作成中のリスト",
        BtnSave: "クラウドに保存して完了",
        BtnUpdate: "更新して完了",
        OptMulti: "正解を選択",
        BtnAddChoice: "＋ 選択肢を追加",
        BtnAddSort: "＋ 項目を追加",
        
        // セット設定エリア
        HeadingSettings: "セット設定 (全体共通)",
        LabelLayout: "モニターレイアウト",
        LayoutStandard: "標準 (上:問題 / 下:選択肢)",
        LayoutSplitList: "左右分割 (右:縦書き問題 / 左:リスト)",
        LayoutSplitGrid: "左右分割 (右:縦書き問題 / 左:グリッド)",
        LabelAlign: "文字の配置",
        AlignLeft: "左揃え",
        AlignCenter: "中央揃え",
        AlignRight: "右揃え",
        
        // ★v44追加: デザイン設定
        LabelDesign: "デザイン設定",
        LabelTextColor: "文字色",
        LabelFrameColor: "枠・ボタン色",
        LabelBgColor: "背景色",
        LabelBgImage: "背景画像 (自動圧縮)",
        BtnSelectImage: "画像を選択",
        MsgImageLoaded: "画像セット完了",

        AlertNoQ: "問題文を入力してください",
        AlertLessChoice: "選択肢は2つ以上必要です",
        AlertMaxChoice: "選択肢は最大10個までです",
        AlertNoCorrect: "正解を選んでください",
        AlertNoTextAns: "正解を入力してください"
    },

    // セット設定 (Config)
    Config: {
        Title: "セット設定",
        BackBtn: "ダッシュボード",
        HeadingAdd: "ピリオドを構成に追加",
        LabelSet: "セットを選択",
        SelectDefault: "-- セットを選択 --",
        SelectLoading: "読み込み中...",
        SelectEmpty: "セットがありません",
        LabelRule: "ルール設定",
        LabelElim: "▼ 脱落条件",
        RuleNone: "脱落なし",
        RuleWrong: "不正解者のみ脱落",
        RuleSlow: "不正解 ＋ 回答が遅い人も脱落",
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
        HeadingLoad: "プログラム読込",
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
        MsgAnswered: "正解までしばらくお待ちください",
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
