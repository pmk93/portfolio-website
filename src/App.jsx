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
const CAMERAS = ["End-On Cam", "Side Cam", "Sky Cam", "Stump Cam"];

const battingLineup = {
  [TEAM_A]: ["A. Sharma", "R. Kohan", "V. Singh", "H. Pandit", "M. Jade"],
  [TEAM_B]: ["D. Warner", "J. Buttler", "K. Wills", "B. Root", "S. Rashid"],
};

const bowlingLineup = {
  [TEAM_A]: ["B. Kumar", "J. Bumrah", "K. Yadav"],
  [TEAM_B]: ["M. Starc", "A. Zampa", "P. Cummins"],
};

const ballLabels = ["Pace", "Spin", "Yorker"];
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
  const [cameraIdx, setCameraIdx] = useState(0);
  const [shotDirection, setShotDirection] = useState("straight");
  const [shotType, setShotType] = useState("ground");
  const [lastBall, setLastBall] = useState({ event: "Ready", runs: 0, wicket: false, direction: "straight", shotType: "ground" });
  const audioRef = useRef(null);
  const gainRef = useRef(null);
  const [musicOn, setMusicOn] = useState(false);

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
      gain.gain.value = 0.05;
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

    if (audioRef.current.ctx.state === "suspended") {
      audioRef.current.ctx.resume();
    }
    gainRef.current.gain.value = 0.06;
  }, [musicOn]);

  useEffect(() => {
    if (phase !== "play") return;
    const timer = setInterval(() => setCameraIdx((idx) => (idx + 1) % CAMERAS.length), 2800);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (phase !== "play" || !currentInnings || !userBatting) return;

      if (e.key === "ArrowLeft") setShotDirection("leg");
      if (e.key === "ArrowUp") setShotDirection("straight");
      if (e.key === "ArrowRight") setShotDirection("off");

      if (e.key.toLowerCase() === "s") {
        setShotType("ground");
        playBattingShot("ground");
      }

      if (e.key.toLowerCase() === "a") {
        setShotType("air");
        playBattingShot("air");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, currentInnings, userBatting, shotDirection, stadium]);

  const doToss = () => {
    const coin = Math.random() < 0.5 ? "Heads" : "Tails";
    const userWon = coin === tossChoice;
    const winner = userWon ? TEAM_A : TEAM_B;
    setTossWinner(`${winner} won the toss (${coin})`);

    if (userWon) {
      setPhase("chooseRole");
    } else {
      const cpuRole = Math.random() < 0.5 ? "bat" : "bowl";
      const userRole = cpuRole === "bat" ? "bowl" : "bat";
      launchMatch(userRole);
    }
  };

  const launchMatch = (firstRole) => {
    setUserFirstRole(firstRole);
    const firstBatting = firstRole === "bat" ? TEAM_A : TEAM_B;
    const firstBowling = firstBatting === TEAM_A ? TEAM_B : TEAM_A;
    setInningsList([
      createInnings(firstBatting, firstBowling),
      createInnings(firstBowling, firstBatting),
    ]);
    setInningsIdx(0);
    setMatchResult("");
    setLastBall({ event: "Innings start!", runs: 0, wicket: false, direction: "straight", shotType: "ground" });
    setPhase("play");
  };

  const finishBall = ({ runs, wicket, note, direction = "straight", type = "ground" }) => {
    setLastBall({ event: note, runs, wicket, direction, shotType: type });
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
  };

  const playBattingShot = (manualType = "ground") => {
    const boost = stadium.battingBoost;
    const roll = Math.random();
    const dirBonus = shotDirection === "straight" ? 0.06 : 0.02;
    const aerialRisk = manualType === "air" ? 0.08 : -0.02;
    const wicketLine = 0.14 - boost / 2 + aerialRisk;

    if (roll < wicketLine) {
      return finishBall({ runs: 0, wicket: true, note: `${manualType === "air" ? "Top edge" : "Inside edge"}! WICKET`, direction: shotDirection, type: manualType });
    }
    if (roll < 0.32) return finishBall({ runs: 0, wicket: false, note: "Dot ball", direction: shotDirection, type: manualType });
    if (roll < 0.52 + dirBonus) return finishBall({ runs: 1, wicket: false, note: "Quick single", direction: shotDirection, type: manualType });
    if (roll < 0.67 + dirBonus) return finishBall({ runs: 2, wicket: false, note: "Punched for two", direction: shotDirection, type: manualType });
    if (roll < 0.85 + boost / 2) return finishBall({ runs: 4, wicket: false, note: `Ground stroke to ${shotDirection} fence`, direction: shotDirection, type: manualType });
    return finishBall({ runs: 6, wicket: false, note: `Big ${manualType === "air" ? "lofted" : "clean"} hit!`, direction: shotDirection, type: manualType });
  };

  const bowlDelivery = () => {
    const style = selectedBall;
    const spinEdge = style === "Spin" ? 0.04 + stadium.spinAssist : 0;
    const yorkerEdge = style === "Yorker" ? 0.06 : 0;
    const wicketChance = 0.11 + spinEdge + yorkerEdge;
    const roll = Math.random();

    if (roll < wicketChance) return finishBall({ runs: 0, wicket: true, note: `${style} strikes!`, direction: "straight", type: "ground" });
    if (roll < 0.4) return finishBall({ runs: 0, wicket: false, note: `${style} keeps it tight`, direction: "straight", type: "ground" });
    if (roll < 0.62) return finishBall({ runs: 1, wicket: false, note: "Worked for one", direction: "leg", type: "ground" });
    if (roll < 0.76) return finishBall({ runs: 2, wicket: false, note: "Placed for two", direction: "off", type: "ground" });
    if (roll < 0.9) return finishBall({ runs: 4, wicket: false, note: "Boundary by CPU", direction: "off", type: "ground" });
    return finishBall({ runs: 6, wicket: false, note: "Huge six by CPU", direction: "straight", type: "air" });
  };

  useEffect(() => {
    if (phase !== "play" || !currentInnings) return;

    const inningsOver =
      currentInnings.balls >= TOTAL_OVERS * 6 ||
      currentInnings.wickets >= battingLineup[currentInnings.battingTeam].length;

    const chaseDone = inningsIdx === 1 && inningsList[1].runs > inningsList[0].runs;

    if (inningsOver || chaseDone) {
      if (inningsIdx === 0) {
        setInningsIdx(1);
        setLastBall({ event: "Second innings begins", runs: 0, wicket: false, direction: "straight", shotType: "ground" });
        return;
      }

      const yourRuns = userFirstRole === "bat" ? inningsList[0].runs : inningsList[1].runs;
      const cpuRuns = userFirstRole === "bat" ? inningsList[1].runs : inningsList[0].runs;

      if (yourRuns > cpuRuns) setMatchResult(`You won by ${yourRuns - cpuRuns} runs!`);
      else if (cpuRuns > yourRuns) setMatchResult(`CPU won by ${cpuRuns - yourRuns} runs.`);
      else setMatchResult("Match tied!");
      setPhase("done");
    }
  }, [currentInnings, inningsIdx, inningsList, phase, userFirstRole]);

  const resetGame = () => {
    setPhase("setup");
    setTossWinner("");
    setInningsList([]);
    setInningsIdx(0);
    setMatchResult("");
    setLastBall({ event: "Ready", runs: 0, wicket: false, direction: "straight", shotType: "ground" });
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>Cricket Clash Simulator</h1>
        <div className={styles.topControls}>
          <label>
            Stadium
            <select value={stadium.name} onChange={(e) => setStadium(STADIUMS.find((s) => s.name === e.target.value))}>
              {STADIUMS.map((s) => (
                <option key={s.name}>{s.name}</option>
              ))}
            </select>
          </label>
          <button onClick={() => setMusicOn((m) => !m)}>{musicOn ? "Pause Music" : "Play Music"}</button>
        </div>
      </header>

      {(phase === "play" || phase === "done") && currentInnings && (
        <section className={`${styles.card} ${styles.broadcast}`}>
          <div className={styles.broadcastTop}>
            <h3>Live Broadcast • {CAMERAS[cameraIdx]}</h3>
            <div className={styles.cameraRow}>
              {CAMERAS.map((c, idx) => (
                <button key={c} className={idx === cameraIdx ? styles.active : ""} onClick={() => setCameraIdx(idx)}>{c}</button>
              ))}
            </div>
          </div>
          <div className={`${styles.field} ${styles[`cam${cameraIdx}`]}`}>
            <div className={styles.pitch}></div>
            <div className={`${styles.player} ${styles.bowler}`}>🏃‍♂️</div>
            <div className={`${styles.player} ${styles.batsman}`}>🏏</div>
            <div className={`${styles.ball} ${styles[`dir${lastBall.direction}`]} ${lastBall.shotType === "air" ? styles.airBall : styles.groundBall}`}></div>
          </div>
          <p className={styles.commentary}>Commentary: {lastBall.event} | Runs: {lastBall.runs} {lastBall.wicket ? "| WICKET!" : ""}</p>
        </section>
      )}

      {phase === "setup" && (
        <section className={styles.card}>
          <h2>Toss Time</h2>
          <p>Choose toss and start the match.</p>
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
          <h2>You won the toss!</h2>
          <p>Choose your first innings role:</p>
          <div className={styles.row}>
            <button onClick={() => launchMatch("bat")}>Bat First</button>
            <button onClick={() => launchMatch("bowl")}>Bowl First</button>
          </div>
        </section>
      )}

      {(phase === "play" || phase === "done") && currentInnings && (
        <>
          <section className={styles.card}>
            <h2>
              {currentInnings.battingTeam} {currentInnings.runs}/{currentInnings.wickets} ({oversText(currentInnings.balls)} ov)
            </h2>
            <p>
              Batting: {currentInnings.striker} | Bowling: {currentInnings.currentBowler}
            </p>
            {required !== null && required > 0 && <p>Need {required} runs to win</p>}
            {phase === "play" && (
              <div className={styles.row}>
                {userBatting ? (
                  <>
                    <p className={styles.controlsHint}>Batting controls: ←/↑/→ set direction | S = ground shot | A = lofted shot</p>
                    <p className={styles.controlsHint}>Current: {shotDirection.toUpperCase()} + {shotType.toUpperCase()}</p>
                  </>
                ) : (
                  <>
                    <select value={selectedBall} onChange={(e) => setSelectedBall(e.target.value)}>
                      {ballLabels.map((label) => (
                        <option key={label}>{label}</option>
                      ))}
                    </select>
                    <button onClick={bowlDelivery}>Bowl Ball</button>
                  </>
                )}
              </div>
            )}
            <ul className={styles.log}>
              {currentInnings.log.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </section>

          <section className={styles.grid}>
            <div className={styles.card}>
              <h3>Scorecard</h3>
              {inningsList.map((inn, idx) => (
                <p key={inn.battingTeam + idx}>
                  Innings {idx + 1}: {inn.battingTeam} {inn.runs}/{inn.wickets} ({oversText(inn.balls)} ov)
                </p>
              ))}
            </div>
            <div className={styles.card}>
              <h3>Player Stats</h3>
              <p><strong>Batting</strong></p>
              {Object.entries(currentInnings.batStats).map(([name, st]) => (
                <p key={name}>{name}: {st.runs} ({st.balls}) {st.out ? "out" : "not out"}</p>
              ))}
              <p><strong>Bowling</strong></p>
              {Object.entries(currentInnings.bowlStats).map(([name, st]) => (
                <p key={name}>{name}: {st.wickets}/{st.runs} ({oversText(st.balls)})</p>
              ))}
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
