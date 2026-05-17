import { useState, useEffect } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase, ref, set, get, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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
const GENRES = ["食べ物","スポーツ","音楽","映画・アニメ","旅行","動物","ゲーム","ファッション","自然・季節","日常生活"];
const POINT_OPTIONS = [2, 1, 0, -1];
const WIN_SCORE = 5;
const ROLE = { king: "理解王", retainer: "家臣" };

function genRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}
function genPlayerId() {
  return Math.random().toString(36).substring(2, 10);
}

// ── Claude API ────────────────────────────────────────────────────────────────
async function generateQuiz(genre, kingName) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `あなたはクイズ出題者です。ジャンルに沿った面白いクイズを1問だけ作ってください。
JSONのみで返答してください（マークダウン不要）。
形式: {"question":"問題文","hint":"ヒント（1行、任意）"}
必ず問題文の主語を「${kingName}」にしてください。例：「${kingName}の好きな食べ物は？」「${kingName}が選ぶ旅行先といえば？」`,
      messages: [{ role: "user", content: `ジャンル「${genre}」のクイズを1問作って。` }],
    }),
  });
  const data = await res.json();
  const txt = data.content.map(b => b.text || "").join("");
  const clean = txt.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
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
        <h1 style={S.h1}>○○理解王</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 6, marginBottom: 28 }}>理解王に認められた家臣が勝者だ！</p>
      </div>
      <button style={S.btn()} onClick={onCreateRoom}>🏠　部屋を作る</button>
      <button style={S.btn(C.red)} onClick={onJoinRoom}>🚪　部屋に参加する</button>
      <div style={{ ...S.card, marginTop: 20 }}>
        <p style={{ color: C.muted, fontSize: 12, margin: 0, lineHeight: 1.8 }}>
          ① 1人が「{ROLE.king}」に選ばれ、残りは「{ROLE.retainer}」<br />
          ② クイズに全員が回答 → {ROLE.king}がポイントを付与<br />
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
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setPlayerCount(n)} style={{
            flex: 1, padding: "16px 0", borderRadius: 12, fontWeight: 800, fontSize: 18, cursor: "pointer",
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
      if (r.phase === "roleReveal") onGameStart(r);
    });
  }, [roomCode]);

  const players = room ? Object.values(room.players || {}) : [];
  const isHost = room?.hostId === playerId;
  const isFull = players.length >= (room?.playerCount || 4);

  const startGame = async () => {
    const playerList = Object.values(room.players);
    const king = playerList[Math.floor(Math.random() * playerList.length)];
    const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
    let quiz;
    try { quiz = await generateQuiz(genre, kingName); }
    catch { quiz = { question: `あなたの好きな${genre}は？`, hint: "" }; }
    await update(ref(db, `rooms/${roomCode}`), {
      phase: "roleReveal", king: king.id, round: 1,
      genre, quiz, answers: {}, answeredCount: 0,
    });
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
      {isHost && isFull && <button style={{ ...S.btn(), marginTop: 8 }} onClick={startGame}>ゲームスタート 🎮</button>}
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
          {isKing ? "家臣たちの回答を見てポイントを付けよう！" : "正直に答えて理解王に認められよう！"}
        </p>
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
      await update(ref(db, `rooms/${room.code}`), { phase: "open" });
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
      players: newPlayers, phase: winner ? "finished" : "result",
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
                    flex: 1, padding: "8px 0", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: "pointer",
                    background: sel ? (pt > 0 ? C.green : pt === 0 ? C.muted : C.red) : C.border,
                    color: sel ? "#fff" : C.muted,
                  }}>{pt > 0 ? "+" : ""}{pt}</button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {isKing && allScored && <button style={{ ...S.btn(), marginTop: 8 }} onClick={submitScoring}>採点完了 →</button>}
      {isKing && !allScored && <p style={{ color: C.muted, textAlign: "center", fontSize: 13 }}>全員にポイントを付けてください</p>}
      {!isKing && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ color: C.accent, fontWeight: 700, margin: "0 0 4px" }}>👑 {ROLE.king}が採点中…</p>
          <p style={{ color: C.muted, fontSize: 13 }}>結果を待ちましょう</p>
        </div>
      )}
    </div>
  );
}

// ── Result ────────────────────────────────────────────────────────────────────
function ResultScreen({ room, playerId }) {
  const isHost = room.hostId === playerId;
  const players = Object.values(room.players).sort((a, b) => b.score - a.score);

  const nextRound = async () => {
    const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
    let quiz;
    try { quiz = await generateQuiz(genre, room.kingName); }
    catch { quiz = { question: `あなたの好きな${genre}は？`, hint: "" }; }
    const playerList = Object.values(room.players);
    const nextKing = playerList[Math.floor(Math.random() * playerList.length)];
    await update(ref(db, `rooms/${room.code}`), {
      phase: "roleReveal", king: nextKing.id, round: (room.round || 1) + 1,
      genre, quiz, answers: {}, answeredCount: 0, lastPoints: {},
    });
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
        <p style={{ color: C.accent, fontWeight: 900, fontSize: 22, margin: "0 0 4px" }}>{winner?.name} の勝利！</p>
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
      {screen === "game" && room && phase === "roleReveal" && <RoleRevealScreen room={room} playerId={playerId} />}
      {screen === "game" && room && phase === "quiz" && <QuizScreen room={room} playerId={playerId} />}
      {screen === "game" && room && phase === "open" && <OpenScreen room={room} playerId={playerId} />}
      {screen === "game" && room && phase === "result" && <ResultScreen room={room} playerId={playerId} />}
      {screen === "game" && room && phase === "finished" && <FinishedScreen room={room} playerId={playerId} />}
    </div>
  );
}