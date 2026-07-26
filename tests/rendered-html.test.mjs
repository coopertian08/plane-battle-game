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
  const [css, page, layout, packageJson, exportScript, pagesWorkflow, sprites, weaponSprites, terrainTile, airportRunway] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/export-github-pages.mjs", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../public/aircraft-sprites.png", import.meta.url)),
    readFile(new URL("../public/weapon-sprites.png", import.meta.url)),
    readFile(new URL("../public/terrain-tile.png", import.meta.url)),
    readFile(new URL("../public/airport-runway.png", import.meta.url)),
  ]);

  assert.match(page, /VIEW_WIDTH = 1280/);
  assert.match(page, /VIEW_HEIGHT = 800/);
  assert.ok(sprites.length > 100_000);
  assert.ok(weaponSprites.length > 50_000);
  assert.ok(terrainTile.length > 100_000);
  assert.ok(airportRunway.length > 100_000);
  assert.match(page, /function publicAssetUrl/);
  assert.match(page, /AIRCRAFT_SPRITES_URL = publicAssetUrl\("aircraft-sprites\.png"\)/);
  assert.match(page, /WEAPON_SPRITES_URL = publicAssetUrl\("weapon-sprites\.png"\)/);
  assert.match(page, /TERRAIN_TILE_URL = publicAssetUrl\("terrain-tile\.png"\)/);
  assert.match(page, /AIRPORT_RUNWAY_URL = publicAssetUrl\("airport-runway\.png"\)/);
  assert.match(page, /CHINA_PLANE_IDS = \["j8", "j10", "j15", "j20", "j35"\]/);
  assert.match(page, /USA_PLANE_IDS = \["f16", "f18", "f15", "f22", "f35"\]/);
  assert.match(page, /type SpriteKey = PlaneId \| "tanker"/);
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
  assert.match(page, /SPRITE_COLUMNS = 5/);
  assert.match(page, /SPRITE_ROWS = 3/);
  assert.match(page, /type PlaneId = \(typeof PLANE_IDS\)\[number\]/);
  assert.match(page, /type PlaneFaction = "china" \| "usa"/);
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
  assert.match(page, /label:\s*"歼-35A"/);
  assert.match(page, /label:\s*"F-16C"/);
  assert.match(page, /label:\s*"F\/A-18E"/);
  assert.match(page, /label:\s*"F-15EX"/);
  assert.match(page, /label:\s*"F-22A"/);
  assert.match(page, /label:\s*"F-35A"/);
  assert.match(page, /role:\s*"隐身空优"/);
  assert.match(page, /faction:\s*"china"/);
  assert.match(page, /faction:\s*"usa"/);
  assert.match(page, /getOpponentFaction/);
  assert.match(page, /getEnemyVariantForKind/);
  assert.match(page, /gunName:\s*"Type 23-III"/);
  assert.match(page, /gunName:\s*"GSh-23 \/ Type 23-3"/);
  assert.match(page, /gunName:\s*"GSh-30-1"/);
  assert.match(page, /gunName:\s*"M61A1 Vulcan"/);
  assert.match(page, /gunName:\s*"M61A2 Vulcan"/);
  assert.match(page, /gunName:\s*"GAU-22\/A"/);
  assert.match(page, /gunBarrels:\s*2/);
  assert.match(page, /gunBarrels:\s*1/);
  assert.match(page, /gunMount:\s*"leftIntake"/);
  assert.match(page, /gunMount:\s*"rightRoot"/);
  assert.match(page, /unlockCost:\s*760/);
  assert.match(page, /unlockCost:\s*1580/);
  assert.match(page, /unlockCost:\s*2800/);
  assert.match(page, /unlockCost:\s*3800/);
  assert.match(page, /unlockCost:\s*3650/);
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
  assert.match(page, /drawTakeoffAirfield/);
  assert.match(page, /drawCloudCluster/);
  assert.match(page, /TAKEOFF_RUNWAY_WORLD_WIDTH = 4600/);
  assert.match(page, /drawMirroredTerrainTile/);
  assert.match(page, /drawTerrainHaze/);
  assert.match(page, /isOddTile/);
  assert.match(page, /seededNoise/);
  assert.match(page, /screenPoint/);
  assert.match(page, /terrain\.naturalWidth/);
  assert.match(page, /airportRef/);
  assert.match(page, /radarBlips/);
  assert.match(page, /\.filter\(\(enemy\) => !isStealthEnemy\(enemy\)\)/);
  assert.match(page, /function isStealthEnemy/);
  assert.match(page, /radarRange/);
  assert.match(page, /function getPlaneTier\(planeId: PlaneId\)/);
  assert.match(page, /function getRadarRange\(planeId: PlaneId\)/);
  assert.match(page, /1750 \+ getPlaneTier\(planeId\) \* 420/);
  assert.match(page, /distance\(player, aircraft\) <= radarRange/);
  assert.doesNotMatch(page, /const limit = dist > 44 \? 44 \/ dist : 1/);
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
  assert.match(page, /getTakeoffFormationPoint/);
  assert.match(page, /positionWingmenForTakeoff/);
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
  assert.match(page, /return localToWorld\(aircraft, localX, localY \* \(1 - cobraPitch \* 0\.12\)\)/);
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
  assert.match(page, /const wingmen = mode === "stage" \? getStageWingmen\(stage\) : 2/);
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
  assert.match(page, /type GamePhase = "menu" \| "hangar" \| "takeoff"/);
  assert.match(page, /updateTakeoff/);
  assert.match(page, /state\.phase = "takeoff"/);
  assert.match(page, /state\.phase = "running"/);
  assert.match(page, /getVisualLaunchAngle/);
  assert.doesNotMatch(page, /drawAircraftRollDepth/);
  assert.match(page, /ctx\.scale\(1 - Math\.abs\(bank\) \* 0\.055/);
  assert.match(page, /const noseY = -size \* 0\.43/);
  assert.match(page, /const origin = localToWorld\(aircraft, port\.x, port\.y\)/);
  assert.match(page, /const launchAngle = normalizeAngle\(aircraft\.angle \+ port\.angle\)/);
  assert.match(page, /const muzzleOffset = owner === "enemy" \? 1\.8 : 2/);
  assert.match(page, /drawCannonTracer/);
  assert.match(page, /tracerLength = bullet\.owner === "enemy" \? 11 : 12\.5/);
  assert.match(page, /rgba\(239, 68, 68, 0\.34\)/);
  assert.match(page, /rgba\(248, 113, 113, 0\.95\)/);
  assert.match(page, /updateAircraftCollisions/);
  assert.match(page, /collisionCooldown/);
  assert.match(page, /function getEnemySeparation/);
  assert.match(page, /a\.side === "enemy" && b\.side === "enemy"/);
  assert.match(page, /trailPoint/);
  assert.match(page, /readPlaneUpgrades/);
  assert.match(page, /savePlaneUpgrades/);
  assert.match(page, /readUnlockedPlanes/);
  assert.match(page, /saveUnlockedPlanes/);
  assert.match(page, /unlockPlane/);
  assert.match(page, /hangarGroups/);
  assert.match(page, /中国战斗机/);
  assert.match(page, /美国战斗机/);
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
  assert.match(css, /conic-gradient\(\s*from -2deg/);
  assert.match(css, /radar-sweep::before/);
  assert.match(css, /linear-gradient\(90deg, rgba\(187, 247, 208, 0\.95\)/);
  assert.match(css, /radar-blip\.enemy/);
  assert.match(css, /fuel-meter/);
  assert.match(css, /joystick-zone/);
  assert.match(css, /plane-preview/);
  assert.match(css, /url\("\.\.\/aircraft-sprites\.png"\)/);
  assert.match(css, /background-size:\s*500% 300%/);
  assert.match(css, /plane-j8/);
  assert.match(css, /plane-j10/);
  assert.match(css, /plane-j15/);
  assert.match(css, /plane-j20/);
  assert.match(css, /plane-j35/);
  assert.match(css, /plane-f16/);
  assert.match(css, /plane-f18/);
  assert.match(css, /plane-f15/);
  assert.match(css, /plane-f22/);
  assert.match(css, /plane-f35/);
  assert.match(css, /plane-list/);
  assert.match(css, /plane-grid/);
  assert.match(css, /faction-section/);
  assert.match(css, /upgrade-list/);
  assert.match(css, /plane-card\.locked/);
  assert.match(packageJson, /"export:github-pages": "node scripts\/export-github-pages\.mjs"/);
  assert.match(exportScript, /dist", "github-pages"/);
  assert.match(exportScript, /GITHUB_REPOSITORY/);
  assert.match(exportScript, /prefixRootAssetPaths/);
  assert.match(exportScript, /writeFile\(resolve\(outDir, "index\.html"\)/);
  assert.match(pagesWorkflow, /Deploy GitHub Pages/);
  assert.match(pagesWorkflow, /enablement:\s*true/);
  assert.match(pagesWorkflow, /actions\/deploy-pages@v4/);
  assert.doesNotMatch(page + layout + css, /SkeletonPreview|codex-preview|Building your site/);
});
