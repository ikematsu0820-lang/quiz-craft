/* =========================================================
 * text_config.js (v58: Race & Free Types Support)
 * =======================================================*/

const APP_TEXT = {
    AppTitle: "Quiz Studio",
    Version: "Cloud Edition v58",
    
    Main: { HostBtn: "クイズを作る", PlayerBtn: "クイズに答える" },
    Login: { Title: "番組IDを入力", Placeholder: "例: QUIZ2026", SubmitBtn: "ログイン / 新規作成", BackBtn: "ホーム", AlertEmpty: "番組IDを入力してください", AlertError: "ID文字種エラー" },
    
    Dashboard: { 
        Logout: "ログアウト", BtnCreate: "問題作成", BtnConfig: "ルール設定", 
        BtnStudio: "スタジオ", BtnViewer: "モニター", SetListTitle: "保存済みセット", DeleteConfirm: "削除しますか？" 
    },
    
    Creator: {
        Title: "問題作成", BackBtn: "ダッシュボード", LabelSetName: "セット名", PlaceholderSetName: "例: 第1ステージ", HeadingNewQ: "新規問題追加", HeadingEditQ: "問題編集",
        
        LabelTypeFixed: "問題形式 (セット内固定)", 
        TypeChoice: "選択式", 
        TypeSort: "並べ替え", 
        TypeFreeOral: "フリー (口頭回答)", 
        TypeFreeWritten: "フリー (記述式)", 
        TypeMulti: "多答クイズ",
        
        PlaceholderQ: "問題文を入力", BtnAdd: "リストに追加", BtnUpdateQ: "更新する", BtnCancel: "キャンセル", ListHeading: "作成中のリスト", BtnSave: "クラウドに保存して完了", BtnUpdate: "更新して完了", OptMulti: "正解を選択",
        LabelTextFormat: "回答形式", TextFormatWritten: "記述式", TextFormatOral: "口頭 (正解入力任意)", LabelSortInitial: "初期配置", SortInitialRandom: "ランダム (推奨)", SortInitialFixed: "固定 (作成順)", 
        DescSort: "※正解の順番（上から下）で入力してください", DescText: "※正解キーワード（カンマ区切り）", DescMulti: "※全ての項目が正解になります",
        BtnAddChoice: "＋ 選択肢を追加", BtnAddSort: "＋ 項目を追加", BtnAddMulti: "＋ 正解を追加",
        
        HeadingSettings: "セット設定 (全体共通)",
        LabelSpecialMode: "スペシャルモード設定",
        SpecialModeNone: "特になし (通常)",
        SpecialModeTimeAttack: "タイムショックモード",
        
        LabelLayout: "モニターレイアウト", LayoutStandard: "標準 (上:問題 / 下:選択肢)", LayoutSplitList: "左右分割 (右:縦書き問題 / 左:リスト)", LayoutSplitGrid: "左右分割 (右:縦書き問題 / 左:グリッド)", LabelAlign: "文字の配置", AlignLeft: "左揃え", AlignCenter: "中央揃え", AlignRight: "右揃え",
        LabelDesign: "デザイン設定", GroupMain: "全体背景 (Main)", GroupQ: "問題文エリア (Question)", GroupC: "選択肢エリア (Choices)", LabelColorText: "文字", LabelColorBg: "背景", LabelColorBorder: "枠線", BtnSelectImage: "画像を選択", BtnClearImage: "画像解除", MsgImageLoaded: "画像セット中", MsgNoImage: "画像なし (単色背景)",
        AlertNoQ: "問題文を入力してください", AlertLessChoice: "選択肢は2つ以上必要です", AlertMaxChoice: "選択肢は最大10個までです", AlertNoCorrect: "正解を選んでください", AlertNoTextAns: "正解を入力してください", MsgSavedToast: "保存しました！", MsgAddedToast: "追加しました", MsgUpdatedToast: "更新しました",
        MsgTypeLocked: "※問題形式は固定されています"
    },

    Config: {
        Title: "ルール設定", 
        BackBtn: "ダッシュボード", HeadingAdd: "ピリオドを構成に追加", LabelSet: "セットを選択", SelectDefault: "-- セットを選択 --", SelectLoading: "読み込み中...", SelectEmpty: "セットがありません",
        
        LabelMode: "回答モード", 
        ModeNormal: "一斉回答 (Simultaneous)", 
        ModeBuzz: "早押し (Buzz-in)", 
        ModeTurn: "順番回答 (Turn-based)", 
        ModeTimeAttack: "★タイムショック (固定)", 
        
        LabelGameType: "ゲームルール (成果報酬)",
        GameTypeScore: "得点 (Score)", 
        GameTypeTerritory: "陣取り (Panel 25)", 
        GameTypeRace: "レース (Sugoroku)", 
        
        LabelNormalLimit: "▼ 回答回数制限", NormalLimitOne: "1回のみ (修正不可)", NormalLimitUnlimited: "何度でも修正可",
        
        LabelShuffleQ: "出題順シャッフル", 
        ShuffleQOn: "する (ランダム出題)", 
        ShuffleQOff: "しない (作成順)",

        LabelBuzzWrongAction: "▼ 誤答時の処理", BuzzWrongNext: "次の人に権限移動", BuzzWrongReset: "全員リセット (再早押し)", BuzzWrongEnd: "その問題終了",
        LabelBuzzTime: "▼ 回答権取得後の制限時間", BuzzTimeNone: "無制限", BuzzTime3: "3秒", BuzzTime5: "5秒", BuzzTime10: "10秒",
        LabelTurnOrder: "▼ 順番ルール", TurnOrderFixed: "固定 (参加順)", TurnOrderRandom: "ランダム", TurnOrderRank: "成績順 (点数高い順)",
        LabelTurnPass: "▼ パス設定", TurnPassOk: "パス可 (次へ回す)", TurnPassNg: "パス不可",
        
        LabelBombCount: "カード枚数", LabelBombTarget: "アタリ/ハズレ枚数",
        LabelRaceGoal: "ゴール地点 (pt)", 
        
        LabelRule: "脱落・時間設定", LabelElim: "▼ 脱落条件", RuleNone: "脱落なし", RuleWrong: "不正解者のみ脱落", RuleSlow: "不正解 ＋ 回答が遅い人も脱落", LabelElimCount: "遅い順に", LabelElimCountSuffix: "名が脱落", LabelTime: "制限時間",
        HeadingCustomScore: "問題別配点・失点・時間設定", LabelBulkTime: "時間一括:", LabelBulkPt: "得点一括:", LabelBulkLoss: "失点一括:", 
        LabelHeaderTime: "制限時間", LabelHeaderPt: "Pt", LabelHeaderLoss: "Loss",
        BtnReflect: "反映", BtnAddList: "リストに追加", HeadingList: "現在の番組構成リスト", LabelFinalRank: "最後に最終結果発表を行う", PlaceholderProgName: "構成に名前をつけて保存", BtnSaveProg: "保存", BtnGoStudio: "保存してスタジオへ", InterHeading: "ピリオド間設定", StatusRevive: "全員復活してスタート", StatusContinue: "生存者のみで継続", StatusRanking: "成績上位者が進出", LabelTop: "上位", LabelName: "名", CheckInterRank: "この前に中間発表を行う", HeadingSavedProg: "保存済みプログラムリスト", BtnLoadProg: "読込", BtnDelProg: "削除", MsgConfirmLoadProg: "このプログラムを読み込みますか？\n（現在の編集内容は破棄されます）", MsgConfirmDelProg: "本当にこのプログラムを削除しますか？", AlertNoSet: "セットを選んでください", AlertEmptyList: "構成リストが空です", AlertNoTitle: "プログラム名を入力してください", MsgSaved: "プログラムを保存しました！",
        MsgLockedMode: "※スペシャルモードのため設定は固定されます"
    },

    Studio: {
        OnAir: "ON AIR", LabelPlayer: "参加", LabelAlive: "生存", LabelKanpe: "司会者用カンペ", StatusReady: "準備中...", HeadingList: "番組構成リスト", HeadingLoad: "プログラム読込", SelectProgDefault: "保存済みプログラムを選択...",
        BtnLoad: "読み込んでセット", BtnMasterPlay: "再生 ▶", BtnStart: "問題 START！", BtnAnswer: "正解発表", BtnNextQ: "次の問題へ", BtnNextPeriod: "次のピリオドへ進む", BtnInterRanking: "中間発表へ", BtnFinalRanking: "最終結果発表へ", BtnEnd: "全工程終了", BtnRanking: "中間順位", BtnClose: "スタジオを閉じて戻る", BtnBackRanking: "スタジオに戻る",
        BtnCorrect: "⭕️ 正解", BtnWrong: "❌ 不正解", BtnPass: "パス (Skip)", MsgBuzzWin: "回答権: ", MsgBuzzWait: "回答権なし...", MsgTurnWait: "順番待ち...", MsgConfirmLoad: "プログラムを読み込んでセットしますか？\n（現在の進行内容はリセットされます）", MsgLoaded: "セットしました。再生ボタンで開始してください。", MsgThinking: "Thinking Time...", MsgAnswerCheck: "正解発表", MsgAllEnd: "全てのピリオドが終了しました！お疲れ様でした！", MsgConfirmBack: "ダッシュボードに戻りますか？",
        MsgTimeAttackReady: "Time Shock Ready...", MsgTimeAttackActive: "TIME SHOCK!", BtnStartTA: "カウント開始 (5s Loop)",
        LabelPanelControl: "パネル操作 (クリックで色変更)", LabelBombControl: "カード操作 (クリックでオープン)", LabelMultiControl: "多答クイズ操作 (クリックでオープン)", LabelRaceControl: "レース進行状況",
        MsgPanelActive: "Panel Attack Mode", MsgBombActive: "Bomb Game Mode", MsgRaceActive: "Race Mode"
    },

    Player: {
        TitleEntry: "エントリー", PlaceholderCode: "部屋コード (6桁)", PlaceholderName: "名前を入力", BtnJoin: "参加する", LabelNameDefault: "名無し", BadgeAlive: "STAND UP", BadgeDead: "DEAD", MsgLobbyHead: "Ready?", MsgLobbyBody: "画面を注視してください", MsgAnswered: "正解までしばらくお待ちください", MsgCorrect: "正解！", MsgWrong: "不正解...", MsgWait: "集計中...", MsgDead: "GAME OVER", MsgDeadBody: "脱落...", RankTitle: "RANKING", RankYou: "あなたは...", RankUnit: "位", ScoreUnit: "点", RankBoardTitle: "上位リーダーボード", BtnBuzz: "PUSH!", MsgBuzzLocked: "LOCKED", MsgBuzzWin: "回答権獲得！<br>口頭で回答してください", MsgTurnYou: "あなたの番です！<br>回答してください", MsgTurnWait: "さんの番です...", BtnAnswered: "回答しました", MsgTimeAttack: "Time Shock Mode<br>モニターを見て回答してください", MsgPanelWait: "Panel Attack<br>モニターを見てください", MsgBombWait: "Bomb Game<br>モニターを見てください",
        MsgMultiWait: "多答クイズ<br>モニターを見てください"
    },

    Viewer: { Title: "モニター接続", BtnConnect: "接続する", Waiting: "WAITING...", AnswerCheck: "ANSWER CHECK" }
};
