const strategies = [
  {
    id: "all_c",
    name: "Always Cooperate",
    short: "AC",
    category: "Good",
    describe: "Standard ALLC: cooperates every round.",
    nextAction() {
      return "C";
    },
  },
  {
    id: "all_d",
    name: "Always Defect",
    short: "AD",
    category: "Evil",
    describe: "Standard ALLD: defects every round.",
    nextAction() {
      return "D";
    },
  },
  {
    id: "tit_for_tat",
    name: "Tit For Tat",
    short: "TFT",
    category: "Good",
    describe: "Starts with cooperate, then mirrors the opponent's previous move.",
    nextAction({ opponentLastAction }) {
      return opponentLastAction ?? "C";
    },
  },
  {
    id: "grim_trigger",
    name: "Grim Trigger",
    short: "GRIM",
    category: "Good",
    describe: "Cooperates until a defection, then defects forever.",
    nextAction({ state, opponentLastAction }) {
      if (opponentLastAction === "D") {
        state.grimTriggered = true;
      }
      return state.grimTriggered ? "D" : "C";
    },
  },
  {
    id: "pavlov",
    name: "Pavlov",
    short: "PAV",
    category: "Neutral",
    describe: "Win-Stay Lose-Shift: repeat on agreement, flip on disagreement.",
    nextAction({ selfLastAction, opponentLastAction }) {
      if (!selfLastAction || !opponentLastAction) {
        return "C";
      }
      return selfLastAction === opponentLastAction ? selfLastAction : flipAction(selfLastAction);
    },
  },
  {
    id: "random_50",
    name: "Random 50",
    short: "RND",
    category: "Neutral",
    describe: "Chooses cooperation or defection 50/50 each round.",
    nextAction({ rng }) {
      return rng() < 0.5 ? "C" : "D";
    },
  },
  {
    id: "generous_tft",
    name: "Generous Tit For Tat",
    short: "GTFT",
    category: "Good",
    describe: "Forgives a defect with some probability instead of retaliating immediately.",
    nextAction({ opponentLastAction, rng }) {
      if (!opponentLastAction || opponentLastAction === "C") {
        return "C";
      }
      return rng() < 0.33 ? "C" : "D";
    },
  },
];

const ui = {
  rounds: document.getElementById("rounds"),
  repetitions: document.getElementById("repetitions"),
  noise: document.getElementById("noise"),
  speed: document.getElementById("speed"),
  seed: document.getElementById("seed"),
  selfPlay: document.getElementById("self-play"),
  payoffCC: document.getElementById("payoff-cc"),
  payoffCD: document.getElementById("payoff-cd"),
  payoffDC: document.getElementById("payoff-dc"),
  payoffDD: document.getElementById("payoff-dd"),
  strategyList: document.getElementById("strategy-list"),
  startButton: document.getElementById("start-button"),
  pauseButton: document.getElementById("pause-button"),
  resetButton: document.getElementById("reset-button"),
  sampleButton: document.getElementById("sample-button"),
  statusMode: document.getElementById("status-mode"),
  statusRound: document.getElementById("status-round"),
  statusMatch: document.getElementById("status-match"),
  playerAName: document.getElementById("player-a-name"),
  playerBName: document.getElementById("player-b-name"),
  playerAMove: document.getElementById("player-a-move"),
  playerBMove: document.getElementById("player-b-move"),
  playerAScore: document.getElementById("player-a-score"),
  playerBScore: document.getElementById("player-b-score"),
  timeline: document.getElementById("timeline"),
  timelineCaption: document.getElementById("timeline-caption"),
  leaderboard: document.getElementById("leaderboard"),
  summaryText: document.getElementById("summary-text"),
  chart: document.getElementById("leaderboard-chart"),
};

const appState = {
  running: false,
  paused: false,
  tournament: null,
  timer: null,
};

renderStrategySelector();
applyClassicDefaults();
renderLeaderboard([]);
wireEvents();

function wireEvents() {
  ui.startButton.addEventListener("click", handleStart);
  ui.pauseButton.addEventListener("click", handlePause);
  ui.resetButton.addEventListener("click", handleReset);
  ui.sampleButton.addEventListener("click", applyClassicDefaults);
}

function renderStrategySelector() {
  ui.strategyList.innerHTML = "";
  strategies.forEach((strategy) => {
    const item = document.createElement("div");
    item.className = "strategy-item";
    item.innerHTML = `
      <label>
        <input type="checkbox" data-strategy-id="${strategy.id}" checked>
        <span>
          <strong>${strategy.name}</strong><br>
          ${strategy.describe}
        </span>
      </label>
      <div class="strategy-meta">
        <code>${strategy.short}</code>
        <span class="strategy-category strategy-category-${strategy.category.toLowerCase()}">${strategy.category}</span>
      </div>
    `;
    ui.strategyList.appendChild(item);
  });
}

function applyClassicDefaults() {
  ui.rounds.value = 150;
  ui.repetitions.value = 3;
  ui.noise.value = "0.01";
  ui.speed.value = 120;
  ui.seed.value = 42;
  ui.selfPlay.value = "yes";
  ui.payoffCC.value = 3;
  ui.payoffCD.value = 0;
  ui.payoffDC.value = 5;
  ui.payoffDD.value = 1;
  ui.strategyList.querySelectorAll("input[type=checkbox]").forEach((checkbox) => {
    checkbox.checked = true;
  });
  resetState();
}

function handleStart() {
  if (appState.running) {
    return;
  }
  const config = readConfig();
  if (!config) {
    return;
  }
  appState.tournament = createTournament(config);
  appState.running = true;
  appState.paused = false;
  ui.startButton.disabled = true;
  ui.pauseButton.disabled = false;
  ui.resetButton.disabled = false;
  ui.statusMode.textContent = "Running";
  ui.summaryText.textContent = "Tournament in progress...";
  updateMatchDisplay(appState.tournament);
  scheduleTick();
}

function handlePause() {
  if (!appState.running) {
    return;
  }
  appState.paused = !appState.paused;
  ui.pauseButton.textContent = appState.paused ? "Resume" : "Pause";
  ui.statusMode.textContent = appState.paused ? "Paused" : "Running";
  if (!appState.paused) {
    scheduleTick();
  }
}

function handleReset() {
  resetState();
}

function resetState() {
  appState.running = false;
  appState.paused = false;
  appState.tournament = null;
  if (appState.timer) {
    clearTimeout(appState.timer);
    appState.timer = null;
  }
  ui.startButton.disabled = false;
  ui.pauseButton.disabled = true;
  ui.pauseButton.textContent = "Pause";
  ui.resetButton.disabled = false;
  ui.statusMode.textContent = "Idle";
  ui.statusRound.textContent = "0";
  ui.statusMatch.textContent = "0 / 0";
  ui.playerAName.textContent = "Waiting";
  ui.playerBName.textContent = "Waiting";
  ui.playerAMove.textContent = "-";
  ui.playerBMove.textContent = "-";
  ui.playerAScore.textContent = "Score: 0.00";
  ui.playerBScore.textContent = "Score: 0.00";
  ui.timeline.innerHTML = "";
  ui.timelineCaption.textContent = "No rounds played yet.";
  renderLeaderboard([]);
  drawChart([]);
  ui.summaryText.textContent = "Set your parameters, then start the tournament to watch the ranking settle in real time.";
}

function readConfig() {
  const rounds = parseInt(ui.rounds.value, 10);
  const repetitions = parseInt(ui.repetitions.value, 10);
  const noise = parseFloat(ui.noise.value);
  const speed = parseInt(ui.speed.value, 10);
  const seed = parseInt(ui.seed.value, 10);
  const selfPlay = ui.selfPlay.value === "yes";
  const payoffs = {
    CC: parseFloat(ui.payoffCC.value),
    CD: parseFloat(ui.payoffCD.value),
    DC: parseFloat(ui.payoffDC.value),
    DD: parseFloat(ui.payoffDD.value),
  };

  if (Number.isNaN(rounds) || rounds < 1) {
    alert("Rounds per match must be at least 1.");
    return null;
  }
  if (Number.isNaN(repetitions) || repetitions < 1) {
    alert("Repetitions per pairing must be at least 1.");
    return null;
  }
  if (Number.isNaN(noise) || noise < 0 || noise > 1) {
    alert("Noise must be between 0 and 1.");
    return null;
  }
  if (Number.isNaN(speed) || speed < 10) {
    alert("Animation speed must be at least 10 ms.");
    return null;
  }
  if (Number.isNaN(seed)) {
    alert("Seed must be a valid integer.");
    return null;
  }

  const selectedIDs = Array.from(ui.strategyList.querySelectorAll("input[type=checkbox]:checked")).map(
    (checkbox) => checkbox.dataset.strategyId,
  );

  if (selectedIDs.length < 2) {
    alert("Please select at least two strategies.");
    return null;
  }

  const selectedStrategies = strategies.filter((strategy) => selectedIDs.includes(strategy.id));

  return {
    rounds,
    repetitions,
    noise,
    speed,
    seed,
    selfPlay,
    payoffs,
    strategies: selectedStrategies,
  };
}

function createTournament(config) {
  const players = config.strategies.map((strategy) => ({
    strategy,
    name: strategy.name,
    id: strategy.id,
    totalScore: 0,
    matchesPlayed: 0,
    averageScore: 0,
  }));

  const pairs = [];
  for (let i = 0; i < players.length; i += 1) {
    for (let j = i; j < players.length; j += 1) {
      if (i === j && !config.selfPlay) continue;
      pairs.push([players[i], players[j]]);
    }
  }

  const schedule = [];
  pairs.forEach((pair) => {
    for (let r = 1; r <= config.repetitions; r += 1) {
      schedule.push({ pair, repetition: r });
    }
  });

  return {
    config,
    players,
    schedule,
    currentMatchIndex: 0,
    totalMatches: schedule.length,
    history: [],
    chartData: [],
  };
}

function scheduleTick() {
  if (!appState.running || appState.paused || !appState.tournament) {
    return;
  }
  appState.timer = setTimeout(() => {
    runTournamentStep();
  }, appState.tournament.config.speed);
}

function runTournamentStep() {
  const tournament = appState.tournament;
  if (!tournament) {
    return;
  }

  if (tournament.currentMatchIndex >= tournament.totalMatches) {
    finishTournament();
    return;
  }

  const current = tournament.schedule[tournament.currentMatchIndex];
  const [playerA, playerB] = current.pair;
  const matchName = `${playerA.name} vs ${playerB.name}`;

  if (!current.matchState) {
    current.matchState = createMatchState(playerA, playerB, tournament.config);
  }

  const state = current.matchState;
  const round = state.currentRound + 1;

  const result = playRound(state, tournament.config);
  state.currentRound = round;

  updateRoundDisplay(playerA, playerB, result, round, tournament.currentMatchIndex + 1, tournament.totalMatches);
  recordRoundHistory(tournament, matchName, round, result, playerA, playerB);
  updatePlayerScoreDisplay(playerA, playerB);
  updateLeaderboard(tournament.players);

  if (round >= tournament.config.rounds) {
    finalizeMatch(tournament, current);
    tournament.currentMatchIndex += 1;
    if (tournament.currentMatchIndex < tournament.totalMatches) {
      const next = tournament.schedule[tournament.currentMatchIndex];
      updateMatchDisplay({ currentMatchIndex: tournament.currentMatchIndex, totalMatches: tournament.totalMatches, pair: next.pair });
    }
  }

  if (!appState.paused) {
    scheduleTick();
  }
}

function createMatchState(playerA, playerB, config) {
  return {
    currentRound: 0,
    playerA: {
      strategy: playerA.strategy,
      state: {},
      lastAction: null,
      score: 0,
    },
    playerB: {
      strategy: playerB.strategy,
      state: {},
      lastAction: null,
      score: 0,
    },
    rng: makeRandom(config.seed + playerA.id.length + playerB.id.length),
  };
}

function playRound(matchState, config) {
  const playerAChoice = getAction(matchState.playerA, matchState.playerB.lastAction, matchState);
  const playerBChoice = getAction(matchState.playerB, matchState.playerA.lastAction, matchState);

  const noisyAChoice = applyNoise(playerAChoice, config.noise, matchState.rng);
  const noisyBChoice = applyNoise(playerBChoice, config.noise, matchState.rng);
  const payoff = getPayoff(noisyAChoice, noisyBChoice, config.payoffs);

  matchState.playerA.lastAction = noisyAChoice;
  matchState.playerB.lastAction = noisyBChoice;
  matchState.playerA.score += payoff.A;
  matchState.playerB.score += payoff.B;

  return {
    aAction: noisyAChoice,
    bAction: noisyBChoice,
    payoff,
    rawA: playerAChoice,
    rawB: playerBChoice,
  };
}

function getAction(player, opponentLastAction, matchState) {
  const context = {
    opponentLastAction,
    selfLastAction: player.lastAction,
    state: player.state,
    rng: matchState.rng,
  };
  return player.strategy.nextAction(context);
}

function applyNoise(action, noise, rng) {
  if (noise <= 0) return action;
  return rng() < noise ? flipAction(action) : action;
}

function flipAction(action) {
  return action === "C" ? "D" : "C";
}

function getPayoff(aAction, bAction, payoffs) {
  if (aAction === "C" && bAction === "C") {
    return { A: payoffs.CC, B: payoffs.CC };
  }
  if (aAction === "C" && bAction === "D") {
    return { A: payoffs.CD, B: payoffs.DC };
  }
  if (aAction === "D" && bAction === "C") {
    return { A: payoffs.DC, B: payoffs.CD };
  }
  return { A: payoffs.DD, B: payoffs.DD };
}

function makeRandom(seed) {
  let x = seed % 2147483647;
  if (x <= 0) x += 2147483646;
  return function () {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
}

function updateMatchDisplay(tournament) {
  if (!tournament) {
    return;
  }
  const current = tournament.schedule[tournament.currentMatchIndex];
  const [playerA, playerB] = current.pair;
  ui.statusMatch.textContent = `${tournament.currentMatchIndex + 1} / ${tournament.totalMatches}`;
  ui.playerAName.textContent = playerA.name;
  ui.playerBName.textContent = playerB.name;
}

function updateRoundDisplay(playerA, playerB, result, round, currentMatch, totalMatches) {
  ui.statusRound.textContent = `${round}`;
  ui.statusMatch.textContent = `${currentMatch} / ${totalMatches}`;
  ui.playerAName.textContent = playerA.name;
  ui.playerBName.textContent = playerB.name;
  ui.playerAMove.textContent = result.aAction;
  ui.playerBMove.textContent = result.bAction;
  ui.playerAScore.textContent = `Score: ${playerA.strategy ? playerA.strategy.name : playerA.name} ${playerA.totalScore ? playerA.totalScore.toFixed(2) : "0.00"}`;
  ui.playerBScore.textContent = `Score: ${playerB.strategy ? playerB.strategy.name : playerB.name} ${playerB.totalScore ? playerB.totalScore.toFixed(2) : "0.00"}`;

  appendTimeline(`${playerA.name} played ${result.aAction}, ${playerB.name} played ${result.bAction}.`);
}

function updatePlayerScoreDisplay(playerA, playerB) {
  ui.playerAScore.textContent = `Score: ${playerA.totalScore.toFixed(2)}`;
  ui.playerBScore.textContent = `Score: ${playerB.totalScore.toFixed(2)}`;
}

function appendTimeline(text) {
  const entry = document.createElement("div");
  entry.className = "timeline-entry";
  entry.textContent = text;
  ui.timeline.prepend(entry);
  if (ui.timeline.children.length > 8) {
    ui.timeline.removeChild(ui.timeline.lastChild);
  }
  ui.timelineCaption.textContent = "Live round feed updated.";
}

function finalizeMatch(tournament, current) {
  const { playerA, playerB } = current.matchState;
  const scoreA = playerA.score;
  const scoreB = playerB.score;
  current.pair[0].totalScore += scoreA;
  current.pair[1].totalScore += scoreB;
  current.pair[0].matchesPlayed += 1;
  current.pair[1].matchesPlayed += 1;
  current.pair[0].averageScore = current.pair[0].totalScore / Math.max(1, current.pair[0].matchesPlayed);
  current.pair[1].averageScore = current.pair[1].totalScore / Math.max(1, current.pair[1].matchesPlayed);

  tournament.chartData.push({
    label: `${current.pair[0].name} vs ${current.pair[1].name}`,
    values: [current.pair[0].averageScore, current.pair[1].averageScore],
  });

  drawChart(tournament.players.map((player) => player.averageScore));
}

function recordRoundHistory(tournament, matchName, round, result, playerA, playerB) {
  tournament.history.push({
    match: matchName,
    round,
    playerA: playerA.name,
    playerB: playerB.name,
    actionA: result.aAction,
    actionB: result.bAction,
    scoreA: result.payoff.A,
    scoreB: result.payoff.B,
  });
}

function finishTournament() {
  appState.running = false;
  appState.paused = false;
  if (appState.timer) {
    clearTimeout(appState.timer);
    appState.timer = null;
  }
  ui.startButton.disabled = false;
  ui.pauseButton.disabled = true;
  ui.pauseButton.textContent = "Pause";
  ui.statusMode.textContent = "Complete";
  ui.summaryText.textContent = "Tournament complete. Review the leaderboard and adjust parameters to run again.";
}

function updateLeaderboard(players) {
  const sorted = [...players].sort((a, b) => b.averageScore - a.averageScore);
  renderLeaderboard(sorted);
}

function renderLeaderboard(players) {
  ui.leaderboard.innerHTML = "";
  players.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.innerHTML = `
      <div class="leaderboard-rank">${index + 1}</div>
      <div>
        <strong>${player.name}</strong>
        <div class="leaderboard-meta">Avg score ${player.averageScore.toFixed(2)} over ${player.matchesPlayed} match${player.matchesPlayed === 1 ? "" : "es"}</div>
      </div>
    `;
    ui.leaderboard.appendChild(row);
  });
}

function drawChart(values) {
  const canvas = ui.chart;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  if (!values.length) {
    ctx.fillStyle = "#7b7b7b";
    ctx.font = "16px Arial";
    ctx.fillText("No leaderboard data yet.", 20, height / 2);
    return;
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const left = 40;
  const bottom = height - 30;
  const plotWidth = width - left - 20;
  const plotHeight = height - 50;

  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(left, 10);
  ctx.lineTo(left, bottom);
  ctx.lineTo(width - 10, bottom);
  ctx.stroke();

  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  values.forEach((value, idx) => {
    const x = left + (plotWidth * idx) / Math.max(values.length - 1, 1);
    const y = bottom - ((value - min) / Math.max(max - min, 1)) * plotHeight;
    if (idx === 0) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.stroke();
}