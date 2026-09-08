import {
  getGameState,
  startOneAwayRound,
  setOneAwayGuesses,
  revealOneAway,
  nextOneAwayTurn,
  endOneAwayRound,
  parseOneAwayState,
  type OneAwayState,
} from "../src/services/gameService";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ok: " + msg);
}

// Every fake digit must be exactly one off the actual digit, honoring 0/9/leading-zero rules
function validateFakePrice(actual: number, fake: string) {
  const a = String(Math.round(actual)).split("");
  assert(a.length === fake.length, `digit count matches (${fake.length})`);
  a.forEach((d, i) => {
    const n = parseInt(d, 10);
    const f = parseInt(fake[i], 10);
    if (n === 0) assert(f === 1, `digit ${i}: actual 0 -> fake must be 1 (got ${f})`);
    else if (n === 9) assert(f === 8, `digit ${i}: actual 9 -> fake must be 8 (got ${f})`);
    else assert(Math.abs(n - f) === 1, `digit ${i}: |${n} - ${f}| === 1`);
    if (i === 0) assert(f !== 0, "no leading zero in fake price");
  });
}

function correctDirections(prize: { actual_price: number; fake_price: string }): string[] {
  const a = String(Math.round(prize.actual_price)).split("");
  return a.map((d, i) => (parseInt(d, 10) > parseInt(prize.fake_price[i], 10) ? "H" : "L"));
}

async function run() {
  console.log("1. startOneAwayRound");
  const started = await startOneAwayRound();
  assert(started, "round started");
  let gs = await getGameState();
  assert(gs?.game_stage === "one_away", "stage is one_away");
  let oa = parseOneAwayState(gs?.one_away_state) as OneAwayState;
  assert(oa.turn === 1, "turn is 1");
  assert(oa.prizes.length === 3 && oa.prizes.every((p) => p !== null), "3 prizes assigned");
  const names = oa.prizes.map((p) => p!.name);
  assert(new Set(names).size === 3, "prizes are distinct");
  oa.prizes.forEach((p) => {
    console.log(`  prize: ${p!.name} — shown $${Number(p!.fake_price).toLocaleString()} / actual $${p!.actual_price.toLocaleString()}`);
    validateFakePrice(p!.actual_price, p!.fake_price);
  });

  console.log("2. team 1 perfect turn");
  const p1 = oa.prizes[0]!;
  const perfect = correctDirections(p1);
  console.log("  perfect calls: " + perfect.join(""));
  await setOneAwayGuesses(perfect);
  const r1 = await revealOneAway();
  assert(r1 !== null && r1.team === 1 && r1.correct === r1.total && r1.points === 3, "team 1 perfect -> +3");

  console.log("3. next turn (team 2)");
  assert(await nextOneAwayTurn(), "advanced");
  gs = await getGameState();
  oa = parseOneAwayState(gs?.one_away_state) as OneAwayState;
  assert(gs?.game_stage === "one_away" && oa.turn === 2, "stage one_away, turn 2");

  console.log("4. team 2 imperfect turn (one digit flipped)");
  const p2 = oa.prizes[1]!;
  const wrong = [...correctDirections(p2)];
  wrong[0] = wrong[0] === "H" ? "L" : "H";
  await setOneAwayGuesses(wrong);
  const r2 = await revealOneAway();
  assert(r2 !== null && r2.points === 0 && r2.correct === r2.total - 1, "team 2 one wrong -> 0 points");

  console.log("5. team 3 partial turn");
  assert(await nextOneAwayTurn(), "advanced");
  gs = await getGameState();
  oa = parseOneAwayState(gs?.one_away_state) as OneAwayState;
  assert(oa.turn === 3, "turn 3");
  const p3 = oa.prizes[2]!;
  const partial = correctDirections(p3).map((d, i) => (i < 2 ? (d === "H" ? "L" : "H") : d));
  await setOneAwayGuesses(partial);
  const r3 = await revealOneAway();
  assert(r3 !== null && r3.points === 0 && r3.correct === r3.total - 2, "team 3 two wrong -> 0 points");

  console.log("6. finish round");
  assert(await nextOneAwayTurn(), "finished");
  gs = await getGameState();
  assert(gs?.game_stage === "one_away_complete", "stage one_away_complete");
  oa = parseOneAwayState(gs?.one_away_state) as OneAwayState;
  assert(oa.results.length === 3, "3 results recorded");

  console.log("7. verify scores: only team 1 gained 3");
  const expected = { t1: 9 + 3, t2: 6, t3: 0 };
  assert(gs?.team_1_score === expected.t1, `team 1 score ${gs?.team_1_score} === ${expected.t1}`);
  assert(gs?.team_2_score === expected.t2, `team 2 score unchanged`);
  assert(gs?.team_3_score === expected.t3, `team 3 score unchanged`);

  console.log("8. endOneAwayRound");
  assert(await endOneAwayRound(), "ended");
  gs = await getGameState();
  assert(gs?.game_stage === "waiting" && gs?.one_away_state === null, "stage waiting, state cleared");

  console.log("\nALL ONE AWAY TESTS PASSED");
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
