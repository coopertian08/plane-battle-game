"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 800;
const AIRCRAFT_SPRITES_URL = "/aircraft-sprites.png";
const WEAPON_SPRITES_URL = "/weapon-sprites.png";
const TERRAIN_TILE_URL = "/terrain-tile.png";
const SPRITE_COLUMNS = 4;
const SPRITE_ROWS = 2;
const WEAPON_COLUMNS = 3;
const WEAPON_ROWS = 2;
const BEST_SCORE_KEY = "plane-battle-best-score";
const CREDITS_KEY = "plane-battle-credits";
const UPGRADES_KEY = "plane-battle-upgrades";
const PLANE_KEY = "plane-battle-selected-plane";
const UNLOCKED_PLANES_KEY = "plane-battle-unlocked-planes";
const CAMPAIGN_STAGE_KEY = "plane-battle-campaign-stage";

type GamePhase = "menu" | "hangar" | "running" | "paused" | "playerDying" | "over" | "stageClear";
type GameMode = "endless" | "stage";
type PlaneId = "j8" | "j10" | "j15" | "j20";
type UpgradeKey = "firepower" | "missiles" | "armor" | "fuelTank" | "engine" | "speed" | "tanker";
type EnemyKind = "scout" | "fighter" | "heavy" | "stealth" | "tank" | "boss";
type ProjectileOwner = "player" | "ally" | "enemy";
type SpriteKey = PlaneId | "enemy" | "enemyHeavy" | "tanker";
type WeaponSpriteKey = "playerTracer" | "enemyTracer" | "missile" | "heavyMissile" | "blast" | "smoke";

type UpgradeState = Record<UpgradeKey, number>;
type PlaneUpgradeState = Record<PlaneId, UpgradeState>;
type PlaneUnlockState = Record<PlaneId, boolean>;

type PlaneMeta = {
  id: PlaneId;
  label: string;
  role: string;
  gunName: string;
  gunCaliber: number;
  gunBarrels: 1 | 2;
  gunMount: "belly" | "leftIntake" | "rightRoot";
  unlockCost: number;
  baseHp: number;
  minSpeed: number;
  cruiseSpeed: number;
  maxSpeed: number;
  turnRate: number;
  fuel: number;
  damageBonus: number;
};

type UpgradeMeta = {
  key: UpgradeKey;
  label: string;
  description: string;
  baseCost: number;
  max: number;
};

type WeaponSpriteSlot = {
  col: number;
  row: number;
  crop?: [number, number, number, number];
};

type Vector = {
  x: number;
  y: number;
};

type Aircraft = {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  hp: number;
  maxHp: number;
  fireTimer: number;
  radius: number;
  kind: EnemyKind | PlaneId;
  side: "player" | "ally" | "enemy";
  heat?: number;
  fuel?: number;
  maxFuel?: number;
  overheated?: boolean;
  invulnerable?: number;
  cobraTimer?: number;
  cobraCooldown?: number;
  missileAmmo?: number;
  tankerCallsLeft?: number;
  tankerCallsMax?: number;
  wingSlot?: number;
  bank?: number;
  throttle?: number;
  spawnWarmup?: number;
  missileTimer?: number;
  burstRemaining?: number;
  burstTimer?: number;
};

type Projectile = {
  id: number;
  owner: ProjectileOwner;
  kind: "cannon" | "missile";
  x: number;
  y: number;
  vx: number;
  vy: number;
  power: number;
  life: number;
  length: number;
  targetId?: number;
  turnRate?: number;
  blastRadius?: number;
  age?: number;
  trackingTime?: number;
};

type Tanker = {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  life: number;
  refueling: boolean;
  departing?: boolean;
  exitAngle?: number;
};

type Explosion = {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
};

type Smoke = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
};

type Wreck = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  kind: EnemyKind | PlaneId;
  side: Aircraft["side"];
  radius: number;
  life: number;
  maxLife: number;
};

type Floater = {
  id: number;
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

type RadarBlip = {
  id: number;
  x: number;
  y: number;
  side: "ally" | "enemy";
  boss: boolean;
};

type GameState = {
  phase: GamePhase;
  mode: GameMode;
  stage: number;
  stageTarget: number;
  stageKills: number;
  stageBossesRequired: number;
  stageBossesSpawned: number;
  stageBossesDefeated: number;
  stageReward: number;
  player: Aircraft;
  allies: Aircraft[];
  enemies: Aircraft[];
  bullets: Projectile[];
  tankers: Tanker[];
  explosions: Explosion[];
  smokes: Smoke[];
  wrecks: Wreck[];
  floaters: Floater[];
  selectedPlane: PlaneId;
  upgrades: UpgradeState;
  score: number;
  bestScore: number;
  difficulty: number;
  nextBossScore: number;
  spawnTimer: number;
  earnedCredits: number;
  rewardClaimed: boolean;
  shake: number;
  time: number;
  nextId: number;
};

type HudState = {
  phase: GamePhase;
  mode: GameMode;
  score: number;
  bestScore: number;
  stage: number;
  stageKills: number;
  stageTarget: number;
  stageReward: number;
  hp: number;
  maxHp: number;
  speed: number;
  heat: number;
  fuel: number;
  maxFuel: number;
  engineStatus: string;
  tankerCallsLeft: number;
  tankerCallsMax: number;
  missileAmmo: number;
  bossHp: number;
  bossMaxHp: number;
  earnedCredits: number;
  allies: number;
  radarBlips: RadarBlip[];
};

type InputState = {
  throttle: number;
  turn: number;
};

const defaultUpgrades: UpgradeState = {
  firepower: 0,
  missiles: 0,
  armor: 0,
  fuelTank: 0,
  engine: 0,
  speed: 0,
  tanker: 0,
};

const defaultUnlockedPlanes: PlaneUnlockState = {
  j8: true,
  j10: false,
  j15: false,
  j20: false,
};

const initialHud: HudState = {
  phase: "menu",
  mode: "endless",
  score: 0,
  bestScore: 0,
  stage: 1,
  stageKills: 0,
  stageTarget: 0,
  stageReward: 150,
  hp: 200,
  maxHp: 200,
  speed: 0,
  heat: 0,
  fuel: 100,
  maxFuel: 100,
  engineStatus: "正常",
  tankerCallsLeft: 2,
  tankerCallsMax: 2,
  missileAmmo: 4,
  bossHp: 0,
  bossMaxHp: 0,
  earnedCredits: 0,
  allies: 0,
  radarBlips: [],
};

const planeCatalog: PlaneMeta[] = [
  {
    id: "j8",
    label: "歼-8II",
    role: "高速截击",
    gunName: "Type 23-III",
    gunCaliber: 23,
    gunBarrels: 2,
    gunMount: "belly",
    unlockCost: 0,
    baseHp: 190,
    minSpeed: 178,
    cruiseSpeed: 270,
    maxSpeed: 415,
    turnRate: 1.62,
    fuel: 235,
    damageBonus: 0,
  },
  {
    id: "j10",
    label: "歼-10C",
    role: "多用途空优",
    gunName: "GSh-23 / Type 23-3",
    gunCaliber: 23,
    gunBarrels: 2,
    gunMount: "leftIntake",
    unlockCost: 760,
    baseHp: 235,
    minSpeed: 170,
    cruiseSpeed: 282,
    maxSpeed: 452,
    turnRate: 2.02,
    fuel: 265,
    damageBonus: 0.16,
  },
  {
    id: "j15",
    label: "歼-15T",
    role: "重型舰载",
    gunName: "GSh-30-1",
    gunCaliber: 30,
    gunBarrels: 1,
    gunMount: "rightRoot",
    unlockCost: 1580,
    baseHp: 295,
    minSpeed: 166,
    cruiseSpeed: 268,
    maxSpeed: 426,
    turnRate: 1.74,
    fuel: 330,
    damageBonus: 0.3,
  },
  {
    id: "j20",
    label: "歼-20",
    role: "隐身空优",
    gunName: "内置航炮",
    gunCaliber: 25,
    gunBarrels: 1,
    gunMount: "belly",
    unlockCost: 2800,
    baseHp: 340,
    minSpeed: 190,
    cruiseSpeed: 315,
    maxSpeed: 510,
    turnRate: 2.08,
    fuel: 365,
    damageBonus: 0.44,
  },
];

const upgradeCatalog: UpgradeMeta[] = [
  {
    key: "firepower",
    label: "机炮火力",
    description: "提高机炮伤害。",
    baseCost: 180,
    max: 5,
  },
  {
    key: "missiles",
    label: "导弹挂架",
    description: "增加初始导弹携带量。",
    baseCost: 220,
    max: 4,
  },
  {
    key: "armor",
    label: "机体结构",
    description: "提高血量。",
    baseCost: 210,
    max: 4,
  },
  {
    key: "fuelTank",
    label: "副油箱",
    description: "提高燃油上限。",
    baseCost: 190,
    max: 5,
  },
  {
    key: "engine",
    label: "发动机冷却",
    description: "降温更快，极速更高。",
    baseCost: 240,
    max: 5,
  },
  {
    key: "speed",
    label: "速度强化",
    description: "提高巡航和极速，但油耗与升温都会增加。",
    baseCost: 270,
    max: 5,
  },
  {
    key: "tanker",
    label: "加油机支援",
    description: "增加呼叫加油机次数。",
    baseCost: 260,
    max: 4,
  },
];

const spriteSlots: Record<SpriteKey, { col: number; row: number }> = {
  j8: { col: 0, row: 0 },
  j10: { col: 1, row: 0 },
  j15: { col: 2, row: 0 },
  j20: { col: 3, row: 0 },
  enemy: { col: 0, row: 1 },
  enemyHeavy: { col: 1, row: 1 },
  tanker: { col: 2, row: 1 },
};

const weaponSpriteSlots: Record<WeaponSpriteKey, WeaponSpriteSlot> = {
  playerTracer: { col: 0, row: 0, crop: [204, 227, 59, 166] },
  enemyTracer: { col: 1, row: 0, crop: [177, 185, 63, 270] },
  missile: { col: 2, row: 0, crop: [124, 123, 97, 398] },
  heavyMissile: { col: 0, row: 1, crop: [147, 32, 173, 472] },
  blast: { col: 1, row: 1, crop: [95, 186, 213, 202] },
  smoke: { col: 2, row: 1, crop: [29, 136, 289, 290] },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function normalizeAngle(angle: number) {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

function angleTo(from: Aircraft | Vector, to: Aircraft | Vector) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function turnToward(current: number, target: number, maxTurn: number) {
  const delta = normalizeAngle(target - current);
  return normalizeAngle(current + clamp(delta, -maxTurn, maxTurn));
}

function distance(a: Vector, b: Vector) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function direction(angle: number) {
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

function getPlaneMeta(planeId: PlaneId) {
  return planeCatalog.find((plane) => plane.id === planeId) ?? planeCatalog[0];
}

function isPlaneId(kind: Aircraft["kind"]): kind is PlaneId {
  return kind === "j8" || kind === "j10" || kind === "j15" || kind === "j20";
}

function isStealthEnemy(aircraft: Aircraft) {
  return aircraft.side === "enemy" && aircraft.kind === "stealth";
}

function createDefaultPlaneUpgrades(): PlaneUpgradeState {
  return {
    j8: { ...defaultUpgrades },
    j10: { ...defaultUpgrades },
    j15: { ...defaultUpgrades },
    j20: { ...defaultUpgrades },
  };
}

function sanitizeUpgrades(upgrades?: Partial<UpgradeState> & Record<string, unknown>): UpgradeState {
  return {
    firepower: clamp(Number(upgrades?.firepower) || 0, 0, 5),
    missiles: clamp(Number(upgrades?.missiles ?? upgrades?.bombBay) || 0, 0, 4),
    armor: clamp(Number(upgrades?.armor) || 0, 0, 4),
    fuelTank: clamp(Number(upgrades?.fuelTank ?? upgrades?.bombBay) || 0, 0, 5),
    engine: clamp(Number(upgrades?.engine ?? upgrades?.reload ?? upgrades?.maneuver) || 0, 0, 5),
    speed: clamp(Number(upgrades?.speed) || 0, 0, 5),
    tanker: clamp(Number(upgrades?.tanker ?? upgrades?.bombBay) || 0, 0, 4),
  };
}

function readBestScore() {
  if (typeof window === "undefined") return 0;
  const stored = Number(window.localStorage.getItem(BEST_SCORE_KEY));
  return Number.isFinite(stored) ? stored : 0;
}

function saveBestScore(score: number) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(BEST_SCORE_KEY, String(Math.max(0, Math.floor(score))));
  }
}

function readCredits() {
  if (typeof window === "undefined") return 300;
  const stored = Number(window.localStorage.getItem(CREDITS_KEY));
  return Number.isFinite(stored) ? stored : 300;
}

function saveCredits(credits: number) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CREDITS_KEY, String(Math.max(0, Math.floor(credits))));
  }
}

function readCampaignStage() {
  if (typeof window === "undefined") return 1;
  const stored = Number(window.localStorage.getItem(CAMPAIGN_STAGE_KEY));
  return normalizeStageNumber(stored);
}

function saveCampaignStage(stage: number) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CAMPAIGN_STAGE_KEY, String(normalizeStageNumber(stage)));
  }
}

function normalizeStageNumber(stage: number) {
  return Number.isFinite(stage) ? clamp(Math.floor(stage), 1, 999) : 1;
}

function readPlaneUpgrades(): PlaneUpgradeState {
  if (typeof window === "undefined") return createDefaultPlaneUpgrades();

  try {
    const parsed = JSON.parse(window.localStorage.getItem(UPGRADES_KEY) ?? "{}") as Record<string, unknown>;
    if ("j8" in parsed || "j10" in parsed || "j15" in parsed || "j20" in parsed) {
      return {
        j8: sanitizeUpgrades(parsed.j8 as Record<string, unknown>),
        j10: sanitizeUpgrades(parsed.j10 as Record<string, unknown>),
        j15: sanitizeUpgrades(parsed.j15 as Record<string, unknown>),
        j20: sanitizeUpgrades(parsed.j20 as Record<string, unknown>),
      };
    }

    if ("falcon" in parsed || "vanguard" in parsed || "raptor" in parsed) {
      return {
        j8: sanitizeUpgrades(parsed.falcon as Record<string, unknown>),
        j10: sanitizeUpgrades(parsed.vanguard as Record<string, unknown>),
        j15: sanitizeUpgrades(parsed.raptor as Record<string, unknown>),
        j20: { ...defaultUpgrades },
      };
    }

    return {
      j8: sanitizeUpgrades(parsed),
      j10: { ...defaultUpgrades },
      j15: { ...defaultUpgrades },
      j20: { ...defaultUpgrades },
    };
  } catch {
    return createDefaultPlaneUpgrades();
  }
}

function savePlaneUpgrades(upgrades: PlaneUpgradeState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(UPGRADES_KEY, JSON.stringify(upgrades));
  }
}

function readUnlockedPlanes(): PlaneUnlockState {
  if (typeof window === "undefined") return { ...defaultUnlockedPlanes };

  try {
    const parsed = JSON.parse(window.localStorage.getItem(UNLOCKED_PLANES_KEY) ?? "{}") as Record<string, unknown>;
    return {
      j8: true,
      j10: Boolean(parsed.j10 ?? parsed.vanguard),
      j15: Boolean(parsed.j15 ?? parsed.raptor),
      j20: Boolean(parsed.j20),
    };
  } catch {
    return { ...defaultUnlockedPlanes };
  }
}

function saveUnlockedPlanes(unlocked: PlaneUnlockState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(UNLOCKED_PLANES_KEY, JSON.stringify(unlocked));
  }
}

function readSelectedPlane(unlocked: PlaneUnlockState) {
  if (typeof window === "undefined") return "j8" as PlaneId;
  const stored = window.localStorage.getItem(PLANE_KEY);
  const legacyMap: Record<string, PlaneId> = { falcon: "j8", vanguard: "j10", raptor: "j15" };
  const planeId = ((stored && legacyMap[stored]) || stored || "j8") as PlaneId;
  return planeCatalog.some((plane) => plane.id === planeId) && unlocked[planeId] ? planeId : "j8";
}

function saveSelectedPlane(planeId: PlaneId) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PLANE_KEY, planeId);
  }
}

function getUpgradeCost(meta: UpgradeMeta, level: number) {
  return Math.round(meta.baseCost * (1 + level * 0.68));
}

function getStageReward(stage: number) {
  return 150 + Math.max(0, stage - 1) * 50;
}

function getStageTarget(stage: number) {
  return 7 + Math.min(22, stage * 2);
}

function getStageBossCount(stage: number) {
  if (stage % 10 === 0) return 2;
  return stage % 5 === 0 ? 1 : 0;
}

function getStageDifficulty(stage: number) {
  return 1 + Math.floor(Math.max(0, stage - 1) * 0.64);
}

function getStageWingmen(stage: number) {
  if (stage >= 6 && stage % 3 === 0) return 2;
  return stage >= 2 && stage % 2 === 0 ? 1 : 0;
}

function getMaxHp(upgrades: UpgradeState, planeId: PlaneId) {
  return getPlaneMeta(planeId).baseHp + upgrades.armor * 42;
}

function getMaxFuel(upgrades: UpgradeState, planeId: PlaneId) {
  return getPlaneMeta(planeId).fuel + upgrades.fuelTank * 42;
}

function getSpeedStats(upgrades: UpgradeState, planeId: PlaneId) {
  const plane = getPlaneMeta(planeId);
  return {
    minSpeed: plane.minSpeed + upgrades.speed * 4,
    cruiseSpeed: plane.cruiseSpeed + upgrades.speed * 12,
    maxSpeed: plane.maxSpeed + upgrades.engine * 14 + upgrades.speed * 22,
  };
}

function getDifficultyFromScore(score: number) {
  return 1 + Math.floor(score / 850);
}

function makeId(state: GameState) {
  state.nextId += 1;
  return state.nextId;
}

function localToWorld(aircraft: Aircraft, localX: number, localY: number) {
  const dir = direction(aircraft.angle);
  const perp = { x: -dir.y, y: dir.x };
  return {
    x: aircraft.x + perp.x * localX + dir.x * -localY,
    y: aircraft.y + perp.y * localX + dir.y * -localY,
  };
}

function localToVisualWorld(aircraft: Aircraft, localX: number, localY: number) {
  const bank = clamp(aircraft.bank ?? 0, -1, 1);
  const cobraPitch = aircraft.side === "player" ? Math.sin(((aircraft.cobraTimer ?? 0) / 1.05) * Math.PI) : 0;
  const visualAngle = aircraft.angle + bank * 0.08;
  const visualX = localX + localY * bank * 0.12;
  const visualY = localY * (1 - Math.abs(bank) * 0.08 - cobraPitch * 0.14);
  const dir = direction(visualAngle);
  const perp = { x: -dir.y, y: dir.x };
  return {
    x: aircraft.x + perp.x * visualX + dir.x * -visualY,
    y: aircraft.y + perp.y * visualX + dir.y * -visualY,
  };
}

function createAircraft(
  state: GameState,
  side: Aircraft["side"],
  kind: Aircraft["kind"],
  x: number,
  y: number,
  angle: number,
  hp: number,
  speed: number,
  radius: number,
): Aircraft {
  return {
    id: makeId(state),
    side,
    kind,
    x,
    y,
    angle,
    speed,
    hp,
    maxHp: hp,
    fireTimer: randomBetween(0.2, 0.8),
    radius,
  };
}

function createGameState(
  bestScore: number,
  upgrades: UpgradeState,
  selectedPlane: PlaneId,
  mode: GameMode = "endless",
  stage = 1,
): GameState {
  const plane = getPlaneMeta(selectedPlane);
  const maxHp = getMaxHp(upgrades, selectedPlane);
  const maxFuel = getMaxFuel(upgrades, selectedPlane);
  const speedStats = getSpeedStats(upgrades, selectedPlane);
  const stageBossesRequired = mode === "stage" ? getStageBossCount(stage) : 0;
  const state: GameState = {
    phase: "menu",
    mode,
    stage,
    stageTarget: mode === "stage" ? getStageTarget(stage) : 0,
    stageKills: 0,
    stageBossesRequired,
    stageBossesSpawned: 0,
    stageBossesDefeated: 0,
    stageReward: mode === "stage" ? getStageReward(stage) : 0,
    player: {
      id: 0,
      side: "player",
      kind: selectedPlane,
      x: 0,
      y: 0,
      angle: -Math.PI / 2,
      speed: speedStats.cruiseSpeed,
      hp: maxHp,
      maxHp,
      fireTimer: 0,
      radius: selectedPlane === "j20" ? 33 : selectedPlane === "j15" ? 32 : 30,
      heat: 8,
      fuel: maxFuel,
      maxFuel,
      overheated: false,
      invulnerable: 1.2,
      cobraTimer: 0,
      cobraCooldown: 0,
      missileAmmo: 4 + upgrades.missiles * 2,
      tankerCallsMax: 2 + upgrades.tanker,
      tankerCallsLeft: 2 + upgrades.tanker,
    },
    allies: [],
    enemies: [],
    bullets: [],
    tankers: [],
    explosions: [],
    smokes: [],
    wrecks: [],
    floaters: [],
    selectedPlane,
    upgrades,
    score: 0,
    bestScore,
    difficulty: mode === "stage" ? getStageDifficulty(stage) : 1,
    nextBossScore: 1700,
    spawnTimer: 0.85,
    earnedCredits: 0,
    rewardClaimed: false,
    shake: 0,
    time: 0,
    nextId: 0,
  };

  state.player.id = makeId(state);
  const wingmen = mode === "stage" ? getStageWingmen(stage) : 0;
  for (let index = 0; index < wingmen; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const ally = createAircraft(
      state,
      "ally",
      selectedPlane,
      side * 160,
      170 + index * 58,
      state.player.angle,
      Math.round(maxHp * 0.62),
      speedStats.cruiseSpeed * 0.96,
      selectedPlane === "j20" ? 29 : selectedPlane === "j15" ? 28 : 27,
    );
    ally.wingSlot = index;
    state.allies.push(ally);
  }

  return state;
}

function snapshot(state: GameState): HudState {
  const player = state.player;
  const bossHp = state.enemies
    .filter((enemy) => enemy.kind === "boss")
    .reduce((total, enemy) => total + Math.max(0, enemy.hp), 0);
  const bossMaxHp = state.enemies
    .filter((enemy) => enemy.kind === "boss")
    .reduce((total, enemy) => total + enemy.maxHp, 0);
  const heat = player.heat ?? 0;
  const fuel = player.fuel ?? 0;
  const maxFuel = player.maxFuel ?? 1;
  const engineStatus = player.overheated
    ? "过热"
    : fuel <= maxFuel * 0.14
      ? "燃油低"
      : heat > 72
        ? "高温"
        : "正常";
  const radarRange = 2200;
  const dir = direction(player.angle);
  const perp = { x: -dir.y, y: dir.x };
  const radarBlips: RadarBlip[] = [...state.allies, ...state.enemies.filter((enemy) => !isStealthEnemy(enemy))].map((aircraft) => {
    const rel = { x: aircraft.x - player.x, y: aircraft.y - player.y };
    const forward = rel.x * dir.x + rel.y * dir.y;
    const side = rel.x * perp.x + rel.y * perp.y;
    const scale = 44 / radarRange;
    const rawX = side * scale;
    const rawY = -forward * scale;
    const dist = Math.hypot(rawX, rawY);
    const limit = dist > 44 ? 44 / dist : 1;
    return {
      id: aircraft.id,
      x: 50 + rawX * limit,
      y: 50 + rawY * limit,
      side: aircraft.side === "enemy" ? "enemy" : "ally",
      boss: aircraft.kind === "boss",
    };
  });

  return {
    phase: state.phase,
    mode: state.mode,
    score: state.score,
    bestScore: state.bestScore,
    stage: state.stage,
    stageKills: state.stageKills,
    stageTarget: state.stageTarget,
    stageReward: state.stageReward,
    hp: Math.max(0, Math.ceil(player.hp)),
    maxHp: player.maxHp,
    speed: Math.round(player.speed),
    heat: Math.round(heat),
    fuel: Math.max(0, Math.round(fuel)),
    maxFuel: Math.round(maxFuel),
    engineStatus,
    tankerCallsLeft: player.tankerCallsLeft ?? 0,
    tankerCallsMax: player.tankerCallsMax ?? 0,
    missileAmmo: player.missileAmmo ?? 0,
    bossHp: Math.ceil(bossHp),
    bossMaxHp: Math.ceil(bossMaxHp),
    earnedCredits: state.earnedCredits,
    allies: state.allies.length,
    radarBlips,
  };
}

function addExplosion(state: GameState, x: number, y: number, radius: number, color = "#fb923c", life = 0.45) {
  state.explosions.push({
    id: makeId(state),
    x,
    y,
    radius,
    life,
    maxLife: life,
    color,
  });
}

function addSmoke(state: GameState, x: number, y: number, radius = 16) {
  const life = randomBetween(0.7, 1.3);
  state.smokes.push({
    id: makeId(state),
    x,
    y,
    vx: randomBetween(-18, 18),
    vy: randomBetween(-18, 18),
    radius,
    life,
    maxLife: life,
  });
}

function addFloater(state: GameState, text: string, x: number, y: number, color = "#f8fafc") {
  state.floaters.push({
    id: makeId(state),
    text,
    x,
    y,
    vy: -36,
    life: 1,
    maxLife: 1,
    color,
  });
}

function getGunPorts(state: GameState, aircraft: Aircraft) {
  const size = getAircraftDrawSize(aircraft);
  if (aircraft.side === "enemy") {
    return [{ x: 0, y: -size * 0.43, angle: 0, powerScale: 1 }];
  }

  const plane = getPlaneMeta(isPlaneId(aircraft.kind) ? aircraft.kind : state.selectedPlane);
  const mount = plane.gunMount === "leftIntake"
    ? { x: -size * 0.16, y: -size * 0.31 }
    : plane.gunMount === "rightRoot"
      ? { x: size * 0.18, y: -size * 0.27 }
      : { x: 0, y: -size * 0.39 };

  if (plane.gunBarrels === 2) {
    return [
      { x: mount.x - size * 0.018, y: mount.y, angle: -0.004, powerScale: 0.56 },
      { x: mount.x + size * 0.018, y: mount.y, angle: 0.004, powerScale: 0.56 },
    ];
  }

  return [{ x: mount.x, y: mount.y, angle: 0, powerScale: plane.gunCaliber >= 30 ? 1.22 : 1 }];
}

function getMissileRackPort(aircraft: Aircraft, side: number) {
  const size = getAircraftDrawSize(aircraft);
  return {
    x: side * size * 0.32,
    y: -size * 0.04,
  };
}

function addBullet(state: GameState, owner: ProjectileOwner, x: number, y: number, angle: number, speed: number, power: number) {
  const dir = direction(angle);
  state.bullets.push({
    id: makeId(state),
    owner,
    x,
    y,
    vx: dir.x * speed,
    vy: dir.y * speed,
    power,
    life: 1.15,
    kind: "cannon",
    length: owner === "enemy" ? 10 : 12,
  });
}

function fireGuns(state: GameState, aircraft: Aircraft, owner: ProjectileOwner, resetTimer = true) {
  const plane = getPlaneMeta(state.selectedPlane);
  const ports = getGunPorts(state, aircraft);
  const basePower =
    owner === "enemy"
      ? aircraft.kind === "boss"
        ? 13
        : aircraft.kind === "heavy" || aircraft.kind === "tank"
          ? 11
          : aircraft.kind === "stealth"
            ? 10
            : 9
      : (3.2 + state.upgrades.firepower * 0.74) * (1 + plane.damageBonus);
  const bulletSpeed = owner === "enemy" ? 650 : 930;

  for (const port of ports) {
    const origin = localToWorld(aircraft, port.x, port.y);
    addBullet(state, owner, origin.x, origin.y, aircraft.angle + port.angle, bulletSpeed + aircraft.speed * 0.35, basePower * port.powerScale);
  }

  if (!resetTimer) return;

  aircraft.fireTimer = owner === "enemy"
    ? aircraft.kind === "boss"
      ? randomBetween(0.85, 1.18)
      : randomBetween(0.78, 1.35)
    : Math.max(0.085, 0.16 - state.upgrades.engine * 0.009);
}

function getEnemyBurstProfile(enemy: Aircraft) {
  if (enemy.kind === "boss") return { count: 5, interval: 0.16, cooldown: randomBetween(1.25, 1.75) };
  if (enemy.kind === "heavy" || enemy.kind === "tank") return { count: 4, interval: 0.18, cooldown: randomBetween(1.1, 1.55) };
  if (enemy.kind === "stealth") return { count: 3, interval: 0.2, cooldown: randomBetween(1.2, 1.7) };
  if (enemy.kind === "fighter") return { count: 3, interval: 0.22, cooldown: randomBetween(1.05, 1.55) };
  return { count: 2, interval: 0.24, cooldown: randomBetween(1.15, 1.75) };
}

function startEnemyBurst(enemy: Aircraft) {
  const profile = getEnemyBurstProfile(enemy);
  enemy.burstRemaining = profile.count;
  enemy.burstTimer = 0;
  enemy.fireTimer = profile.cooldown;
}

function updateEnemyBurst(state: GameState, enemy: Aircraft, dt: number) {
  if ((enemy.burstRemaining ?? 0) <= 0) return;
  enemy.burstTimer = Math.max(0, (enemy.burstTimer ?? 0) - dt);
  if ((enemy.burstTimer ?? 0) > 0) return;

  const profile = getEnemyBurstProfile(enemy);
  fireGuns(state, enemy, "enemy", false);
  enemy.burstRemaining = Math.max(0, (enemy.burstRemaining ?? 0) - 1);
  enemy.burstTimer = profile.interval;
}

function fireMissile(state: GameState) {
  const player = state.player;
  if (state.phase !== "running" || (player.missileAmmo ?? 0) <= 0) return;
  const side = (player.missileAmmo ?? 0) % 2 === 0 ? -1 : 1;
  const rack = getMissileRackPort(player, side);
  const origin = localToWorld(player, rack.x, rack.y);
  const target = chooseMissileTarget(state, player);
  const launchAngle = target ? turnToward(player.angle, angleTo(player, target), 0.48) : player.angle;
  const dir = direction(launchAngle);
  player.missileAmmo = Math.max(0, (player.missileAmmo ?? 0) - 1);
  state.bullets.push({
    id: makeId(state),
    owner: "player",
    kind: "missile",
    x: origin.x,
    y: origin.y,
    vx: dir.x * (720 + player.speed * 0.8),
    vy: dir.y * (720 + player.speed * 0.8),
    power: 26 + state.upgrades.firepower * 2.6 + state.upgrades.missiles * 1.8,
    life: 4.4,
    length: 30,
    targetId: target?.id,
    turnRate: 3.8 + state.upgrades.engine * 0.18,
    blastRadius: 82 + state.upgrades.firepower * 4 + state.upgrades.missiles * 3,
    age: 0,
  });
  addExplosion(state, origin.x, origin.y, 20, "#facc15", 0.18);
}

function fireEnemyMissile(state: GameState, enemy: Aircraft, target: Aircraft) {
  const side = enemy.id % 2 === 0 ? -1 : 1;
  const rack = getMissileRackPort(enemy, side);
  const origin = localToWorld(enemy, rack.x, rack.y);
  const launchAngle = turnToward(enemy.angle, angleTo(enemy, target), 0.38);
  const dir = direction(launchAngle);
  const speed = 560 + enemy.speed * 0.55;
  state.bullets.push({
    id: makeId(state),
    owner: "enemy",
    kind: "missile",
    x: origin.x,
    y: origin.y,
    vx: dir.x * speed,
    vy: dir.y * speed,
    power: 18 + state.difficulty * 1.2,
    life: 3.6,
    length: 24,
    targetId: target.id,
    turnRate: 1.85,
    blastRadius: 46,
    age: 0,
    trackingTime: 1.05,
  });
  addExplosion(state, origin.x, origin.y, 14, "#fca5a5", 0.16);
}

function getEnemyMissileTarget(state: GameState, missile: Projectile) {
  if (missile.targetId === state.player.id) return state.player;
  return state.allies.find((ally) => ally.id === missile.targetId) ?? state.player;
}

function requestRefuel(state: GameState) {
  const player = state.player;
  if (state.phase !== "running" || (player.tankerCallsLeft ?? 0) <= 0 || state.tankers.length > 0) return;
  player.tankerCallsLeft = Math.max(0, (player.tankerCallsLeft ?? 0) - 1);
  const dir = direction(player.angle);
  const perp = { x: -dir.y, y: dir.x };
  state.tankers.push({
    id: makeId(state),
    x: player.x - dir.x * 1100 + perp.x * 420,
    y: player.y - dir.y * 1100 + perp.y * 420,
    angle: player.angle,
    speed: 330,
    life: 30,
    refueling: false,
    departing: false,
  });
  addFloater(state, "加油机已呼叫", player.x, player.y - 80, "#bae6fd");
}

function startCobra(state: GameState) {
  const player = state.player;
  if (state.phase !== "running" || (player.cobraCooldown ?? 0) > 0 || (player.cobraTimer ?? 0) > 0) return;
  player.cobraTimer = 1.05;
  player.cobraCooldown = 5.5;
  player.invulnerable = Math.max(player.invulnerable ?? 0, 1.05);
  player.speed = Math.max(getSpeedStats(state.upgrades, state.selectedPlane).minSpeed, player.speed * 0.82);
  addFloater(state, "眼镜蛇机动", player.x, player.y - 70, "#fde68a");
}

function getBossHp(state: GameState, totalBosses = 1) {
  const plane = getPlaneMeta(state.selectedPlane);
  const upgradePressure = 1 + state.upgrades.missiles * 0.04 + state.upgrades.firepower * 0.07 + plane.damageBonus * 0.18;
  const doubleBossPenalty = totalBosses > 1 ? 0.58 : 1;
  return Math.round((78 + state.difficulty * 15) * upgradePressure * doubleBossPenalty);
}

function spawnBossEnemy(state: GameState, index = 0, totalBosses = 1) {
  const player = state.player;
  const dir = direction(player.angle + Math.PI + (index - (totalBosses - 1) / 2) * 0.62);
  const hp = getBossHp(state, totalBosses);
  const boss = createAircraft(
    state,
    "enemy",
    "boss",
    player.x + dir.x * randomBetween(1250, 1650),
    player.y + dir.y * randomBetween(1250, 1650),
    angleTo({ x: player.x + dir.x * 900, y: player.y + dir.y * 900 }, player),
    hp,
    245 + state.difficulty * 5,
    54,
  );
  boss.fireTimer = totalBosses > 1 ? 1.5 + index * 0.42 : 1.15;
  boss.missileTimer = 2.4 + index * 0.55;
  boss.spawnWarmup = 2.25 + index * 0.28;
  state.enemies.push(boss);
}

function spawnRegularEnemy(state: GameState) {
  const player = state.player;
  const difficulty = state.difficulty;
  const roll = Math.random();
  const kind: EnemyKind =
    difficulty > 5 && roll > 0.9
      ? "stealth"
      : difficulty > 3 && roll > 0.76
        ? "heavy"
        : roll > 0.84 && difficulty > 2
          ? "tank"
          : roll > 0.48
            ? "fighter"
            : "scout";
  const hp =
    kind === "tank"
      ? 18 + difficulty * 3
      : kind === "heavy"
        ? 15 + difficulty * 3
        : kind === "stealth"
          ? 12 + difficulty * 2
          : kind === "fighter"
            ? 10 + difficulty * 2
            : 6 + difficulty;
  const radius = kind === "tank" ? 35 : kind === "heavy" ? 34 : kind === "stealth" ? 29 : kind === "fighter" ? 30 : 27;
  const angle = Math.random() * Math.PI * 2;
  const range = randomBetween(1120, 1720);
  const enemy = createAircraft(
    state,
    "enemy",
    kind,
    player.x + Math.cos(angle) * range,
    player.y + Math.sin(angle) * range,
    angleTo({ x: player.x + Math.cos(angle) * range, y: player.y + Math.sin(angle) * range }, player),
    hp,
    kind === "tank"
      ? 224 + difficulty * 4
      : kind === "heavy"
        ? 238 + difficulty * 5
        : kind === "stealth"
          ? 318 + difficulty * 7
          : kind === "fighter"
            ? 268 + difficulty * 6
            : 292 + difficulty * 5,
    radius,
  );
  enemy.spawnWarmup = randomBetween(1.15, 1.9);
  state.enemies.push(enemy);
}

function chooseEnemyTarget(state: GameState, enemy: Aircraft) {
  let target = state.player;
  let best = distance(enemy, state.player);
  for (const ally of state.allies) {
    const dist = distance(enemy, ally);
    if (dist < best * 0.92) {
      best = dist;
      target = ally;
    }
  }
  return target;
}

function chooseNearestEnemy(state: GameState, source: Vector) {
  let target: Aircraft | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (const enemy of state.enemies) {
    const dist = distance(source, enemy);
    if (dist < best) {
      best = dist;
      target = enemy;
    }
  }
  return target;
}

function chooseMissileTarget(state: GameState, shooter: Vector & { angle: number }) {
  let forwardTarget: Aircraft | null = null;
  let forwardScore = Number.POSITIVE_INFINITY;

  for (const enemy of state.enemies) {
    const dist = distance(shooter, enemy);
    const offBoresight = Math.abs(normalizeAngle(angleTo(shooter, enemy) - shooter.angle));
    const score = dist * (enemy.kind === "boss" ? 0.72 : 1);
    if (offBoresight < 1.85) {
      const coneScore = score * (1 + offBoresight * 0.35);
      if (coneScore < forwardScore) {
        forwardScore = coneScore;
        forwardTarget = enemy;
      }
    }
  }

  return forwardTarget;
}

function destroyEnemy(state: GameState, enemy: Aircraft) {
  const points =
    enemy.kind === "boss"
      ? 520 + state.difficulty * 55
      : enemy.kind === "tank" || enemy.kind === "heavy"
        ? 115
        : enemy.kind === "stealth"
          ? 135
          : enemy.kind === "fighter"
            ? 70
            : 40;
  const dir = direction(enemy.angle);
  const wreckLife = enemy.kind === "boss" ? 2.2 : enemy.kind === "tank" || enemy.kind === "heavy" ? 1.25 : 0.9;
  state.score += points;
  if (state.mode === "stage") {
    if (enemy.kind === "boss") {
      state.stageBossesDefeated += 1;
    } else {
      state.stageKills = Math.min(state.stageTarget, state.stageKills + 1);
    }
  } else {
    state.difficulty = Math.max(state.difficulty, getDifficultyFromScore(state.score));
  }
  state.wrecks.push({
    id: makeId(state),
    x: enemy.x,
    y: enemy.y,
    vx: dir.x * enemy.speed * 0.28,
    vy: dir.y * enemy.speed * 0.28,
    angle: enemy.angle,
    kind: enemy.kind,
    side: enemy.side,
    radius: enemy.radius,
    life: wreckLife,
    maxLife: wreckLife,
  });
  addExplosion(
    state,
    enemy.x,
    enemy.y,
    enemy.kind === "boss" ? 112 : 42,
    enemy.kind === "boss" ? "#fb7185" : "#fb923c",
    enemy.kind === "boss" ? 1.05 : 0.42,
  );
  for (let index = 0; index < (enemy.kind === "boss" ? 8 : 2); index += 1) {
    addSmoke(state, enemy.x, enemy.y, enemy.kind === "boss" ? 30 : 18);
  }
  addFloater(state, `+${points}`, enemy.x, enemy.y - 36, "#fde68a");
}

function detonateMissile(state: GameState, missile: Projectile) {
  const blastRadius = missile.blastRadius ?? 72;
  addExplosion(state, missile.x, missile.y, blastRadius, "#facc15", 0.62);
  const targets = [...state.enemies];
  for (const enemy of targets) {
    const dist = distance(missile, enemy);
    if (dist <= blastRadius + enemy.radius) {
      const falloff = clamp(1 - dist / (blastRadius + enemy.radius), 0.34, 1);
      damageAircraft(state, enemy, missile.power * falloff, missile.x, missile.y);
    }
  }
}

function damageAircraft(state: GameState, target: Aircraft, amount: number, x: number, y: number) {
  if (target.side === "player" && ((target.invulnerable ?? 0) > 0 || (target.cobraTimer ?? 0) > 0)) {
    addFloater(state, "规避", x, y, "#bae6fd");
    return;
  }
  target.hp = Math.max(0, target.hp - amount);
  addExplosion(state, x, y, 18, target.side === "enemy" ? "#fde68a" : "#fb7185", 0.2);
  if (target.hp <= 0) {
    if (target.side === "enemy") {
      destroyEnemy(state, target);
      state.enemies = state.enemies.filter((enemy) => enemy.id !== target.id);
    } else if (target.side === "ally") {
      addExplosion(state, target.x, target.y, 54, "#fb923c", 0.5);
      state.allies = state.allies.filter((ally) => ally.id !== target.id);
    } else {
      state.phase = "playerDying";
      state.bullets = state.bullets.filter((bullet) => bullet.owner !== "enemy");
      state.shake = Math.max(state.shake, 24);
      addExplosion(state, target.x, target.y, 88, "#fb923c", 0.85);
      for (let index = 0; index < 8; index += 1) addSmoke(state, target.x, target.y, randomBetween(16, 28));
      if (state.score > state.bestScore) {
        state.bestScore = state.score;
        saveBestScore(state.score);
      }
    }
  }
}

function updateProjectiles(state: GameState, dt: number) {
  const used = new Set<number>();
  for (const bullet of state.bullets) {
    bullet.life -= dt;
    bullet.age = (bullet.age ?? 0) + dt;

    if (bullet.kind === "missile" && bullet.owner !== "enemy") {
      const currentAngle = Math.atan2(bullet.vy, bullet.vx);
      const missileSeeker = { x: bullet.x, y: bullet.y, angle: currentAngle };
      let lockedTarget = state.enemies.find((enemy) => enemy.id === bullet.targetId) ?? chooseMissileTarget(state, missileSeeker);
      if (lockedTarget) {
        const targetBearing = angleTo(bullet, lockedTarget);
        if (Math.abs(normalizeAngle(targetBearing - currentAngle)) > 2.35 && (bullet.age ?? 0) > 0.45) {
          lockedTarget = chooseMissileTarget(state, missileSeeker);
        }
      }
      if (!lockedTarget) delete bullet.targetId;
      if (lockedTarget) {
        bullet.targetId = lockedTarget.id;
        const speed = Math.hypot(bullet.vx, bullet.vy);
        const targetDir = direction(lockedTarget.angle);
        const leadTime = clamp(distance(bullet, lockedTarget) / Math.max(1, speed), 0.1, 0.55);
        const predicted = {
          x: lockedTarget.x + targetDir.x * lockedTarget.speed * leadTime * 0.42,
          y: lockedTarget.y + targetDir.y * lockedTarget.speed * leadTime * 0.42,
        };
        const desiredAngle = angleTo(bullet, predicted);
        const boostLock = clamp(((bullet.age ?? 0) - 0.12) / 0.28, 0.18, 1);
        const nextAngle = turnToward(currentAngle, desiredAngle, (bullet.turnRate ?? 2.6) * boostLock * dt);
        const targetSpeed = 910 + clamp((bullet.age ?? 0) * 180, 0, 180);
        const nextSpeed = speed + (targetSpeed - speed) * Math.min(1, dt * 1.3);
        bullet.vx = Math.cos(nextAngle) * nextSpeed;
        bullet.vy = Math.sin(nextAngle) * nextSpeed;
      }
    }

    if (bullet.kind === "missile" && bullet.owner === "enemy" && (bullet.age ?? 0) < (bullet.trackingTime ?? 0)) {
      const currentAngle = Math.atan2(bullet.vy, bullet.vx);
      const target = getEnemyMissileTarget(state, bullet);
      const desiredAngle = angleTo(bullet, target);
      const nextAngle = turnToward(currentAngle, desiredAngle, (bullet.turnRate ?? 1.5) * dt);
      const speed = Math.hypot(bullet.vx, bullet.vy);
      const targetSpeed = 660 + Math.min(120, state.difficulty * 8);
      const nextSpeed = speed + (targetSpeed - speed) * Math.min(1, dt * 0.8);
      bullet.vx = Math.cos(nextAngle) * nextSpeed;
      bullet.vy = Math.sin(nextAngle) * nextSpeed;
    }

    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.life <= 0 || distance(bullet, state.player) > (bullet.kind === "missile" ? 2700 : 1900)) {
      if (bullet.kind === "missile" && bullet.life <= 0) detonateMissile(state, bullet);
      used.add(bullet.id);
      continue;
    }

    if (bullet.owner === "enemy") {
      if (distance(bullet, state.player) < state.player.radius) {
        used.add(bullet.id);
        if (bullet.kind === "missile") addExplosion(state, bullet.x, bullet.y, bullet.blastRadius ?? 42, "#fca5a5", 0.42);
        damageAircraft(state, state.player, bullet.power, bullet.x, bullet.y);
        continue;
      }
      for (const ally of state.allies) {
        if (distance(bullet, ally) < ally.radius) {
          used.add(bullet.id);
          if (bullet.kind === "missile") addExplosion(state, bullet.x, bullet.y, bullet.blastRadius ?? 42, "#fca5a5", 0.42);
          damageAircraft(state, ally, bullet.power, bullet.x, bullet.y);
          break;
        }
      }
    } else {
      for (const enemy of state.enemies) {
        if (distance(bullet, enemy) < enemy.radius) {
          used.add(bullet.id);
          if (bullet.kind === "missile") detonateMissile(state, bullet);
          else damageAircraft(state, enemy, bullet.power, bullet.x, bullet.y);
          break;
        }
      }
    }
  }
  state.bullets = state.bullets.filter((bullet) => !used.has(bullet.id));
}

function updatePlayer(state: GameState, dt: number, input: InputState) {
  const player = state.player;
  const plane = getPlaneMeta(state.selectedPlane);
  const speedStats = getSpeedStats(state.upgrades, state.selectedPlane);
  const heat = player.heat ?? 0;
  const fuel = player.fuel ?? 0;
  const throttle = fuel <= 0 ? Math.min(0, input.throttle) : input.throttle;
  const cooling = state.upgrades.engine * 3;
  const speedLoad = state.upgrades.speed * 4.2;
  player.throttle = throttle;

  player.invulnerable = Math.max(0, (player.invulnerable ?? 0) - dt);
  player.cobraCooldown = Math.max(0, (player.cobraCooldown ?? 0) - dt);
  player.cobraTimer = Math.max(0, (player.cobraTimer ?? 0) - dt);
  player.bank = (player.bank ?? 0) + (input.turn - (player.bank ?? 0)) * Math.min(1, dt * 5);
  player.angle = normalizeAngle(player.angle + input.turn * (plane.turnRate + state.upgrades.engine * 0.06) * dt);

  if (!player.overheated && throttle > 0.12) {
    player.heat = clamp(heat + Math.max(10, 26 + speedLoad - cooling) * throttle * dt, 0, 100);
  } else {
    player.heat = clamp(heat - (20 + state.upgrades.engine * 6 + Math.max(0, -throttle) * 15) * dt, 0, 100);
  }
  if ((player.heat ?? 0) >= 100) player.overheated = true;
  if ((player.heat ?? 0) <= 42) player.overheated = false;

  const maxSpeed = speedStats.maxSpeed;
  const targetSpeed = throttle > 0.08 && !player.overheated
    ? maxSpeed
    : throttle < -0.08
      ? speedStats.minSpeed
      : speedStats.cruiseSpeed;
  player.speed += (targetSpeed - player.speed) * Math.min(1, dt * (throttle < -0.08 ? 1.9 : 1.15));
  player.speed = clamp(player.speed, speedStats.minSpeed, maxSpeed);
  const dir = direction(player.angle);
  player.x += dir.x * player.speed * dt;
  player.y += dir.y * player.speed * dt;

  const drain = (0.75 + player.speed / maxSpeed * 0.65 + Math.max(0, throttle) * (1.65 + state.upgrades.speed * 0.22)) * (1 + state.upgrades.speed * 0.1) * dt;
  player.fuel = Math.max(0, fuel - drain);
  player.fireTimer -= dt;
  if (player.fireTimer <= 0 && fuel > 0) fireGuns(state, player, "player");
}

function updateAllies(state: GameState, dt: number) {
  const player = state.player;
  const plane = getPlaneMeta(state.selectedPlane);
  const speedStats = getSpeedStats(state.upgrades, state.selectedPlane);
  for (const ally of state.allies) {
    const slot = ally.wingSlot ?? 0;
    const side = slot % 2 === 0 ? -1 : 1;
    const dir = direction(player.angle);
    const perp = { x: -dir.y, y: dir.x };
    const formation = {
      x: player.x - dir.x * (135 + slot * 18) + perp.x * side * 92,
      y: player.y - dir.y * (135 + slot * 18) + perp.y * side * 92,
    };
    const target = chooseNearestEnemy(state, ally);
    const desiredAngle = target && distance(target, ally) < 980 ? angleTo(ally, target) : angleTo(ally, formation);
    ally.bank = (ally.bank ?? 0) + (clamp(normalizeAngle(desiredAngle - ally.angle) * 1.8, -1, 1) - (ally.bank ?? 0)) * Math.min(1, dt * 4);
    ally.angle = turnToward(ally.angle, desiredAngle, (plane.turnRate + 0.18) * dt);
    ally.speed += (clamp(distance(ally, formation), 70, 420) - ally.speed) * dt * 0.75;
    ally.speed = clamp(ally.speed, speedStats.minSpeed, speedStats.maxSpeed);
    ally.throttle = clamp((ally.speed - speedStats.cruiseSpeed) / Math.max(1, speedStats.maxSpeed - speedStats.cruiseSpeed), -0.35, 1);
    const move = direction(ally.angle);
    ally.x += move.x * ally.speed * dt;
    ally.y += move.y * ally.speed * dt;
    ally.fireTimer -= dt;
    if (target && distance(target, ally) < 920 && Math.abs(normalizeAngle(angleTo(ally, target) - ally.angle)) < 0.24 && ally.fireTimer <= 0) {
      fireGuns(state, ally, "ally");
      ally.fireTimer = 0.24;
    }
  }
}

function updateEnemies(state: GameState, dt: number) {
  for (const enemy of state.enemies) {
    enemy.spawnWarmup = Math.max(0, (enemy.spawnWarmup ?? 0) - dt);
    const target = chooseEnemyTarget(state, enemy);
    const targetAngle = angleTo(enemy, target);
    const boss = enemy.kind === "boss";
    const turnRate = boss ? 1.05 : enemy.kind === "stealth" ? 1.88 : enemy.kind === "tank" || enemy.kind === "heavy" ? 1.24 : 1.64;
    const weave = Math.sin(state.time * (boss ? 0.9 : enemy.kind === "stealth" ? 1.9 : 1.6) + enemy.id) * (boss ? 0.14 : enemy.kind === "stealth" ? 0.28 : 0.22);
    const preferred = boss ? 760 : enemy.kind === "tank" || enemy.kind === "heavy" ? 640 : enemy.kind === "stealth" ? 560 : 520;
    const dist = distance(enemy, target);
    const tooClose = dist < preferred * 0.72;
    const desiredAngle = tooClose ? normalizeAngle(targetAngle + Math.PI + weave * 0.45) : targetAngle + weave;
    enemy.bank = (enemy.bank ?? 0) + (clamp(normalizeAngle(desiredAngle - enemy.angle) * 1.6, -1, 1) - (enemy.bank ?? 0)) * Math.min(1, dt * 4);
    enemy.angle = turnToward(enemy.angle, desiredAngle, turnRate * dt);
    const warmingUp = (enemy.spawnWarmup ?? 0) > 0;
    const arrival = warmingUp ? 0.34 : 1;
    const speedTarget = (tooClose ? enemy.speed + 45 : dist > preferred ? enemy.speed + 80 : enemy.speed - 45) * arrival;
    enemy.speed += (speedTarget - enemy.speed) * dt * 0.45;
    const maxEnemySpeed = boss ? 330 : enemy.kind === "stealth" ? 435 + state.difficulty * 9 : enemy.kind === "heavy" || enemy.kind === "tank" ? 350 + state.difficulty * 6 : 380 + state.difficulty * 8;
    enemy.speed = clamp(enemy.speed, warmingUp ? (boss ? 118 : 104) : boss ? 200 : enemy.kind === "heavy" || enemy.kind === "tank" ? 175 : 190, maxEnemySpeed);
    enemy.throttle = clamp((speedTarget - enemy.speed) / 160, -0.2, 1);
    const dir = direction(enemy.angle);
    enemy.x += dir.x * enemy.speed * dt;
    enemy.y += dir.y * enemy.speed * dt;
    enemy.fireTimer -= dt;
    updateEnemyBurst(state, enemy, dt);
    if (boss) enemy.missileTimer = Math.max(0, (enemy.missileTimer ?? randomBetween(2.4, 3.4)) - dt);

    const aimError = Math.abs(normalizeAngle(targetAngle - enemy.angle));
    if (
      (enemy.spawnWarmup ?? 0) <= 0 &&
      (enemy.burstRemaining ?? 0) <= 0 &&
      !tooClose &&
      dist < (boss ? 980 : enemy.kind === "heavy" || enemy.kind === "tank" ? 860 : 780) &&
      aimError < (boss ? 0.3 : enemy.kind === "stealth" ? 0.28 : 0.22) &&
      enemy.fireTimer <= 0
    ) {
      startEnemyBurst(enemy);
    }
    if (
      boss &&
      (enemy.spawnWarmup ?? 0) <= 0 &&
      !tooClose &&
      dist < 1250 &&
      aimError < 0.62 &&
      (enemy.missileTimer ?? 0) <= 0
    ) {
      fireEnemyMissile(state, enemy, target);
      enemy.missileTimer = randomBetween(3.8, 5.6);
    }
  }
}

function updateTankers(state: GameState, dt: number) {
  const player = state.player;
  const dir = direction(player.angle);
  const target = { x: player.x - dir.x * 88, y: player.y - dir.y * 88 };
  for (const tanker of state.tankers) {
    tanker.life -= dt;
    if (tanker.departing) {
      tanker.angle = turnToward(tanker.angle, tanker.exitAngle ?? tanker.angle, 0.62 * dt);
      tanker.speed += (520 - tanker.speed) * Math.min(1, dt * 0.48);
    } else {
      tanker.angle = turnToward(tanker.angle, angleTo(tanker, target), 0.8 * dt);
    }
    const move = direction(tanker.angle);
    tanker.x += move.x * tanker.speed * dt;
    tanker.y += move.y * tanker.speed * dt;
    tanker.refueling = !tanker.departing && distance(tanker, player) < 135;
    if (tanker.refueling) {
      player.fuel = Math.min(player.maxFuel ?? 1, (player.fuel ?? 0) + (70 + state.upgrades.tanker * 12) * dt);
      player.heat = Math.max(0, (player.heat ?? 0) - 12 * dt);
      if ((player.fuel ?? 0) >= (player.maxFuel ?? 1) * 0.98) {
        const side = tanker.id % 2 === 0 ? 1 : -1;
        tanker.departing = true;
        tanker.refueling = false;
        tanker.exitAngle = normalizeAngle(player.angle + side * 0.52);
        tanker.life = Math.max(tanker.life, 14);
      }
    }
  }
  state.tankers = state.tankers.filter((tanker) => {
    const leaveRange = tanker.departing ? 2850 : 2400;
    return tanker.life > 0 && distance(tanker, player) < leaveRange;
  });
}

function spawnForMode(state: GameState) {
  if (state.mode === "stage") {
    const regularEnemies = state.enemies.filter((enemy) => enemy.kind !== "boss").length;
    if (state.stageKills + regularEnemies < state.stageTarget) {
      spawnRegularEnemy(state);
    } else if (state.stageBossesSpawned < state.stageBossesRequired) {
      const totalBosses = state.stageBossesRequired;
      for (let index = 0; index < totalBosses; index += 1) spawnBossEnemy(state, index, totalBosses);
      state.stageBossesSpawned = totalBosses;
      addFloater(state, totalBosses > 1 ? "双机来袭" : "Boss来袭", state.player.x, state.player.y - 140, "#fb7185");
    }
    state.spawnTimer = Math.max(0.68, 1.35 - state.difficulty * 0.035);
    return;
  }

  const regularCap = 4 + Math.min(5, state.difficulty);
  if (state.enemies.filter((enemy) => enemy.kind !== "boss").length < regularCap) spawnRegularEnemy(state);
  if (state.score >= state.nextBossScore && !state.enemies.some((enemy) => enemy.kind === "boss")) {
    state.nextBossScore += 2100 + state.difficulty * 260;
    spawnBossEnemy(state);
    addFloater(state, "Boss来袭", state.player.x, state.player.y - 140, "#fb7185");
  }
  state.spawnTimer = Math.max(0.55, 1.05 - state.difficulty * 0.035);
}

function updateEffects(state: GameState, dt: number) {
  for (const explosion of state.explosions) explosion.life -= dt;
  state.explosions = state.explosions.filter((explosion) => explosion.life > 0);
  for (const smoke of state.smokes) {
    smoke.life -= dt;
    smoke.x += smoke.vx * dt;
    smoke.y += smoke.vy * dt;
    smoke.radius += dt * 10;
  }
  state.smokes = state.smokes.filter((smoke) => smoke.life > 0);
  for (const wreck of state.wrecks) {
    wreck.life -= dt;
    wreck.x += wreck.vx * dt;
    wreck.y += wreck.vy * dt;
    wreck.vx *= 1 - dt * 0.42;
    wreck.vy *= 1 - dt * 0.42;
    if (Math.random() < dt * (wreck.kind === "boss" ? 8 : 3)) addSmoke(state, wreck.x, wreck.y, wreck.kind === "boss" ? 22 : 13);
  }
  state.wrecks = state.wrecks.filter((wreck) => wreck.life > 0);
  for (const floater of state.floaters) {
    floater.life -= dt;
    floater.y += floater.vy * dt;
  }
  state.floaters = state.floaters.filter((floater) => floater.life > 0);
  state.shake = Math.max(0, state.shake - dt * 28);
}

function tryCompleteStage(state: GameState) {
  if (state.mode !== "stage" || state.phase !== "running") return;
  const normalDone = state.stageKills >= state.stageTarget;
  const bossesDone = state.stageBossesDefeated >= state.stageBossesRequired;
  if (normalDone && bossesDone && state.enemies.length === 0) {
    state.phase = "stageClear";
    state.bullets = state.bullets.filter((bullet) => bullet.owner !== "enemy");
    state.tankers = [];
    state.shake = Math.max(state.shake, 12);
    addFloater(state, "关卡完成", state.player.x, state.player.y - 110, "#bef264");
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveBestScore(state.score);
    }
  }
}

function updateGame(state: GameState, dt: number, input: InputState) {
  state.time += dt;
  updateEffects(state, dt);

  if (state.phase === "playerDying") {
    if (state.explosions.length === 0) state.phase = "over";
    return;
  }

  if (state.phase !== "running") return;

  updatePlayer(state, dt, input);
  updateAllies(state, dt);
  updateEnemies(state, dt);
  updateTankers(state, dt);
  updateProjectiles(state, dt);

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) spawnForMode(state);

  if (Math.random() < dt * 1.2) {
    const back = direction(state.player.angle + Math.PI);
    addSmoke(state, state.player.x + back.x * 36, state.player.y + back.y * 36, 7);
  }

  tryCompleteStage(state);
}

function screenPoint(state: GameState, x: number, y: number) {
  return {
    x: x - state.player.x + VIEW_WIDTH / 2,
    y: y - state.player.y + VIEW_HEIGHT / 2,
  };
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function seededNoise(a: number, b: number) {
  return Math.abs(Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1;
}

function drawSky(ctx: CanvasRenderingContext2D, state: GameState, terrain: HTMLImageElement | null) {
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  gradient.addColorStop(0, "#4aaeee");
  gradient.addColorStop(0.58, "#8ed8ff");
  gradient.addColorStop(1, "#dff7ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  if (terrain?.complete && terrain.naturalWidth > 0) {
    const tile = 1600;
    const startX = Math.floor((state.player.x - VIEW_WIDTH / 2) / tile) - 1;
    const endX = Math.floor((state.player.x + VIEW_WIDTH / 2) / tile) + 1;
    const startY = Math.floor((state.player.y - VIEW_HEIGHT / 2) / tile) - 1;
    const endY = Math.floor((state.player.y + VIEW_HEIGHT / 2) / tile) + 1;
    ctx.save();
    ctx.globalAlpha = 0.9;
    for (let gx = startX; gx <= endX; gx += 1) {
      for (let gy = startY; gy <= endY; gy += 1) {
        const p = screenPoint(state, gx * tile, gy * tile);
        ctx.drawImage(terrain, p.x, p.y, tile, tile);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(125, 211, 252, 0.22)";
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.restore();
  }

  ctx.save();
  const grid = 540;
  const startX = Math.floor((state.player.x - VIEW_WIDTH / 2) / grid) - 1;
  const endX = Math.floor((state.player.x + VIEW_WIDTH / 2) / grid) + 1;
  const startY = Math.floor((state.player.y - VIEW_HEIGHT / 2) / grid) - 1;
  const endY = Math.floor((state.player.y + VIEW_HEIGHT / 2) / grid) + 1;
  for (let gx = startX; gx <= endX; gx += 1) {
    for (let gy = startY; gy <= endY; gy += 1) {
      const noise = seededNoise(gx, gy);
      const worldX = gx * grid + noise * 160;
      const worldY = gy * grid + seededNoise(gy, gx) * 140;
      const p = screenPoint(state, worldX, worldY);
      ctx.globalAlpha = 0.12 + noise * 0.22;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(p.x - 64, p.y, 118, 32, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + 32, p.y - 12, 132, 42, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + 120, p.y + 5, 86, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function getAircraftSpriteKey(kind: Aircraft["kind"], side: Aircraft["side"]): SpriteKey {
  if (side === "enemy") {
    if (kind === "stealth") return "j20";
    return kind === "boss" || kind === "tank" || kind === "heavy" ? "enemyHeavy" : "enemy";
  }
  return isPlaneId(kind) ? kind : "j8";
}

function getAircraftDrawSize(aircraft: Aircraft) {
  if (aircraft.kind === "boss") return 166;
  if (aircraft.kind === "tank") return 116;
  if (aircraft.kind === "heavy") return 112;
  if (aircraft.kind === "stealth") return 106;
  if (aircraft.side === "ally") return aircraft.kind === "j20" ? 98 : aircraft.kind === "j15" ? 94 : 90;
  if (aircraft.side === "enemy") return aircraft.kind === "scout" ? 90 : 98;
  if (aircraft.kind === "j20") return 116;
  return aircraft.kind === "j15" ? 112 : 103;
}

function drawAircraftSprite(ctx: CanvasRenderingContext2D, sprites: HTMLImageElement | null, key: SpriteKey, size: number) {
  if (!sprites?.complete || sprites.naturalWidth <= 0) return false;
  const slot = spriteSlots[key];
  const cellWidth = sprites.naturalWidth / SPRITE_COLUMNS;
  const cellHeight = sprites.naturalHeight / SPRITE_ROWS;
  ctx.drawImage(
    sprites,
    slot.col * cellWidth,
    slot.row * cellHeight,
    cellWidth,
    cellHeight,
    -size / 2,
    -size / 2,
    size,
    size,
  );
  return true;
}

function drawWeaponSprite(ctx: CanvasRenderingContext2D, sprites: HTMLImageElement | null, key: WeaponSpriteKey, width: number, height: number) {
  if (!sprites?.complete || sprites.naturalWidth <= 0) return false;
  const slot = weaponSpriteSlots[key];
  const cellWidth = sprites.naturalWidth / WEAPON_COLUMNS;
  const cellHeight = sprites.naturalHeight / WEAPON_ROWS;
  const crop = slot.crop ?? [0, 0, cellWidth, cellHeight];
  ctx.drawImage(
    sprites,
    slot.col * cellWidth + crop[0],
    slot.row * cellHeight + crop[1],
    crop[2],
    crop[3],
    -width / 2,
    -height / 2,
    width,
    height,
  );
  return true;
}

function getEnginePorts(aircraft: Aircraft) {
  const size = getAircraftDrawSize(aircraft);
  if (aircraft.kind === "j8") {
    return [{ x: -size * 0.028, y: size * 0.385 }];
  }
  if (aircraft.kind === "j10") {
    return [{ x: -size * 0.092, y: size * 0.39 }];
  }
  if (aircraft.kind === "j15") {
    return [
      { x: -size * 0.2, y: size * 0.36 },
      { x: -size * 0.07, y: size * 0.36 },
    ];
  }
  if (aircraft.kind === "j20" || aircraft.kind === "stealth") {
    return [
      { x: -size * 0.055, y: size * 0.39 },
      { x: size * 0.055, y: size * 0.39 },
    ];
  }
  if (aircraft.kind === "boss" || aircraft.kind === "tank" || aircraft.kind === "heavy") {
    return [
      { x: -size * 0.14, y: size * 0.31 },
      { x: size * 0.025, y: size * 0.31 },
    ];
  }
  return [{ x: -size * 0.02, y: size * 0.315 }];
}

function drawEngineFlame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  aircraft: Aircraft,
  port: { x: number; y: number },
  size: number,
  cobraPitch: number,
  spawnAlpha: number,
) {
  const throttle = aircraft.throttle ?? 0;
  const thrust = clamp(0.28 + Math.max(0, throttle) * 0.72 + cobraPitch * 0.62, 0.14, 1.25);
  const length = size * (0.14 + thrust * 0.22);
  const width = size * (0.045 + thrust * 0.03);
  const forward = direction(aircraft.angle);
  const back = { x: -forward.x, y: -forward.y };
  const perp = { x: -forward.y, y: forward.x };
  const base = localToVisualWorld(aircraft, port.x, port.y);
  const baseScreen = screenPoint(state, base.x, base.y);
  const tipScreen = screenPoint(state, base.x + back.x * length, base.y + back.y * length);
  const leftBase = screenPoint(state, base.x + perp.x * width * 0.36, base.y + perp.y * width * 0.36);
  const rightBase = screenPoint(state, base.x - perp.x * width * 0.36, base.y - perp.y * width * 0.36);
  const leftMid = screenPoint(state, base.x + back.x * length * 0.58 + perp.x * width, base.y + back.y * length * 0.58 + perp.y * width);
  const rightMid = screenPoint(state, base.x + back.x * length * 0.58 - perp.x * width, base.y + back.y * length * 0.58 - perp.y * width);
  const coreLeftBase = screenPoint(state, base.x + perp.x * width * 0.16, base.y + perp.y * width * 0.16);
  const coreRightBase = screenPoint(state, base.x - perp.x * width * 0.16, base.y - perp.y * width * 0.16);
  const coreTip = screenPoint(state, base.x + back.x * length * 0.58, base.y + back.y * length * 0.58);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = spawnAlpha * (0.34 + thrust * 0.34);
  const gradient = ctx.createLinearGradient(baseScreen.x, baseScreen.y, tipScreen.x, tipScreen.y);
  gradient.addColorStop(0, "rgba(239, 246, 255, 0.92)");
  gradient.addColorStop(0.22, "rgba(56, 189, 248, 0.78)");
  gradient.addColorStop(0.62, "rgba(251, 191, 36, 0.5)");
  gradient.addColorStop(1, "rgba(249, 115, 22, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(leftBase.x, leftBase.y);
  ctx.quadraticCurveTo(leftMid.x, leftMid.y, tipScreen.x, tipScreen.y);
  ctx.quadraticCurveTo(rightMid.x, rightMid.y, rightBase.x, rightBase.y);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = spawnAlpha * (0.48 + thrust * 0.25);
  ctx.fillStyle = "rgba(239, 246, 255, 0.74)";
  ctx.beginPath();
  ctx.moveTo(baseScreen.x, baseScreen.y);
  ctx.lineTo(coreLeftBase.x, coreLeftBase.y);
  ctx.lineTo(coreTip.x, coreTip.y);
  ctx.lineTo(coreRightBase.x, coreRightBase.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEngineFlamesAt(ctx: CanvasRenderingContext2D, state: GameState, aircraft: Aircraft) {
  const cobraPitch = aircraft.side === "player" ? Math.sin(((aircraft.cobraTimer ?? 0) / 1.05) * Math.PI) : 0;
  const size = getAircraftDrawSize(aircraft);
  const spawnAlpha = aircraft.side === "enemy" ? clamp(1 - (aircraft.spawnWarmup ?? 0) / 1.9, 0.18, 1) : 1;
  for (const port of getEnginePorts(aircraft)) {
    drawEngineFlame(ctx, state, aircraft, port, size, cobraPitch, spawnAlpha);
  }
}

function drawJet(ctx: CanvasRenderingContext2D, planeId: PlaneId | EnemyKind, team: Aircraft["side"], cobraProgress = 0) {
  const enemy = team === "enemy";
  const naval = planeId === "j15";
  const delta = planeId === "j10";
  const slender = planeId === "j8";
  const pitch = Math.sin(cobraProgress * Math.PI);
  const body = enemy ? "#9f1239" : naval ? "#475569" : delta ? "#64748b" : "#d1d5db";
  const dark = enemy ? "#450a0a" : "#1f2937";
  const stripe = enemy ? "#fca5a5" : "#ef4444";

  ctx.save();
  ctx.scale(0.74 + pitch * 0.08, 0.74 - pitch * 0.05);
  ctx.strokeStyle = "rgba(2,6,23,0.72)";
  ctx.lineWidth = 2;
  ctx.fillStyle = body;

  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.bezierCurveTo(12, -28, 12, 24, 5, 48);
  ctx.lineTo(-5, 48);
  ctx.bezierCurveTo(-12, 24, -12, -28, 0, -46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = enemy ? "#7f1d1d" : "#94a3b8";
  ctx.beginPath();
  if (slender) {
    ctx.moveTo(-8, -8);
    ctx.lineTo(-66, 18);
    ctx.lineTo(-46, 31);
    ctx.lineTo(-8, 18);
    ctx.moveTo(8, -8);
    ctx.lineTo(66, 18);
    ctx.lineTo(46, 31);
    ctx.lineTo(8, 18);
  } else if (delta) {
    ctx.moveTo(-8, -10);
    ctx.lineTo(-72, 34);
    ctx.lineTo(-22, 42);
    ctx.lineTo(-6, 16);
    ctx.moveTo(8, -10);
    ctx.lineTo(72, 34);
    ctx.lineTo(22, 42);
    ctx.lineTo(6, 16);
  } else {
    ctx.moveTo(-9, -8);
    ctx.lineTo(-82, 20);
    ctx.lineTo(-54, 42);
    ctx.lineTo(-8, 20);
    ctx.moveTo(9, -8);
    ctx.lineTo(82, 20);
    ctx.lineTo(54, 42);
    ctx.lineTo(8, 20);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-5, 32);
  ctx.lineTo(-32, 60);
  ctx.lineTo(-10, 62);
  ctx.lineTo(0, 45);
  ctx.lineTo(10, 62);
  ctx.lineTo(32, 60);
  ctx.lineTo(5, 32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (delta) {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(-8, -25);
    ctx.lineTo(-30, -14);
    ctx.lineTo(-8, -7);
    ctx.moveTo(8, -25);
    ctx.lineTo(30, -14);
    ctx.lineTo(8, -7);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#082f49";
  ctx.beginPath();
  ctx.ellipse(0, -22, 7, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = stripe;
  drawRoundRect(ctx, -3, -12, 6, 42, 3);
  ctx.fill();
  ctx.fillStyle = "rgba(251,146,60,0.88)";
  ctx.beginPath();
  ctx.moveTo(-8, 49);
  ctx.lineTo(-3, 68);
  ctx.lineTo(0, 49);
  ctx.lineTo(3, 68);
  ctx.lineTo(8, 49);
  ctx.fill();
  ctx.restore();
}

function drawAircraftAt(ctx: CanvasRenderingContext2D, state: GameState, aircraft: Aircraft, sprites: HTMLImageElement | null) {
  const p = screenPoint(state, aircraft.x, aircraft.y);
  const playerCobra = aircraft.side === "player" ? (aircraft.cobraTimer ?? 0) / 1.05 : 0;
  const cobraPitch = Math.sin(playerCobra * Math.PI);
  const bank = clamp(aircraft.bank ?? 0, -1, 1);
  const size = getAircraftDrawSize(aircraft);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(aircraft.angle + Math.PI / 2);
  if (aircraft.side === "player" && (aircraft.invulnerable ?? 0) > 0) {
    ctx.globalAlpha = 0.62 + Math.sin(state.time * 26) * 0.2;
  }
  ctx.rotate(bank * 0.08);
  ctx.transform(1, 0, bank * 0.12, 1 - Math.abs(bank) * 0.08 - cobraPitch * 0.14, 0, 0);
  if (aircraft.side === "enemy") {
    ctx.globalAlpha *= clamp(1 - (aircraft.spawnWarmup ?? 0) / 1.9, 0.18, 1);
  }
  const drewSprite = drawAircraftSprite(ctx, sprites, getAircraftSpriteKey(aircraft.kind, aircraft.side), size * (1 + cobraPitch * 0.06));
  if (!drewSprite) drawJet(ctx, aircraft.kind, aircraft.side, playerCobra);
  if (playerCobra > 0) {
    ctx.globalAlpha = 0.24 + cobraPitch * 0.28;
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, size * 0.12);
    ctx.quadraticCurveTo(0, size * 0.42, size * 0.22, size * 0.12);
    ctx.stroke();
  }
  ctx.restore();

  if (aircraft.side !== "player" && aircraft.hp < aircraft.maxHp) {
    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,0.52)";
    drawRoundRect(ctx, p.x - size * 0.36, p.y - size * 0.48, size * 0.72, 5, 3);
    ctx.fill();
    ctx.fillStyle = aircraft.side === "enemy" ? "#fb7185" : "#22c55e";
    drawRoundRect(ctx, p.x - size * 0.36, p.y - size * 0.48, size * 0.72 * clamp(aircraft.hp / aircraft.maxHp, 0, 1), 5, 3);
    ctx.fill();
    ctx.restore();
  }
}

function drawWreckAt(ctx: CanvasRenderingContext2D, state: GameState, wreck: Wreck, sprites: HTMLImageElement | null) {
  const p = screenPoint(state, wreck.x, wreck.y);
  const alpha = clamp(wreck.life / wreck.maxLife, 0, 1);
  const fakeAircraft = { kind: wreck.kind, side: wreck.side } as Aircraft;
  const size = getAircraftDrawSize(fakeAircraft) * (wreck.kind === "boss" ? 1 : 0.88);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(wreck.angle + Math.PI / 2);
  ctx.globalAlpha = alpha * 0.52;
  const drewSprite = drawAircraftSprite(ctx, sprites, getAircraftSpriteKey(wreck.kind, wreck.side), size);
  if (!drewSprite) drawJet(ctx, wreck.kind, wreck.side, 0);
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(15,23,42,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, 4, wreck.radius * 1.2, wreck.radius * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTanker(ctx: CanvasRenderingContext2D, state: GameState, tanker: Tanker, sprites: HTMLImageElement | null) {
  const p = screenPoint(state, tanker.x, tanker.y);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(tanker.angle + Math.PI / 2);
  ctx.globalAlpha = tanker.refueling ? 1 : 0.92;
  if (drawAircraftSprite(ctx, sprites, "tanker", 172)) {
    if (tanker.refueling) {
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 42);
      ctx.lineTo(0, 98);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = tanker.refueling ? "#bae6fd" : "#e2e8f0";
  ctx.strokeStyle = "rgba(15,23,42,0.68)";
  ctx.lineWidth = 2;
  drawRoundRect(ctx, -13, -58, 26, 96, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#94a3b8";
  ctx.beginPath();
  ctx.moveTo(-13, -16);
  ctx.lineTo(-96, 18);
  ctx.lineTo(-62, 36);
  ctx.lineTo(-12, 14);
  ctx.moveTo(13, -16);
  ctx.lineTo(96, 18);
  ctx.lineTo(62, 36);
  ctx.lineTo(12, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 38);
  ctx.lineTo(0, 86);
  ctx.stroke();
  ctx.restore();
}

function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  sprites: HTMLImageElement | null,
  weaponSprites: HTMLImageElement | null,
  terrain: HTMLImageElement | null,
) {
  drawSky(ctx, state, terrain);
  const shakeX = state.shake ? randomBetween(-state.shake, state.shake) * 0.18 : 0;
  const shakeY = state.shake ? randomBetween(-state.shake, state.shake) * 0.18 : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  for (const smoke of state.smokes) {
    const p = screenPoint(state, smoke.x, smoke.y);
    const alpha = clamp(smoke.life / smoke.maxLife, 0, 1);
    ctx.fillStyle = `rgba(51,65,85,${0.22 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, smoke.radius * 1.5, smoke.radius, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const tanker of state.tankers) drawTanker(ctx, state, tanker, sprites);
  for (const wreck of state.wrecks) drawWreckAt(ctx, state, wreck, sprites);
  for (const ally of state.allies) drawEngineFlamesAt(ctx, state, ally);
  for (const enemy of state.enemies) drawEngineFlamesAt(ctx, state, enemy);
  drawEngineFlamesAt(ctx, state, state.player);
  for (const ally of state.allies) drawAircraftAt(ctx, state, ally, sprites);
  for (const enemy of state.enemies) drawAircraftAt(ctx, state, enemy, sprites);
  drawAircraftAt(ctx, state, state.player, sprites);

  for (const bullet of state.bullets) {
    const p = screenPoint(state, bullet.x, bullet.y);
    const angle = Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    if (bullet.kind === "missile") {
      const missileWidth = bullet.owner === "enemy" ? 8 : 11;
      const missileHeight = bullet.owner === "enemy" ? 30 : 38;
      const drewMissile = drawWeaponSprite(ctx, weaponSprites, bullet.blastRadius && bullet.blastRadius > 92 ? "heavyMissile" : "missile", missileWidth, missileHeight);
      if (!drewMissile) {
        ctx.fillStyle = "#e5e7eb";
        ctx.beginPath();
        ctx.moveTo(0, -missileHeight * 0.52);
        ctx.lineTo(missileWidth * 0.28, -missileHeight * 0.32);
        ctx.lineTo(missileWidth * 0.24, missileHeight * 0.32);
        ctx.lineTo(-missileWidth * 0.24, missileHeight * 0.32);
        ctx.lineTo(-missileWidth * 0.28, -missileHeight * 0.32);
        ctx.closePath();
        ctx.fill();
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.36;
      ctx.fillStyle = "rgba(251, 146, 60, 0.62)";
      ctx.beginPath();
      ctx.moveTo(-1.2, missileHeight * 0.45);
      ctx.quadraticCurveTo(-2.8, missileHeight * 0.58, 0, missileHeight * 0.72);
      ctx.quadraticCurveTo(2.8, missileHeight * 0.58, 1.2, missileHeight * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      const tracerWidth = bullet.owner === "enemy" ? 8 : 9;
      const tracerHeight = bullet.owner === "enemy" ? 36 : 40;
      const drewTracer = drawWeaponSprite(ctx, weaponSprites, bullet.owner === "enemy" ? "enemyTracer" : "playerTracer", tracerWidth, tracerHeight);
      if (!drewTracer) {
        ctx.fillStyle = bullet.owner === "enemy" ? "#fca5a5" : "#fff7ad";
        drawRoundRect(ctx, -1.25, -bullet.length * 1.25, 2.5, bullet.length * 1.25, 1.4);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  for (const explosion of state.explosions) {
    const p = screenPoint(state, explosion.x, explosion.y);
    const progress = 1 - explosion.life / explosion.maxLife;
    ctx.globalAlpha = clamp(explosion.life / explosion.maxLife, 0, 1);
    ctx.save();
    ctx.translate(p.x, p.y);
    const spriteSize = Math.max(24, explosion.radius * (0.7 + progress * 1.25));
    const drewBlast = drawWeaponSprite(ctx, weaponSprites, explosion.color === "#facc15" ? "blast" : "smoke", spriteSize, spriteSize);
    ctx.restore();
    if (!drewBlast) {
      ctx.strokeStyle = explosion.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, explosion.radius * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha *= 0.2;
      ctx.fillStyle = explosion.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, explosion.radius * progress * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  for (const floater of state.floaters) {
    const p = screenPoint(state, floater.x, floater.y);
    ctx.globalAlpha = clamp(floater.life / floater.maxLife, 0, 1);
    ctx.fillStyle = floater.color;
    ctx.font = "800 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(floater.text, p.x, p.y);
    ctx.globalAlpha = 1;
  }

  if (state.phase === "paused") {
    ctx.fillStyle = "rgba(2,6,23,0.36)";
    ctx.fillRect(-shakeX, -shakeY, VIEW_WIDTH, VIEW_HEIGHT);
  }
  ctx.restore();
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const keysRef = useRef(new Set<string>());
  const joystickRef = useRef<InputState>({ throttle: 0, turn: 0 });
  const spritesRef = useRef<HTMLImageElement | null>(null);
  const weaponSpritesRef = useRef<HTMLImageElement | null>(null);
  const terrainRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const scaleRef = useRef({ x: 1, y: 1, dpr: 1 });
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [hud, setHud] = useState<HudState>(initialHud);
  const [credits, setCredits] = useState(300);
  const [campaignStage, setCampaignStage] = useState(1);
  const [selectedPlane, setSelectedPlane] = useState<PlaneId>("j8");
  const [planeUpgrades, setPlaneUpgrades] = useState<PlaneUpgradeState>(createDefaultPlaneUpgrades);
  const [unlockedPlanes, setUnlockedPlanes] = useState<PlaneUnlockState>(defaultUnlockedPlanes);
  const [joystick, setJoystick] = useState({ x: 0, y: 0, active: false });
  const upgrades = planeUpgrades[selectedPlane] ?? defaultUpgrades;

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    scaleRef.current = { x: rect.width / VIEW_WIDTH, y: rect.height / VIEW_HEIGHT, dpr };
  }, []);

  const syncHud = useCallback(() => {
    const state = gameRef.current;
    if (!state) return;
    setHud(snapshot(state));
    setPhase(state.phase);
  }, []);

  const readInput = useCallback((): InputState => {
    const keys = keysRef.current;
    const keyboard = {
      turn: (keys.has("a") ? -1 : 0) + (keys.has("d") ? 1 : 0),
      throttle: (keys.has("w") ? 1 : 0) + (keys.has("s") ? -1 : 0),
    };
    return {
      turn: clamp(keyboard.turn + joystickRef.current.turn, -1, 1),
      throttle: clamp(keyboard.throttle + joystickRef.current.throttle, -1, 1),
    };
  }, []);

  useEffect(() => {
    const aircraftImage = new Image();
    aircraftImage.src = AIRCRAFT_SPRITES_URL;
    aircraftImage.onload = () => {
      spritesRef.current = aircraftImage;
    };

    const weaponImage = new Image();
    weaponImage.src = WEAPON_SPRITES_URL;
    weaponImage.onload = () => {
      weaponSpritesRef.current = weaponImage;
    };

    const terrainImage = new Image();
    terrainImage.src = TERRAIN_TILE_URL;
    terrainImage.onload = () => {
      terrainRef.current = terrainImage;
    };
    return () => {
      aircraftImage.onload = null;
      weaponImage.onload = null;
      terrainImage.onload = null;
    };
  }, []);

  const startRun = useCallback(
    (mode: GameMode, stageNumber = campaignStage) => {
      const safeStage = mode === "stage" ? normalizeStageNumber(stageNumber) : 1;
      const safePlane = planeCatalog.some((planeItem) => planeItem.id === selectedPlane) ? selectedPlane : "j8";
      const safeUpgrades = sanitizeUpgrades((planeUpgrades[safePlane] ?? defaultUpgrades) as Record<string, unknown>);
      let state: GameState;
      try {
        state = createGameState(
          Math.max(readBestScore(), gameRef.current?.bestScore ?? 0),
          safeUpgrades,
          safePlane,
          mode,
          safeStage,
        );
      } catch {
        state = createGameState(Math.max(readBestScore(), gameRef.current?.bestScore ?? 0), { ...defaultUpgrades }, "j8", mode, 1);
        addFloater(state, "关卡状态已重置", state.player.x, state.player.y - 90, "#bae6fd");
      }
      state.phase = "running";
      gameRef.current = state;
      setPhase("running");
      setHud(snapshot(state));
    },
    [campaignStage, planeUpgrades, selectedPlane],
  );

  const startStageGame = useCallback(() => startRun("stage", campaignStage), [campaignStage, startRun]);
  const startEndlessGame = useCallback(() => startRun("endless"), [startRun]);
  const startNextStage = useCallback(() => startRun("stage", Math.max(campaignStage, hud.stage + 1)), [campaignStage, hud.stage, startRun]);

  const returnToMenu = useCallback(() => {
    const state = createGameState(Math.max(readBestScore(), gameRef.current?.bestScore ?? 0), upgrades, selectedPlane);
    state.phase = "menu";
    gameRef.current = state;
    setPhase("menu");
    setHud(snapshot(state));
  }, [selectedPlane, upgrades]);

  const openHangar = useCallback(() => {
    const state = gameRef.current;
    if (!state || state.phase === "running" || state.phase === "playerDying") return;
    state.phase = "hangar";
    setPhase("hangar");
    setHud(snapshot(state));
  }, []);

  const selectPlane = useCallback(
    (planeId: PlaneId) => {
      if (!unlockedPlanes[planeId]) return;
      setSelectedPlane(planeId);
      saveSelectedPlane(planeId);
      const state = gameRef.current;
      if (state && state.phase !== "running" && state.phase !== "playerDying") {
        const preview = createGameState(Math.max(readBestScore(), state.bestScore), planeUpgrades[planeId] ?? defaultUpgrades, planeId);
        preview.phase = state.phase;
        preview.earnedCredits = state.earnedCredits;
        gameRef.current = preview;
        setHud(snapshot(preview));
      }
    },
    [planeUpgrades, unlockedPlanes],
  );

  const unlockPlane = useCallback(
    (planeId: PlaneId) => {
      const plane = getPlaneMeta(planeId);
      if (unlockedPlanes[planeId]) {
        selectPlane(planeId);
        return;
      }
      if (credits < plane.unlockCost) return;
      const nextCredits = credits - plane.unlockCost;
      const nextUnlocked = { ...unlockedPlanes, [planeId]: true };
      setCredits(nextCredits);
      setUnlockedPlanes(nextUnlocked);
      setSelectedPlane(planeId);
      saveCredits(nextCredits);
      saveUnlockedPlanes(nextUnlocked);
      saveSelectedPlane(planeId);
      const state = gameRef.current;
      if (state && state.phase !== "running" && state.phase !== "playerDying") {
        const preview = createGameState(Math.max(readBestScore(), state.bestScore), planeUpgrades[planeId] ?? defaultUpgrades, planeId);
        preview.phase = state.phase;
        preview.earnedCredits = state.earnedCredits;
        gameRef.current = preview;
        setHud(snapshot(preview));
      }
    },
    [credits, planeUpgrades, selectPlane, unlockedPlanes],
  );

  const buyUpgrade = useCallback(
    (meta: UpgradeMeta) => {
      const current = planeUpgrades[selectedPlane] ?? defaultUpgrades;
      const level = current[meta.key];
      const cost = getUpgradeCost(meta, level);
      if (level >= meta.max || credits < cost) return;
      const nextCredits = credits - cost;
      const nextUpgrades = { ...current, [meta.key]: level + 1 };
      const nextPlaneUpgrades = { ...planeUpgrades, [selectedPlane]: nextUpgrades };
      setCredits(nextCredits);
      setPlaneUpgrades(nextPlaneUpgrades);
      saveCredits(nextCredits);
      savePlaneUpgrades(nextPlaneUpgrades);
    },
    [credits, planeUpgrades, selectedPlane],
  );

  const togglePause = useCallback(() => {
    const state = gameRef.current;
    if (!state) return;
    if (state.phase === "running") state.phase = "paused";
    else if (state.phase === "paused") state.phase = "running";
    else if (state.phase === "menu" || state.phase === "hangar" || state.phase === "over" || state.phase === "stageClear") startEndlessGame();
    syncHud();
  }, [startEndlessGame, syncHud]);

  const useMissile = useCallback(() => {
    const state = gameRef.current;
    if (!state) return;
    fireMissile(state);
    syncHud();
  }, [syncHud]);

  const callTanker = useCallback(() => {
    const state = gameRef.current;
    if (!state) return;
    requestRefuel(state);
    syncHud();
  }, [syncHud]);

  const useCobra = useCallback(() => {
    const state = gameRef.current;
    if (!state) return;
    startCobra(state);
    syncHud();
  }, [syncHud]);

  useEffect(() => {
    const storedUpgrades = readPlaneUpgrades();
    const storedUnlocked = readUnlockedPlanes();
    const storedStage = readCampaignStage();
    const storedPlane = readSelectedPlane(storedUnlocked);
    setPlaneUpgrades(storedUpgrades);
    setUnlockedPlanes(storedUnlocked);
    setCredits(readCredits());
    setCampaignStage(storedStage);
    setSelectedPlane(storedPlane);
    const initial = createGameState(readBestScore(), storedUpgrades[storedPlane] ?? defaultUpgrades, storedPlane);
    gameRef.current = initial;
    setHud(snapshot(initial));

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (stageRef.current) observer.observe(stageRef.current);
    let last = performance.now();
    let hudTimer = 0;
    const tick = (now: number) => {
      const state = gameRef.current;
      if (!state) return;
      const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
      last = now;
      const previousPhase = state.phase;
      updateGame(state, dt, readInput());

      if (state.phase === "stageClear" && !state.rewardClaimed) {
        state.rewardClaimed = true;
        state.earnedCredits = state.stageReward;
        setCredits((value) => {
          const next = value + state.stageReward;
          saveCredits(next);
          return next;
        });
        setCampaignStage((value) => {
          const next = Math.max(value, state.stage + 1);
          saveCampaignStage(next);
          return next;
        });
      }

      if (state.phase === "over" && !state.rewardClaimed) {
        state.rewardClaimed = true;
        state.earnedCredits = state.mode === "endless" ? Math.max(30, Math.floor(state.score / 8)) : 0;
        if (state.earnedCredits > 0) {
          setCredits((value) => {
            const next = value + state.earnedCredits;
            saveCredits(next);
            return next;
          });
        }
      }

      const context = canvasRef.current?.getContext("2d");
      if (context) {
        const { x, y, dpr } = scaleRef.current;
        context.setTransform(dpr * x, 0, 0, dpr * y, 0, 0);
        drawGame(context, state, spritesRef.current, weaponSpritesRef.current, terrainRef.current);
        context.setTransform(1, 0, 0, 1, 0, 0);
      }

      hudTimer += dt;
      if (hudTimer > 0.08 || previousPhase !== state.phase) {
        hudTimer = 0;
        setHud(snapshot(state));
        if (previousPhase !== state.phase) setPhase(state.phase);
      }
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => {
      observer.disconnect();
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [readInput, resizeCanvas]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        keysRef.current.add(key);
      }
      if (key === "q" && !event.repeat) {
        event.preventDefault();
        useMissile();
      }
      if (key === "e" && !event.repeat) {
        event.preventDefault();
        callTanker();
      }
      if (key === " " && !event.repeat) {
        event.preventDefault();
        useCobra();
      }
      if (key === "p" && !event.repeat) togglePause();
      if (key === "enter" && !event.repeat) startEndlessGame();
    };
    const handleKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [callTanker, startEndlessGame, togglePause, useCobra, useMissile]);

  const handleJoystickMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = Math.min(rect.width, rect.height) * 0.36;
    const rawX = clamp(event.clientX - centerX, -maxDistance, maxDistance);
    const rawY = clamp(event.clientY - centerY, -maxDistance, maxDistance);
    joystickRef.current = {
      turn: clamp(rawX / maxDistance, -1, 1),
      throttle: clamp(-rawY / maxDistance, -1, 1),
    };
    setJoystick({ x: rawX, y: rawY, active: true });
  }, []);

  const handleJoystickStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      handleJoystickMove(event);
    },
    [handleJoystickMove],
  );

  const resetJoystick = useCallback(() => {
    joystickRef.current = { throttle: 0, turn: 0 };
    setJoystick({ x: 0, y: 0, active: false });
  }, []);

  const plane = getPlaneMeta(selectedPlane);
  const hpPercent = clamp(hud.hp / Math.max(1, hud.maxHp), 0, 1) * 100;
  const fuelPercent = clamp(hud.fuel / Math.max(1, hud.maxFuel), 0, 1) * 100;
  const bossPercent = clamp(hud.bossHp / Math.max(1, hud.bossMaxHp), 0, 1) * 100;
  const showBattleUi = phase === "running" || phase === "paused" || phase === "playerDying";
  const showPanel = phase !== "running" && phase !== "playerDying";
  const showMainMenu = phase === "menu";
  const showHangar = phase === "hangar";
  const showOver = phase === "over";
  const showStageClear = phase === "stageClear";
  const showPause = phase === "paused";

  return (
    <main className="game-shell">
      <section className="game-stage-wrap" aria-label="无限空战游戏区">
        <div className="game-stage" ref={stageRef}>
          <canvas
            ref={canvasRef}
            className="game-canvas"
            width={VIEW_WIDTH}
            height={VIEW_HEIGHT}
            aria-label="无限空战画面"
          />

          {showBattleUi && (
            <>
              <div className="radar-panel" aria-label="雷达">
                <div className="radar-title">
                  <span>雷达</span>
                  <strong>{hud.radarBlips.filter((blip) => blip.side === "enemy").length}</strong>
                </div>
                <div className="radar-scope">
                  <i className="radar-ring one" />
                  <i className="radar-ring two" />
                  <i className="radar-sweep" />
                  <i className="radar-player" />
                  {hud.radarBlips.map((blip) => (
                    <i
                      className={[
                        "radar-blip",
                        blip.side === "enemy" ? "enemy" : "ally",
                        blip.boss ? "boss" : "",
                      ].filter(Boolean).join(" ")}
                      key={blip.id}
                      style={{ left: `${blip.x}%`, top: `${blip.y}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="hud-strip" aria-live="polite">
                <div>
                  <span>{hud.mode === "stage" ? `第 ${hud.stage} 关` : "分数"}</span>
                  <strong>{hud.mode === "stage" ? `${hud.stageKills}/${hud.stageTarget}` : hud.score}</strong>
                </div>
                <div>
                  <span>速度</span>
                  <strong>{hud.speed}</strong>
                </div>
                <div>
                  <span>僚机</span>
                  <strong>{hud.allies}</strong>
                </div>
              </div>

              <div className="engine-panel" aria-label="发动机状态">
                <div>
                  <span>发动机状态</span>
                  <strong>{hud.engineStatus}</strong>
                </div>
                <div className="mini-meter">
                  <i style={{ width: `${hud.heat}%` }} />
                </div>
                <div>
                  <span>燃油</span>
                  <strong>
                    {hud.fuel}/{hud.maxFuel}
                  </strong>
                </div>
                <div className="fuel-meter">
                  <i style={{ width: `${fuelPercent}%` }} />
                </div>
                <small>
                  加油机 {hud.tankerCallsLeft}/{hud.tankerCallsMax}
                </small>
              </div>

              {hud.bossMaxHp > 0 && (
                <div className="boss-hp" aria-label={`Boss血量 ${hud.bossHp}/${hud.bossMaxHp}`}>
                  <div className="boss-hp-meta">
                    <span>BOSS</span>
                    <strong>
                      {hud.bossHp}/{hud.bossMaxHp}
                    </strong>
                  </div>
                  <div className="boss-meter">
                    <i style={{ width: `${bossPercent}%` }} />
                  </div>
                </div>
              )}

              <div className="battle-hp" aria-label={`血量 ${hud.hp}/${hud.maxHp}`}>
                <div className="battle-hp-meta">
                  <span>机体</span>
                  <strong>
                    {hud.hp}/{hud.maxHp}
                  </strong>
                </div>
                <div className="hp-meter">
                  <i style={{ width: `${hpPercent}%` }} />
                </div>
              </div>
            </>
          )}

          {showPanel && (
            <div className={showHangar ? "start-panel hangar-panel" : "start-panel"}>
              {showMainMenu && (
                <>
                  <p>无限空战</p>
                  <h1>飞机大战</h1>
                  <div className="main-plane-summary">
                    <div className={`plane-preview plane-${selectedPlane}`} aria-hidden="true">
                      <i />
                    </div>
                    <span>当前战机</span>
                    <strong>{plane.label}</strong>
                    <em>
                      血量 {getMaxHp(upgrades, selectedPlane)} / 燃油 {getMaxFuel(upgrades, selectedPlane)}
                    </em>
                  </div>
                  <div className="mode-actions">
                    <button className="primary-action mode-action" type="button" onClick={startStageGame}>
                      <span>关卡出击</span>
                      <small>第 {campaignStage} 关 · 奖励 {getStageReward(campaignStage)}</small>
                    </button>
                    <button className="secondary-action mode-action" type="button" onClick={startEndlessGame}>
                      <span>无尽模式</span>
                      <small>开放空域 · 持续追击</small>
                    </button>
                  </div>
                  <div className="panel-actions">
                    <button className="secondary-action" type="button" onClick={openHangar}>
                      进入机库
                    </button>
                  </div>
                </>
              )}

              {showHangar && (
                <>
                  <p>战机机库</p>
                  <h1>机库</h1>
                  <div className="hangar-summary">
                    <div>
                      <span>战功</span>
                      <strong>{credits}</strong>
                    </div>
                    <div>
                      <span>最高分</span>
                      <strong>{hud.bestScore}</strong>
                    </div>
                    <div>
                      <span>关卡</span>
                      <strong>{campaignStage}</strong>
                    </div>
                  </div>
                  <div className="plane-list" aria-label="选择战机">
                    {planeCatalog.map((item) => {
                      const unlocked = unlockedPlanes[item.id];
                      const currentUpgrades = planeUpgrades[item.id] ?? defaultUpgrades;
                      const active = selectedPlane === item.id;
                      const unlockable = credits >= item.unlockCost;
                      return (
                        <button
                          className={["plane-card", active ? "active" : "", unlocked ? "unlocked" : "locked"].filter(Boolean).join(" ")}
                          type="button"
                          key={item.id}
                          onClick={() => (unlocked ? selectPlane(item.id) : unlockPlane(item.id))}
                          disabled={!unlocked && !unlockable}
                        >
                          <div className={`plane-preview plane-${item.id}`} aria-hidden="true">
                            <i />
                          </div>
                          <span>
                            {item.label}
                            <small>{item.role}</small>
                          </span>
                          <strong>
                            {unlocked
                              ? `血量 ${getMaxHp(currentUpgrades, item.id)} · 燃油 ${getMaxFuel(currentUpgrades, item.id)}`
                              : `${unlockable ? "解锁" : "需要"} ${item.unlockCost} 战功`}
                          </strong>
                        </button>
                      );
                    })}
                  </div>
                  <div className="upgrade-list" aria-label="战机升级">
                    {upgradeCatalog.map((meta) => {
                      const level = upgrades[meta.key];
                      const cost = getUpgradeCost(meta, level);
                      const maxed = level >= meta.max;
                      return (
                        <button
                          className="upgrade-card"
                          type="button"
                          key={meta.key}
                          onClick={() => buyUpgrade(meta)}
                          disabled={maxed || credits < cost}
                        >
                          <span>
                            {meta.label}
                            <small>
                              {level}/{meta.max}
                            </small>
                          </span>
                          <em>{meta.description}</em>
                          <strong>{maxed ? "已满级" : `${cost} 战功`}</strong>
                        </button>
                      );
                    })}
                  </div>
                  <div className="panel-actions">
                    <button className="primary-action" type="button" onClick={startStageGame}>
                      关卡出击
                    </button>
                    <button className="secondary-action" type="button" onClick={startEndlessGame}>
                      无尽模式
                    </button>
                    <button className="secondary-action" type="button" onClick={returnToMenu}>
                      返回主界面
                    </button>
                  </div>
                </>
              )}

              {showPause && (
                <>
                  <p>战斗暂停</p>
                  <h1>飞机大战</h1>
                  <div className="panel-actions">
                    <button className="primary-action" type="button" onClick={togglePause}>
                      继续战斗
                    </button>
                    <button className="secondary-action" type="button" onClick={returnToMenu}>
                      返回主界面
                    </button>
                  </div>
                </>
              )}

              {showOver && (
                <>
                  <p>任务结束</p>
                  <h1>飞机大战</h1>
                  <div className="hangar-summary">
                    <div>
                      <span>分数</span>
                      <strong>{hud.score}</strong>
                    </div>
                    <div>
                      <span>战功</span>
                      <strong>+{hud.earnedCredits}</strong>
                    </div>
                    <div>
                      <span>最高分</span>
                      <strong>{hud.bestScore}</strong>
                    </div>
                  </div>
                  <div className="panel-actions">
                    <button className="primary-action" type="button" onClick={() => (hud.mode === "stage" ? startRun("stage", hud.stage) : startEndlessGame())}>
                      {hud.mode === "stage" ? "重试关卡" : "再次出击"}
                    </button>
                    <button className="secondary-action" type="button" onClick={openHangar}>
                      进入机库
                    </button>
                    <button className="secondary-action" type="button" onClick={returnToMenu}>
                      返回主界面
                    </button>
                  </div>
                </>
              )}

              {showStageClear && (
                <>
                  <p>关卡完成</p>
                  <h1>第 {hud.stage} 关胜利</h1>
                  <div className="hangar-summary">
                    <div>
                      <span>分数</span>
                      <strong>{hud.score}</strong>
                    </div>
                    <div>
                      <span>奖励</span>
                      <strong>+{hud.earnedCredits || hud.stageReward}</strong>
                    </div>
                    <div>
                      <span>下一关</span>
                      <strong>{hud.stage + 1}</strong>
                    </div>
                  </div>
                  <div className="panel-actions">
                    <button className="primary-action" type="button" onClick={startNextStage}>
                      下一关
                    </button>
                    <button className="secondary-action" type="button" onClick={openHangar}>
                      进入机库
                    </button>
                    <button className="secondary-action" type="button" onClick={returnToMenu}>
                      返回主界面
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {phase === "running" && (
            <div className="mobile-controls" aria-label="移动端控制">
              <div
                className={`joystick-zone ${joystick.active ? "is-active" : ""}`}
                onPointerDown={handleJoystickStart}
                onPointerMove={handleJoystickMove}
                onPointerUp={resetJoystick}
                onPointerCancel={resetJoystick}
                role="application"
                aria-label="摇杆"
              >
                <div className="joystick-base">
                  <div
                    className="joystick-stick"
                    style={{ transform: `translate(${joystick.x}px, ${joystick.y}px)` }}
                  />
                </div>
              </div>
              <div className="action-cluster">
                <button type="button" onClick={useCobra}>
                  机动
                </button>
                <button type="button" onClick={callTanker} disabled={hud.tankerCallsLeft <= 0}>
                  加油
                </button>
                <button type="button" onClick={useMissile} disabled={hud.missileAmmo <= 0}>
                  导弹
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
