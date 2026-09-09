import {
  getGameState,
  startWheelRound,
  spinWheel,
  confirmWheelSpin,
  stayWheel,
  spinAgainWheel,
  nextWheelTurn,
  endWheelRound,
  parseWheelState,
  WHEEL_SECTIONS,
  wheelTravelForVelocity,
  wheelSectionAtRotation,
  type WheelState,
} from "../src/services/gameService";
import { supabase } from "../src/integrations/supabase/client";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ok: " + msg);
}

// Velocity (px/ms) that lands the wheel on `target` cents from the current
// rotation. Adds two extra revolutions so travel stays inside the clamp range.
function velocityFor(target: number, baseRotation: number): number {
  const idx = WHEEL_SECTIONS.indexOf(target);
  if (idx === -1) throw new Error("bad target: " + target);
  const needed = (((-idx * 18 - baseRotation) % 360) + 360) % 360;
  const travel = needed + 720;
  const v = travel / 320;
  if (Math.abs(wheelTravelForVelocity(v) - travel) > 0.01) {
    throw new Error(`travel ${travel} got clamped to ${wheelTravelForVelocity(v)}`);
  }
  const landed = WHEEL_SECTIONS[wheelSectionAtRotation(baseRotation + travel)];
  if (landed !== target) {
    throw new Error(`velocityFor computed a spin that lands on ${landed}, not ${target}`);
  }
  return v;
}

async function phaseIs(p: string): Promise<WheelState> {
  const gs = await getGameState();
  const w = parseWheelState(gs?.wheel_state);
  assert(gs?.game_stage === "wheel" && w?.phase === p, `phase is ${p}`);
  return w as WheelState;
}

async function spinTo(target: number) {
  const gs = await getGameState();
  const w = parseWheelState(gs?.wheel_state);
  if (!w) throw new Error("no wheel state before spin");
  const spin = await spinWheel(velocityFor(target, w.baseRotation));
  if (!spin) throw new Error("spinWheel failed for " + target);
  assert(await confirmWheelSpin(), `spin to ${target}c confirmed`);
}

async function scores(): Promise<number[]> {
  const gs = await getGameState();
  return [gs?.team_1_score ?? 0, gs?.team_2_score ?? 0, gs?.team_3_score ?? 0];
}

async function run() {
  const before = await getGameState();
  const startScores = [before?.team_1_score ?? 0, before?.team_2_score ?? 0, before?.team_3_score ?? 0];
  console.log(`start: stage=${before?.game_stage} scores=${startScores.join("/")}`);

  // ===== Scenario A: stay / bust / solo $1.00 (+3 dollar, +3 round win) =====
  console.log("\nA1. start wheel round");
  assert(await startWheelRound(), "round started");
  let w = await phaseIs("spin");
  assert(w.turn === 1 && w.teams.every((t) => t.status === "waiting"), "turn 1, all teams waiting");

  console.log("A2. team 1 spins 65c and stays");
  await spinTo(65);
  w = await phaseIs("choose");
  assert(w.teams[0].total === 65 && w.teams[0].status === "spun", "team 1 at 65c, choosing");
  assert(await stayWheel(), "stayed");
  w = await phaseIs("turn_end");
  assert(w.teams[0].status === "done" && w.teams[0].total === 65, "team 1 done at 65c");

  console.log("A3. team 2 spins 45c then 75c -> bust");
  assert(await nextWheelTurn(), "advance to team 2");
  w = await phaseIs("spin");
  assert(w.turn === 2, "turn 2");
  await spinTo(45);
  await phaseIs("choose");
  assert(await spinAgainWheel(), "chose spin again");
  await spinTo(75);
  w = await phaseIs("turn_end");
  assert(w.teams[1].total === 120 && w.teams[1].status === "bust", "team 2 busted at $1.20");

  console.log("A4. team 3 spins 55c then 45c -> exactly $1.00, +3 banked");
  assert(await nextWheelTurn(), "advance to team 3");
  await phaseIs("spin");
  await spinTo(55);
  await phaseIs("choose");
  assert(await spinAgainWheel(), "chose spin again");
  await spinTo(45);
  w = await phaseIs("turn_end");
  assert(w.teams[2].status === "dollar" && w.dollarTeams.includes(3), "team 3 hit $1.00");
  const midA = await scores();
  assert(midA[2] === startScores[2] + 3, "team 3 banked +3 immediately");

  console.log("A5. bonus spin lands $1.00 ($25,000 gag)");
  assert(await nextWheelTurn(), "advance to bonus");
  w = await phaseIs("bonus");
  assert(w.bonusActiveTeam === 3 && w.bonusSpin === null, "bonus pending for team 3");
  const bs = await spinWheel(velocityFor(100, w.baseRotation));
  assert(bs !== null, "bonus swipe accepted");
  await phaseIs("bonus_spinning");
  assert(await confirmWheelSpin(), "bonus confirmed");
  w = await phaseIs("bonus_done");
  assert(w.bonusSpin?.value === 100 && w.bonusGiven.includes(3), "bonus landed $1.00 and was recorded");

  console.log("A6. resolve: solo $1.00 leads outright -> round win +3 stacks");
  assert(await nextWheelTurn(), "resolve round");
  let gs = await getGameState();
  w = parseWheelState(gs?.wheel_state) as WheelState;
  assert(gs?.game_stage === "wheel_complete", "stage is wheel_complete");
  assert(JSON.stringify(w.winners) === JSON.stringify([3]), "winners: team 3 only");
  const afterA = await scores();
  assert(afterA[2] === startScores[2] + 6, "team 3 +3 for the dollar and +3 for the win");
  assert(afterA[0] === startScores[0] && afterA[1] === startScores[1], "teams 1/2 unchanged");

  console.log("A7. end wheel round");
  assert(await endWheelRound(), "ended");
  gs = await getGameState();
  assert(gs?.game_stage === "waiting" && gs?.wheel_state === null, "waiting, wheel state cleared");

  // ===== Scenario B: tie for the lead -> spin-off =====
  console.log("\nB1. 50c / 50c / 30c stays -> spin-off between teams 1 and 2");
  assert(await startWheelRound(), "started");
  await spinTo(50);
  await phaseIs("choose");
  assert(await stayWheel(), "team 1 stays");
  await nextWheelTurn();
  await phaseIs("spin");
  await spinTo(50);
  await phaseIs("choose");
  assert(await stayWheel(), "team 2 stays");
  await nextWheelTurn();
  await phaseIs("spin");
  await spinTo(30);
  await phaseIs("choose");
  assert(await stayWheel(), "team 3 stays");
  await nextWheelTurn();
  w = await phaseIs("spinoff");
  assert(JSON.stringify(w.spinoff?.order) === JSON.stringify([1, 2]), "spin-off order: teams 1,2");

  console.log("B2. spin-off spins: 20c vs 60c -> team 2 wins +3");
  await spinTo(20);
  w = await phaseIs("spinoff");
  assert(w.spinoff?.idx === 1 && w.spinoff.spins.length === 1, "team 1 spun, idx at 1");
  await spinTo(60);
  w = await phaseIs("turn_end");
  assert(w.spinoff !== null && w.spinoff.idx >= w.spinoff.order.length, "spin-off complete");
  assert(await nextWheelTurn(), "crown the winner");
  gs = await getGameState();
  w = parseWheelState(gs?.wheel_state) as WheelState;
  assert(gs?.game_stage === "wheel_complete" && JSON.stringify(w.winners) === JSON.stringify([2]), "team 2 wins the spin-off");
  const afterB = await scores();
  assert(afterB[1] === afterA[1] + 3, "team 2 +3 for the round win");
  assert(await endWheelRound(), "ended");

  // ===== Scenario C: everyone busts -> last spinner wins by default =====
  console.log("\nC1. all three teams bust -> team 3 wins by default");
  assert(await startWheelRound(), "started");
  await spinTo(65);
  await phaseIs("choose");
  assert(await spinAgainWheel(), "again");
  await spinTo(45);
  await phaseIs("turn_end");
  await nextWheelTurn();
  await spinTo(60);
  await phaseIs("choose");
  assert(await spinAgainWheel(), "again");
  await spinTo(50);
  await phaseIs("turn_end");
  await nextWheelTurn();
  await spinTo(55);
  await phaseIs("choose");
  assert(await spinAgainWheel(), "again");
  await spinTo(50);
  w = await phaseIs("turn_end");
  assert(w.teams.every((t) => t.status === "bust"), "all three busted");
  assert(await nextWheelTurn(), "resolve");
  gs = await getGameState();
  w = parseWheelState(gs?.wheel_state) as WheelState;
  assert(gs?.game_stage === "wheel_complete" && JSON.stringify(w.winners) === JSON.stringify([3]), "default win: team 3");
  const afterC = await scores();
  assert(afterC[2] === afterB[2] + 3, "team 3 +3 default win");
  assert(await endWheelRound(), "ended");

  // ===== Scenario D: two $1.00s -> no auto win, spin-off for the round's 3 =====
  console.log("\nD1. team 1 hits $1.00 (55c + 45c)");
  assert(await startWheelRound(), "started");
  await spinTo(55);
  await phaseIs("choose");
  assert(await spinAgainWheel(), "again");
  await spinTo(45);
  w = await phaseIs("turn_end");
  assert(w.teams[0].status === "dollar", "team 1 hit $1.00");
  const dStart = await scores();
  assert(dStart[0] === afterC[0] + 3, "team 1 banked +3");

  console.log("D2. team 1 bonus spin (15c), then team 2's turn");
  assert(await nextWheelTurn(), "advance to bonus");
  w = await phaseIs("bonus");
  assert(w.bonusActiveTeam === 1, "bonus for team 1");
  await spinTo(15);
  w = await phaseIs("bonus_done");
  assert(w.bonusSpin?.value === 15, "team 1 bonus landed 15c");
  assert(await nextWheelTurn(), "advance to team 2");
  await phaseIs("spin");

  console.log("D3. team 2 spins 50c + 50c -> also $1.00");
  await spinTo(50);
  await phaseIs("choose");
  assert(await spinAgainWheel(), "again");
  await spinTo(50);
  w = await phaseIs("turn_end");
  assert(w.teams[1].status === "dollar" && JSON.stringify(w.dollarTeams) === JSON.stringify([1, 2]), "both teams dollar");
  const dMid = await scores();
  assert(dMid[1] === dStart[1] + 3, "team 2 banked +3");

  console.log("D4. team 2 bonus spin (5c), then team 3 busts");
  assert(await nextWheelTurn(), "advance to bonus");
  w = await phaseIs("bonus");
  assert(w.bonusActiveTeam === 2, "bonus for team 2");
  await spinTo(5);
  w = await phaseIs("bonus_done");
  assert(w.bonusSpin?.value === 5, "team 2 bonus landed 5c");
  assert(await nextWheelTurn(), "advance to team 3");
  await phaseIs("spin");
  await spinTo(65);
  await phaseIs("choose");
  assert(await spinAgainWheel(), "again");
  await spinTo(45);
  await phaseIs("turn_end");

  console.log("D5. resolve -> spin-off between the two $1.00 teams");
  assert(await nextWheelTurn(), "resolve");
  w = await phaseIs("spinoff");
  assert(JSON.stringify(w.spinoff?.order) === JSON.stringify([1, 2]), "spin-off: both dollar teams");

  console.log("D6. spin-off: team 1 30c vs team 2 70c -> team 2 takes the round +3");
  await spinTo(30);
  w = await phaseIs("spinoff");
  assert(w.spinoff?.idx === 1, "team 1 spun, idx at 1");
  await spinTo(70);
  w = await phaseIs("turn_end");
  assert(w.spinoff !== null && w.spinoff.idx >= w.spinoff.order.length, "spin-off complete");
  assert(await nextWheelTurn(), "crown the winner");
  gs = await getGameState();
  w = parseWheelState(gs?.wheel_state) as WheelState;
  assert(gs?.game_stage === "wheel_complete" && JSON.stringify(w.winners) === JSON.stringify([2]), "team 2 wins the spin-off");
  const afterD = await scores();
  assert(afterD[0] === dStart[0], "team 1 keeps only the dollar +3");
  assert(afterD[1] === dStart[1] + 6, "team 2 stacks dollar +3 and round win +3");
  assert(await endWheelRound(), "ended");

  // ===== Cleanup: put the scores back =====
  console.log(`\ncleanup: restoring scores to ${startScores.join("/")}`);
  const { error } = await supabase
    .from("game_state")
    .update({
      team_1_score: startScores[0],
      team_2_score: startScores[1],
      team_3_score: startScores[2],
      game_stage: before?.game_stage ?? "waiting",
    })
    .not("id", "is", null);
  assert(!error, "scores restored" + (error ? ` (error: ${error.message})` : ""));

  console.log("\nALL WHEEL TESTS PASSED");
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
