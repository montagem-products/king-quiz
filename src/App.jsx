import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getDatabase, ref, set, get, onValue, update, remove
} from "firebase/database";

// ── Firebase ──────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAHFucnW1IzEf7Tme3_Z6AF47X1m6tV90Q",
  authDomain: "king-quiz-f498f.firebaseapp.com",
  databaseURL: "https://king-quiz-f498f-default-rtdb.firebaseio.com",
  projectId: "king-quiz-f498f",
  storageBucket: "king-quiz-f498f.firebasestorage.app",
  messagingSenderId: "796013255133",
  appId: "1:796013255133:web:19687adb650dab3909fe34"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── Constants ─────────────────────────────────────────────────────────────────
const GENRES_PERSONAL = ["恋愛・人間関係","恋愛・人間関係","過去・思い出","過去・思い出","性格・価値観","性格・価値観","もしも系","もしも系","ちょっと深い話","ちょっと深い話"];
const GENRES_GENERAL = ["食べ物","スポーツ","音楽","映画・アニメ","旅行","動物","ゲーム","ファッション","自然・季節","日常生活"];
const GENRES = [...GENRES_PERSONAL,...GENRES_PERSONAL,...GENRES_PERSONAL,...GENRES_PERSONAL,...GENRES_PERSONAL,...GENRES_PERSONAL,...GENRES_PERSONAL,...GENRES_GENERAL,...GENRES_GENERAL,...GENRES_GENERAL];
const POINT_OPTIONS = [2, 1, 0, -1];
const POINT_LABELS = { 2: "大絶賛", 1: "承認", 0: "不採用", "-1": "罰" };
const WIN_SCORE = 7;
const ROLE = { king: "理解され王", retainer: "家臣" };

function genRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({length: 4}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}
function genPlayerId() {
  return Math.random().toString(36).substring(2, 10);
}

// ── Claude API ────────────────────────────────────────────────────────────────
// ── 問題バンク（100問）────────────────────────────────────────────────────────
const QUESTION_BANK = [
  "○○が人生で一番恥ずかしかった瞬間は？",
  "○○が学生時代にやらかした最大の失敗は？",
  "○○が親に絶対バレたくなかったことは？",
  "○○はドラマで感動して泣いちゃう？",
  "○○が酔っ払いすぎるとどうなる？",
  "○○は朝方？夜型？",
  "○○が人生で一番びびった瞬間は？",
  "○○が好きな野球チームは？",
  "○○が今でも引きずっている黒歴史は？",
  "○○が職場・学校でやらかした最大のミスは？",
  "○○のスマホの付き合い方は？",
  "○○が人生で一番後悔している買い物は？",
  "○○が絶対に再現したくない最悪の一日は？",
  "○○が秘かに続けていたけど誰にも言えなかった習慣は？",
  "○○が絶対に許せない他人の行動は？",
  "○○が譲れない最大のこだわりは？",
  "○○のストレス発散法は？",
  "○○が実は苦手な人のタイプは？",
  "○○がまだやったことのないことは？",
  "○○が知り合いのいないパーティーに参加したらどうする？",
  "○○はミニマリスト？それともマキシマリスト？",
  "○○が実は密かに気にしていることは？",
  "○○が言われた忘れられない一言は？",
  "○○が本音では絶対やりたくない仕事は？",
  "○○が楽しんでいる活動は？",
  "○○が一人の時だけやっていることは？",
  "○○が絶対に曲げないポイントは？",
  "○○が友達には言えない本音の不満は？",
  "○○が実は怖いと思う人は？",
  "○○が宝くじで5億当たったら最初にすることは？",
  "○○が無人島に一つだけ持っていくものは？",
  "○○がもし異性に生まれていたら何をしていた？",
  "○○が余命1週間と言われたらまず何をする？",
  "○○がタイムマシンで過去に戻るなら何歳に戻る？",
  "○○が道端で１万円見つけたらすることは？",
  "○○が転生したら何になりたい？",
  "○○が魔法を一つ使えるとしたら？",
  "○○が24時間透明人間になれたら何をする？",
  "○○が記憶を消せるなら何の記憶を消したい？",
  "○○が世界の終わりの日にまずすることは？",
  "○○が子供たちに絶対に教えたいことは？",
  "○○が無敵になれたら最初にすることは？",
  "○○が自分のクローンを作ったら何をやらせる？",
  "○○が一番よくなくすものは？",
  "○○が書いた本のタイトルは？",
  "○○の隠れたあだ名は？",
  "○○が主人公のドラマのタイトルは？",
  "○○が絶対言わなそうな一言は？",
  "○○のスマホの検索履歴にありそうなワードは？",
  "○○が作るカクテルの名前は？",
  "○○がシャワー浴びながら考えていることは？",
  "○○が開いたら絶対流行るお店のジャンルは？",
  "○○が芸人になったらどんなキャラ？",
  "○○は自分のことが好き？",
  "○○が総選挙に出たら何位？その理由は？",
  "○○のLINEのトーク画面にありそうなスタンプは？",
  "○○が全裸で逃げる夢を見た理由は？",
  "○○の理想のデートプランは？",
  "○○が一番キュンとする瞬間は？",
  "○○が付き合う前に必ず確認することは？",
  "○○が振られた時にする行動は？",
  "○○が浮気を疑う瞬間は？",
  "○○の口説き文句は？",
  "○○が最近した無駄遣いは？",
  "○○の理想の告白シチュエーションは？",
  "○○が絶対に付き合えないタイプは？",
  "○○が絶対に食べたくないものは？",
  "○○が二度とやりたくないことは？",
  "○○が生理的に無理なものは？",
  "○○が絶対に住みたくない場所は？",
  "○○が一番テンションが下がる瞬間は？",
  "○○がやりたくないスポーツは？",
  "○○が世の中で一番いらないと思うものは？",
  "○○がどうしても克服できない苦手なものは？",
  "○○が絶対に見たくない映画のジャンルは？",
  "○○が一番嫌いな季節とその理由は？",
  "○○が今焦っていることは？",
  "○○が10年後になっていたい姿は？",
  "○○が死ぬ前にやりたいことは？",
  "○○が今の自分に一言言えるとしたら？",
  "○○が人生でターニングポイントだったと思う瞬間は？",
  "○○が友達に絶対に言えない悩みは？",
  "○○が生まれ変わっても同じ選択をすることは？",
  "○○が今の仕事・生活で本当に満足していることは？",
  "○○が老後にやりたいことは？",
  "○○は今の人生に満足している？",
  "○○が絶対に後悔したくないと思っていることは？",
  "○○が人生で一番大切にしている価値観は？",
  "○○の誰にも言えない野望は？",
  "○○が今すぐ全てリセットできるなら何を変える？",
  "○○が人生で一番嬉しかった瞬間は？",
  "○○の好きなパンは？",
  "○○の好きなお茶は？",
  "○○の好きな季節は？",
  "○○はアクション映画が好き？",
  "○○の好きな音楽のジャンルは？",
  "○○の好きな旅行先は？",
  "○○の好きなスポーツは？",
  "○○の好きな動物は？",
  "○○の好きな飲み物は？",
  "○○の好きな芸人は？",
  "○○の朝ごはんはパン派？",
  "○○の好きな天気は？",
  "○○の好きなコンビニスイーツは？",
  "○○の好きな居酒屋メニューは？",
  "○○の好きなゲームは？",
  "○○の好きな旅行スタイルは？",
  "○○の好きな休日の過ごし方は？",
  "○○の好きな漫画・アニメは？",
  "○○の好きな鍋の具材は？",
  "○○の好きなラーメンの種類は？",
  "○○の好きなスタバのメニューは？",
  "○○の好きなカフェのドリンクは？",
  "○○の好きなお土産は？",
  "○○の好きなSNSは？",
  "○○の好きなファッションはどんなの？",
  "○○の好きな季節は？",
  "○○の好きな漫画は？",
  "○○の好きなワード、フレーズは？",
  "○○が結成するバンドの名前は？",
  "○○の好きなポテチの味は？",
  "○○の嫌いな乗り物は？",
  "○○の嫌いな家事は？",
  "○○の嫌いなスポーツは？",
  "○○の嫌いなファッションアイテムは？",
  "○○は犬よりも猫を飼いたい？",
  "○○の嫌いな時間帯は？",
  "○○の嫌いな場所は？",
  "○○は恋に落ちるのが早い？ゆっくり？",
  "○○の嫌いな勉強科目は？",
  "○○は大盛無料だったら大盛にする？",
  "○○の子供のころの夢は？",
  "○○の嫌いな休日の過ごし方は？"
];

function generateQuiz(genre, kingName, usedQuestions = []) {
  // 使用済みを除外してシャッフル
  const unused = QUESTION_BANK.filter(q => !usedQuestions.includes(q.replace('○○', kingName)));
  const pool = unused.length > 0 ? unused : QUESTION_BANK;
  const template = pool[Math.floor(Math.random() * pool.length)];
  const question = template.replace(/○○/g, kingName);
  return { question, hint: "" };
}

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  bg: "#10100e", card: "#1c1c18", border: "#2a2a24",
  accent: "#e8c547", accentDim: "rgba(232,197,71,0.15)",
  red: "#e85547", redDim: "rgba(232,85,71,0.15)",
  green: "#47c574", greenDim: "rgba(71,197,116,0.15)",
  text: "#f5f0e0", muted: "#6b6b58", tag: "#2a2a24",
};

const S = {
  root: { minHeight: "100vh", background: C.bg, fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", color: C.text, display: "flex", justifyContent: "center" },
  page: { width: "100%", maxWidth: 430, padding: "36px 20px 60px", boxSizing: "border-box" },
  h1: { fontSize: 28, fontWeight: 900, margin: "0 0 4px", letterSpacing: "-0.02em", color: C.accent },
  h2: { fontSize: 20, fontWeight: 800, margin: "0 0 20px", color: C.text },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px", marginBottom: 12 },
  input: { display: "block", width: "100%", padding: "14px 16px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 16, boxSizing: "border-box", outline: "none", marginBottom: 10, fontFamily: "inherit", letterSpacing: "0.05em" },
  btn: (color = C.accent) => ({ display: "block", width: "100%", padding: "15px 0", background: color, color: color === C.accent ? "#10100e" : "#fff", border: "none", borderRadius: 13, fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em", marginBottom: 10 }),
  btnOutline: { display: "block", width: "auto", padding: "8px 16px", background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 13, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 24 },
  tag: { display: "inline-block", background: C.tag, color: C.muted, borderRadius: 999, padding: "3px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14, textTransform: "uppercase" },
  codeBox: { background: C.accentDim, border: `2px solid ${C.accent}`, borderRadius: 16, padding: "24px", textAlign: "center", marginBottom: 20 },
  codeText: { fontSize: 48, fontWeight: 900, letterSpacing: "0.2em", color: C.accent, margin: 0 },
  playerRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` },
  dot: (on) => ({ width: 8, height: 8, borderRadius: "50%", background: on ? C.green : C.border, flexShrink: 0 }),
  quizCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "24px 20px", marginBottom: 20 },
  quizQ: { fontSize: 19, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.5 },
  hint: { color: C.muted, fontSize: 12, margin: 0 },
  textarea: { width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 15, padding: "12px", boxSizing: "border-box", marginBottom: 10, outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.6 },
  answerReveal: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 },
  answerName: { fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 4, letterSpacing: "0.06em" },
  answerText: { fontSize: 16, fontWeight: 600, margin: 0 },
  pointRow: { display: "flex", gap: 8, marginTop: 10 },
  scoreBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: C.card, borderRadius: 12, marginBottom: 8, border: `1px solid ${C.border}` },
  winBox: { background: C.accentDim, border: `2px solid ${C.accent}`, borderRadius: 18, padding: "28px 20px", textAlign: "center", marginBottom: 24 },
  spinner: { width: 40, height: 40, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "60px auto 16px" },
  errorBox: { background: C.redDim, border: `1px solid ${C.red}`, borderRadius: 12, padding: "12px 16px", color: C.red, fontSize: 13, marginBottom: 12 },
};

const styleEl = document.createElement("style");
styleEl.textContent = `@keyframes spin { to { transform: rotate(360deg); } } * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; } input::placeholder, textarea::placeholder { color: #3a3a30; }`;
document.head.appendChild(styleEl);

// ── Top ───────────────────────────────────────────────────────────────────────
function TopScreen({ onCreateRoom, onJoinRoom }) {
  return (
    <div style={S.page}>
      <div style={{ marginBottom: 40, paddingTop: 20 }}>
        <p style={S.tag}>party game</p>
        <h1 style={S.h1}>王の理解者ゲーム</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 6, marginBottom: 28 }}>王を理解して栄誉を勝ち取れ。</p>
      </div>
      <button style={S.btn()} onClick={onCreateRoom}>🏠　部屋を作る</button>
      <button style={S.btn(C.red)} onClick={onJoinRoom}>🚪　部屋に参加する</button>
      <div style={{ ...S.card, marginTop: 20 }}>
        <p style={{ color: C.muted, fontSize: 12, margin: 0, lineHeight: 1.8 }}>
          ① 1人が「{ROLE.king}」に選ばれ、残りは「{ROLE.retainer}」<br />
          ② クイズに全員が回答 → {ROLE.king}が気に入った回答にポイントを付与<br />
          ③ 誰かが {WIN_SCORE}pt に達したらゲーム終了！
        </p>
      </div>
    </div>
  );
}

// ── Create Room ───────────────────────────────────────────────────────────────
function CreateRoomScreen({ onBack, onRoomCreated }) {
  const [playerCount, setPlayerCount] = useState(4);
  const [winScore, setWinScore] = useState(7);
  const [hostName, setHostName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (!hostName.trim()) { setError("名前を入力してください"); return; }
    setLoading(true);
    const code = genRoomCode();
    const playerId = genPlayerId();
    await set(ref(db, `rooms/${code}`), {
      code, playerCount, winScore, phase: "waiting", hostId: playerId,
      players: { [playerId]: { id: playerId, name: hostName.trim(), score: 0, isHost: true } },
      createdAt: Date.now(),
    });
    onRoomCreated(code, playerId);
  };

  return (
    <div style={S.page}>
      <button style={S.btnOutline} onClick={onBack}>← 戻る</button>
      <h2 style={S.h2}>部屋を作る</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>プレイ人数を選んでください</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[2, 3, 4, 5, 6].map(n => (
          <button key={n} onClick={() => setPlayerCount(n)} style={{
            flex: 1, minWidth: "18%", padding: "14px 0", borderRadius: 12, fontWeight: 800, fontSize: 17, cursor: "pointer",
            background: playerCount === n ? C.accentDim : C.card,
            border: `2px solid ${playerCount === n ? C.accent : C.border}`,
            color: playerCount === n ? C.accent : C.muted,
          }}>{n}人</button>
        ))}
      </div>
      {playerCount === 2 && (
        <div style={{ ...S.card, background: C.accentDim, border: `1px solid ${C.accent}`, marginBottom: 16 }}>
          <p style={{ color: C.accent, fontSize: 12, margin: 0 }}>⚡ 2人モード：{ROLE.king}と{ROLE.retainer}が1対1で対決！</p>
        </div>
      )}
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>勝利ポイントを選んでください</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[3, 5, 7, 9].map(n => (
          <button key={n} onClick={() => setWinScore(n)} style={{
            flex: 1, padding: "14px 0", borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: "pointer",
            background: winScore === n ? C.accentDim : C.card,
            border: `2px solid ${winScore === n ? C.accent : C.border}`,
            color: winScore === n ? C.accent : C.muted,
          }}>{n}pt</button>
        ))}
      </div>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>あなたの名前</p>
      <input style={S.input} placeholder="名前を入力" value={hostName} onChange={e => setHostName(e.target.value)} maxLength={10} />
      {error && <div style={S.errorBox}>{error}</div>}
      <button style={S.btn()} onClick={create} disabled={loading}>{loading ? "作成中…" : "部屋を作成する"}</button>
    </div>
  );
}

// ── Join Room ─────────────────────────────────────────────────────────────────
function JoinRoomScreen({ onBack, onJoined }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const join = async () => {
    if (code.trim().length < 4) { setError("部屋コードを入力してください"); return; }
    if (!name.trim()) { setError("名前を入力してください"); return; }
    setLoading(true); setError("");
    const upper = code.toUpperCase();
    const snap = await get(ref(db, `rooms/${upper}`));
    if (!snap.exists()) { setError("部屋が見つかりません"); setLoading(false); return; }
    const room = snap.val();
    if (room.phase !== "waiting") { setError("すでにゲームが始まっています"); setLoading(false); return; }
    const players = room.players || {};
    if (Object.keys(players).length >= room.playerCount) { setError("部屋が満員です"); setLoading(false); return; }
    if (Object.values(players).some(p => p.name === name.trim())) { setError("その名前はすでに使われています"); setLoading(false); return; }
    const playerId = genPlayerId();
    await update(ref(db, `rooms/${upper}/players/${playerId}`), { id: playerId, name: name.trim(), score: 0, isHost: false });
    onJoined(upper, playerId);
  };

  return (
    <div style={S.page}>
      <button style={S.btnOutline} onClick={onBack}>← 戻る</button>
      <h2 style={S.h2}>部屋に参加する</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>部屋コード（4文字）</p>
      <input style={{ ...S.input, fontSize: 22, letterSpacing: "0.25em", textTransform: "uppercase", textAlign: "center" }}
        placeholder="AB3K" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={4} />
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>あなたの名前</p>
      <input style={S.input} placeholder="名前を入力" value={name} onChange={e => setName(e.target.value)} maxLength={10} />
      {error && <div style={S.errorBox}>{error}</div>}
      <button style={S.btn(C.red)} onClick={join} disabled={loading}>{loading ? "参加中…" : "参加する"}</button>
    </div>
  );
}

// ── Waiting ───────────────────────────────────────────────────────────────────
function WaitingScreen({ roomCode, playerId, onGameStart }) {
  const [room, setRoom] = useState(null);

  useEffect(() => {
    return onValue(ref(db, `rooms/${roomCode}`), snap => {
      if (!snap.exists()) return;
      const r = snap.val();
      setRoom(r);
      if (r.phase !== "waiting") onGameStart(r);
    });
  }, [roomCode]);

  const players = room ? Object.values(room.players || {}) : [];
  const isHost = room?.hostId === playerId;
  const isFull = players.length >= (room?.playerCount || 4);

  const [starting, setStarting] = useState(false);
  const startGame = async () => {
    if (starting) return;
    setStarting(true);
    const playerList = Object.values(room.players);
    const king = playerList[Math.floor(Math.random() * playerList.length)];
    const kingName = king.name;
    const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
    // まずphase:loadingに切り替えてからクイズ生成
    let quiz;
    quiz = generateQuiz(genre, kingName, []);
    await update(ref(db, `rooms/${roomCode}`), {
      phase: "roleReveal", king: king.id, kingName, round: 1,
      genre, quiz, answers: {}, answeredCount: 0, usedQuestions: [quiz.question],
    });
    setStarting(false);
  };

  if (!room) return <div style={S.page}><div style={S.spinner} /><p style={{ color: C.muted, textAlign: "center", marginTop: 8 }}>接続中…</p></div>;

  return (
    <div style={S.page}>
      <p style={S.tag}>waiting room</p>
      <h2 style={S.h2}>参加者を待っています</h2>
      <div style={S.codeBox}>
        <p style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 6px" }}>ROOM CODE</p>
        <p style={S.codeText}>{roomCode}</p>
        <p style={{ color: C.muted, fontSize: 12, margin: "8px 0 0" }}>このコードを友達に送ろう</p>
      </div>
      <div style={S.card}>
        <p style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 12px" }}>
          参加者 {players.length} / {room.playerCount}
        </p>
        {players.map(p => (
          <div key={p.id} style={S.playerRow}>
            <div style={S.dot(true)} />
            <span style={{ fontSize: 15, fontWeight: p.id === playerId ? 700 : 400 }}>
              {p.name} {p.id === playerId ? "（あなた）" : ""} {p.isHost ? "👑" : ""}
            </span>
          </div>
        ))}
        {Array.from({ length: room.playerCount - players.length }).map((_, i) => (
          <div key={i} style={S.playerRow}>
            <div style={S.dot(false)} />
            <span style={{ fontSize: 14, color: C.muted }}>待機中…</span>
          </div>
        ))}
      </div>
      {isHost && isFull && <button style={{ ...S.btn(), marginTop: 8, opacity: starting ? 0.6 : 1 }} onClick={startGame} disabled={starting}>{starting ? "準備中…🎮" : "ゲームスタート 🎮"}</button>}
      {isHost && !isFull && <p style={{ color: C.muted, textAlign: "center", fontSize: 13 }}>全員揃ったらスタートできます</p>}
      {!isHost && <p style={{ color: C.muted, textAlign: "center", fontSize: 13 }}>ホストがゲームを開始するまで待ってください</p>}
    </div>
  );
}

// ── Role Reveal ───────────────────────────────────────────────────────────────
function RoleRevealScreen({ room, playerId }) {
  const isKing = room.king === playerId;
  const isHost = room.hostId === playerId;

  const proceed = async () => {
    await update(ref(db, `rooms/${room.code}`), { phase: "quiz" });
  };

  return (
    <div style={S.page}>
      <p style={S.tag}>役職発表 · round {room.round}</p>
      <h2 style={S.h2}>あなたの役職は…</h2>
      <div style={{ ...S.card, background: isKing ? C.accentDim : C.greenDim, border: `2px solid ${isKing ? C.accent : C.green}`, textAlign: "center", padding: "32px 20px", marginBottom: 24 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{isKing ? "👑" : "🙇"}</div>
        <p style={{ fontSize: 24, fontWeight: 900, color: isKing ? C.accent : C.green, margin: "0 0 8px" }}>
          {isKing ? ROLE.king : ROLE.retainer}
        </p>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
          {isKing ? "家臣たちの回答を見てポイントを付けよう" : "王のよき理解者となり、ポイントを稼ぐのだ"}
        </p>
        {!isKing && (
          <p style={{ color: C.accent, fontSize: 14, fontWeight: 700, marginTop: 12, marginBottom: 0 }}>
            👑 今回の王様：{room.kingName}
          </p>
        )}
      </div>
      {isHost
        ? <button style={S.btn()} onClick={proceed}>全員確認できたら進む →</button>
        : <p style={{ color: C.muted, textAlign: "center", fontSize: 13 }}>ホストが進めるまで待ってください</p>}
    </div>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
function QuizScreen({ room, playerId }) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(room.answeredCount || 0);
  const isKing = room.king === playerId;
  const totalAnswerers = Object.keys(room.players).length - 1;

  useEffect(() => {
    return onValue(ref(db, `rooms/${room.code}/answeredCount`), snap => {
      setAnsweredCount(snap.val() || 0);
    });
  }, [room.code]);

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    const snap = await get(ref(db, `rooms/${room.code}/answeredCount`));
    const newCount = (snap.val() || 0) + 1;
    await update(ref(db, `rooms/${room.code}`), {
      [`answers/${playerId}`]: answer.trim(),
      answeredCount: newCount,
    });
    if (newCount >= totalAnswerers) {
      await update(ref(db, `rooms/${room.code}`), { phase: "review" });
    }
    setSubmitted(true);
  };

  return (
    <div style={S.page}>
      <p style={S.tag}>{room.genre} · round {room.round}</p>
      <div style={S.quizCard}>
        <p style={S.quizQ}>{room.quiz?.question}</p>
        {room.quiz?.hint && <p style={S.hint}>💡 {room.quiz.hint}</p>}
      </div>
      {isKing ? (
        <div style={{ ...S.card, textAlign: "center", padding: "28px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👑</div>
          <p style={{ color: C.accent, fontWeight: 700, margin: "0 0 6px" }}>あなたは{ROLE.king}です</p>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>家臣たちの回答を待ちましょう</p>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>回答済み {answeredCount} / {totalAnswerers}</p>
        </div>
      ) : submitted ? (
        <div style={{ ...S.card, textAlign: "center", padding: "24px" }}>
          <p style={{ color: C.green, fontWeight: 700, margin: "0 0 6px" }}>✅ 回答を送信しました</p>
          <p style={{ color: C.muted, fontSize: 13 }}>他の家臣の回答を待っています…</p>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>回答済み {answeredCount} / {totalAnswerers}</p>
        </div>
      ) : (
        <div style={S.card}>
          <p style={{ color: C.muted, fontSize: 13, margin: "0 0 10px" }}>あなたの回答</p>
          <textarea style={S.textarea} rows={3} placeholder="自由に入力してください…" value={answer} onChange={e => setAnswer(e.target.value)} />
          <button style={S.btn()} onClick={submitAnswer}>回答完了 ✓</button>
        </div>
      )}
    </div>
  );
}


// ── Review（全員の回答確認）────────────────────────────────────────────────────
function ReviewScreen({ room, playerId }) {
  const isHost = room.hostId === playerId;
  const isKing = room.king === playerId;
  const retainers = Object.values(room.players).filter(p => p.id !== room.king);

  const goToScoring = async () => {
    await update(ref(db, `rooms/${room.code}`), { phase: "open" });
  };

  return (
    <div style={S.page}>
      <p style={S.tag}>回答確認 · round {room.round}</p>
      <div style={S.quizCard}>
        <p style={S.quizQ}>{room.quiz?.question}</p>
      </div>
      <div style={{ ...S.card, background: "rgba(71,197,116,0.08)", border: `1px solid ${C.green}`, marginBottom: 20, textAlign: "center" }}>
        <p style={{ color: C.green, fontSize: 13, fontWeight: 700, margin: 0 }}>
          💬 全員の回答が出揃いました！感想を話し合おう
        </p>
      </div>
      {retainers.map(p => (
        <div key={p.id} style={S.answerReveal}>
          <p style={S.answerName}>{p.name}（{ROLE.retainer}）</p>
          <p style={S.answerText}>{room.answers?.[p.id] || "（回答なし）"}</p>
        </div>
      ))}
      <div style={{ marginTop: 16 }}>
        {isHost
          ? <button style={S.btn()} onClick={goToScoring}> {room.kingName}の評価へ... →</button>
          : <p style={{ color: C.muted, textAlign: "center", fontSize: 13 }}>ホストが評価に進めます</p>}
      </div>
    </div>
  );
}

// ── Open ──────────────────────────────────────────────────────────────────────
function OpenScreen({ room, playerId }) {
  const isKing = room.king === playerId;
  const retainers = Object.values(room.players).filter(p => p.id !== room.king);
  const [points, setPoints] = useState({});
  const allScored = retainers.every(p => points[p.id] !== undefined);

  const submitScoring = async () => {
    const newPlayers = { ...room.players };
    retainers.forEach(p => {
      newPlayers[p.id] = { ...newPlayers[p.id], score: (newPlayers[p.id].score || 0) + (points[p.id] || 0) };
    });
    const winScore = room.winScore || WIN_SCORE;
    const winner = Object.values(newPlayers).find(p => p.score >= winScore);
    await update(ref(db, `rooms/${room.code}`), {
      players: newPlayers, phase: "scored",
      lastPoints: points, winner: winner ? winner.id : null,
    });
  };

  return (
    <div style={S.page}>
      <p style={S.tag}>回答オープン · round {room.round}</p>
      <div style={S.quizCard}><p style={S.quizQ}>{room.quiz?.question}</p></div>
      {retainers.map(p => (
        <div key={p.id} style={S.answerReveal}>
          <p style={S.answerName}>{p.name}（{ROLE.retainer}）</p>
          <p style={S.answerText}>{room.answers?.[p.id] || "（回答なし）"}</p>
          {points[p.id] !== undefined && (
            <p style={{ marginTop: 6, fontSize: 13, fontWeight: 700,
              color: points[p.id] > 0 ? C.green : points[p.id] < 0 ? C.red : C.muted }}>
              評価：{points[p.id] > 0 ? "+" : ""}{points[p.id]}pt
            </p>
          )}
          {isKing && (
            <div style={S.pointRow}>
              {POINT_OPTIONS.map(pt => {
                const sel = points[p.id] === pt;
                return (
                  <button key={pt} onClick={() => setPoints(prev => ({ ...prev, [p.id]: pt }))} style={{
                    flex: 1, padding: "8px 4px", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 10, cursor: "pointer", lineHeight: 1.4,
                    background: sel ? (pt > 0 ? C.green : pt === 0 ? C.muted : C.red) : C.border,
                    color: sel ? "#fff" : C.muted,
                  }}>
                    <div>{POINT_LABELS[String(pt)]}</div>
                    <div style={{ fontSize: 12 }}>{pt > 0 ? "+" : ""}{pt}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {isKing && allScored && <button style={{ ...S.btn(), marginTop: 8 }} onClick={submitScoring}>評価完了 →</button>}
      {isKing && !allScored && <p style={{ color: C.muted, textAlign: "center", fontSize: 13 }}>全員にポイントを付けてください</p>}
      {!isKing && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ color: C.accent, fontWeight: 700, margin: "0 0 4px" }}>{ROLE.king}がご判断なさり中…</p>
          <p style={{ color: C.muted, fontSize: 13 }}>結果を待ちましょう</p>
        </div>
      )}
    </div>
  );
}


// ── Scored ────────────────────────────────────────────────────────────────────
function ScoredScreen({ room, playerId }) {
  const isHost = room.hostId === playerId;
  const retainers = Object.values(room.players).filter(p => p.id !== room.king);

  const goNext = async () => {
    await update(ref(db, `rooms/${room.code}`), {
      phase: room.winner ? "finished" : "result",
    });
  };

  return (
    <div style={S.page}>
      <p style={S.tag}>評価結果 · round {room.round}</p>
      <div style={S.quizCard}><p style={S.quizQ}>{room.quiz?.question}</p></div>
      {retainers.map(p => {
        const pt = room.lastPoints?.[p.id];
        return (
          <div key={p.id} style={{
            ...S.answerReveal,
            border: `1px solid ${pt > 0 ? C.green : pt < 0 ? C.red : C.border}`,
          }}>
            <p style={S.answerName}>{p.name}（{ROLE.retainer}）</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ ...S.answerText, flex: 1, marginRight: 12 }}>{room.answers?.[p.id] || "（回答なし）"}</p>
              {pt !== undefined && (
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: pt > 0 ? C.green : pt < 0 ? C.red : C.muted }}>
                    {POINT_LABELS[String(pt)]}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: pt > 0 ? C.green : pt < 0 ? C.red : C.muted }}>
                    {pt > 0 ? "+" : ""}{pt}pt
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {isHost
        ? <button style={{ ...S.btn(), marginTop: 16 }} onClick={goNext}>スコアを見る →</button>
        : <p style={{ color: C.muted, textAlign: "center", fontSize: 13, marginTop: 16 }}>ホストが次へ進めます...</p>}
    </div>
  );
}

// ── Result ────────────────────────────────────────────────────────────────────
function ResultScreen({ room, playerId }) {
  const isHost = room.hostId === playerId;
  const players = Object.values(room.players).filter(p => p.id !== room.king).sort((a, b) => b.score - a.score);

  const nextRound = async () => {
    const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
    const nextRoundNum = (room.round || 1) + 1;
    await update(ref(db, `rooms/${room.code}`), {
      phase: "loading", round: nextRoundNum,
      genre, answers: {}, answeredCount: 0, lastPoints: {},
    });
    const usedQuestions = room.usedQuestions || [];
    const quiz = generateQuiz(genre, room.kingName, usedQuestions);
    const newUsed = [...usedQuestions, quiz.question];
    await update(ref(db, `rooms/${room.code}`), { quiz, phase: "quiz", usedQuestions: newUsed });
  };

  return (
    <div style={S.page}>
      <p style={S.tag}>ラウンド結果 · round {room.round}</p>
      <h2 style={S.h2}>スコア</h2>
      {players.map((p, i) => {
        const gained = room.lastPoints?.[p.id];
        const isKingThisRound = p.id === room.king;
        return (
          <div key={p.id} style={{ ...S.scoreBar, border: `1px solid ${isKingThisRound ? C.accentDim : C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: C.muted, fontSize: 12, width: 16 }}>{i + 1}</span>
              <span style={{ fontWeight: p.id === playerId ? 800 : 400 }}>{p.name} {isKingThisRound ? "👑" : ""}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {gained !== undefined && !isKingThisRound && (
                <span style={{ fontSize: 12, color: gained > 0 ? C.green : gained < 0 ? C.red : C.muted }}>
                  {gained > 0 ? "+" : ""}{gained}
                </span>
              )}
              <span style={{ fontSize: 22, fontWeight: 900, color: C.accent, minWidth: 28, textAlign: "right" }}>{p.score}</span>
              {!isKingThisRound && p.score === (room.winScore || WIN_SCORE) - 1 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentDim, borderRadius: 999, padding: "2px 8px", marginLeft: 4 }}>リーチ！🎯</span>
              )}
              {!isKingThisRound && p.score === (room.winScore || WIN_SCORE) - 2 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: C.red, background: C.redDim, borderRadius: 999, padding: "2px 8px", marginLeft: 4 }}>もう少し！🔥</span>
              )}
            </div>
          </div>
        );
      })}
      {isHost
        ? <button style={{ ...S.btn(), marginTop: 16 }} onClick={nextRound}>次のラウンドへ →</button>
        : <p style={{ color: C.muted, textAlign: "center", fontSize: 13, marginTop: 16 }}>ホストが次のラウンドを開始します</p>}
    </div>
  );
}

// ── Finished ──────────────────────────────────────────────────────────────────
function FinishedScreen({ room, playerId }) {
  const winner = room.winner ? room.players[room.winner] : null;
  const players = Object.values(room.players).sort((a, b) => b.score - a.score);

  return (
    <div style={S.page}>
      <p style={S.tag}>ゲーム終了</p>
      <div style={S.winBox}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🏆</div>
        <p style={{ color: C.accent, fontWeight: 900, fontSize: 22, margin: "0 0 4px" }}>{winner?.name} こそが理解のある家臣くん！</p>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{room.winScore || WIN_SCORE}ポイント達成！</p>
      </div>
      <h2 style={{ ...S.h2, marginBottom: 12 }}>最終スコア</h2>
      {players.map((p, i) => (
        <div key={p.id} style={S.scoreBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>{["🥇","🥈","🥉"][i] || "　"}</span>
            <span style={{ fontWeight: p.id === playerId ? 800 : 400 }}>{p.name}</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, color: C.accent }}>{p.score}</span>
        </div>
      ))}
      <button style={{ ...S.btn(), marginTop: 20 }} onClick={() => remove(ref(db, `rooms/${room.code}`))}>タイトルに戻る</button>
    </div>
  );
}


// ── Loading ───────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={S.page}>
      <div style={{ textAlign: "center", paddingTop: 120 }}>
        <div style={S.spinner} />
        <p style={{ color: C.muted, marginTop: 16, fontSize: 14 }}>クイズを生成中…</p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("top");
  const [roomCode, setRoomCode] = useState(null);
  const [playerId, setPlayerId] = useState(() => genPlayerId());
  const [room, setRoom] = useState(null);

  useEffect(() => {
    if (!roomCode) return;
    return onValue(ref(db, `rooms/${roomCode}`), snap => {
      if (!snap.exists()) return;
      const r = snap.val();
      setRoom(r);
      if (screen === "waiting" && r.phase !== "waiting") setScreen("game");
    });
  }, [roomCode]);

  const phase = room?.phase;

  return (
    <div style={S.root}>
      {screen === "top" && <TopScreen onCreateRoom={() => setScreen("create")} onJoinRoom={() => setScreen("join")} />}
      {screen === "create" && (
        <CreateRoomScreen
          onBack={() => setScreen("top")}
          onRoomCreated={(code, pid) => {
            setPlayerId(pid);
            setRoomCode(code);
            setScreen("waiting");
          }}
        />
      )}
      {screen === "join" && (
        <JoinRoomScreen
          onBack={() => setScreen("top")}
          onJoined={(code, pid) => {
            setPlayerId(pid);
            setRoomCode(code);
            setScreen("waiting");
          }}
        />
      )}
      {screen === "waiting" && roomCode && <WaitingScreen roomCode={roomCode} playerId={playerId} onGameStart={(r) => { setRoom(r); setScreen("game"); }} />}
      {screen === "game" && room && phase === "loading" && <LoadingScreen />}
      {screen === "game" && room && phase === "roleReveal" && <RoleRevealScreen room={room} playerId={playerId} />}
      {screen === "game" && room && phase === "quiz" && <QuizScreen room={room} playerId={playerId} />}
      {screen === "game" && room && phase === "review" && <ReviewScreen room={room} playerId={playerId} />}
      {screen === "game" && room && phase === "open" && <OpenScreen room={room} playerId={playerId} />}
      {screen === "game" && room && phase === "scored" && <ScoredScreen room={room} playerId={playerId} />}
      {screen === "game" && room && phase === "result" && <ResultScreen room={room} playerId={playerId} />}
      {screen === "game" && room && phase === "finished" && <FinishedScreen room={room} playerId={playerId} />}
    </div>
  );
}