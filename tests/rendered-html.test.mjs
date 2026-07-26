import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the plane battle game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>飞机大战<\/title>/i);
  assert.match(html, /<canvas/i);
  assert.match(html, /飞机大战/);
  assert.match(html, /关卡出击/);
  assert.match(html, /无尽模式/);
  assert.match(html, /进入机库/);
  assert.match(html, /当前战机/);
  assert.match(html, /血量/);
  assert.match(html, /燃油/);
  assert.match(html, /歼-8II/);
  assert.match(html, /plane-preview/);
  assert.doesNotMatch(html, /cockpit-panel/);
  assert.doesNotMatch(html, /生命/);
  assert.doesNotMatch(html, /爆弹/);
  assert.doesNotMatch(html, /Codex/);
  assert.doesNotMatch(html, /react-loading-skeleton|codex-preview|Building your site/);
});

test("keeps the finished game free of starter preview code", async () => {
  const [css, page, layout, sprites, weaponSprites, terrainTile] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/aircraft-sprites.png", import.meta.url)),
    readFile(new URL("../public/weapon-sprites.png", import.meta.url)),
    readFile(new URL("../public/terrain-tile.png", import.meta.url)),
  ]);

  assert.match(page, /VIEW_WIDTH = 1280/);
  assert.match(page, /VIEW_HEIGHT = 800/);
  assert.ok(sprites.length > 100_000);
  assert.ok(weaponSprites.length > 50_000);
  assert.ok(terrainTile.length > 100_000);
  assert.match(page, /AIRCRAFT_SPRITES_URL = "\/aircraft-sprites\.png"/);
  assert.match(page, /WEAPON_SPRITES_URL = "\/weapon-sprites\.png"/);
  assert.match(page, /TERRAIN_TILE_URL = "\/terrain-tile\.png"/);
  assert.match(page, /type SpriteKey = PlaneId \| "enemy" \| "enemyHeavy" \| "tanker"/);
  assert.match(page, /type WeaponSpriteKey/);
  assert.match(page, /spriteSlots/);
  assert.match(page, /weaponSpriteSlots/);
  assert.match(page, /drawAircraftSprite/);
  assert.match(page, /drawWeaponSprite/);
  assert.match(page, /drawEngineFlame/);
  assert.match(page, /getAircraftDrawSize/);
  assert.match(page, /spritesRef/);
  assert.match(page, /weaponSpritesRef/);
  assert.match(page, /terrainRef/);
  assert.match(page, /joystick-zone/);
  assert.match(page, /SPRITE_COLUMNS = 4/);
  assert.match(page, /type PlaneId = "j8" \| "j10" \| "j15" \| "j20"/);
  assert.match(page, /type GameMode = "endless" \| "stage"/);
  assert.match(page, /type UpgradeKey = "firepower" \| "missiles" \| "armor" \| "fuelTank" \| "engine" \| "speed" \| "tanker"/);
  assert.match(page, /type EnemyKind = "scout" \| "fighter" \| "heavy" \| "stealth" \| "tank" \| "boss"/);
  assert.match(page, /type PlaneUpgradeState/);
  assert.match(page, /CAMPAIGN_STAGE_KEY/);
  assert.match(page, /UNLOCKED_PLANES_KEY/);
  assert.match(page, /planeCatalog/);
  assert.match(page, /label:\s*"歼-8II"/);
  assert.match(page, /label:\s*"歼-10C"/);
  assert.match(page, /label:\s*"歼-15T"/);
  assert.match(page, /label:\s*"歼-20"/);
  assert.match(page, /role:\s*"隐身空优"/);
  assert.match(page, /gunName:\s*"Type 23-III"/);
  assert.match(page, /gunName:\s*"GSh-23 \/ Type 23-3"/);
  assert.match(page, /gunName:\s*"GSh-30-1"/);
  assert.match(page, /gunBarrels:\s*2/);
  assert.match(page, /gunBarrels:\s*1/);
  assert.match(page, /gunMount:\s*"leftIntake"/);
  assert.match(page, /gunMount:\s*"rightRoot"/);
  assert.match(page, /unlockCost:\s*760/);
  assert.match(page, /unlockCost:\s*1580/);
  assert.match(page, /unlockCost:\s*2800/);
  assert.match(page, /getMaxHp/);
  assert.match(page, /getMaxFuel/);
  assert.match(page, /getSpeedStats/);
  assert.match(page, /key:\s*"missiles"/);
  assert.match(page, /label:\s*"导弹挂架"/);
  assert.match(page, /key:\s*"speed"/);
  assert.match(page, /label:\s*"速度强化"/);
  assert.match(page, /type WeaponSpriteSlot/);
  assert.match(page, /crop:\s*\[204, 227, 59, 166\]/);
  assert.match(page, /getGunPorts/);
  assert.match(page, /getMissileRackPort/);
  assert.match(page, /chooseMissileTarget/);
  assert.match(page, /offBoresight < 1\.85/);
  assert.match(page, /fireMissile/);
  assert.match(page, /missileAmmo:\s*4 \+ upgrades\.missiles \* 2/);
  assert.match(page, /kind:\s*"missile"/);
  assert.match(page, /targetId/);
  assert.match(page, /trackingTime/);
  assert.match(page, /missileTimer/);
  assert.match(page, /blastRadius/);
  assert.match(page, /turnRate:\s*3\.8/);
  assert.match(page, /missileSeeker/);
  assert.match(page, /delete bullet\.targetId/);
  assert.match(page, /boostLock = clamp/);
  assert.match(page, /detonateMissile/);
  assert.match(page, /fireEnemyMissile/);
  assert.match(page, /getEnemyMissileTarget/);
  assert.match(page, /requestRefuel/);
  assert.match(page, /tankerCallsLeft/);
  assert.match(page, /departing\?: boolean/);
  assert.match(page, /exitAngle\?: number/);
  assert.match(page, /tanker\.departing = true/);
  assert.match(page, /tanker\.speed \+= \(520 - tanker\.speed\)/);
  assert.match(page, /加油机/);
  assert.match(page, /startCobra/);
  assert.match(page, /cobraTimer/);
  assert.match(page, /眼镜蛇机动/);
  assert.match(page, /overheated/);
  assert.match(page, /engineStatus/);
  assert.match(page, /燃油低/);
  assert.match(page, /readInput/);
  assert.match(page, /keys\.has\("w"\)/);
  assert.match(page, /keys\.has\("s"\)/);
  assert.match(page, /keys\.has\("a"\)/);
  assert.match(page, /keys\.has\("d"\)/);
  assert.match(page, /joystickRef\.current/);
  assert.match(page, /throttle/);
  assert.match(page, /turn/);
  assert.match(page, /drawSky/);
  assert.match(page, /seededNoise/);
  assert.match(page, /screenPoint/);
  assert.match(page, /terrain\.naturalWidth/);
  assert.match(page, /radarBlips/);
  assert.match(page, /\.filter\(\(enemy\) => !isStealthEnemy\(enemy\)\)/);
  assert.match(page, /function isStealthEnemy/);
  assert.match(page, /radarRange/);
  assert.match(page, /chooseEnemyTarget/);
  assert.match(page, /chooseNearestEnemy/);
  assert.match(page, /updateEnemies/);
  assert.match(page, /spawnWarmup\?: number/);
  assert.match(page, /burstRemaining\?: number/);
  assert.match(page, /burstTimer\?: number/);
  assert.match(page, /getEnemyBurstProfile/);
  assert.match(page, /startEnemyBurst/);
  assert.match(page, /updateEnemyBurst/);
  assert.match(page, /enemy\.spawnWarmup = randomBetween\(1\.15, 1\.9\)/);
  assert.match(page, /const warmingUp = \(enemy\.spawnWarmup \?\? 0\) > 0/);
  assert.match(page, /updateAllies/);
  assert.match(page, /fireGuns/);
  assert.match(page, /type Wreck/);
  assert.match(page, /wrecks/);
  assert.match(page, /drawWreckAt/);
  assert.match(page, /bank/);
  assert.match(page, /tooClose/);
  assert.match(page, /playerDying/);
  assert.match(page, /stageClear/);
  assert.match(page, /showBattleUi/);
  assert.match(page, /drawEngineFlamesAt/);
  assert.match(page, /localToVisualWorld/);
  assert.match(page, /const base = localToVisualWorld\(aircraft, port\.x, port\.y\)/);
  assert.match(page, /const forward = direction\(aircraft\.angle\)/);
  assert.match(page, /const back = \{ x: -forward\.x, y: -forward\.y \}/);
  assert.match(page, /createLinearGradient\(baseScreen\.x, baseScreen\.y, tipScreen\.x, tipScreen\.y\)/);
  assert.match(page, /upgradePressure/);
  assert.match(page, /doubleBossPenalty/);
  assert.match(page, /getStageReward/);
  assert.match(page, /normalizeStageNumber/);
  assert.match(page, /getStageTarget/);
  assert.match(page, /getStageBossCount/);
  assert.match(page, /getStageWingmen/);
  assert.match(page, /stage % 10 === 0/);
  assert.match(page, /stage % 5 === 0/);
  assert.match(page, /150 \+ Math\.max\(0, stage - 1\) \* 50/);
  assert.match(page, /stageKills/);
  assert.match(page, /stageBossesRequired/);
  assert.match(page, /spawnRegularEnemy/);
  assert.match(page, /\? "stealth"/);
  assert.match(page, /\? "heavy"/);
  assert.match(page, /spawnBossEnemy/);
  assert.match(page, /startStageGame/);
  assert.match(page, /safeStage/);
  assert.match(page, /关卡状态已重置/);
  assert.match(page, /startEndlessGame/);
  assert.match(page, /startNextStage/);
  assert.match(page, /saveCampaignStage/);
  assert.match(page, /bossHp/);
  assert.match(page, /bossMaxHp/);
  assert.match(page, /tracerWidth = bullet\.owner === "enemy" \? 8 : 9/);
  assert.match(page, /tracerHeight = bullet\.owner === "enemy" \? 36 : 40/);
  assert.match(page, /readPlaneUpgrades/);
  assert.match(page, /savePlaneUpgrades/);
  assert.match(page, /readUnlockedPlanes/);
  assert.match(page, /saveUnlockedPlanes/);
  assert.match(page, /unlockPlane/);
  assert.doesNotMatch(page, /<aside/);
  assert.doesNotMatch(page, /cockpit-panel/);
  assert.doesNotMatch(page, /ctx\.arc\(bullet/);
  assert.doesNotMatch(page, /dropBomb/);
  assert.doesNotMatch(page, /getCannonPorts/);
  assert.doesNotMatch(page, /"cannons"/);
  assert.doesNotMatch(page, /爆弹/);
  assert.doesNotMatch(page, /lives/);
  assert.doesNotMatch(page, /arrowleft|arrowright|arrowup|arrowdown/);
  assert.match(layout, /title:\s*"飞机大战"/);
  assert.match(css, /mobile-controls/);
  assert.match(css, /battle-hp/);
  assert.match(css, /boss-hp/);
  assert.match(css, /mode-actions/);
  assert.match(css, /pointer:\s*coarse/);
  assert.match(css, /place-items:\s*center/);
  assert.match(css, /engine-panel/);
  assert.match(css, /radar-panel/);
  assert.match(css, /radar-scope/);
  assert.match(css, /radar-sweep/);
  assert.match(css, /radar-blip\.enemy/);
  assert.match(css, /fuel-meter/);
  assert.match(css, /joystick-zone/);
  assert.match(css, /plane-preview/);
  assert.match(css, /url\("\/aircraft-sprites\.png"\)/);
  assert.match(css, /background-size:\s*400% 200%/);
  assert.match(css, /plane-j8/);
  assert.match(css, /plane-j10/);
  assert.match(css, /plane-j15/);
  assert.match(css, /plane-j20/);
  assert.match(css, /plane-list/);
  assert.match(css, /upgrade-list/);
  assert.match(css, /plane-card\.locked/);
  assert.doesNotMatch(page + layout + css, /SkeletonPreview|codex-preview|Building your site/);
});
