import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./App.module.css";

const STADIUMS = [
  { name: "Mumbai Thunder Dome", battingBoost: 0.2, spinAssist: -0.05 },
  { name: "Melbourne Cricket Arena", battingBoost: 0.05, spinAssist: 0.1 },
  { name: "Lords Heritage Ground", battingBoost: 0, spinAssist: 0.05 },
  { name: "Sharjah Desert Oval", battingBoost: 0.15, spinAssist: -0.1 },
];

const TEAM_A = "You XI";
const TEAM_B = "CPU XI";
const TOTAL_OVERS = 2;

const battingLineup = {
  [TEAM_A]: ["A. Sharma", "R. Kohan", "V. Singh", "H. Pandit", "M. Jade"],
  [TEAM_B]: ["D. Warner", "J. Buttler", "K. Wills", "B. Root", "S. Rashid"],
};

const bowlingLineup = {
  [TEAM_A]: ["B. Kumar", "J. Bumrah", "K. Yadav"],
  [TEAM_B]: ["M. Starc", "A. Zampa", "P. Cummins"],
};

const ballLabels = ["Pace", "Spin", "Yorker"];
const shotDirs = ["leg", "straight", "off"];

const createInnings = (battingTeam, bowlingTeam) => ({
  battingTeam,
  bowlingTeam,
  runs: 0,
  wickets: 0,
  balls: 0,
  batterIndex: 0,
  striker: battingLineup[battingTeam][0],
  bowlerIndex: 0,
  currentBowler: bowlingLineup[bowlingTeam][0],
  log: ["Innings start!"],
  batStats: Object.fromEntries(battingLineup[battingTeam].map((name) => [name, { runs: 0, balls: 0, out: false }])),
  bowlStats: Object.fromEntries(bowlingLineup[bowlingTeam].map((name) => [name, { runs: 0, wickets: 0, balls: 0 }])),
});

const oversText = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;

function App() {
  const [stadium, setStadium] = useState(STADIUMS[0]);
  const [phase, setPhase] = useState("setup");
  const [tossChoice, setTossChoice] = useState("Heads");
  const [tossWinner, setTossWinner] = useState("");
  const [userFirstRole, setUserFirstRole] = useState("");
  const [inningsList, setInningsList] = useState([]);
  const [inningsIdx, setInningsIdx] = useState(0);
  const [matchResult, setMatchResult] = useState("");
  const [selectedBall, setSelectedBall] = useState("Pace");
  const [shotDirection, setShotDirection] = useState("straight");
  const [lastBall, setLastBall] = useState("Ready for first ball");
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef(null);
  const gainRef = useRef(null);

  const [anim, setAnim] = useState({ active: false, type: "", progress: 0 });
  const [delivery, setDelivery] = useState({ shotPlayed: false, shotType: "ground", shotTiming: 0, shotDir: "straight" });

  const currentInnings = inningsList[inningsIdx];
  const userBatting = currentInnings?.battingTeam === TEAM_A;

  const required = useMemo(() => {
    if (inningsIdx !== 1 || !inningsList[0]) return null;
    return inningsList[0].runs + 1 - inningsList[1].runs;
  }, [inningsIdx, inningsList]);

  useEffect(() => {
    if (!musicOn) {
      if (gainRef.current) gainRef.current.gain.value = 0;
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!audioRef.current) {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = 0.06;
      gain.connect(ctx.destination);
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = "sine";
      osc2.type = "triangle";
      osc1.frequency.value = 196;
      osc2.frequency.value = 246.94;
      osc1.connect(gain);
      osc2.connect(gain);
      osc1.start();
      osc2.start();
      audioRef.current = { ctx, osc1, osc2 };
      gainRef.current = gain;
    }

    if (audioRef.current.ctx.state === "suspended") audioRef.current.ctx.resume();
    gainRef.current.gain.value = 0.06;
  }, [musicOn]);

  useEffect(() => {
    let id;
    if (anim.active) {
      id = setInterval(() => {
        setAnim((prev) => {
          const next = Math.min(prev.progress + 0.03, 1);
          if (next >= 1) {
            setTimeout(() => {
              if (prev.type === "bat") resolveBatBall();
              if (prev.type === "bowl") resolveBowlBall();
            }, 0);
            return { active: false, type: "", progress: 0 };
          }
          return { ...prev, progress: next };
        });
      }, 28);
    }

    return () => clearInterval(id);
  }, [anim.active]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (phase !== "play" || !currentInnings || !userBatting || !anim.active || anim.type !== "bat") return;
      if (e.key === "ArrowLeft") setShotDirection("leg");
      if (e.key === "ArrowUp") setShotDirection("straight");
      if (e.key === "ArrowRight") setShotDirection("off");
      if (delivery.shotPlayed) return;
      if (e.key.toLowerCase() === "s" || e.key.toLowerCase() === "a") {
        setDelivery({
          shotPlayed: true,
          shotType: e.key.toLowerCase() === "a" ? "air" : "ground",
          shotTiming: anim.progress,
          shotDir: shotDirection,
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, currentInnings, userBatting, anim, delivery.shotPlayed, shotDirection]);

  const doToss = () => {
    const coin = Math.random() < 0.5 ? "Heads" : "Tails";
    const userWon = coin === tossChoice;
    const winner = userWon ? TEAM_A : TEAM_B;
    setTossWinner(`${winner} won the toss (${coin})`);
    if (userWon) setPhase("chooseRole");
    else launchMatch(Math.random() < 0.5 ? "bat" : "bowl");
  };

  const launchMatch = (firstRole) => {
    setUserFirstRole(firstRole);
    const firstBatting = firstRole === "bat" ? TEAM_A : TEAM_B;
    const firstBowling = firstBatting === TEAM_A ? TEAM_B : TEAM_A;
    setInningsList([createInnings(firstBatting, firstBowling), createInnings(firstBowling, firstBatting)]);
    setInningsIdx(0);
    setMatchResult("");
    setLastBall("Innings start!");
    setPhase("play");
  };

  const finishBall = (runs, wicket, note) => {
    setLastBall(note);
    setInningsList((prev) => {
      const next = [...prev];
      const inn = { ...next[inningsIdx] };
      const striker = inn.striker;
      const bowler = inn.currentBowler;
      const bat = { ...inn.batStats[striker] };
      const bowl = { ...inn.bowlStats[bowler] };
      inn.balls += 1;
      inn.runs += runs;
      bat.runs += runs;
      bat.balls += 1;
      bowl.runs += runs;
      bowl.balls += 1;
      if (wicket) {
        inn.wickets += 1;
        bat.out = true;
        bowl.wickets += 1;
        inn.batterIndex += 1;
        inn.striker = battingLineup[inn.battingTeam][inn.batterIndex] || "All Out";
      }
      if (inn.balls % 6 === 0) {
        inn.bowlerIndex = (inn.bowlerIndex + 1) % bowlingLineup[inn.bowlingTeam].length;
        inn.currentBowler = bowlingLineup[inn.bowlingTeam][inn.bowlerIndex];
      }
      inn.batStats = { ...inn.batStats, [striker]: bat };
      inn.bowlStats = { ...inn.bowlStats, [bowler]: bowl };
      inn.log = [`${note} (${runs}${wicket ? ", W" : ""})`, ...inn.log].slice(0, 10);
      next[inningsIdx] = inn;
      return next;
    });
    setDelivery({ shotPlayed: false, shotType: "ground", shotTiming: 0, shotDir: "straight" });
  };

  const resolveBatBall = () => {
    const boost = stadium.battingBoost;
    if (!delivery.shotPlayed) return finishBall(0, true, "Too late! Bowled");
    const timingDiff = Math.abs(delivery.shotTiming - 0.72);
    const timingQuality = Math.max(0, 1 - timingDiff * 2.4);
    const aerialRisk = delivery.shotType === "air" ? 0.12 : 0.02;
    const wicketChance = Math.max(0.06, 0.28 - timingQuality * 0.18 + aerialRisk - boost * 0.08);
    const roll = Math.random();
    if (roll < wicketChance) return finishBall(0, true, `${delivery.shotType === "air" ? "Mishit skier" : "Inside edge"} - OUT`);
    if (timingQuality < 0.25) return finishBall(0, false, "Beaten for pace (dot)");
    if (timingQuality < 0.45) return finishBall(1, false, `Nudged to ${delivery.shotDir}`);
    if (timingQuality < 0.68) return finishBall(2, false, `Timed to the gap on ${delivery.shotDir}`);
    if (timingQuality < 0.88) return finishBall(4, false, `Cracking boundary through ${delivery.shotDir}`);
    return finishBall(6, false, `Perfect ${delivery.shotType === "air" ? "lofted" : "driven"} six!`);
  };

  const resolveBowlBall = () => {
    const spinEdge = selectedBall === "Spin" ? 0.04 + stadium.spinAssist : 0;
    const yorkerEdge = selectedBall === "Yorker" ? 0.06 : 0;
    const wicketChance = 0.11 + spinEdge + yorkerEdge;
    const roll = Math.random();
    if (roll < wicketChance) return finishBall(0, true, `${selectedBall} castles the batter`);
    if (roll < 0.4) return finishBall(0, false, `${selectedBall} tight line`);
    if (roll < 0.62) return finishBall(1, false, "CPU takes one");
    if (roll < 0.76) return finishBall(2, false, "CPU finds the gap");
    if (roll < 0.9) return finishBall(4, false, "CPU boundary");
    return finishBall(6, false, "CPU launches a six");
  };

  useEffect(() => {
    if (phase !== "play" || !currentInnings) return;
    const inningsOver = currentInnings.balls >= TOTAL_OVERS * 6 || currentInnings.wickets >= battingLineup[currentInnings.battingTeam].length;
    const chaseDone = inningsIdx === 1 && inningsList[1].runs > inningsList[0].runs;
    if (inningsOver || chaseDone) {
      if (inningsIdx === 0) {
        setInningsIdx(1);
        setLastBall("Second innings begins");
        return;
      }
      const yourRuns = userFirstRole === "bat" ? inningsList[0].runs : inningsList[1].runs;
      const cpuRuns = userFirstRole === "bat" ? inningsList[1].runs : inningsList[0].runs;
      if (yourRuns > cpuRuns) setMatchResult(`You won by ${yourRuns - cpuRuns} runs!`);
      else if (cpuRuns > yourRuns) setMatchResult(`CPU won by ${cpuRuns - yourRuns} runs.`);
      else setMatchResult("Match tied!");
      setPhase("done");
    }
  }, [phase, currentInnings, inningsIdx, inningsList, userFirstRole]);

  const resetGame = () => {
    setPhase("setup");
    setTossWinner("");
    setInningsList([]);
    setInningsIdx(0);
    setMatchResult("");
    setAnim({ active: false, type: "", progress: 0 });
    setDelivery({ shotPlayed: false, shotType: "ground", shotTiming: 0, shotDir: "straight" });
  };

  const startBatDelivery = () => {
    if (anim.active) return;
    setDelivery({ shotPlayed: false, shotType: "ground", shotTiming: 0, shotDir: shotDirection });
    setAnim({ active: true, type: "bat", progress: 0 });
  };

  const startBowlDelivery = () => {
    if (anim.active) return;
    setAnim({ active: true, type: "bowl", progress: 0 });
  };

  const ballX = anim.progress * 78;
  const ballY = 8 + anim.progress * 69;
  const swingClass = shotDirs.includes(delivery.shotDir) ? styles[`shot${delivery.shotDir}`] : styles.shotstraight;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>Cricket Clash Pro</h1>
        <div className={styles.topControls}>
          <label>
            Stadium
            <select value={stadium.name} onChange={(e) => setStadium(STADIUMS.find((s) => s.name === e.target.value))}>
              {STADIUMS.map((s) => <option key={s.name}>{s.name}</option>)}
            </select>
          </label>
          <button onClick={() => setMusicOn((m) => !m)}>{musicOn ? "Pause Music" : "Play Music"}</button>
        </div>
      </header>

      {phase === "setup" && (
        <section className={styles.card}>
          <h2>Toss Time</h2>
          <div className={styles.row}>
            <button className={tossChoice === "Heads" ? styles.active : ""} onClick={() => setTossChoice("Heads")}>Heads</button>
            <button className={tossChoice === "Tails" ? styles.active : ""} onClick={() => setTossChoice("Tails")}>Tails</button>
            <button onClick={doToss}>Flip Coin</button>
          </div>
          {tossWinner && <p>{tossWinner}</p>}
        </section>
      )}

      {phase === "chooseRole" && (
        <section className={styles.card}>
          <h2>You won toss</h2>
          <div className={styles.row}>
            <button onClick={() => launchMatch("bat")}>Bat First</button>
            <button onClick={() => launchMatch("bowl")}>Bowl First</button>
          </div>
        </section>
      )}

      {(phase === "play" || phase === "done") && currentInnings && (
        <>
          <section className={`${styles.card} ${styles.broadcast}`}>
            <div className={styles.field}>
              <div className={styles.pitch} />
              <div className={styles.bowler}>🧍</div>
              <div className={styles.batsman}>🏏</div>
              <div className={`${styles.ball} ${anim.active ? styles.liveBall : ""} ${delivery.shotPlayed ? swingClass : ""} ${delivery.shotType === "air" ? styles.airBall : styles.groundBall}`} style={{ left: `${ballX}%`, top: `${ballY}%` }} />
              <div className={styles.hud}>Timing window: hit S/A near release point (~70%)</div>
            </div>
            <p className={styles.commentary}>{lastBall}</p>
          </section>

          <section className={styles.card}>
            <h2>{currentInnings.battingTeam} {currentInnings.runs}/{currentInnings.wickets} ({oversText(currentInnings.balls)} ov)</h2>
            <p>Batting: {currentInnings.striker} | Bowling: {currentInnings.currentBowler}</p>
            {required !== null && required > 0 && <p>Need {required} runs to win</p>}
            {phase === "play" && (
              <div className={styles.row}>
                {userBatting ? (
                  <>
                    <p className={styles.controls}>Controls: ←/↑/→ direction, S ground shot, A aerial shot</p>
                    <p className={styles.controls}>Direction selected: {shotDirection.toUpperCase()}</p>
                    <button onClick={startBatDelivery} disabled={anim.active}>Start Next Ball</button>
                  </>
                ) : (
                  <>
                    <select value={selectedBall} onChange={(e) => setSelectedBall(e.target.value)}>
                      {ballLabels.map((label) => <option key={label}>{label}</option>)}
                    </select>
                    <button onClick={startBowlDelivery} disabled={anim.active}>Bowl Ball</button>
                  </>
                )}
              </div>
            )}
            <ul className={styles.log}>{currentInnings.log.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </section>

          <section className={styles.grid}>
            <div className={styles.card}>
              <h3>Scorecard</h3>
              {inningsList.map((inn, idx) => <p key={inn.battingTeam + idx}>Innings {idx + 1}: {inn.battingTeam} {inn.runs}/{inn.wickets} ({oversText(inn.balls)} ov)</p>)}
            </div>
            <div className={styles.card}>
              <h3>Player Stats</h3>
              <p><strong>Batting</strong></p>
              {Object.entries(currentInnings.batStats).map(([name, st]) => <p key={name}>{name}: {st.runs} ({st.balls}) {st.out ? "out" : "not out"}</p>)}
              <p><strong>Bowling</strong></p>
              {Object.entries(currentInnings.bowlStats).map(([name, st]) => <p key={name}>{name}: {st.wickets}/{st.runs} ({oversText(st.balls)})</p>)}
            </div>
          </section>
        </>
      )}

      {phase === "done" && (
        <section className={styles.card}>
          <h2>{matchResult}</h2>
          <button onClick={resetGame}>Play Again</button>
        </section>
      )}
    </div>
  );
}

export default App;
