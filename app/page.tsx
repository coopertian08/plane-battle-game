"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 800;
function publicAssetUrl(fileName: string) {
  if (typeof window === "undefined") return `/${fileName}`;
  const firstSegment = window.location.hostname.endsWith("github.io")
    ? window.location.pathname.split("/").filter(Boolean)[0]
    : "";
  return `${firstSegment ? `/${firstSegment}` : ""}/${fileName}`;
}

const AIRCRAFT_SPRITES_URL = publicAssetUrl("aircraft-sprites.png");
const WW2_AIRCRAFT_SPRITES_URL = publicAssetUrl("ww2-aircraft-sprites.png");
const WEAPON_SPRITES_URL = publicAssetUrl("weapon-sprites.png");
const SUPPORT_SPRITES_URL = publicAssetUrl("support-sprites.png");
const TERRAIN_TILE_URL = publicAssetUrl("terrain-tile.png");
const STORY_TERRAIN_TILE_URL = publicAssetUrl("story-terrain-tile.png");
const AIRPORT_RUNWAY_URL = publicAssetUrl("airport-runway.png");
const TERRAIN_TILE_SIZE = 1600;
const TAKEOFF_RUNWAY_WORLD_WIDTH = 4600;
const SPRITE_COLUMNS = 10;
const SPRITE_ROWS = 3;
const WW2_SPRITE_COLUMNS = 5;
const WW2_SPRITE_ROWS = 2;
const CHINA_PLANE_IDS = ["j7", "j8", "j10", "j11", "j15", "j16", "jh7", "j20", "j35", "fc31"] as const;
const USA_PLANE_IDS = ["f4", "f5", "f14", "f15", "f16", "f18", "f22", "f35", "f117", "f18c"] as const;
const RUSSIA_PLANE_IDS = ["mig21", "mig23", "mig29", "mig31", "mig35", "su27", "su30", "su33", "su35", "su57"] as const;
const PLANE_IDS = [...CHINA_PLANE_IDS, ...USA_PLANE_IDS, ...RUSSIA_PLANE_IDS] as const;
const FACTION_IDS = ["china", "usa", "russia"] as const;
const WEAPON_COLUMNS = 3;
const WEAPON_ROWS = 2;
const SUPPORT_COLUMNS = 4;
const SUPPORT_ROWS = 1;
const BEST_SCORE_KEY = "plane-battle-best-score";
const CREDITS_KEY = "plane-battle-credits";
const UPGRADES_KEY = "plane-battle-upgrades";
const INVENTORY_KEY = "plane-battle-inventory";
const DAILY_CHECKIN_KEY = "plane-battle-daily-checkin";
const PLANE_KEY = "plane-battle-selected-plane";
const UNLOCKED_PLANES_KEY = "plane-battle-unlocked-planes";
const CAMPAIGN_STAGE_KEY = "plane-battle-campaign-stage";
const STORY_PROGRESS_KEY = "plane-battle-story-progress";
const GAME_VERSION = "1.05";
const STORY_UNLOCK_STAGE = 10;
const SAVE_SCHEMA_VERSION = "1.0";
const SAVE_VERSION_KEY = "plane-battle-save-version";
const TUTORIAL_KEY = "plane-battle-tutorial-1.01";
const RESETTABLE_SAVE_KEYS = [
  BEST_SCORE_KEY,
  CREDITS_KEY,
  UPGRADES_KEY,
  INVENTORY_KEY,
  DAILY_CHECKIN_KEY,
  PLANE_KEY,
  UNLOCKED_PLANES_KEY,
  CAMPAIGN_STAGE_KEY,
  STORY_PROGRESS_KEY,
] as const;

type GamePhase = "menu" | "hangar" | "takeoff" | "running" | "paused" | "playerDying" | "over" | "stageClear";
type GameMode = "endless" | "stage" | "story";
type HomeTab = "battle" | "upgrade" | "shop" | "inventory";
type TutorialKey = "controls" | "missile" | "refuel";
type StoryFaction = "usa" | "japan";
type Ww2SpriteKey = "usP40" | "usF4f" | "usSbd" | "usB17" | "usPby" | "jpZero" | "jpOscar" | "jpVal" | "jpBetty" | "jpJake";
type PlaneId = (typeof PLANE_IDS)[number];
type PlaneFaction = (typeof FACTION_IDS)[number];
type UpgradeKey = "firepower" | "missiles" | "armor" | "fuelTank" | "engine" | "speed" | "tanker" | "ammo";
type EnemyKind = "scout" | "fighter" | "heavy" | "stealth" | "tank";
type ProjectileOwner = "player" | "ally" | "enemy";
type SpriteKey = PlaneId;
type WeaponSpriteKey = "playerTracer" | "enemyTracer" | "missile" | "heavyMissile" | "blast" | "smoke";
type ShopPackId = "starter" | "arsenal" | "elite";
type SupportSpriteKey = "tanker" | ShopPackId;

type UpgradeState = Record<UpgradeKey, number>;
type PlaneUpgradeState = Record<PlaneId, UpgradeState>;
type PlaneUnlockState = Record<PlaneId, boolean>;
type UpgradeBlueprintState = Record<UpgradeKey, number>;
type PlaneBlueprintState = Record<PlaneId, number>;
type EnginePort = {
  x: number;
  y: number;
  widthScale?: number;
  lengthScale?: number;
};

type InventoryState = {
  materials: number;
  planeBlueprints: PlaneBlueprintState;
  upgradeBlueprints: UpgradeBlueprintState;
};

type DailyCheckinState = {
  lastDate: string;
  streak: number;
};

type StoryProgressState = Record<StoryFaction, number>;

type StoryMission = {
  stage: number;
  year: string;
  title: string;
  theatre: string;
  objective: string;
  target: number;
  reward: number;
  difficulty: number;
  playerSprite: Ww2SpriteKey;
  enemyScoutSprite: Ww2SpriteKey;
  enemyFighterSprite: Ww2SpriteKey;
  enemyHeavySprite: Ww2SpriteKey;
};

type InventoryReward = {
  credits?: number;
  materials?: number;
  planeBlueprints?: Partial<PlaneBlueprintState>;
  duplicateBlueprints?: Partial<PlaneBlueprintState>;
  upgradeBlueprints?: Partial<UpgradeBlueprintState>;
  giftPlane?: PlaneId;
};

type PackOpeningState = {
  id: number;
  packId: ShopPackId;
  label: string;
  rewardText: string;
};

type PlaneMeta = {
  id: PlaneId;
  faction: PlaneFaction;
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
  missileAmmo?: number;
  ammoReserve?: number;
  maxAmmoReserve?: number;
  magazineAmmo?: number;
  magazineSize?: number;
  reloadTimer?: number;
  fuelEmptyTimer?: number;
  fuelEmptyLimit?: number;
  tankerCallsLeft?: number;
  tankerCallsMax?: number;
  wingSlot?: number;
  bank?: number;
  throttle?: number;
  spawnWarmup?: number;
  missileTimer?: number;
  burstRemaining?: number;
  burstTimer?: number;
  collisionCooldown?: number;
  variant?: PlaneId;
  ww2Sprite?: Ww2SpriteKey;
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
  variant?: PlaneId;
  ww2Sprite?: Ww2SpriteKey;
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
};

type GameState = {
  phase: GamePhase;
  mode: GameMode;
  stage: number;
  stageTarget: number;
  stageKills: number;
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
  opponentFaction: PlaneFaction;
  storyFaction: StoryFaction | null;
  storyMission: StoryMission | null;
  upgrades: UpgradeState;
  score: number;
  bestScore: number;
  difficulty: number;
  spawnTimer: number;
  earnedCredits: number;
  rewardClaimed: boolean;
  shake: number;
  time: number;
  takeoffTimer: number;
  takeoffDuration: number;
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
  ammoReserve: number;
  maxAmmoReserve: number;
  magazineAmmo: number;
  magazineSize: number;
  reloadTimer: number;
  fuelEmptyTimer: number;
  fuelEmptyLimit: number;
  earnedCredits: number;
  allies: number;
  radarRange: number;
  radarBlips: RadarBlip[];
  storyFaction: StoryFaction | null;
  missionTitle: string;
  missionObjective: string;
  missionTheatre: string;
  missionYear: string;
};

type InputState = {
  throttle: number;
  turn: number;
  firing: boolean;
};

const defaultUpgrades: UpgradeState = {
  firepower: 0,
  missiles: 0,
  armor: 0,
  fuelTank: 0,
  engine: 0,
  speed: 0,
  tanker: 0,
  ammo: 0,
};

const defaultUpgradeBlueprints: UpgradeBlueprintState = {
  firepower: 0,
  missiles: 0,
  armor: 0,
  fuelTank: 0,
  engine: 0,
  speed: 0,
  tanker: 0,
  ammo: 0,
};

const defaultPlaneBlueprints = Object.fromEntries(PLANE_IDS.map((planeId) => [planeId, 0])) as PlaneBlueprintState;

const defaultInventory: InventoryState = {
  materials: 0,
  planeBlueprints: { ...defaultPlaneBlueprints },
  upgradeBlueprints: { ...defaultUpgradeBlueprints },
};

const defaultDailyCheckin: DailyCheckinState = {
  lastDate: "",
  streak: 0,
};

const defaultStoryProgress: StoryProgressState = {
  usa: 1,
  japan: 1,
};

const storyCampaigns: Record<StoryFaction, StoryMission[]> = {
  usa: [
    {
      stage: 1,
      year: "1941",
      title: "战争前夕",
      theatre: "珍珠港外海巡逻",
      objective: "完成战备巡逻，确认异常机群并击退第一波侦察机。",
      target: 7,
      reward: 180,
      difficulty: 1,
      playerSprite: "usP40",
      enemyScoutSprite: "jpJake",
      enemyFighterSprite: "jpZero",
      enemyHeavySprite: "jpBetty",
    },
    {
      stage: 2,
      year: "1941",
      title: "珍珠港防空",
      theatre: "瓦胡岛上空",
      objective: "掩护港区撤离，拦截来袭轰炸编队。",
      target: 10,
      reward: 240,
      difficulty: 2,
      playerSprite: "usP40",
      enemyScoutSprite: "jpJake",
      enemyFighterSprite: "jpZero",
      enemyHeavySprite: "jpBetty",
    },
    {
      stage: 3,
      year: "1942",
      title: "珊瑚海搜索",
      theatre: "珊瑚海",
      objective: "搜索敌方航母编队，保护己方舰载机返航。",
      target: 12,
      reward: 300,
      difficulty: 3,
      playerSprite: "usF4f",
      enemyScoutSprite: "jpJake",
      enemyFighterSprite: "jpZero",
      enemyHeavySprite: "jpBetty",
    },
    {
      stage: 4,
      year: "1942",
      title: "中途岛反击",
      theatre: "中途岛北方海域",
      objective: "突破护航机群，摧毁敌方航母甲板航空力量。",
      target: 15,
      reward: 380,
      difficulty: 4,
      playerSprite: "usSbd",
      enemyScoutSprite: "jpJake",
      enemyFighterSprite: "jpZero",
      enemyHeavySprite: "jpVal",
    },
    {
      stage: 5,
      year: "1943",
      title: "瓜岛航空战",
      theatre: "亨德森机场",
      objective: "守住岛上机场，压制夜间袭扰机群。",
      target: 18,
      reward: 460,
      difficulty: 5,
      playerSprite: "usF4f",
      enemyScoutSprite: "jpJake",
      enemyFighterSprite: "jpOscar",
      enemyHeavySprite: "jpBetty",
    },
    {
      stage: 6,
      year: "1944",
      title: "菲律宾海",
      theatre: "马里亚纳群岛",
      objective: "拦截大规模舰载机攻击，保护航母特混舰队。",
      target: 22,
      reward: 560,
      difficulty: 7,
      playerSprite: "usF4f",
      enemyScoutSprite: "jpJake",
      enemyFighterSprite: "jpZero",
      enemyHeavySprite: "jpBetty",
    },
  ],
  japan: [
    {
      stage: 1,
      year: "1941",
      title: "战争前夕",
      theatre: "南云机动部队训练空域",
      objective: "完成远航编队演练，清除暴露航线的侦察机。",
      target: 7,
      reward: 180,
      difficulty: 1,
      playerSprite: "jpZero",
      enemyScoutSprite: "usPby",
      enemyFighterSprite: "usF4f",
      enemyHeavySprite: "usB17",
    },
    {
      stage: 2,
      year: "1941",
      title: "珍珠港突袭",
      theatre: "瓦胡岛北部航线",
      objective: "护送攻击队进入目标空域，压制港区防空战机。",
      target: 11,
      reward: 250,
      difficulty: 2,
      playerSprite: "jpZero",
      enemyScoutSprite: "usPby",
      enemyFighterSprite: "usP40",
      enemyHeavySprite: "usB17",
    },
    {
      stage: 3,
      year: "1942",
      title: "印度洋突进",
      theatre: "锡兰外海",
      objective: "搜索英军舰队，击退拦截机群并保障舰队机动。",
      target: 13,
      reward: 320,
      difficulty: 3,
      playerSprite: "jpZero",
      enemyScoutSprite: "usPby",
      enemyFighterSprite: "usF4f",
      enemyHeavySprite: "usSbd",
    },
    {
      stage: 4,
      year: "1942",
      title: "中途岛警戒",
      theatre: "中途岛西北海域",
      objective: "掩护航母甲板整备，阻止敌方鱼雷机逼近。",
      target: 16,
      reward: 390,
      difficulty: 4,
      playerSprite: "jpZero",
      enemyScoutSprite: "usPby",
      enemyFighterSprite: "usF4f",
      enemyHeavySprite: "usSbd",
    },
    {
      stage: 5,
      year: "1942",
      title: "瓜岛争夺",
      theatre: "所罗门群岛",
      objective: "突入岛上机场空域，压制美军增援航线。",
      target: 19,
      reward: 480,
      difficulty: 5,
      playerSprite: "jpVal",
      enemyScoutSprite: "usPby",
      enemyFighterSprite: "usF4f",
      enemyHeavySprite: "usB17",
    },
    {
      stage: 6,
      year: "1944",
      title: "莱特湾防线",
      theatre: "菲律宾中部海域",
      objective: "拦截舰队防空圈外的攻击机，掩护主力舰撤退。",
      target: 23,
      reward: 570,
      difficulty: 7,
      playerSprite: "jpZero",
      enemyScoutSprite: "usPby",
      enemyFighterSprite: "usF4f",
      enemyHeavySprite: "usB17",
    },
  ],
};

const defaultTutorialProgress: Record<TutorialKey, boolean> = {
  controls: false,
  missile: false,
  refuel: false,
};

const defaultUnlockedPlanes: PlaneUnlockState = {
  j7: false,
  j8: true,
  j10: false,
  j11: false,
  j15: false,
  j16: false,
  jh7: false,
  j20: false,
  j35: false,
  fc31: false,
  f4: false,
  f5: false,
  f14: false,
  f15: false,
  f16: true,
  f18: false,
  f22: false,
  f35: false,
  f117: false,
  f18c: false,
  mig21: false,
  mig23: false,
  mig29: true,
  mig31: false,
  mig35: false,
  su27: false,
  su30: false,
  su33: false,
  su35: false,
  su57: false,
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
  ammoReserve: 620,
  maxAmmoReserve: 620,
  magazineAmmo: 72,
  magazineSize: 72,
  reloadTimer: 0,
  fuelEmptyTimer: 0,
  fuelEmptyLimit: 10,
  earnedCredits: 0,
  allies: 0,
  radarRange: 0,
  radarBlips: [],
  storyFaction: null,
  missionTitle: "",
  missionObjective: "",
  missionTheatre: "",
  missionYear: "",
};

const planeCatalog: PlaneMeta[] = [
  {
    id: "j7",
    faction: "china",
    label: "歼-7G",
    role: "轻型截击",
    gunName: "Type 23-III",
    gunCaliber: 23,
    gunBarrels: 2,
    gunMount: "belly",
    unlockCost: 420,
    baseHp: 168,
    minSpeed: 174,
    cruiseSpeed: 262,
    maxSpeed: 398,
    turnRate: 1.86,
    fuel: 215,
    damageBonus: -0.02,
  },
  {
    id: "j8",
    faction: "china",
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
    faction: "china",
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
    id: "j11",
    faction: "china",
    label: "歼-11B",
    role: "重型空优",
    gunName: "GSh-30-1",
    gunCaliber: 30,
    gunBarrels: 1,
    gunMount: "rightRoot",
    unlockCost: 1180,
    baseHp: 270,
    minSpeed: 168,
    cruiseSpeed: 286,
    maxSpeed: 452,
    turnRate: 1.82,
    fuel: 308,
    damageBonus: 0.22,
  },
  {
    id: "j15",
    faction: "china",
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
    id: "j16",
    faction: "china",
    label: "歼-16",
    role: "重型多用途",
    gunName: "GSh-30-1",
    gunCaliber: 30,
    gunBarrels: 1,
    gunMount: "rightRoot",
    unlockCost: 2200,
    baseHp: 326,
    minSpeed: 172,
    cruiseSpeed: 296,
    maxSpeed: 470,
    turnRate: 1.88,
    fuel: 352,
    damageBonus: 0.37,
  },
  {
    id: "jh7",
    faction: "china",
    label: "歼轰-7A",
    role: "重型突击",
    gunName: "GSh-23 / Type 23-3",
    gunCaliber: 23,
    gunBarrels: 2,
    gunMount: "belly",
    unlockCost: 2480,
    baseHp: 336,
    minSpeed: 166,
    cruiseSpeed: 286,
    maxSpeed: 440,
    turnRate: 1.68,
    fuel: 372,
    damageBonus: 0.4,
  },
  {
    id: "j20",
    faction: "china",
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
  {
    id: "j35",
    faction: "china",
    label: "歼-35A",
    role: "隐身多用途",
    gunName: "内置航炮",
    gunCaliber: 25,
    gunBarrels: 1,
    gunMount: "belly",
    unlockCost: 3800,
    baseHp: 360,
    minSpeed: 188,
    cruiseSpeed: 325,
    maxSpeed: 528,
    turnRate: 2.18,
    fuel: 382,
    damageBonus: 0.52,
  },
  {
    id: "fc31",
    faction: "china",
    label: "FC-31",
    role: "隐身外贸",
    gunName: "内置航炮",
    gunCaliber: 25,
    gunBarrels: 1,
    gunMount: "belly",
    unlockCost: 4600,
    baseHp: 372,
    minSpeed: 190,
    cruiseSpeed: 332,
    maxSpeed: 538,
    turnRate: 2.22,
    fuel: 392,
    damageBonus: 0.58,
  },
  {
    id: "f4",
    faction: "usa",
    label: "F-4E",
    role: "经典重型",
    gunName: "M61A1 Vulcan",
    gunCaliber: 20,
    gunBarrels: 1,
    gunMount: "belly",
    unlockCost: 460,
    baseHp: 178,
    minSpeed: 166,
    cruiseSpeed: 266,
    maxSpeed: 420,
    turnRate: 1.52,
    fuel: 252,
    damageBonus: 0,
  },
  {
    id: "f5",
    faction: "usa",
    label: "F-5E",
    role: "轻型格斗",
    gunName: "M39A3",
    gunCaliber: 20,
    gunBarrels: 2,
    gunMount: "belly",
    unlockCost: 620,
    baseHp: 182,
    minSpeed: 176,
    cruiseSpeed: 274,
    maxSpeed: 414,
    turnRate: 2.06,
    fuel: 230,
    damageBonus: 0.04,
  },
  {
    id: "f14",
    faction: "usa",
    label: "F-14D",
    role: "远程截击",
    gunName: "M61A1 Vulcan",
    gunCaliber: 20,
    gunBarrels: 1,
    gunMount: "belly",
    unlockCost: 1180,
    baseHp: 268,
    minSpeed: 166,
    cruiseSpeed: 276,
    maxSpeed: 462,
    turnRate: 1.72,
    fuel: 318,
    damageBonus: 0.2,
  },
  {
    id: "f15",
    faction: "usa",
    label: "F-15EX",
    role: "重型制空",
    gunName: "M61A1 Vulcan",
    gunCaliber: 20,
    gunBarrels: 1,
    gunMount: "rightRoot",
    unlockCost: 1600,
    baseHp: 302,
    minSpeed: 172,
    cruiseSpeed: 292,
    maxSpeed: 468,
    turnRate: 1.82,
    fuel: 338,
    damageBonus: 0.28,
  },
  {
    id: "f16",
    faction: "usa",
    label: "F-16C",
    role: "轻型多用途",
    gunName: "M61A1 Vulcan",
    gunCaliber: 20,
    gunBarrels: 1,
    gunMount: "leftIntake",
    unlockCost: 0,
    baseHp: 188,
    minSpeed: 176,
    cruiseSpeed: 286,
    maxSpeed: 438,
    turnRate: 2.04,
    fuel: 240,
    damageBonus: 0.05,
  },
  {
    id: "f18",
    faction: "usa",
    label: "F/A-18E",
    role: "舰载多用途",
    gunName: "M61A2 Vulcan",
    gunCaliber: 20,
    gunBarrels: 1,
    gunMount: "belly",
    unlockCost: 780,
    baseHp: 228,
    minSpeed: 168,
    cruiseSpeed: 278,
    maxSpeed: 430,
    turnRate: 1.96,
    fuel: 274,
    damageBonus: 0.14,
  },
  {
    id: "f22",
    faction: "usa",
    label: "F-22A",
    role: "隐身空优",
    gunName: "M61A2 Vulcan",
    gunCaliber: 20,
    gunBarrels: 1,
    gunMount: "belly",
    unlockCost: 2850,
    baseHp: 336,
    minSpeed: 188,
    cruiseSpeed: 318,
    maxSpeed: 512,
    turnRate: 2.16,
    fuel: 358,
    damageBonus: 0.43,
  },
  {
    id: "f35",
    faction: "usa",
    label: "F-35A",
    role: "隐身打击",
    gunName: "GAU-22/A",
    gunCaliber: 25,
    gunBarrels: 1,
    gunMount: "belly",
    unlockCost: 3650,
    baseHp: 352,
    minSpeed: 184,
    cruiseSpeed: 310,
    maxSpeed: 492,
    turnRate: 2.06,
    fuel: 372,
    damageBonus: 0.48,
  },
  {
    id: "f117",
    faction: "usa",
    label: "F-117A",
    role: "隐身突击",
    gunName: "内部武器舱",
    gunCaliber: 25,
    gunBarrels: 1,
    gunMount: "belly",
    unlockCost: 2250,
    baseHp: 318,
    minSpeed: 160,
    cruiseSpeed: 260,
    maxSpeed: 405,
    turnRate: 1.58,
    fuel: 348,
    damageBonus: 0.36,
  },
  {
    id: "f18c",
    faction: "usa",
    label: "F/A-18C",
    role: "舰载格斗",
    gunName: "M61A1 Vulcan",
    gunCaliber: 20,
    gunBarrels: 1,
    gunMount: "belly",
    unlockCost: 980,
    baseHp: 220,
    minSpeed: 170,
    cruiseSpeed: 276,
    maxSpeed: 422,
    turnRate: 2,
    fuel: 268,
    damageBonus: 0.12,
  },
  {
    id: "mig21",
    faction: "russia",
    label: "MiG-21bis",
    role: "轻型截击",
    gunName: "GSh-23L",
    gunCaliber: 23,
    gunBarrels: 2,
    gunMount: "belly",
    unlockCost: 420,
    baseHp: 166,
    minSpeed: 176,
    cruiseSpeed: 264,
    maxSpeed: 402,
    turnRate: 1.9,
    fuel: 214,
    damageBonus: -0.02,
  },
  {
    id: "mig23",
    faction: "russia",
    label: "MiG-23MLD",
    role: "变后掠截击",
    gunName: "GSh-23L",
    gunCaliber: 23,
    gunBarrels: 2,
    gunMount: "belly",
    unlockCost: 720,
    baseHp: 206,
    minSpeed: 174,
    cruiseSpeed: 276,
    maxSpeed: 434,
    turnRate: 1.72,
    fuel: 258,
    damageBonus: 0.1,
  },
  {
    id: "mig29",
    faction: "russia",
    label: "MiG-29SMT",
    role: "前线空优",
    gunName: "GSh-30-1",
    gunCaliber: 30,
    gunBarrels: 1,
    gunMount: "rightRoot",
    unlockCost: 0,
    baseHp: 210,
    minSpeed: 178,
    cruiseSpeed: 284,
    maxSpeed: 450,
    turnRate: 2.04,
    fuel: 246,
    damageBonus: 0.08,
  },
  {
    id: "mig31",
    faction: "russia",
    label: "MiG-31BM",
    role: "高速截击",
    gunName: "GSh-6-23",
    gunCaliber: 23,
    gunBarrels: 2,
    gunMount: "rightRoot",
    unlockCost: 1320,
    baseHp: 292,
    minSpeed: 184,
    cruiseSpeed: 306,
    maxSpeed: 504,
    turnRate: 1.48,
    fuel: 352,
    damageBonus: 0.24,
  },
  {
    id: "mig35",
    faction: "russia",
    label: "MiG-35",
    role: "多用途格斗",
    gunName: "GSh-30-1",
    gunCaliber: 30,
    gunBarrels: 1,
    gunMount: "rightRoot",
    unlockCost: 1540,
    baseHp: 246,
    minSpeed: 178,
    cruiseSpeed: 292,
    maxSpeed: 462,
    turnRate: 2.08,
    fuel: 278,
    damageBonus: 0.2,
  },
  {
    id: "su27",
    faction: "russia",
    label: "Su-27SM",
    role: "重型空优",
    gunName: "GSh-30-1",
    gunCaliber: 30,
    gunBarrels: 1,
    gunMount: "rightRoot",
    unlockCost: 1180,
    baseHp: 270,
    minSpeed: 168,
    cruiseSpeed: 286,
    maxSpeed: 452,
    turnRate: 1.84,
    fuel: 310,
    damageBonus: 0.22,
  },
  {
    id: "su30",
    faction: "russia",
    label: "Su-30SM",
    role: "双座多用途",
    gunName: "GSh-30-1",
    gunCaliber: 30,
    gunBarrels: 1,
    gunMount: "rightRoot",
    unlockCost: 1780,
    baseHp: 304,
    minSpeed: 166,
    cruiseSpeed: 288,
    maxSpeed: 456,
    turnRate: 1.86,
    fuel: 342,
    damageBonus: 0.3,
  },
  {
    id: "su33",
    faction: "russia",
    label: "Su-33",
    role: "重型舰载",
    gunName: "GSh-30-1",
    gunCaliber: 30,
    gunBarrels: 1,
    gunMount: "rightRoot",
    unlockCost: 2140,
    baseHp: 318,
    minSpeed: 164,
    cruiseSpeed: 282,
    maxSpeed: 440,
    turnRate: 1.78,
    fuel: 354,
    damageBonus: 0.34,
  },
  {
    id: "su35",
    faction: "russia",
    label: "Su-35S",
    role: "超机动空优",
    gunName: "GSh-30-1",
    gunCaliber: 30,
    gunBarrels: 1,
    gunMount: "rightRoot",
    unlockCost: 2720,
    baseHp: 334,
    minSpeed: 176,
    cruiseSpeed: 304,
    maxSpeed: 490,
    turnRate: 2.16,
    fuel: 362,
    damageBonus: 0.42,
  },
  {
    id: "su57",
    faction: "russia",
    label: "Su-57",
    role: "隐身空优",
    gunName: "9A1-4071K",
    gunCaliber: 30,
    gunBarrels: 1,
    gunMount: "rightRoot",
    unlockCost: 3950,
    baseHp: 358,
    minSpeed: 190,
    cruiseSpeed: 324,
    maxSpeed: 524,
    turnRate: 2.18,
    fuel: 382,
    damageBonus: 0.52,
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
  {
    key: "ammo",
    label: "弹药携带",
    description: "增加机炮总弹药，每级约增加240发。",
    baseCost: 230,
    max: 5,
  },
];

const upgradeBlueprintLabels: Record<UpgradeKey, string> = {
  firepower: "机炮升级蓝图",
  missiles: "导弹挂架蓝图",
  armor: "机体结构蓝图",
  fuelTank: "副油箱蓝图",
  engine: "发动机升级蓝图",
  speed: "速度升级蓝图",
  tanker: "支援系统蓝图",
  ammo: "弹药携带蓝图",
};

const dailyRewards: InventoryReward[] = [
  { credits: 120 },
  { credits: 160, materials: 6 },
  { credits: 210, materials: 8 },
  { credits: 260 },
  { credits: 320, materials: 14 },
  { credits: 420, upgradeBlueprints: { engine: 1, firepower: 1, missiles: 1 } },
  { credits: 520 },
];

const shopPacks: { id: ShopPackId; label: string; description: string; cost: number; rolls: number; rareBias: number }[] = [
  { id: "starter", label: "基础补给箱", description: "适合前期攒材料和少量蓝图。", cost: 220, rolls: 2, rareBias: 0 },
  { id: "arsenal", label: "军械礼包", description: "更容易开出升级蓝图和飞机蓝图。", cost: 620, rolls: 4, rareBias: 0.12 },
  { id: "elite", label: "王牌蓝图箱", description: "高概率获得飞机蓝图和高级升级蓝图。", cost: 1180, rolls: 5, rareBias: 0.24 },
];

const spriteSlots: Partial<Record<SpriteKey, { col: number; row: number }>> = {
  j7: { col: 0, row: 0 },
  j8: { col: 1, row: 0 },
  j10: { col: 2, row: 0 },
  j11: { col: 3, row: 0 },
  j15: { col: 4, row: 0 },
  j16: { col: 5, row: 0 },
  jh7: { col: 6, row: 0 },
  j20: { col: 7, row: 0 },
  j35: { col: 8, row: 0 },
  fc31: { col: 9, row: 0 },
  f4: { col: 0, row: 1 },
  f5: { col: 1, row: 1 },
  f14: { col: 2, row: 1 },
  f15: { col: 3, row: 1 },
  f16: { col: 4, row: 1 },
  f18: { col: 5, row: 1 },
  f22: { col: 6, row: 1 },
  f35: { col: 7, row: 1 },
  f117: { col: 8, row: 1 },
  f18c: { col: 9, row: 1 },
  mig21: { col: 0, row: 2 },
  mig23: { col: 1, row: 2 },
  mig29: { col: 2, row: 2 },
  mig31: { col: 3, row: 2 },
  mig35: { col: 4, row: 2 },
  su27: { col: 5, row: 2 },
  su30: { col: 6, row: 2 },
  su33: { col: 7, row: 2 },
  su35: { col: 8, row: 2 },
  su57: { col: 9, row: 2 },
};

const ww2SpriteSlots: Record<Ww2SpriteKey, { col: number; row: number }> = {
  usP40: { col: 0, row: 0 },
  usF4f: { col: 1, row: 0 },
  usSbd: { col: 2, row: 0 },
  usB17: { col: 3, row: 0 },
  usPby: { col: 4, row: 0 },
  jpZero: { col: 0, row: 1 },
  jpOscar: { col: 1, row: 1 },
  jpVal: { col: 2, row: 1 },
  jpBetty: { col: 3, row: 1 },
  jpJake: { col: 4, row: 1 },
};

const weaponSpriteSlots: Record<WeaponSpriteKey, WeaponSpriteSlot> = {
  playerTracer: { col: 0, row: 0, crop: [204, 227, 59, 166] },
  enemyTracer: { col: 1, row: 0, crop: [177, 185, 63, 270] },
  missile: { col: 2, row: 0, crop: [124, 123, 97, 398] },
  heavyMissile: { col: 0, row: 1, crop: [147, 32, 173, 472] },
  blast: { col: 1, row: 1, crop: [95, 186, 213, 202] },
  smoke: { col: 2, row: 1, crop: [29, 136, 289, 290] },
};

const supportSpriteSlots: Record<SupportSpriteKey, { col: number; row: number }> = {
  tanker: { col: 0, row: 0 },
  starter: { col: 1, row: 0 },
  arsenal: { col: 2, row: 0 },
  elite: { col: 3, row: 0 },
};

function getPlanePreviewClass(planeId: PlaneId) {
  return `plane-preview plane-${planeId}`;
}

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

function getFactionLabel(faction: PlaneFaction) {
  if (faction === "china") return "中国";
  if (faction === "usa") return "美国";
  return "俄罗斯";
}

function getPlaneIdsByFaction(faction: PlaneFaction): readonly PlaneId[] {
  if (faction === "china") return CHINA_PLANE_IDS;
  if (faction === "usa") return USA_PLANE_IDS;
  return RUSSIA_PLANE_IDS;
}

function getOtherFactions(faction: PlaneFaction) {
  return FACTION_IDS.filter((item) => item !== faction);
}

function getRandomOpponentFaction(planeId: PlaneId): PlaneFaction {
  const options = getOtherFactions(getPlaneMeta(planeId).faction);
  return options[Math.floor(Math.random() * options.length)] ?? "usa";
}

function formatOpponentPool(faction: PlaneFaction) {
  return getOtherFactions(faction).map(getFactionLabel).join(" / ");
}

function getPlaneTier(planeId: PlaneId) {
  const factionIds = getPlaneIdsByFaction(getPlaneMeta(planeId).faction);
  return Math.max(0, factionIds.indexOf(planeId));
}

function getRadarRange(planeId: PlaneId) {
  return 1750 + getPlaneTier(planeId) * 420;
}

function getOpponentFaction(state: GameState): PlaneFaction {
  return state.opponentFaction;
}

function isPlaneId(kind: Aircraft["kind"]): kind is PlaneId {
  return PLANE_IDS.includes(kind as PlaneId);
}

function isStealthEnemy(aircraft: Aircraft) {
  return aircraft.side === "enemy" && aircraft.kind === "stealth";
}

function createDefaultPlaneUpgrades(): PlaneUpgradeState {
  return Object.fromEntries(PLANE_IDS.map((planeId) => [planeId, { ...defaultUpgrades }])) as PlaneUpgradeState;
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
    ammo: clamp(Number(upgrades?.ammo) || 0, 0, 5),
  };
}

function readBestScore() {
  if (typeof window === "undefined") return 0;
  const stored = Number(window.localStorage.getItem(BEST_SCORE_KEY));
  return Number.isFinite(stored) ? stored : 0;
}

function ensureSaveVersion() {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(SAVE_VERSION_KEY) === SAVE_SCHEMA_VERSION) return false;
  for (const key of RESETTABLE_SAVE_KEYS) {
    window.localStorage.removeItem(key);
  }
  window.localStorage.setItem(SAVE_VERSION_KEY, SAVE_SCHEMA_VERSION);
  return true;
}

function readTutorialProgress() {
  if (typeof window === "undefined") return { ...defaultTutorialProgress };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TUTORIAL_KEY) ?? "{}") as Partial<Record<TutorialKey, unknown>>;
    return {
      controls: Boolean(parsed.controls),
      missile: Boolean(parsed.missile),
      refuel: Boolean(parsed.refuel),
    };
  } catch {
    return { ...defaultTutorialProgress };
  }
}

function saveTutorialProgress(progress: Record<TutorialKey, boolean>) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TUTORIAL_KEY, JSON.stringify(progress));
  }
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

function sanitizeInventory(value?: Partial<InventoryState> & Record<string, unknown>): InventoryState {
  const parsedBlueprints = (value?.upgradeBlueprints ?? {}) as Partial<UpgradeBlueprintState> & Record<string, unknown>;
  const upgradeBlueprints = { ...defaultUpgradeBlueprints };
  for (const meta of upgradeCatalog) {
    upgradeBlueprints[meta.key] = Math.max(0, Math.floor(Number(parsedBlueprints[meta.key]) || 0));
  }
  const planeBlueprints = { ...defaultPlaneBlueprints };
  if (typeof value?.planeBlueprints === "number") {
    const legacyAmount = Math.max(0, Math.floor(value.planeBlueprints));
    for (const planeId of PLANE_IDS) planeBlueprints[planeId] = legacyAmount;
  } else {
    const parsedPlaneBlueprints = (value?.planeBlueprints ?? {}) as Partial<PlaneBlueprintState> & Record<string, unknown>;
    for (const planeId of PLANE_IDS) {
      planeBlueprints[planeId] = Math.max(0, Math.floor(Number(parsedPlaneBlueprints[planeId]) || 0));
    }
  }
  return {
    materials: Math.max(0, Math.floor(Number(value?.materials) || 0)),
    planeBlueprints,
    upgradeBlueprints,
  };
}

function readInventory(): InventoryState {
  if (typeof window === "undefined") return { ...defaultInventory, planeBlueprints: { ...defaultPlaneBlueprints }, upgradeBlueprints: { ...defaultUpgradeBlueprints } };
  try {
    return sanitizeInventory(JSON.parse(window.localStorage.getItem(INVENTORY_KEY) ?? "{}") as Record<string, unknown>);
  } catch {
    return { ...defaultInventory, planeBlueprints: { ...defaultPlaneBlueprints }, upgradeBlueprints: { ...defaultUpgradeBlueprints } };
  }
}

function saveInventory(inventory: InventoryState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(INVENTORY_KEY, JSON.stringify(sanitizeInventory(inventory)));
  }
}

function readDailyCheckin(): DailyCheckinState {
  if (typeof window === "undefined") return { ...defaultDailyCheckin };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DAILY_CHECKIN_KEY) ?? "{}") as Record<string, unknown>;
    return {
      lastDate: typeof parsed.lastDate === "string" ? parsed.lastDate : "",
      streak: clamp(Math.floor(Number(parsed.streak) || 0), 0, 7),
    };
  } catch {
    return { ...defaultDailyCheckin };
  }
}

function saveDailyCheckin(daily: DailyCheckinState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DAILY_CHECKIN_KEY, JSON.stringify(daily));
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

function readStoryProgress(): StoryProgressState {
  if (typeof window === "undefined") return { ...defaultStoryProgress };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORY_PROGRESS_KEY) ?? "{}") as Partial<Record<StoryFaction, unknown>>;
    return {
      usa: clamp(normalizeStageNumber(Number(parsed.usa) || defaultStoryProgress.usa), 1, storyCampaigns.usa.length),
      japan: clamp(normalizeStageNumber(Number(parsed.japan) || defaultStoryProgress.japan), 1, storyCampaigns.japan.length),
    };
  } catch {
    return { ...defaultStoryProgress };
  }
}

function saveStoryProgress(progress: StoryProgressState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORY_PROGRESS_KEY, JSON.stringify(progress));
  }
}

function normalizeStageNumber(stage: number) {
  return Number.isFinite(stage) ? clamp(Math.floor(stage), 1, 999) : 1;
}

function isEndlessUnlocked(stage: number) {
  return normalizeStageNumber(stage) > 5;
}

function isStoryUnlocked(stage: number) {
  return normalizeStageNumber(stage) > STORY_UNLOCK_STAGE;
}

function readPlaneUpgrades(): PlaneUpgradeState {
  if (typeof window === "undefined") return createDefaultPlaneUpgrades();

  try {
    const parsed = JSON.parse(window.localStorage.getItem(UPGRADES_KEY) ?? "{}") as Record<string, unknown>;
    const next = createDefaultPlaneUpgrades();
    const hasPlaneKeys = PLANE_IDS.some((planeId) => planeId in parsed);
    if (hasPlaneKeys) {
      for (const planeId of PLANE_IDS) {
        if (planeId in parsed) next[planeId] = sanitizeUpgrades(parsed[planeId] as Record<string, unknown>);
      }
      return next;
    }
    if ("falcon" in parsed || "vanguard" in parsed || "raptor" in parsed) {
      next.j8 = sanitizeUpgrades(parsed.falcon as Record<string, unknown>);
      next.j10 = sanitizeUpgrades(parsed.vanguard as Record<string, unknown>);
      next.j15 = sanitizeUpgrades(parsed.raptor as Record<string, unknown>);
      return next;
    }

    next.j8 = sanitizeUpgrades(parsed);
    return next;
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
    const next = { ...defaultUnlockedPlanes };
    for (const planeId of PLANE_IDS) {
      next[planeId] = Boolean(parsed[planeId]) || next[planeId];
    }
    next.j10 = Boolean(parsed.j10 ?? parsed.vanguard) || next.j10;
    next.j15 = Boolean(parsed.j15 ?? parsed.raptor) || next.j15;
    return next;
  } catch {
    return { ...defaultUnlockedPlanes };
  }
}

function saveUnlockedPlanes(unlocked: PlaneUnlockState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(UNLOCKED_PLANES_KEY, JSON.stringify(unlocked));
  }
}

function getFirstUnlockedPlane(unlocked: PlaneUnlockState) {
  return PLANE_IDS.find((planeId) => unlocked[planeId]) ?? "j8";
}

function readSelectedPlane(unlocked: PlaneUnlockState) {
  if (typeof window === "undefined") return "j8" as PlaneId;
  const stored = window.localStorage.getItem(PLANE_KEY);
  const legacyMap: Record<string, PlaneId> = { falcon: "j8", vanguard: "j10", raptor: "j15" };
  const planeId = ((stored && legacyMap[stored]) || stored || "j8") as PlaneId;
  return PLANE_IDS.includes(planeId) && unlocked[planeId] ? planeId : getFirstUnlockedPlane(unlocked);
}

function saveSelectedPlane(planeId: PlaneId) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PLANE_KEY, planeId);
  }
}

function getUpgradeCost(meta: UpgradeMeta, level: number) {
  return Math.round(meta.baseCost * (1 + level * 0.68));
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getDateValue(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return Number.NaN;
  return Math.floor(new Date(year, month - 1, day).getTime() / 86400000);
}

function getNextDailyDay(daily: DailyCheckinState) {
  const today = getTodayKey();
  if (daily.lastDate === today) return clamp(daily.streak, 1, 7);
  const gap = getDateValue(today) - getDateValue(daily.lastDate);
  if (gap === 1) return (daily.streak % 7) + 1;
  return 1;
}

function canClaimDaily(daily: DailyCheckinState) {
  return daily.lastDate !== getTodayKey();
}

function getDuplicateBlueprintConversion(planeId: PlaneId, amount: number) {
  const tier = getPlaneTier(planeId);
  const count = Math.max(0, Math.floor(amount));
  return {
    credits: count * (95 + tier * 36),
    materials: count * (4 + Math.ceil(tier * 1.6)),
  };
}

function settleInventoryReward(inventory: InventoryState, reward: InventoryReward, unlocked: PlaneUnlockState) {
  const settled: InventoryReward = {
    credits: Math.max(0, Math.floor(reward.credits ?? 0)),
    materials: Math.max(0, Math.floor(reward.materials ?? 0)),
    planeBlueprints: {},
    duplicateBlueprints: {},
    upgradeBlueprints: { ...reward.upgradeBlueprints },
    giftPlane: reward.giftPlane,
  };

  for (const planeId of PLANE_IDS) {
    const amount = Math.max(0, Math.floor(reward.planeBlueprints?.[planeId] ?? 0));
    if (amount <= 0) continue;
    if (unlocked[planeId]) {
      const conversion = getDuplicateBlueprintConversion(planeId, amount);
      settled.credits = (settled.credits ?? 0) + conversion.credits;
      settled.materials = (settled.materials ?? 0) + conversion.materials;
      settled.duplicateBlueprints = { ...settled.duplicateBlueprints, [planeId]: amount };
    } else {
      settled.planeBlueprints = { ...settled.planeBlueprints, [planeId]: (settled.planeBlueprints?.[planeId] ?? 0) + amount };
    }
  }

  return {
    inventory: addRewardToInventory(inventory, settled),
    reward: settled,
  };
}

function convertUnlockedPlaneBlueprints(inventory: InventoryState, unlocked: PlaneUnlockState) {
  const reward: InventoryReward = { credits: 0, materials: 0, planeBlueprints: {}, duplicateBlueprints: {}, upgradeBlueprints: {} };
  const next: InventoryState = {
    materials: inventory.materials,
    planeBlueprints: { ...inventory.planeBlueprints },
    upgradeBlueprints: { ...inventory.upgradeBlueprints },
  };

  for (const planeId of PLANE_IDS) {
    const amount = Math.max(0, Math.floor(next.planeBlueprints[planeId] ?? 0));
    if (!unlocked[planeId] || amount <= 0) continue;
    const conversion = getDuplicateBlueprintConversion(planeId, amount);
    reward.credits = (reward.credits ?? 0) + conversion.credits;
    reward.materials = (reward.materials ?? 0) + conversion.materials;
    reward.duplicateBlueprints = { ...reward.duplicateBlueprints, [planeId]: amount };
    next.planeBlueprints[planeId] = 0;
  }

  next.materials += Math.max(0, Math.floor(reward.materials ?? 0));
  return { inventory: next, reward };
}

function addRewardToInventory(inventory: InventoryState, reward: InventoryReward) {
  const next: InventoryState = {
    materials: inventory.materials + Math.max(0, Math.floor(reward.materials ?? 0)),
    planeBlueprints: { ...inventory.planeBlueprints },
    upgradeBlueprints: { ...inventory.upgradeBlueprints },
  };
  for (const planeId of PLANE_IDS) {
    next.planeBlueprints[planeId] += Math.max(0, Math.floor(reward.planeBlueprints?.[planeId] ?? 0));
  }
  for (const meta of upgradeCatalog) {
    next.upgradeBlueprints[meta.key] += Math.max(0, Math.floor(reward.upgradeBlueprints?.[meta.key] ?? 0));
  }
  return next;
}

function getUpgradeRequirement(meta: UpgradeMeta, level: number) {
  return {
    credits: getUpgradeCost(meta, level),
    materials: level >= 2 ? 8 + (level - 2) * 6 : 0,
    blueprintKey: level >= 3 ? meta.key : null,
    blueprints: level >= 3 ? level - 2 : 0,
  };
}

function getPlaneUnlockRequirement(planeId: PlaneId) {
  const plane = getPlaneMeta(planeId);
  const tier = getPlaneTier(planeId);
  return {
    credits: plane.unlockCost,
    materials: tier >= 2 ? 10 + Math.max(0, tier - 2) * 14 : 0,
    planeBlueprints: plane.unlockCost <= 0 ? 0 : 1,
  };
}

function formatRequirement(parts: string[]) {
  return parts.filter(Boolean).join(" · ");
}

function formatUpgradeRequirement(meta: UpgradeMeta, level: number) {
  if (level >= meta.max) return "已满级";
  const requirement = getUpgradeRequirement(meta, level);
  return formatRequirement([
    `${requirement.credits} 战功`,
    requirement.materials > 0 ? `${requirement.materials} 材料` : "",
    requirement.blueprintKey && requirement.blueprints > 0 ? `${requirement.blueprints} ${upgradeBlueprintLabels[requirement.blueprintKey]}` : "",
  ]);
}

function formatPlaneRequirement(planeId: PlaneId) {
  const requirement = getPlaneUnlockRequirement(planeId);
  return formatRequirement([
    requirement.credits > 0 ? `${requirement.credits} 战功` : "",
    requirement.materials > 0 ? `${requirement.materials} 材料` : "",
    requirement.planeBlueprints > 0 ? `${requirement.planeBlueprints} ${getPlaneMeta(planeId).label}蓝图` : "",
  ]) || "已拥有";
}

function canAffordUpgrade(meta: UpgradeMeta, level: number, credits: number, inventory: InventoryState) {
  const requirement = getUpgradeRequirement(meta, level);
  return (
    credits >= requirement.credits &&
    inventory.materials >= requirement.materials &&
    (!requirement.blueprintKey || inventory.upgradeBlueprints[requirement.blueprintKey] >= requirement.blueprints)
  );
}

function canAffordPlane(planeId: PlaneId, credits: number, inventory: InventoryState) {
  const requirement = getPlaneUnlockRequirement(planeId);
  return credits >= requirement.credits && inventory.materials >= requirement.materials && inventory.planeBlueprints[planeId] >= requirement.planeBlueprints;
}

function getGiftPlane(unlocked: PlaneUnlockState, selectedPlane: PlaneId) {
  const selectedFaction = getPlaneMeta(selectedPlane).faction;
  return (
    getPlaneIdsByFaction(selectedFaction).find((planeId) => !unlocked[planeId]) ??
    PLANE_IDS.find((planeId) => !unlocked[planeId]) ??
    null
  );
}

function rollPlaneBlueprint(rareBias: number) {
  let total = 0;
  const weights = PLANE_IDS.map((planeId) => {
    const tier = getPlaneTier(planeId);
    const baseWeight = Math.max(0.42, 8.5 - tier * 1.28);
    const weight = baseWeight + rareBias * (tier + 1) * 1.35;
    total += weight;
    return { planeId, weight };
  });
  let roll = Math.random() * total;
  for (const item of weights) {
    roll -= item.weight;
    if (roll <= 0) return item.planeId;
  }
  return weights[0].planeId;
}

function rollShopPack(pack: { rolls: number; rareBias: number }): InventoryReward {
  const reward: InventoryReward = { credits: 0, materials: 0, planeBlueprints: {}, upgradeBlueprints: {} };
  for (let index = 0; index < pack.rolls; index += 1) {
    const roll = Math.random() + pack.rareBias;
    if (roll < 0.26) {
      reward.credits = (reward.credits ?? 0) + Math.round(randomBetween(80, 180) * (1 + pack.rareBias));
    } else if (roll < 0.58) {
      reward.materials = (reward.materials ?? 0) + Math.round(randomBetween(5, 13) * (1 + pack.rareBias));
    } else if (roll < 0.9) {
      const key = upgradeCatalog[Math.floor(Math.random() * upgradeCatalog.length)].key;
      reward.upgradeBlueprints = { ...reward.upgradeBlueprints, [key]: (reward.upgradeBlueprints?.[key] ?? 0) + 1 };
    } else {
      const planeId = rollPlaneBlueprint(pack.rareBias);
      reward.planeBlueprints = { ...reward.planeBlueprints, [planeId]: (reward.planeBlueprints?.[planeId] ?? 0) + 1 };
    }
  }
  return reward;
}

function formatReward(reward: InventoryReward) {
  const parts = [
    reward.credits ? `${reward.credits} 战功` : "",
    reward.materials ? `${reward.materials} 材料` : "",
    reward.giftPlane ? `解锁 ${getPlaneMeta(reward.giftPlane).label}` : "",
  ];
  for (const planeId of PLANE_IDS) {
    const amount = reward.planeBlueprints?.[planeId] ?? 0;
    if (amount > 0) parts.push(`${amount} ${getPlaneMeta(planeId).label}蓝图`);
  }
  for (const planeId of PLANE_IDS) {
    const amount = reward.duplicateBlueprints?.[planeId] ?? 0;
    if (amount > 0) parts.push(`${amount} ${getPlaneMeta(planeId).label}重复蓝图已转换`);
  }
  for (const meta of upgradeCatalog) {
    const amount = reward.upgradeBlueprints?.[meta.key] ?? 0;
    if (amount > 0) parts.push(`${amount} ${upgradeBlueprintLabels[meta.key]}`);
  }
  return parts.filter(Boolean).join("、") || "补给已领取";
}

function getStageReward(stage: number) {
  return 150 + Math.max(0, stage - 1) * 50;
}

function getStageTarget(stage: number) {
  return 7 + Math.min(22, stage * 2);
}

function getStageDifficulty(stage: number) {
  return 1 + Math.floor(Math.max(0, stage - 1) * 0.64);
}

function getStoryMission(faction: StoryFaction, stage: number) {
  const missions = storyCampaigns[faction];
  const index = clamp(normalizeStageNumber(stage) - 1, 0, missions.length - 1);
  return missions[index];
}

function getStoryFactionLabel(faction: StoryFaction) {
  return faction === "usa" ? "美国线" : "日本线";
}

function advanceStoryProgress(progress: StoryProgressState, faction: StoryFaction, completedStage: number) {
  const nextStage = Math.min(storyCampaigns[faction].length, normalizeStageNumber(completedStage) + 1);
  return { ...progress, [faction]: Math.max(progress[faction] ?? 1, nextStage) };
}

function getStoryEnemySprite(mission: StoryMission | null, kind: EnemyKind) {
  if (!mission) return undefined;
  if (kind === "scout" || kind === "stealth") return mission.enemyScoutSprite;
  if (kind === "fighter") return mission.enemyFighterSprite;
  return mission.enemyHeavySprite;
}

function getStoryEnemyKind(mission: StoryMission | null, roll: number): EnemyKind {
  if (!mission) return "scout";
  if (mission.stage === 1) return roll > 0.74 ? "fighter" : "scout";
  if (mission.stage === 2) return roll > 0.38 ? "heavy" : roll > 0.18 ? "fighter" : "scout";
  if (mission.stage === 3) return roll > 0.68 ? "heavy" : roll > 0.22 ? "fighter" : "scout";
  if (mission.stage === 4) return roll > 0.5 ? "heavy" : "fighter";
  if (mission.stage >= 6) return roll > 0.72 ? "heavy" : roll > 0.2 ? "fighter" : "scout";
  return roll > 0.62 ? "heavy" : roll > 0.2 ? "fighter" : "scout";
}

function isWw2Bomber(sprite?: Ww2SpriteKey) {
  return sprite === "usB17" || sprite === "jpBetty";
}

function isWw2AttackPlane(sprite?: Ww2SpriteKey) {
  return sprite === "usSbd" || sprite === "jpVal" || sprite === "usPby" || sprite === "jpJake";
}

function getStoryProxyPlane(sprite?: Ww2SpriteKey): PlaneId {
  if (!sprite) return "j8";
  if (sprite === "usB17" || sprite === "usPby") return "f4";
  if (sprite === "usSbd") return "f18";
  if (sprite === "usP40" || sprite === "usF4f") return "f16";
  if (sprite === "jpVal" || sprite === "jpBetty") return "jh7";
  return "j7";
}

function getStageWingmen(stage: number) {
  return stage >= 2 && stage % 2 === 0 ? 2 : 0;
}

function getEnemyActiveCap(state: GameState) {
  if (state.mode === "stage" || state.mode === "story") {
    if (state.mode === "story" && state.stage <= 2) return 5;
    if (state.stage >= 15) return 8;
    if (state.stage >= 9) return 7;
    if (state.stage >= 5) return 6;
    return 5;
  }

  return 5 + Math.min(3, Math.floor(state.score / 9000));
}

function getSpawnInterval(state: GameState) {
  if (state.mode === "stage" || state.mode === "story") return Math.max(1.16, 1.95 - state.difficulty * 0.04);
  return Math.max(0.92, 1.48 - state.difficulty * 0.03);
}

function getMaxHp(upgrades: UpgradeState, planeId: PlaneId) {
  return getPlaneMeta(planeId).baseHp + upgrades.armor * 42;
}

function getMaxFuel(upgrades: UpgradeState, planeId: PlaneId) {
  return getPlaneMeta(planeId).fuel + upgrades.fuelTank * 42;
}

function getMagazineSize(planeId: PlaneId) {
  return 72 + getPlaneTier(planeId) * 8;
}

function getMaxCannonAmmo(upgrades: UpgradeState, planeId: PlaneId) {
  return 620 + getPlaneTier(planeId) * 70 + upgrades.ammo * 240;
}

function getPlayerFireInterval(state: GameState) {
  const tier = getPlaneTier(state.selectedPlane);
  return Math.max(0.052, 0.112 - tier * 0.0055 - state.upgrades.engine * 0.0045 - state.upgrades.firepower * 0.002);
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
  return localToWorld(aircraft, localX, localY);
}

function getAircraftRenderScale(aircraft: Aircraft) {
  const bank = Math.abs(clamp(aircraft.bank ?? 0, -1, 1));
  return {
    x: 1 - bank * 0.04,
    y: 1 + bank * 0.018,
  };
}

function getVisualLaunchAngle(aircraft: Aircraft, extraAngle = 0) {
  return normalizeAngle(aircraft.angle + extraAngle);
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

const looseFormationOffsets = [
  { rear: 142, lateral: -104 },
  { rear: 142, lateral: 104 },
  { rear: 252, lateral: -176 },
  { rear: 252, lateral: 176 },
  { rear: 342, lateral: 0 },
  { rear: 392, lateral: -112 },
  { rear: 392, lateral: 112 },
  { rear: 478, lateral: -188 },
  { rear: 478, lateral: 188 },
];

function getLooseFormationOffset(slot: number) {
  if (looseFormationOffsets[slot]) return looseFormationOffsets[slot];
  const pair = Math.floor(slot / 2);
  const side = slot % 2 === 0 ? -1 : 1;
  return {
    rear: 500 + pair * 42,
    lateral: side * (128 + (pair % 3) * 44),
  };
}

function getFormationPoint(leader: Aircraft, slot: number, rearScale = 1, lateralScale = 1) {
  const dir = direction(leader.angle);
  const perp = { x: -dir.y, y: dir.x };
  const offset = getLooseFormationOffset(slot);
  return {
    x: leader.x - dir.x * offset.rear * rearScale + perp.x * offset.lateral * lateralScale,
    y: leader.y - dir.y * offset.rear * rearScale + perp.y * offset.lateral * lateralScale,
  };
}

function getTakeoffFormationPoint(player: Aircraft, slot: number) {
  return getFormationPoint(player, slot, 1.08, 1.16);
}

function positionWingmenForTakeoff(state: GameState) {
  for (const ally of state.allies) {
    const target = getTakeoffFormationPoint(state.player, ally.wingSlot ?? 0);
    ally.x = target.x;
    ally.y = target.y;
    ally.angle = state.player.angle;
    ally.speed = state.player.speed * 0.98;
    ally.bank = 0;
    ally.throttle = 1;
    ally.invulnerable = Math.max(ally.invulnerable ?? 0, state.takeoffDuration + 0.8);
  }
}

function createGameState(
  bestScore: number,
  upgrades: UpgradeState,
  selectedPlane: PlaneId,
  mode: GameMode = "endless",
  stage = 1,
  storyFaction: StoryFaction | null = null,
): GameState {
  const storyMission = mode === "story" ? getStoryMission(storyFaction ?? "usa", stage) : null;
  const effectivePlane = storyMission ? getStoryProxyPlane(storyMission.playerSprite) : selectedPlane;
  const effectiveUpgrades = storyMission ? { ...defaultUpgrades } : upgrades;
  const maxHp = getMaxHp(effectiveUpgrades, effectivePlane);
  const maxFuel = getMaxFuel(effectiveUpgrades, effectivePlane);
  const maxAmmoReserve = getMaxCannonAmmo(effectiveUpgrades, effectivePlane);
  const magazineSize = getMagazineSize(effectivePlane);
  const speedStats = getSpeedStats(effectiveUpgrades, effectivePlane);
  const playerRadius = storyMission
    ? isWw2Bomber(storyMission.playerSprite)
      ? 38
      : isWw2AttackPlane(storyMission.playerSprite)
        ? 34
        : 30
    : isStealthPlane(effectivePlane)
      ? 33
      : isHeavyPlane(effectivePlane)
        ? 32
        : 30;
  const state: GameState = {
    phase: "menu",
    mode,
    stage: storyMission?.stage ?? stage,
    stageTarget: storyMission ? storyMission.target : mode === "stage" ? getStageTarget(stage) : 0,
    stageKills: 0,
    stageReward: storyMission ? storyMission.reward : mode === "stage" ? getStageReward(stage) : 0,
    player: {
      id: 0,
      side: "player",
      kind: effectivePlane,
      x: 0,
      y: 0,
      angle: -Math.PI / 2,
      speed: speedStats.cruiseSpeed,
      hp: maxHp,
      maxHp,
      fireTimer: 0,
      radius: playerRadius,
      ww2Sprite: storyMission?.playerSprite,
      heat: 8,
      fuel: maxFuel,
      maxFuel,
      overheated: false,
      invulnerable: 1.2,
      missileAmmo: storyMission ? 0 : 4 + effectiveUpgrades.missiles * 2,
      ammoReserve: maxAmmoReserve,
      maxAmmoReserve,
      magazineAmmo: Math.min(magazineSize, maxAmmoReserve),
      magazineSize,
      reloadTimer: 0,
      fuelEmptyTimer: 0,
      fuelEmptyLimit: 10,
      tankerCallsMax: 2 + effectiveUpgrades.tanker,
      tankerCallsLeft: 2 + effectiveUpgrades.tanker,
    },
    allies: [],
    enemies: [],
    bullets: [],
    tankers: [],
    explosions: [],
    smokes: [],
    wrecks: [],
    floaters: [],
    selectedPlane: effectivePlane,
    opponentFaction: getRandomOpponentFaction(effectivePlane),
    storyFaction: mode === "story" ? storyFaction ?? "usa" : null,
    storyMission,
    upgrades: effectiveUpgrades,
    score: 0,
    bestScore,
    difficulty: storyMission ? storyMission.difficulty : mode === "stage" ? getStageDifficulty(stage) : 1,
    spawnTimer: storyMission ? 0.22 : 0.85,
    earnedCredits: 0,
    rewardClaimed: false,
    shake: 0,
    time: 0,
    takeoffTimer: 0,
    takeoffDuration: 3.35,
    nextId: 0,
  };

  state.player.id = makeId(state);
  const wingmen = mode === "story" ? Math.max(2, getStageWingmen(storyMission?.stage ?? stage)) : mode === "stage" ? getStageWingmen(stage) : 5;
  for (let index = 0; index < wingmen; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const ally = createAircraft(
      state,
      "ally",
      effectivePlane,
      side * 160,
      170 + index * 58,
      state.player.angle,
      Math.round(maxHp * 0.62),
      speedStats.cruiseSpeed * 0.96,
      isStealthPlane(effectivePlane) ? 29 : isHeavyPlane(effectivePlane) ? 28 : 27,
    );
    ally.wingSlot = index;
    ally.ww2Sprite = storyMission?.playerSprite;
    state.allies.push(ally);
  }

  return state;
}

function snapshot(state: GameState): HudState {
  const player = state.player;
  const heat = player.heat ?? 0;
  const fuel = player.fuel ?? 0;
  const maxFuel = player.maxFuel ?? 1;
  const fuelEmptyTimer = player.fuelEmptyTimer ?? 0;
  const fuelEmptyLimit = player.fuelEmptyLimit ?? 10;
  const engineStatus = player.overheated
    ? "过热"
    : fuel <= 0 && fuelEmptyTimer > 0
      ? "燃油耗尽"
      : fuel <= maxFuel * 0.14
      ? "燃油低"
      : heat > 72
        ? "高温"
        : "正常";
  const radarRange = getRadarRange(state.selectedPlane);
  const dir = direction(player.angle);
  const perp = { x: -dir.y, y: dir.x };
  const radarBlips: RadarBlip[] = [...state.allies, ...state.enemies.filter((enemy) => !isStealthEnemy(enemy))]
    .filter((aircraft) => distance(player, aircraft) <= radarRange)
    .map((aircraft) => {
      const rel = { x: aircraft.x - player.x, y: aircraft.y - player.y };
      const forward = rel.x * dir.x + rel.y * dir.y;
      const side = rel.x * perp.x + rel.y * perp.y;
      const scale = 44 / radarRange;
      return {
        id: aircraft.id,
        x: 50 + side * scale,
        y: 50 - forward * scale,
        side: aircraft.side === "enemy" ? "enemy" : "ally",
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
    ammoReserve: player.ammoReserve ?? 0,
    maxAmmoReserve: player.maxAmmoReserve ?? 0,
    magazineAmmo: player.magazineAmmo ?? 0,
    magazineSize: player.magazineSize ?? 0,
    reloadTimer: player.reloadTimer ?? 0,
    fuelEmptyTimer,
    fuelEmptyLimit,
    earnedCredits: state.earnedCredits,
    allies: state.allies.length,
    radarRange,
    radarBlips,
    storyFaction: state.storyFaction,
    missionTitle: state.storyMission?.title ?? "",
    missionObjective: state.storyMission?.objective ?? "",
    missionTheatre: state.storyMission?.theatre ?? "",
    missionYear: state.storyMission?.year ?? "",
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
  const noseY = -size * 0.43;
  if (aircraft.side === "enemy") {
    return [{ x: 0, y: noseY, angle: 0, powerScale: 1 }];
  }

  const plane = getPlaneMeta(isPlaneId(aircraft.kind) ? aircraft.kind : state.selectedPlane);
  const powerScale = plane.gunCaliber >= 30 ? 1.22 : plane.gunBarrels === 2 ? 1.12 : 1;

  return [{ x: 0, y: noseY, angle: 0, powerScale }];
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
  const muzzleOffset = owner === "enemy" ? 1.8 : 2;
  state.bullets.push({
    id: makeId(state),
    owner,
    x: x + dir.x * muzzleOffset,
    y: y + dir.y * muzzleOffset,
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
  if (owner === "player") {
    const reserve = aircraft.ammoReserve ?? 0;
    const magazine = aircraft.magazineAmmo ?? 0;
    if (reserve <= 0 || magazine <= 0 || (aircraft.reloadTimer ?? 0) > 0) {
      if (resetTimer) aircraft.fireTimer = reserve <= 0 ? 0.22 : 0.08;
      return false;
    }
  }
  const basePower =
    owner === "enemy"
      ? aircraft.kind === "heavy" || aircraft.kind === "tank"
        ? 11
        : aircraft.kind === "stealth"
          ? 10
          : 9
      : (3.2 + state.upgrades.firepower * 0.74) * (1 + plane.damageBonus);
  const bulletSpeed = owner === "enemy" ? 650 : 930;
  let shotsFired = 0;

  for (const port of ports) {
    if (owner === "player") {
      if ((aircraft.ammoReserve ?? 0) <= 0 || (aircraft.magazineAmmo ?? 0) <= 0) break;
      aircraft.ammoReserve = Math.max(0, (aircraft.ammoReserve ?? 0) - 1);
      aircraft.magazineAmmo = Math.max(0, (aircraft.magazineAmmo ?? 0) - 1);
    }
    const origin = localToWorld(aircraft, port.x, port.y);
    const launchAngle = normalizeAngle(aircraft.angle + port.angle);
    addBullet(state, owner, origin.x, origin.y, launchAngle, bulletSpeed + aircraft.speed * 0.35, basePower * port.powerScale);
    shotsFired += 1;
  }

  if (owner === "player" && (aircraft.magazineAmmo ?? 0) <= 0 && (aircraft.ammoReserve ?? 0) > 0) {
    aircraft.reloadTimer = Math.max(aircraft.reloadTimer ?? 0, 1.05);
  }

  if (!resetTimer) return shotsFired > 0;

  aircraft.fireTimer = owner === "enemy" ? randomBetween(0.78, 1.35) : getPlayerFireInterval(state);
  return shotsFired > 0;
}

function getEnemyBurstProfile(enemy: Aircraft) {
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
  const origin = localToVisualWorld(player, rack.x, rack.y);
  const target = chooseMissileTarget(state, player);
  const visualAngle = getVisualLaunchAngle(player);
  const launchAngle = target ? turnToward(visualAngle, angleTo(player, target), 0.48) : visualAngle;
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
    life: 4.8,
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
  const origin = localToVisualWorld(enemy, rack.x, rack.y);
  const launchAngle = turnToward(getVisualLaunchAngle(enemy), angleTo(enemy, target), 0.38);
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

function getNextEnemyFormationSlot(state: GameState) {
  const occupied = new Set(state.enemies.map((enemy) => enemy.wingSlot ?? -1));
  const cap = getEnemyActiveCap(state);
  for (let slot = 0; slot < cap; slot += 1) {
    if (!occupied.has(slot)) return slot;
  }
  return state.enemies.length;
}

function getEnemyAttackFormationPoint(state: GameState, target: Aircraft, slot: number, preferred: number, kind: Aircraft["kind"]) {
  const targetDir = direction(target.angle);
  const targetPerp = { x: -targetDir.y, y: targetDir.x };
  const offset = getLooseFormationOffset(slot);
  const heavy = kind === "tank" || kind === "heavy";
  const rear = preferred + offset.rear * (heavy ? 0.38 : 0.32);
  const lateralScale = heavy ? 0.96 : 0.82;
  const drift = Math.sin(state.time * 0.58 + slot * 1.21) * 38;
  return {
    x: target.x - targetDir.x * rear + targetPerp.x * (offset.lateral * lateralScale + drift),
    y: target.y - targetDir.y * rear + targetPerp.y * (offset.lateral * lateralScale + drift),
  };
}

function spawnRegularEnemy(state: GameState) {
  const player = state.player;
  const difficulty = state.difficulty;
  const roll = Math.random();
  const openingStoryKind: EnemyKind | undefined =
    state.mode === "story" && state.stageKills === 0 && state.enemies.length === 0
      ? state.storyMission?.stage === 2
        ? "heavy"
        : state.storyMission?.stage === 1
          ? "scout"
          : undefined
      : undefined;
  const kind: EnemyKind = openingStoryKind ?? (state.mode === "story"
    ? getStoryEnemyKind(state.storyMission, roll)
    : difficulty > 5 && roll > 0.9
      ? "stealth"
      : difficulty > 3 && roll > 0.76
        ? "heavy"
        : roll > 0.84 && difficulty > 2
          ? "tank"
          : roll > 0.48
            ? "fighter"
            : "scout");
  const storySprite = state.mode === "story" ? getStoryEnemySprite(state.storyMission, kind) : undefined;
  const hp =
    storySprite && isWw2Bomber(storySprite)
      ? 24 + difficulty * 4
      : storySprite && isWw2AttackPlane(storySprite)
        ? 16 + difficulty * 3
        : kind === "tank"
          ? 18 + difficulty * 3
          : kind === "heavy"
            ? 15 + difficulty * 3
            : kind === "stealth"
              ? 12 + difficulty * 2
              : kind === "fighter"
                ? 10 + difficulty * 2
                : 6 + difficulty;
  const radius = storySprite && isWw2Bomber(storySprite)
    ? 42
    : storySprite && isWw2AttackPlane(storySprite)
      ? 35
      : kind === "tank"
        ? 35
        : kind === "heavy"
          ? 34
          : kind === "stealth"
            ? 29
            : kind === "fighter"
              ? 30
              : 27;
  const slot = getNextEnemyFormationSlot(state);
  const storyEntry = state.mode === "story";
  const firstStoryContact = storyEntry && state.stageKills === 0 && state.enemies.length === 0;
  const preferred = storyEntry
    ? kind === "heavy" || kind === "tank"
      ? 260
      : kind === "fighter"
        ? 230
        : 210
    : kind === "tank" || kind === "heavy"
      ? 760
      : kind === "stealth"
        ? 700
        : 650;
  const station = getEnemyAttackFormationPoint(state, player, slot, preferred, kind);
  const entrySide = slot % 2 === 0 ? -1 : 1;
  const entryDir = storyEntry
    ? direction(player.angle + Math.PI + entrySide * Math.PI * 0.58 + randomBetween(-0.16, 0.16))
    : direction(player.angle + Math.PI + randomBetween(-0.42, 0.42));
  const entryDistance = storyEntry ? randomBetween(140, 280) : randomBetween(360, 760);
  const jitter = storyEntry ? 48 : 120;
  const playerDir = direction(player.angle);
  const playerPerp = { x: -playerDir.y, y: playerDir.x };
  const contactSide = slot % 2 === 0 ? -1 : 1;
  const spawnX = firstStoryContact
    ? player.x + playerPerp.x * contactSide * randomBetween(380, 470) + playerDir.x * randomBetween(110, 170)
    : station.x + entryDir.x * entryDistance + randomBetween(-jitter, jitter);
  const spawnY = firstStoryContact
    ? player.y + playerPerp.y * contactSide * randomBetween(380, 470) + playerDir.y * randomBetween(110, 170)
    : station.y + entryDir.y * entryDistance + randomBetween(-jitter, jitter);
  const spawnAngle = firstStoryContact
    ? normalizeAngle(player.angle - contactSide * Math.PI / 2 + randomBetween(-0.12, 0.12))
    : angleTo({ x: spawnX, y: spawnY }, station);
  const enemy = createAircraft(
    state,
    "enemy",
    kind,
    spawnX,
    spawnY,
    spawnAngle,
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
  enemy.spawnWarmup = storyEntry ? randomBetween(0.45, 0.9) : randomBetween(1.15, 1.9);
  enemy.variant = getEnemyVariantForKind(state, kind, enemy.id);
  enemy.wingSlot = slot;
  enemy.ww2Sprite = storySprite;
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
    if (offBoresight < 2.45 && dist < 3600) {
      const coneScore = dist * (1 + offBoresight * 0.24);
      if (coneScore < forwardScore) {
        forwardScore = coneScore;
        forwardTarget = enemy;
      }
    }
  }

  return forwardTarget;
}

function getEnemyVariantForKind(state: GameState, kind: EnemyKind, seed = 0): PlaneId {
  const opponentIds = getPlaneIdsByFaction(getOpponentFaction(state));
  const last = opponentIds.length - 1;
  if (kind === "stealth") return opponentIds[Math.max(0, last - (seed % 2))] ?? opponentIds[0];
  if (kind === "tank" || kind === "heavy") return opponentIds[Math.min(3 + (seed % 3), last)] ?? opponentIds[0];
  if (kind === "fighter") return opponentIds[Math.min(1 + (seed % 4), last)] ?? opponentIds[0];
  return opponentIds[seed % Math.min(3, opponentIds.length)] ?? opponentIds[0];
}

function destroyEnemy(state: GameState, enemy: Aircraft) {
  const points =
    enemy.kind === "tank" || enemy.kind === "heavy"
      ? 115
      : enemy.kind === "stealth"
        ? 135
        : enemy.kind === "fighter"
          ? 70
          : 40;
  const dir = direction(enemy.angle);
  const wreckLife = enemy.kind === "tank" || enemy.kind === "heavy" ? 1.25 : 0.9;
  state.score += points;
  if (state.mode === "stage" || state.mode === "story") {
    state.stageKills = Math.min(state.stageTarget, state.stageKills + 1);
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
    variant: enemy.variant,
    ww2Sprite: enemy.ww2Sprite,
    radius: enemy.radius,
    life: wreckLife,
    maxLife: wreckLife,
  });
  addExplosion(
    state,
    enemy.x,
    enemy.y,
    42,
    "#fb923c",
    0.42,
  );
  for (let index = 0; index < 2; index += 1) addSmoke(state, enemy.x, enemy.y, 18);
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

function damageAircraft(
  state: GameState,
  target: Aircraft,
  amount: number,
  x: number,
  y: number,
  options: { ignoreInvulnerability?: boolean } = {},
) {
  if (!options.ignoreInvulnerability && target.side === "player" && (target.invulnerable ?? 0) > 0) {
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

function isAircraftActive(state: GameState, aircraft: Aircraft) {
  if (aircraft.side === "player") return state.player.id === aircraft.id && state.player.hp > 0;
  if (aircraft.side === "ally") return state.allies.some((ally) => ally.id === aircraft.id);
  return state.enemies.some((enemy) => enemy.id === aircraft.id);
}

function getCollisionMass(aircraft: Aircraft) {
  if (aircraft.kind === "tank" || aircraft.kind === "heavy") return 2.6;
  if (aircraft.side === "player") return 2.2;
  if (aircraft.side === "ally") return 1.8;
  return 1.25;
}

function applyCollisionDamage(state: GameState, a: Aircraft, b: Aircraft, x: number, y: number) {
  const enemy = a.side === "enemy" ? a : b.side === "enemy" ? b : null;
  const friendly = a.side === "enemy" ? b : b.side === "enemy" ? a : null;
  if (!enemy || !friendly || (a.collisionCooldown ?? 0) > 0 || (b.collisionCooldown ?? 0) > 0) return;

  a.collisionCooldown = 0.85;
  b.collisionCooldown = 0.85;
  const enemyWeight = enemy.kind === "tank" || enemy.kind === "heavy" ? 1.22 : 1;
  const friendlyDamage = enemy.kind === "tank" || enemy.kind === "heavy" ? 88 : enemy.kind === "stealth" ? 76 : 66;
  const enemyDamage = Math.max(enemy.maxHp * 0.78, 54 + friendly.radius * 0.9);

  state.shake = Math.max(state.shake, 18);
  addExplosion(state, x, y, 42, "#fb7185", 0.36);
  addFloater(state, "碰撞", x, y - 28, "#fecaca");
  damageAircraft(state, friendly, friendlyDamage * enemyWeight, x, y, { ignoreInvulnerability: true });
  if (isAircraftActive(state, enemy)) {
    damageAircraft(state, enemy, enemyDamage, x, y, { ignoreInvulnerability: true });
  }
}

function updateAircraftCollisions(state: GameState, dt: number) {
  const aircraft = [state.player, ...state.allies, ...state.enemies];
  for (const unit of aircraft) {
    unit.collisionCooldown = Math.max(0, (unit.collisionCooldown ?? 0) - dt);
  }

  for (let i = 0; i < aircraft.length; i += 1) {
    const a = aircraft[i];
    if (!isAircraftActive(state, a)) continue;
    for (let j = i + 1; j < aircraft.length; j += 1) {
      const b = aircraft[j];
      if (!isAircraftActive(state, b)) continue;
      if ((a.side === "enemy") === (b.side === "enemy")) continue;
      const minimum = a.radius + b.radius + 12;
      const dist = distance(a, b);
      if (dist >= minimum) continue;

      const fallbackAngle = normalizeAngle((a.id - b.id) * 1.73);
      const nx = dist > 0.001 ? (b.x - a.x) / dist : Math.cos(fallbackAngle);
      const ny = dist > 0.001 ? (b.y - a.y) / dist : Math.sin(fallbackAngle);
      const overlap = minimum - Math.max(dist, 0.001);
      const aMass = getCollisionMass(a);
      const bMass = getCollisionMass(b);
      const totalMass = aMass + bMass;
      const aMove = overlap * (bMass / totalMass);
      const bMove = overlap * (aMass / totalMass);

      a.x -= nx * aMove;
      a.y -= ny * aMove;
      b.x += nx * bMove;
      b.y += ny * bMove;
      a.speed *= 0.96;
      b.speed *= 0.94;
      applyCollisionDamage(state, a, b, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
  }
}

function getEnemySeparation(state: GameState, enemy: Aircraft) {
  const separation = { x: 0, y: 0 };
  for (const other of state.enemies) {
    if (other.id === enemy.id) continue;
    const desiredGap = enemy.radius + other.radius + 132;
    const gap = distance(enemy, other);
    if (gap <= 0.001 || gap >= desiredGap) continue;
    const strength = (desiredGap - gap) / desiredGap;
    separation.x += ((enemy.x - other.x) / gap) * strength;
    separation.y += ((enemy.y - other.y) / gap) * strength;
  }
  return separation;
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
        if (Math.abs(normalizeAngle(targetBearing - currentAngle)) > 2.72 && (bullet.age ?? 0) > 0.45) {
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
    if (bullet.life <= 0 || distance(bullet, state.player) > (bullet.kind === "missile" ? 3300 : 1900)) {
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
  if ((player.fuel ?? 0) <= 0) {
    player.fuelEmptyTimer = (player.fuelEmptyTimer ?? 0) + dt;
    if ((player.fuelEmptyTimer ?? 0) >= (player.fuelEmptyLimit ?? 10)) {
      addFloater(state, "燃油不足坠机", player.x, player.y - 92, "#fecaca");
      damageAircraft(state, player, player.maxHp + 999, player.x, player.y, { ignoreInvulnerability: true });
      return;
    }
  } else {
    player.fuelEmptyTimer = 0;
  }

  player.fireTimer -= dt;
  player.reloadTimer = Math.max(0, (player.reloadTimer ?? 0) - dt);
  if ((player.magazineAmmo ?? 0) <= 0 && (player.ammoReserve ?? 0) > 0 && (player.reloadTimer ?? 0) <= 0) {
    player.magazineAmmo = Math.min(player.magazineSize ?? 0, player.ammoReserve ?? 0);
    addFloater(state, "换弹", player.x, player.y - 62, "#dbeafe");
  }
  if (input.firing && player.fireTimer <= 0 && (player.fuel ?? 0) > 0) fireGuns(state, player, "player");
}

function updateAllies(state: GameState, dt: number) {
  const player = state.player;
  const plane = getPlaneMeta(state.selectedPlane);
  const speedStats = getSpeedStats(state.upgrades, state.selectedPlane);
  for (const ally of state.allies) {
    const slot = ally.wingSlot ?? 0;
    const dir = direction(player.angle);
    const perp = { x: -dir.y, y: dir.x };
    const formation = getFormationPoint(player, slot);
    const looseDrift = Math.sin(state.time * 0.62 + slot * 1.37);
    formation.x += perp.x * looseDrift * 22 + dir.x * Math.cos(state.time * 0.48 + slot) * 12;
    formation.y += perp.y * looseDrift * 22 + dir.y * Math.cos(state.time * 0.48 + slot) * 12;
    const target = chooseNearestEnemy(state, ally);
    const formationDist = distance(ally, formation);
    const formationAngle = angleTo(ally, formation);
    let desiredAngle = formationAngle;
    if (target && distance(target, ally) < 980 && formationDist < 520) {
      desiredAngle = turnToward(formationAngle, angleTo(ally, target), 0.72);
    }
    ally.bank = (ally.bank ?? 0) + (clamp(normalizeAngle(desiredAngle - ally.angle) * 1.8, -1, 1) - (ally.bank ?? 0)) * Math.min(1, dt * 4);
    ally.angle = turnToward(ally.angle, desiredAngle, (plane.turnRate + 0.18) * dt);
    const speedTarget = clamp(player.speed + (formationDist - 120) * 0.52, speedStats.minSpeed, speedStats.maxSpeed);
    ally.speed += (speedTarget - ally.speed) * dt * 0.82;
    ally.speed = clamp(ally.speed, speedStats.minSpeed, speedStats.maxSpeed);
    ally.throttle = clamp((ally.speed - speedStats.cruiseSpeed) / Math.max(1, speedStats.maxSpeed - speedStats.cruiseSpeed), -0.35, 1);
    const move = direction(ally.angle);
    ally.x += move.x * ally.speed * dt;
    ally.y += move.y * ally.speed * dt;
    ally.fireTimer -= dt;
    if (target && formationDist < 620 && distance(target, ally) < 920 && Math.abs(normalizeAngle(angleTo(ally, target) - ally.angle)) < 0.24 && ally.fireTimer <= 0) {
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
    const heavyEnemy = enemy.kind === "tank" || enemy.kind === "heavy";
    const turnRate = enemy.kind === "stealth" ? 2.16 : heavyEnemy ? 1.46 : 1.92;
    const weave = Math.sin(state.time * (enemy.kind === "stealth" ? 1.95 : 1.65) + enemy.id) * (enemy.kind === "stealth" ? 0.22 : 0.18);
    const preferred = heavyEnemy ? 720 : enemy.kind === "stealth" ? 680 : 640;
    const dist = distance(enemy, target);
    const trailPoint = getEnemyAttackFormationPoint(state, target, enemy.wingSlot ?? enemy.id, preferred, enemy.kind);
    const separation = getEnemySeparation(state, enemy);
    const separationForce = Math.hypot(separation.x, separation.y);
    const separatedTrailPoint = {
      x: trailPoint.x + separation.x * 220,
      y: trailPoint.y + separation.y * 220,
    };
    const stationDist = distance(enemy, separatedTrailPoint);
    const safeRange = Math.max(target.radius + enemy.radius + 220, preferred * 0.56);
    const cautionRange = preferred * 0.82;
    const fireRange = heavyEnemy ? 1180 : enemy.kind === "stealth" ? 1120 : 1060;
    const closingOnTarget = Math.cos(normalizeAngle(targetAngle - enemy.angle)) > 0.18;
    const tooClose = dist < safeRange;
    const shouldOpenDistance = tooClose || (dist < cautionRange && closingOnTarget);
    const nearStation = stationDist < 220;
    const inAttackWindow = dist > safeRange * 1.05 && dist < fireRange;
    const shouldChase = dist > preferred * 1.34 || stationDist > 620;
    const escapeSide = ((enemy.wingSlot ?? enemy.id) % 2 === 0 ? 1 : -1);
    const escapeAngle = normalizeAngle(targetAngle + Math.PI + escapeSide * (tooClose ? 0.92 : 0.58) + weave * 0.22);
    let desiredAngle = shouldOpenDistance
      ? escapeAngle
      : shouldChase
        ? targetAngle + weave * 0.08
        : inAttackWindow || nearStation
          ? targetAngle + weave * 0.1
          : angleTo(enemy, separatedTrailPoint) + weave * 0.1;
    if (separationForce > 0.04 && !tooClose) {
      desiredAngle = turnToward(desiredAngle, Math.atan2(separation.y, separation.x), clamp(separationForce * 0.42, 0, 0.36));
    }
    enemy.bank = (enemy.bank ?? 0) + (clamp(normalizeAngle(desiredAngle - enemy.angle) * 1.6, -1, 1) - (enemy.bank ?? 0)) * Math.min(1, dt * 4);
    const turnAuthority = shouldOpenDistance ? turnRate * 1.28 : turnRate;
    enemy.angle = turnToward(enemy.angle, desiredAngle, turnAuthority * dt);
    const warmingUp = (enemy.spawnWarmup ?? 0) > 0;
    const arrival = warmingUp ? 0.34 : 1;
    const maxEnemySpeed = enemy.kind === "stealth" ? 390 + state.difficulty * 5 : heavyEnemy ? 328 + state.difficulty * 4 : 352 + state.difficulty * 5;
    const minEnemySpeed = warmingUp ? 104 : heavyEnemy ? 175 : 190;
    const chaseSpeed = clamp(target.speed + 72 + Math.max(0, dist - preferred) * 0.08, minEnemySpeed, maxEnemySpeed);
    const attackSpeed = clamp(target.speed * 0.96 + (dist - preferred) * 0.11, minEnemySpeed, maxEnemySpeed);
    const holdSpeed = clamp(target.speed * 0.9 + (nearStation ? -6 : stationDist * 0.08), minEnemySpeed, maxEnemySpeed);
    const retreatSpeed = clamp(target.speed + 128 + (safeRange - Math.min(dist, safeRange)) * 0.24, minEnemySpeed, maxEnemySpeed);
    const speedTarget = (shouldOpenDistance ? retreatSpeed : shouldChase ? chaseSpeed : inAttackWindow ? attackSpeed : holdSpeed) * arrival;
    enemy.speed += (speedTarget - enemy.speed) * dt * (shouldOpenDistance ? 1.04 : 0.45);
    enemy.speed = clamp(enemy.speed, minEnemySpeed, maxEnemySpeed);
    enemy.throttle = clamp((speedTarget - enemy.speed) / 160, -0.2, 1);
    const dir = direction(enemy.angle);
    enemy.x += dir.x * enemy.speed * dt;
    enemy.y += dir.y * enemy.speed * dt;
    enemy.fireTimer -= dt;
    updateEnemyBurst(state, enemy, dt);

    const aimError = Math.abs(normalizeAngle(targetAngle - enemy.angle));
    if (
      (enemy.spawnWarmup ?? 0) <= 0 &&
      (enemy.burstRemaining ?? 0) <= 0 &&
      !tooClose &&
      dist > safeRange * 1.05 &&
      dist < fireRange &&
      aimError < (enemy.kind === "stealth" ? 0.48 : 0.42) &&
      enemy.fireTimer <= 0
    ) {
      startEnemyBurst(enemy);
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
  const activeCap = getEnemyActiveCap(state);
  if (state.mode === "stage" || state.mode === "story") {
    const availableSlots = Math.max(0, activeCap - state.enemies.length);
    if (availableSlots > 0 && state.stageKills + state.enemies.length < state.stageTarget) {
      spawnRegularEnemy(state);
    }
    state.spawnTimer = getSpawnInterval(state);
    return;
  }

  if (state.enemies.length < activeCap) spawnRegularEnemy(state);
  state.spawnTimer = getSpawnInterval(state);
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
    if (Math.random() < dt * 3) addSmoke(state, wreck.x, wreck.y, 13);
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
  if ((state.mode !== "stage" && state.mode !== "story") || state.phase !== "running") return;
  const normalDone = state.stageKills >= state.stageTarget;
  if (normalDone && state.enemies.length === 0) {
    state.phase = "stageClear";
    state.bullets = state.bullets.filter((bullet) => bullet.owner !== "enemy");
    state.tankers = [];
    state.shake = Math.max(state.shake, 12);
    addFloater(state, state.mode === "story" ? "任务完成" : "关卡完成", state.player.x, state.player.y - 110, "#bef264");
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveBestScore(state.score);
    }
  }
}

function updateTakeoff(state: GameState, dt: number) {
  const player = state.player;
  const speedStats = getSpeedStats(state.upgrades, state.selectedPlane);
  state.takeoffTimer += dt;
  const progress = clamp(state.takeoffTimer / Math.max(0.1, state.takeoffDuration), 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  player.bank = (player.bank ?? 0) * Math.max(0, 1 - dt * 6);
  player.angle = -Math.PI / 2;
  player.throttle = 1;
  player.speed = speedStats.minSpeed * 0.58 + (speedStats.cruiseSpeed * 1.04 - speedStats.minSpeed * 0.58) * eased;
  player.heat = clamp((player.heat ?? 0) + (14 + state.upgrades.speed * 2) * dt, 0, 54);
  player.fuel = Math.max(0, (player.fuel ?? 0) - (0.55 + state.upgrades.speed * 0.08) * dt);

  const dir = direction(player.angle);
  player.x += dir.x * player.speed * dt;
  player.y += dir.y * player.speed * dt;

  positionWingmenForTakeoff(state);

  if (Math.random() < dt * 6) {
    const back = direction(player.angle + Math.PI);
    addSmoke(state, player.x + back.x * 42 + randomBetween(-10, 10), player.y + back.y * 42 + randomBetween(-10, 10), randomBetween(5, 9));
  }

  if (progress >= 1) {
    state.phase = "running";
    state.spawnTimer = state.mode === "story" ? 0.18 : getSpawnInterval(state);
    player.invulnerable = Math.max(player.invulnerable ?? 0, 1.15);
    addFloater(state, "起飞", player.x, player.y - 72, "#bae6fd");
  }
}

function updateGame(state: GameState, dt: number, input: InputState) {
  state.time += dt;
  updateEffects(state, dt);

  if (state.phase === "playerDying") {
    if (state.explosions.length === 0) state.phase = "over";
    return;
  }

  if (state.phase === "takeoff") {
    updateTakeoff(state, dt);
    return;
  }

  if (state.phase !== "running") return;

  updatePlayer(state, dt, input);
  if (state.phase !== "running") return;
  updateAllies(state, dt);
  updateEnemies(state, dt);
  updateTankers(state, dt);
  updateProjectiles(state, dt);
  updateAircraftCollisions(state, dt);

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

function isOddTile(value: number) {
  return Math.abs(value % 2) === 1;
}

function drawMirroredTerrainTile(
  ctx: CanvasRenderingContext2D,
  terrain: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  gx: number,
  gy: number,
) {
  const flipX = isOddTile(gx);
  const flipY = isOddTile(gy);
  ctx.save();
  ctx.translate(x + (flipX ? size : 0), y + (flipY ? size : 0));
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(terrain, 0, 0, size, size);
  ctx.restore();
}

function drawTerrainHaze(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const grid = 980;
  const startX = Math.floor((state.player.x - VIEW_WIDTH / 2) / grid) - 1;
  const endX = Math.floor((state.player.x + VIEW_WIDTH / 2) / grid) + 1;
  const startY = Math.floor((state.player.y - VIEW_HEIGHT / 2) / grid) - 1;
  const endY = Math.floor((state.player.y + VIEW_HEIGHT / 2) / grid) + 1;
  for (let gx = startX; gx <= endX; gx += 1) {
    for (let gy = startY; gy <= endY; gy += 1) {
      const density = seededNoise(gx * 4.9 + 19.1, gy * 3.6 - 7.3);
      if (density < 0.5) continue;
      const worldX = gx * grid + (seededNoise(gx + 5.7, gy - 3.1) - 0.5) * grid * 0.72;
      const worldY = gy * grid + (seededNoise(gy + 11.4, gx + 2.8) - 0.5) * grid * 0.72;
      const p = screenPoint(state, worldX, worldY);
      const radius = 340 + seededNoise(gx - 13.5, gy + 8.2) * 520;
      const alpha = 0.04 + density * 0.08;
      const haze = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      haze.addColorStop(0, `rgba(226, 246, 255, ${alpha})`);
      haze.addColorStop(0.58, `rgba(226, 246, 255, ${alpha * 0.42})`);
      haze.addColorStop(1, "rgba(226, 246, 255, 0)");
      ctx.fillStyle = haze;
      ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    }
  }
  ctx.restore();
}

function drawTakeoffAirfield(ctx: CanvasRenderingContext2D, state: GameState, airport: HTMLImageElement | null) {
  if (!airport?.complete || airport.naturalWidth <= 0) return;
  const fadeStart = state.takeoffDuration;
  const fade = state.phase === "takeoff" ? 1 : clamp(1 - (state.time - fadeStart) / 1.6, 0, 1);
  if (fade <= 0) return;

  const runwayWorldWidth = TAKEOFF_RUNWAY_WORLD_WIDTH;
  const runwayWorldHeight = runwayWorldWidth * (airport.naturalHeight / Math.max(1, airport.naturalWidth));
  const center = screenPoint(state, 0, -120);
  ctx.save();
  ctx.globalAlpha = 0.64 * fade;
  ctx.drawImage(airport, center.x - runwayWorldWidth / 2, center.y - runwayWorldHeight / 2, runwayWorldWidth, runwayWorldHeight);
  ctx.fillStyle = `rgba(125, 211, 252, ${0.16 * fade})`;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.restore();
}

function drawCloudCluster(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number, seed: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const ox = (seededNoise(seed + index * 2.7, seed - index * 1.9) - 0.5) * 160 * scale;
    const oy = (seededNoise(seed - index * 3.3, seed + index * 2.1) - 0.5) * 54 * scale;
    const w = (42 + seededNoise(seed + index * 5.1, 7.7) * 72) * scale;
    const h = (12 + seededNoise(3.1, seed - index * 4.3) * 22) * scale;
    const rot = (seededNoise(seed, index + 9.4) - 0.5) * 0.24;
    ctx.ellipse(x + ox, y + oy, w, h, rot, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawSky(ctx: CanvasRenderingContext2D, state: GameState, terrain: HTMLImageElement | null, airport: HTMLImageElement | null) {
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  gradient.addColorStop(0, "#4aaeee");
  gradient.addColorStop(0.58, "#8ed8ff");
  gradient.addColorStop(1, "#dff7ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  if (terrain?.complete && terrain.naturalWidth > 0) {
    const tile = terrain.naturalWidth || TERRAIN_TILE_SIZE;
    const startX = Math.floor((state.player.x - VIEW_WIDTH / 2) / tile) - 1;
    const endX = Math.floor((state.player.x + VIEW_WIDTH / 2) / tile) + 1;
    const startY = Math.floor((state.player.y - VIEW_HEIGHT / 2) / tile) - 1;
    const endY = Math.floor((state.player.y + VIEW_HEIGHT / 2) / tile) + 1;
    ctx.save();
    ctx.globalAlpha = 0.9;
    for (let gx = startX; gx <= endX; gx += 1) {
      for (let gy = startY; gy <= endY; gy += 1) {
        const p = screenPoint(state, gx * tile, gy * tile);
        drawMirroredTerrainTile(ctx, terrain, p.x, p.y, tile, gx, gy);
      }
    }
    ctx.globalAlpha = 1;
    drawTerrainHaze(ctx, state);
    ctx.fillStyle = "rgba(125, 211, 252, 0.22)";
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.restore();
  }

  drawTakeoffAirfield(ctx, state, airport);

  ctx.save();
  const grid = 620;
  const startX = Math.floor((state.player.x - VIEW_WIDTH / 2) / grid) - 1;
  const endX = Math.floor((state.player.x + VIEW_WIDTH / 2) / grid) + 1;
  const startY = Math.floor((state.player.y - VIEW_HEIGHT / 2) / grid) - 1;
  const endY = Math.floor((state.player.y + VIEW_HEIGHT / 2) / grid) + 1;
  for (let gx = startX; gx <= endX; gx += 1) {
    for (let gy = startY; gy <= endY; gy += 1) {
      const density = seededNoise(gx * 2.3, gy * 1.7);
      if (density < 0.42) continue;
      const count = density > 0.88 ? 2 : 1;
      for (let index = 0; index < count; index += 1) {
        const n1 = seededNoise(gx + index * 13.7, gy - index * 9.3);
        const n2 = seededNoise(gy - index * 5.1, gx + index * 7.9);
        const worldX = gx * grid + (n1 - 0.5) * grid * 0.92;
        const worldY = gy * grid + (n2 - 0.5) * grid * 0.78;
        const p = screenPoint(state, worldX, worldY);
        const cloudScale = 0.46 + seededNoise(gx + 41 + index, gy - 17 - index) * 0.5;
        const alpha = 0.06 + seededNoise(gx - 31 - index, gy + 23 + index) * 0.16;
        drawCloudCluster(ctx, p.x, p.y, cloudScale, alpha, gx * 11.7 + gy * 3.9 + index * 19.3);
      }
    }
  }
  ctx.restore();
}

function getAircraftSpriteKey(kind: Aircraft["kind"], side: Aircraft["side"], variant?: PlaneId): SpriteKey {
  if (side === "enemy" && variant) return variant;
  if (side === "enemy" && !isPlaneId(kind)) return "f16";
  return isPlaneId(kind) ? kind : "j8";
}

function isStealthPlane(planeId: PlaneId) {
  return ["j20", "j35", "fc31", "f22", "f35", "f117", "su57"].includes(planeId);
}

function isHeavyPlane(planeId: PlaneId) {
  return ["j11", "j15", "j16", "jh7", "f4", "f14", "f15", "mig31", "su27", "su30", "su33", "su35"].includes(planeId);
}

function getAircraftDrawSize(aircraft: Aircraft) {
  if (aircraft.ww2Sprite) {
    if (isWw2Bomber(aircraft.ww2Sprite)) return aircraft.side === "enemy" ? 126 : 116;
    if (isWw2AttackPlane(aircraft.ww2Sprite)) return aircraft.side === "enemy" ? 112 : 106;
    if (aircraft.side === "ally") return 88;
    return aircraft.side === "enemy" ? 94 : 100;
  }
  if (aircraft.kind === "tank") return 116;
  if (aircraft.kind === "heavy") return 112;
  if (aircraft.kind === "stealth") return 106;
  const planeKind = isPlaneId(aircraft.kind) ? aircraft.kind : aircraft.variant;
  const stealthFrame = planeKind ? isStealthPlane(planeKind) : false;
  const heavyFrame = planeKind ? isHeavyPlane(planeKind) : false;
  if (aircraft.side === "ally") return stealthFrame ? 98 : heavyFrame ? 94 : 90;
  if (aircraft.side === "enemy") return aircraft.kind === "scout" ? 90 : 98;
  if (stealthFrame) return 116;
  return heavyFrame ? 112 : 103;
}

function drawAircraftSprite(ctx: CanvasRenderingContext2D, sprites: HTMLImageElement | null, key: SpriteKey, size: number) {
  if (!sprites?.complete || sprites.naturalWidth <= 0) return false;
  const slot = spriteSlots[key];
  if (!slot) return false;
  const cellWidth = sprites.naturalWidth / SPRITE_COLUMNS;
  const cellHeight = sprites.naturalHeight / SPRITE_ROWS;
  const drawWidth = size * (cellWidth / cellHeight);
  ctx.drawImage(
    sprites,
    slot.col * cellWidth,
    slot.row * cellHeight,
    cellWidth,
    cellHeight,
    -drawWidth / 2,
    -size / 2,
    drawWidth,
    size,
  );
  return true;
}

function drawWw2AircraftSprite(ctx: CanvasRenderingContext2D, sprites: HTMLImageElement | null, key: Ww2SpriteKey, size: number) {
  if (!sprites?.complete || sprites.naturalWidth <= 0) return false;
  const slot = ww2SpriteSlots[key];
  const cellWidth = sprites.naturalWidth / WW2_SPRITE_COLUMNS;
  const cellHeight = sprites.naturalHeight / WW2_SPRITE_ROWS;
  const drawWidth = size * (cellWidth / cellHeight);
  ctx.drawImage(
    sprites,
    slot.col * cellWidth,
    slot.row * cellHeight,
    cellWidth,
    cellHeight,
    -drawWidth / 2,
    -size / 2,
    drawWidth,
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

function drawSupportSprite(ctx: CanvasRenderingContext2D, sprites: HTMLImageElement | null, key: SupportSpriteKey, size: number) {
  if (!sprites?.complete || sprites.naturalWidth <= 0) return false;
  const slot = supportSpriteSlots[key];
  const cellWidth = sprites.naturalWidth / SUPPORT_COLUMNS;
  const cellHeight = sprites.naturalHeight / SUPPORT_ROWS;
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

const singleEnginePorts: Partial<Record<PlaneId, EnginePort[]>> = {
  j7: [{ x: 0, y: 0.392, widthScale: 0.72, lengthScale: 0.92 }],
  j10: [{ x: 0, y: 0.37, widthScale: 0.78, lengthScale: 0.94 }],
  f16: [{ x: 0, y: 0.265, widthScale: 0.78, lengthScale: 0.94 }],
  f35: [{ x: 0, y: 0.235, widthScale: 0.78, lengthScale: 0.94 }],
  mig21: [{ x: 0, y: 0.39, widthScale: 0.72, lengthScale: 0.9 }],
  mig23: [{ x: 0, y: 0.382, widthScale: 0.72, lengthScale: 0.9 }],
};

const twinEnginePorts: Partial<Record<PlaneId, EnginePort[]>> = {
  j8: [
    { x: -0.024, y: 0.414, widthScale: 0.42, lengthScale: 0.88 },
    { x: 0.024, y: 0.414, widthScale: 0.42, lengthScale: 0.88 },
  ],
  j11: [
    { x: -0.034, y: 0.378, widthScale: 0.5 },
    { x: 0.034, y: 0.378, widthScale: 0.5 },
  ],
  j15: [
    { x: -0.032, y: 0.374, widthScale: 0.5 },
    { x: 0.032, y: 0.374, widthScale: 0.5 },
  ],
  j16: [
    { x: -0.035, y: 0.394, widthScale: 0.5 },
    { x: 0.035, y: 0.394, widthScale: 0.5 },
  ],
  jh7: [
    { x: -0.036, y: 0.378, widthScale: 0.5 },
    { x: 0.036, y: 0.378, widthScale: 0.5 },
  ],
  j20: [
    { x: -0.029, y: 0.372, widthScale: 0.5 },
    { x: 0.029, y: 0.372, widthScale: 0.5 },
  ],
  j35: [
    { x: -0.024, y: 0.392, widthScale: 0.48 },
    { x: 0.024, y: 0.392, widthScale: 0.48 },
  ],
  fc31: [
    { x: -0.026, y: 0.382, widthScale: 0.48 },
    { x: 0.026, y: 0.382, widthScale: 0.48 },
  ],
  f4: [
    { x: -0.03, y: 0.365, widthScale: 0.48, lengthScale: 0.86 },
    { x: 0.03, y: 0.365, widthScale: 0.48, lengthScale: 0.86 },
  ],
  f5: [
    { x: -0.028, y: 0.334, widthScale: 0.46, lengthScale: 0.86 },
    { x: 0.028, y: 0.334, widthScale: 0.46, lengthScale: 0.86 },
  ],
  f18: [
    { x: -0.033, y: 0.244, widthScale: 0.5 },
    { x: 0.033, y: 0.244, widthScale: 0.5 },
  ],
  f14: [
    { x: -0.042, y: 0.218, widthScale: 0.5 },
    { x: 0.042, y: 0.218, widthScale: 0.5 },
  ],
  f15: [
    { x: -0.036, y: 0.274, widthScale: 0.5 },
    { x: 0.036, y: 0.274, widthScale: 0.5 },
  ],
  f117: [
    { x: -0.038, y: 0.212, widthScale: 0.46, lengthScale: 0.78 },
    { x: 0.038, y: 0.212, widthScale: 0.46, lengthScale: 0.78 },
  ],
  f22: [
    { x: -0.032, y: 0.265, widthScale: 0.5 },
    { x: 0.032, y: 0.265, widthScale: 0.5 },
  ],
  f18c: [
    { x: -0.033, y: 0.252, widthScale: 0.5 },
    { x: 0.033, y: 0.252, widthScale: 0.5 },
  ],
  mig29: [
    { x: -0.035, y: 0.372, widthScale: 0.5 },
    { x: 0.035, y: 0.372, widthScale: 0.5 },
  ],
  mig31: [
    { x: -0.033, y: 0.388, widthScale: 0.5 },
    { x: 0.033, y: 0.388, widthScale: 0.5 },
  ],
  mig35: [
    { x: -0.034, y: 0.376, widthScale: 0.5 },
    { x: 0.034, y: 0.376, widthScale: 0.5 },
  ],
  su27: [
    { x: -0.037, y: 0.382, widthScale: 0.5 },
    { x: 0.037, y: 0.382, widthScale: 0.5 },
  ],
  su30: [
    { x: -0.037, y: 0.382, widthScale: 0.5 },
    { x: 0.037, y: 0.382, widthScale: 0.5 },
  ],
  su33: [
    { x: -0.037, y: 0.384, widthScale: 0.5 },
    { x: 0.037, y: 0.384, widthScale: 0.5 },
  ],
  su35: [
    { x: -0.037, y: 0.38, widthScale: 0.5 },
    { x: 0.037, y: 0.38, widthScale: 0.5 },
  ],
  su57: [
    { x: -0.033, y: 0.372, widthScale: 0.5 },
    { x: 0.033, y: 0.372, widthScale: 0.5 },
  ],
};

function scaleEnginePorts(size: number, ports: EnginePort[]) {
  return ports.map((port) => ({
    ...port,
    x: port.x * size,
    y: port.y * size,
    widthScale: port.widthScale ?? 0.58,
    lengthScale: port.lengthScale ?? 0.92,
  }));
}

function getEnginePorts(aircraft: Aircraft): EnginePort[] {
  const size = getAircraftDrawSize(aircraft);
  const spriteKind = aircraft.variant ?? aircraft.kind;
  if (isPlaneId(spriteKind) && singleEnginePorts[spriteKind]) {
    return scaleEnginePorts(size, singleEnginePorts[spriteKind]);
  }
  if (isPlaneId(spriteKind) && twinEnginePorts[spriteKind]) {
    return scaleEnginePorts(size, twinEnginePorts[spriteKind]);
  }
  if (aircraft.kind === "tank" || aircraft.kind === "heavy" || aircraft.kind === "stealth") {
    return [
      { x: -size * 0.052, y: size * 0.29, widthScale: 0.56, lengthScale: 0.9 },
      { x: size * 0.052, y: size * 0.29, widthScale: 0.56, lengthScale: 0.9 },
    ];
  }
  return [{ x: 0, y: size * 0.315, widthScale: 0.76, lengthScale: 0.92 }];
}

function drawEngineFlame(
  ctx: CanvasRenderingContext2D,
  aircraft: Aircraft,
  port: EnginePort,
  size: number,
  turnBoost: number,
  baseAlpha: number,
) {
  const throttle = aircraft.throttle ?? 0;
  const thrust = clamp(0.28 + Math.max(0, throttle) * 0.72 + turnBoost, 0.14, 1.18);
  const length = size * (0.14 + thrust * 0.22) * (port.lengthScale ?? 1);
  const width = size * (0.036 + thrust * 0.022) * (port.widthScale ?? 1);
  const baseX = port.x;
  const baseY = port.y;
  const tipY = baseY + length;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = baseAlpha * (0.34 + thrust * 0.34);
  const gradient = ctx.createLinearGradient(baseX, baseY, baseX, tipY);
  gradient.addColorStop(0, "rgba(239, 246, 255, 0.92)");
  gradient.addColorStop(0.22, "rgba(56, 189, 248, 0.78)");
  gradient.addColorStop(0.62, "rgba(251, 191, 36, 0.5)");
  gradient.addColorStop(1, "rgba(249, 115, 22, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(baseX - width * 0.3, baseY);
  ctx.quadraticCurveTo(baseX - width * 0.74, baseY + length * 0.58, baseX, tipY);
  ctx.quadraticCurveTo(baseX + width * 0.74, baseY + length * 0.58, baseX + width * 0.3, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = baseAlpha * (0.48 + thrust * 0.25);
  ctx.fillStyle = "rgba(239, 246, 255, 0.74)";
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(baseX - width * 0.16, baseY);
  ctx.lineTo(baseX, baseY + length * 0.58);
  ctx.lineTo(baseX + width * 0.16, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEngineFlamesAt(ctx: CanvasRenderingContext2D, aircraft: Aircraft, baseAlpha: number) {
  const turnBoost = Math.abs(aircraft.bank ?? 0) * 0.12;
  const size = getAircraftDrawSize(aircraft);
  for (const port of getEnginePorts(aircraft)) {
    drawEngineFlame(ctx, aircraft, port, size, turnBoost, baseAlpha);
  }
}

function drawJet(ctx: CanvasRenderingContext2D, planeId: PlaneId | EnemyKind, team: Aircraft["side"]) {
  const enemy = team === "enemy";
  const naval = planeId === "j15" || planeId === "f18" || planeId === "f18c" || planeId === "f14" || planeId === "su33";
  const delta = planeId === "j7" || planeId === "j10" || planeId === "f16" || planeId === "mig21" || planeId === "mig23";
  const slender = planeId === "j8" || planeId === "f117" || planeId === "mig31";
  const heavyFrame = isPlaneId(planeId) ? isHeavyPlane(planeId) : planeId === "heavy" || planeId === "tank";
  const stealthFrame = (isPlaneId(planeId) && isStealthPlane(planeId)) || planeId === "stealth";
  const body = enemy ? "#9f1239" : stealthFrame ? "#334155" : heavyFrame ? "#64748b" : naval ? "#475569" : delta ? "#64748b" : "#d1d5db";
  const dark = enemy ? "#450a0a" : "#1f2937";
  const stripe = enemy ? "#fca5a5" : "#ef4444";

  ctx.save();
  ctx.scale(0.74, 0.74);
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
  if (stealthFrame) {
    ctx.moveTo(0, -20);
    ctx.lineTo(-76, 18);
    ctx.lineTo(-38, 44);
    ctx.lineTo(-10, 21);
    ctx.lineTo(0, 48);
    ctx.lineTo(10, 21);
    ctx.lineTo(38, 44);
    ctx.lineTo(76, 18);
    ctx.lineTo(0, -20);
  } else if (heavyFrame) {
    ctx.moveTo(-10, -12);
    ctx.lineTo(-88, 20);
    ctx.lineTo(-60, 46);
    ctx.lineTo(-10, 23);
    ctx.moveTo(10, -12);
    ctx.lineTo(88, 20);
    ctx.lineTo(60, 46);
    ctx.lineTo(10, 23);
  } else if (slender) {
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

function drawAircraftAt(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  aircraft: Aircraft,
  sprites: HTMLImageElement | null,
  ww2Sprites: HTMLImageElement | null,
) {
  const p = screenPoint(state, aircraft.x, aircraft.y);
  const bank = clamp(aircraft.bank ?? 0, -1, 1);
  const size = getAircraftDrawSize(aircraft);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(aircraft.angle + Math.PI / 2);
  if (aircraft.side === "player" && (aircraft.invulnerable ?? 0) > 0) {
    ctx.globalAlpha = 0.62 + Math.sin(state.time * 26) * 0.2;
  }
  const renderScale = getAircraftRenderScale(aircraft);
  ctx.scale(renderScale.x, renderScale.y);
  if (aircraft.side === "enemy") {
    ctx.globalAlpha *= clamp(1 - (aircraft.spawnWarmup ?? 0) / 1.9, 0.18, 1);
  }
  const aircraftAlpha = ctx.globalAlpha;
  if (!aircraft.ww2Sprite) drawEngineFlamesAt(ctx, aircraft, aircraftAlpha);
  const drewSprite =
    (aircraft.ww2Sprite ? drawWw2AircraftSprite(ctx, ww2Sprites, aircraft.ww2Sprite, size) : false) ||
    drawAircraftSprite(ctx, sprites, getAircraftSpriteKey(aircraft.kind, aircraft.side, aircraft.variant), size);
  if (!drewSprite) drawJet(ctx, aircraft.kind, aircraft.side);
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

function drawWreckAt(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  wreck: Wreck,
  sprites: HTMLImageElement | null,
  ww2Sprites: HTMLImageElement | null,
) {
  const p = screenPoint(state, wreck.x, wreck.y);
  const alpha = clamp(wreck.life / wreck.maxLife, 0, 1);
  const fakeAircraft = { kind: wreck.kind, side: wreck.side, ww2Sprite: wreck.ww2Sprite } as Aircraft;
  const size = getAircraftDrawSize(fakeAircraft) * 0.88;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(wreck.angle + Math.PI / 2);
  ctx.globalAlpha = alpha * 0.52;
  const drewSprite =
    (wreck.ww2Sprite ? drawWw2AircraftSprite(ctx, ww2Sprites, wreck.ww2Sprite, size) : false) ||
    drawAircraftSprite(ctx, sprites, getAircraftSpriteKey(wreck.kind, wreck.side, wreck.variant), size);
  if (!drewSprite) drawJet(ctx, wreck.kind, wreck.side, 0);
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(15,23,42,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, 4, wreck.radius * 1.2, wreck.radius * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTanker(ctx: CanvasRenderingContext2D, state: GameState, tanker: Tanker, supportSprites: HTMLImageElement | null) {
  const p = screenPoint(state, tanker.x, tanker.y);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(tanker.angle + Math.PI / 2);
  ctx.globalAlpha = tanker.refueling ? 1 : 0.92;
  if (drawSupportSprite(ctx, supportSprites, "tanker", 224)) {
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
  const fuselageGradient = ctx.createLinearGradient(-18, 0, 18, 0);
  fuselageGradient.addColorStop(0, "#94a3b8");
  fuselageGradient.addColorStop(0.36, "#f8fafc");
  fuselageGradient.addColorStop(0.62, "#cbd5e1");
  fuselageGradient.addColorStop(1, "#64748b");
  const wingGradient = ctx.createLinearGradient(0, -16, 0, 42);
  wingGradient.addColorStop(0, "#cbd5e1");
  wingGradient.addColorStop(0.56, "#64748b");
  wingGradient.addColorStop(1, "#334155");
  ctx.strokeStyle = "rgba(15,23,42,0.72)";
  ctx.lineWidth = 2;
  ctx.fillStyle = wingGradient;
  ctx.beginPath();
  ctx.moveTo(-12, -18);
  ctx.lineTo(-112, 16);
  ctx.lineTo(-72, 40);
  ctx.lineTo(-11, 16);
  ctx.moveTo(12, -18);
  ctx.lineTo(112, 16);
  ctx.lineTo(72, 40);
  ctx.lineTo(11, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fuselageGradient;
  drawRoundRect(ctx, -15, -66, 30, 112, 15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#475569";
  ctx.beginPath();
  ctx.moveTo(-8, 30);
  ctx.lineTo(-42, 64);
  ctx.lineTo(-14, 66);
  ctx.lineTo(0, 43);
  ctx.lineTo(14, 66);
  ctx.lineTo(42, 64);
  ctx.lineTo(8, 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.ellipse(0, -34, 7, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e293b";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 52, 24, 8, 14, 0.08 * side, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = tanker.refueling ? "rgba(56, 189, 248, 0.96)" : "rgba(148, 163, 184, 0.78)";
  ctx.lineWidth = tanker.refueling ? 3.2 : 2.2;
  ctx.beginPath();
  ctx.moveTo(0, 44);
  ctx.lineTo(0, 94);
  ctx.stroke();
  if (tanker.refueling) {
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = "rgba(186, 230, 253, 0.5)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(0, 92);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCannonTracer(ctx: CanvasRenderingContext2D, state: GameState, bullet: Projectile) {
  const speed = Math.max(1, Math.hypot(bullet.vx, bullet.vy));
  const dir = { x: bullet.vx / speed, y: bullet.vy / speed };
  const tracerLength = bullet.owner === "enemy" ? 11 : 12.5;
  const headLead = bullet.owner === "enemy" ? 1.5 : 1.8;
  const head = screenPoint(state, bullet.x + dir.x * headLead, bullet.y + dir.y * headLead);
  const tail = screenPoint(state, bullet.x - dir.x * tracerLength, bullet.y - dir.y * tracerLength);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.strokeStyle = bullet.owner === "enemy" ? "rgba(239, 68, 68, 0.34)" : "rgba(250, 204, 21, 0.3)";
  ctx.lineWidth = bullet.owner === "enemy" ? 3.1 : 3.3;
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();

  ctx.strokeStyle = bullet.owner === "enemy" ? "rgba(248, 113, 113, 0.95)" : "rgba(253, 224, 71, 0.96)";
  ctx.lineWidth = bullet.owner === "enemy" ? 1.35 : 1.45;
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  ctx.restore();
}

function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  sprites: HTMLImageElement | null,
  ww2Sprites: HTMLImageElement | null,
  weaponSprites: HTMLImageElement | null,
  supportSprites: HTMLImageElement | null,
  terrain: HTMLImageElement | null,
  storyTerrain: HTMLImageElement | null,
  airport: HTMLImageElement | null,
) {
  drawSky(ctx, state, state.mode === "story" ? storyTerrain ?? terrain : terrain, airport);
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

  for (const tanker of state.tankers) drawTanker(ctx, state, tanker, supportSprites);
  for (const wreck of state.wrecks) drawWreckAt(ctx, state, wreck, sprites, ww2Sprites);
  for (const ally of state.allies) drawAircraftAt(ctx, state, ally, sprites, ww2Sprites);
  for (const enemy of state.enemies) drawAircraftAt(ctx, state, enemy, sprites, ww2Sprites);
  drawAircraftAt(ctx, state, state.player, sprites, ww2Sprites);

  for (const bullet of state.bullets) {
    if (bullet.kind === "cannon") {
      drawCannonTracer(ctx, state, bullet);
      continue;
    }

    const p = screenPoint(state, bullet.x, bullet.y);
    const angle = Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
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
  const joystickRef = useRef<InputState>({ throttle: 0, turn: 0, firing: false });
  const mouseFireRef = useRef(false);
  const touchDeviceRef = useRef(false);
  const spritesRef = useRef<HTMLImageElement | null>(null);
  const ww2SpritesRef = useRef<HTMLImageElement | null>(null);
  const weaponSpritesRef = useRef<HTMLImageElement | null>(null);
  const supportSpritesRef = useRef<HTMLImageElement | null>(null);
  const terrainRef = useRef<HTMLImageElement | null>(null);
  const storyTerrainRef = useRef<HTMLImageElement | null>(null);
  const airportRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const tutorialProgressRef = useRef<Record<TutorialKey, boolean>>({ ...defaultTutorialProgress });
  const tutorialPromptRef = useRef<TutorialKey | null>(null);
  const scaleRef = useRef({ scale: 1, offsetX: 0, offsetY: 0, dpr: 1, width: VIEW_WIDTH, height: VIEW_HEIGHT });
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [hud, setHud] = useState<HudState>(initialHud);
  const [credits, setCredits] = useState(300);
  const [campaignStage, setCampaignStage] = useState(1);
  const [storyProgress, setStoryProgress] = useState<StoryProgressState>({ ...defaultStoryProgress });
  const [selectedPlane, setSelectedPlane] = useState<PlaneId>("j8");
  const [planeUpgrades, setPlaneUpgrades] = useState<PlaneUpgradeState>(createDefaultPlaneUpgrades);
  const [unlockedPlanes, setUnlockedPlanes] = useState<PlaneUnlockState>(defaultUnlockedPlanes);
  const [inventory, setInventory] = useState<InventoryState>({ ...defaultInventory, planeBlueprints: { ...defaultPlaneBlueprints }, upgradeBlueprints: { ...defaultUpgradeBlueprints } });
  const [dailyCheckin, setDailyCheckin] = useState<DailyCheckinState>(defaultDailyCheckin);
  const [rewardNotice, setRewardNotice] = useState("");
  const [packOpening, setPackOpening] = useState<PackOpeningState | null>(null);
  const [homeTab, setHomeTab] = useState<HomeTab>("battle");
  const [joystick, setJoystick] = useState({ x: 0, y: 0, active: false });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [tutorialPrompt, setTutorialPrompt] = useState<TutorialKey | null>(null);
  const upgrades = planeUpgrades[selectedPlane] ?? defaultUpgrades;

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const scale = Math.max(rect.width / VIEW_WIDTH, rect.height / VIEW_HEIGHT);
    scaleRef.current = {
      scale,
      offsetX: (rect.width - VIEW_WIDTH * scale) / 2,
      offsetY: (rect.height - VIEW_HEIGHT * scale) / 2,
      dpr,
      width: rect.width,
      height: rect.height,
    };
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
      firing: touchDeviceRef.current || mouseFireRef.current || keys.has("e"),
    };
  }, []);

  const showTutorial = useCallback((key: TutorialKey) => {
    if (tutorialProgressRef.current[key] || tutorialPromptRef.current) return;
    tutorialPromptRef.current = key;
    setTutorialPrompt(key);
  }, []);

  const dismissTutorial = useCallback((key = tutorialPromptRef.current) => {
    if (!key) return;
    const next = { ...tutorialProgressRef.current, [key]: true };
    tutorialProgressRef.current = next;
    tutorialPromptRef.current = null;
    setTutorialPrompt(null);
    saveTutorialProgress(next);
  }, []);

  const maybeShowContextTutorial = useCallback(
    (state: GameState) => {
      if (state.phase !== "running" || tutorialPromptRef.current) return;
      if (!tutorialProgressRef.current.refuel && (state.player.fuel ?? 0) <= 0 && (state.player.tankerCallsLeft ?? 0) > 0) {
        showTutorial("refuel");
        return;
      }
      const readyForMissile =
        (state.mode === "stage" && state.stage >= 2 && state.time > state.takeoffDuration + 4.8) ||
        (state.mode === "endless" && state.time > state.takeoffDuration + 8.5);
      if (!tutorialProgressRef.current.missile && readyForMissile && (state.player.missileAmmo ?? 0) > 0) {
        showTutorial("missile");
      }
    },
    [showTutorial],
  );

  useEffect(() => {
    const query = window.matchMedia("(hover: none) and (pointer: coarse)");
    const updatePointerType = () => {
      touchDeviceRef.current = query.matches;
      setIsTouchDevice(query.matches);
    };
    updatePointerType();
    query.addEventListener("change", updatePointerType);
    return () => query.removeEventListener("change", updatePointerType);
  }, []);

  useEffect(() => {
    if (phase !== "running" || hud.ammoReserve <= 0) mouseFireRef.current = false;
  }, [hud.ammoReserve, phase]);

  useEffect(() => {
    const aircraftImage = new Image();
    aircraftImage.src = AIRCRAFT_SPRITES_URL;
    aircraftImage.onload = () => {
      spritesRef.current = aircraftImage;
    };

    const ww2AircraftImage = new Image();
    ww2AircraftImage.src = WW2_AIRCRAFT_SPRITES_URL;
    ww2AircraftImage.onload = () => {
      ww2SpritesRef.current = ww2AircraftImage;
    };

    const weaponImage = new Image();
    weaponImage.src = WEAPON_SPRITES_URL;
    weaponImage.onload = () => {
      weaponSpritesRef.current = weaponImage;
    };

    const supportImage = new Image();
    supportImage.src = SUPPORT_SPRITES_URL;
    supportImage.onload = () => {
      supportSpritesRef.current = supportImage;
    };

    const terrainImage = new Image();
    terrainImage.src = TERRAIN_TILE_URL;
    terrainImage.onload = () => {
      terrainRef.current = terrainImage;
    };

    const storyTerrainImage = new Image();
    storyTerrainImage.src = STORY_TERRAIN_TILE_URL;
    storyTerrainImage.onload = () => {
      storyTerrainRef.current = storyTerrainImage;
    };

    const airportImage = new Image();
    airportImage.src = AIRPORT_RUNWAY_URL;
    airportImage.onload = () => {
      airportRef.current = airportImage;
    };
    return () => {
      aircraftImage.onload = null;
      ww2AircraftImage.onload = null;
      weaponImage.onload = null;
      supportImage.onload = null;
      terrainImage.onload = null;
      storyTerrainImage.onload = null;
      airportImage.onload = null;
    };
  }, []);

  const startRun = useCallback(
    (mode: GameMode, stageNumber = campaignStage, storyFaction: StoryFaction | null = null) => {
      const safeStoryFaction = storyFaction ?? "usa";
      const safeStage = mode === "stage" || mode === "story" ? normalizeStageNumber(stageNumber) : 1;
      const safePlane = planeCatalog.some((planeItem) => planeItem.id === selectedPlane) && unlockedPlanes[selectedPlane] ? selectedPlane : getFirstUnlockedPlane(unlockedPlanes);
      const safeUpgrades = sanitizeUpgrades((planeUpgrades[safePlane] ?? defaultUpgrades) as Record<string, unknown>);
      let state: GameState;
      try {
        state = createGameState(
          Math.max(readBestScore(), gameRef.current?.bestScore ?? 0),
          safeUpgrades,
          safePlane,
          mode,
          safeStage,
          mode === "story" ? safeStoryFaction : null,
        );
      } catch {
        state = createGameState(Math.max(readBestScore(), gameRef.current?.bestScore ?? 0), { ...defaultUpgrades }, "j8", mode, 1, mode === "story" ? safeStoryFaction : null);
        addFloater(state, "关卡状态已重置", state.player.x, state.player.y - 90, "#bae6fd");
      }
      const speedStats = getSpeedStats(state.upgrades, state.selectedPlane);
      state.phase = "takeoff";
      state.player.x = 0;
      state.player.y = 520;
      state.player.angle = -Math.PI / 2;
      state.player.speed = Math.max(92, speedStats.minSpeed * 0.55);
      state.player.bank = 0;
      state.player.throttle = 1;
      state.player.invulnerable = Math.max(state.player.invulnerable ?? 0, state.takeoffDuration + 0.8);
      positionWingmenForTakeoff(state);
      state.takeoffTimer = 0;
      state.spawnTimer = mode === "story" ? 0.22 : 0.85;
      gameRef.current = state;
      setPhase("takeoff");
      setHud(snapshot(state));
    },
    [campaignStage, planeUpgrades, selectedPlane, unlockedPlanes],
  );

  const startStageGame = useCallback(() => startRun("stage", campaignStage), [campaignStage, startRun]);
  const startStoryGame = useCallback(
    (faction: StoryFaction) => {
      if (!isStoryUnlocked(campaignStage)) {
        setRewardNotice("通关第10关后解锁剧情模式");
        return;
      }
      startRun("story", storyProgress[faction], faction);
    },
    [campaignStage, startRun, storyProgress],
  );
  const startEndlessGame = useCallback(() => {
    if (!isEndlessUnlocked(campaignStage)) {
      setRewardNotice("通关第5关后解锁无尽模式");
      return;
    }
    startRun("endless");
  }, [campaignStage, startRun]);
  const startNextStage = useCallback(() => {
    if (hud.mode === "story" && hud.storyFaction) {
      startRun("story", Math.max(storyProgress[hud.storyFaction], hud.stage + 1), hud.storyFaction);
      return;
    }
    startRun("stage", Math.max(campaignStage, hud.stage + 1));
  }, [campaignStage, hud.mode, hud.stage, hud.storyFaction, startRun, storyProgress]);

  const returnToMenu = useCallback(() => {
    const state = createGameState(Math.max(readBestScore(), gameRef.current?.bestScore ?? 0), upgrades, selectedPlane);
    state.phase = "menu";
    gameRef.current = state;
    setHomeTab("battle");
    setPhase("menu");
    setHud(snapshot(state));
  }, [selectedPlane, upgrades]);

  const openHangar = useCallback(() => {
    const state = gameRef.current;
    if (!state || state.phase === "running" || state.phase === "playerDying") return;
    state.phase = "hangar";
    setHomeTab("upgrade");
    setPhase("hangar");
    setHud(snapshot(state));
  }, []);

  const openHomeTab = useCallback((tab: HomeTab) => {
    const state = gameRef.current;
    if (!state || state.phase === "running" || state.phase === "playerDying") return;
    state.phase = tab === "battle" ? "menu" : "hangar";
    setHomeTab(tab);
    setPhase(state.phase);
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
      if (unlockedPlanes[planeId]) {
        selectPlane(planeId);
        return;
      }
      const requirement = getPlaneUnlockRequirement(planeId);
      if (!canAffordPlane(planeId, credits, inventory)) return;
      const nextCredits = credits - requirement.credits;
      const nextInventory: InventoryState = {
        materials: inventory.materials - requirement.materials,
        planeBlueprints: { ...inventory.planeBlueprints, [planeId]: inventory.planeBlueprints[planeId] - requirement.planeBlueprints },
        upgradeBlueprints: { ...inventory.upgradeBlueprints },
      };
      const nextUnlocked = { ...unlockedPlanes, [planeId]: true };
      setCredits(nextCredits);
      setInventory(nextInventory);
      setUnlockedPlanes(nextUnlocked);
      setSelectedPlane(planeId);
      setRewardNotice(`已解锁 ${getPlaneMeta(planeId).label}`);
      saveCredits(nextCredits);
      saveInventory(nextInventory);
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
    [credits, inventory, planeUpgrades, selectPlane, unlockedPlanes],
  );

  const buyUpgrade = useCallback(
    (meta: UpgradeMeta) => {
      const current = planeUpgrades[selectedPlane] ?? defaultUpgrades;
      const level = current[meta.key];
      const requirement = getUpgradeRequirement(meta, level);
      if (level >= meta.max || !canAffordUpgrade(meta, level, credits, inventory)) return;
      const nextCredits = credits - requirement.credits;
      const nextInventory: InventoryState = {
        materials: inventory.materials - requirement.materials,
        planeBlueprints: { ...inventory.planeBlueprints },
        upgradeBlueprints: { ...inventory.upgradeBlueprints },
      };
      if (requirement.blueprintKey) {
        nextInventory.upgradeBlueprints[requirement.blueprintKey] -= requirement.blueprints;
      }
      const nextUpgrades = { ...current, [meta.key]: level + 1 };
      const nextPlaneUpgrades = { ...planeUpgrades, [selectedPlane]: nextUpgrades };
      setCredits(nextCredits);
      setInventory(nextInventory);
      setPlaneUpgrades(nextPlaneUpgrades);
      setRewardNotice(`${getPlaneMeta(selectedPlane).label} ${meta.label} 升至 ${level + 1}`);
      saveCredits(nextCredits);
      saveInventory(nextInventory);
      savePlaneUpgrades(nextPlaneUpgrades);
    },
    [credits, inventory, planeUpgrades, selectedPlane],
  );

  const claimDailyReward = useCallback(() => {
    if (!canClaimDaily(dailyCheckin)) return;
    const day = getNextDailyDay(dailyCheckin);
    const baseReward = dailyRewards[day - 1] ?? dailyRewards[0];
    const reward: InventoryReward = { ...baseReward, upgradeBlueprints: { ...baseReward.upgradeBlueprints } };
    if (day === 4) {
      const planeId = rollPlaneBlueprint(0.08);
      reward.planeBlueprints = { ...reward.planeBlueprints, [planeId]: (reward.planeBlueprints?.[planeId] ?? 0) + 1 };
    }
    let nextUnlocked = unlockedPlanes;
    if (day === 7) {
      const giftPlane = getGiftPlane(unlockedPlanes, selectedPlane);
      if (giftPlane) {
        reward.giftPlane = giftPlane;
        nextUnlocked = { ...unlockedPlanes, [giftPlane]: true };
      } else {
        for (let index = 0; index < 3; index += 1) {
          const planeId = rollPlaneBlueprint(0.2);
          reward.planeBlueprints = { ...reward.planeBlueprints, [planeId]: (reward.planeBlueprints?.[planeId] ?? 0) + 1 };
        }
      }
    }
    const settled = settleInventoryReward(inventory, reward, nextUnlocked);
    const nextCredits = credits + Math.max(0, Math.floor(settled.reward.credits ?? 0));
    const nextInventory = settled.inventory;
    const nextDaily = { lastDate: getTodayKey(), streak: day };
    setCredits(nextCredits);
    setInventory(nextInventory);
    setDailyCheckin(nextDaily);
    setUnlockedPlanes(nextUnlocked);
    setRewardNotice(`签到第 ${day} 天：${formatReward(settled.reward)}`);
    saveCredits(nextCredits);
    saveInventory(nextInventory);
    saveDailyCheckin(nextDaily);
    if (nextUnlocked !== unlockedPlanes) saveUnlockedPlanes(nextUnlocked);
  }, [credits, dailyCheckin, inventory, selectedPlane, unlockedPlanes]);

  const buyShopPack = useCallback(
    (packId: ShopPackId) => {
      const pack = shopPacks.find((item) => item.id === packId);
      if (!pack || credits < pack.cost) return;
      const reward = rollShopPack(pack);
      const settled = settleInventoryReward(inventory, reward, unlockedPlanes);
      const nextCredits = credits - pack.cost + Math.max(0, Math.floor(settled.reward.credits ?? 0));
      const nextInventory = settled.inventory;
      setCredits(nextCredits);
      setInventory(nextInventory);
      setRewardNotice(`${pack.label}：${formatReward(settled.reward)}`);
      setPackOpening({
        id: Date.now(),
        packId: pack.id,
        label: pack.label,
        rewardText: formatReward(settled.reward),
      });
      saveCredits(nextCredits);
      saveInventory(nextInventory);
    },
    [credits, inventory, unlockedPlanes],
  );

  useEffect(() => {
    if (!packOpening) return;
    const timer = window.setTimeout(() => setPackOpening(null), 4200);
    return () => window.clearTimeout(timer);
  }, [packOpening]);

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
    if (tutorialPromptRef.current === "missile") dismissTutorial("missile");
    syncHud();
  }, [dismissTutorial, syncHud]);

  const callTanker = useCallback(() => {
    const state = gameRef.current;
    if (!state) return;
    requestRefuel(state);
    if (tutorialPromptRef.current === "refuel") dismissTutorial("refuel");
    syncHud();
  }, [dismissTutorial, syncHud]);

  useEffect(() => {
    const versionReset = ensureSaveVersion();
    const storedTutorial = readTutorialProgress();
    tutorialProgressRef.current = storedTutorial;
    if (!storedTutorial.controls) showTutorial("controls");
    const storedUpgrades = readPlaneUpgrades();
    const storedUnlocked = readUnlockedPlanes();
    const storedStage = readCampaignStage();
    const storedStoryProgress = readStoryProgress();
    let storedInventory = readInventory();
    const storedDaily = readDailyCheckin();
    let storedCredits = readCredits();
    let initialNotice = versionReset ? `1.0版本已重置：仅保留三国初始战机` : "";
    const duplicateSettlement = convertUnlockedPlaneBlueprints(storedInventory, storedUnlocked);
    if ((duplicateSettlement.reward.credits ?? 0) > 0 || (duplicateSettlement.reward.materials ?? 0) > 0) {
      storedInventory = duplicateSettlement.inventory;
      storedCredits += Math.max(0, Math.floor(duplicateSettlement.reward.credits ?? 0));
      saveInventory(storedInventory);
      saveCredits(storedCredits);
      initialNotice = `重复蓝图已转换：${formatReward(duplicateSettlement.reward)}`;
    }
    const storedPlane = readSelectedPlane(storedUnlocked);
    setPlaneUpgrades(storedUpgrades);
    setUnlockedPlanes(storedUnlocked);
    setInventory(storedInventory);
    setDailyCheckin(storedDaily);
    setCredits(storedCredits);
    setCampaignStage(storedStage);
    setStoryProgress(storedStoryProgress);
    setSelectedPlane(storedPlane);
    if (initialNotice) setRewardNotice(initialNotice);
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
      maybeShowContextTutorial(state);

      if (state.phase === "stageClear" && !state.rewardClaimed) {
        state.rewardClaimed = true;
        state.earnedCredits = state.stageReward;
        setCredits((value) => {
          const next = value + state.stageReward;
          saveCredits(next);
          return next;
        });
        if (state.mode === "story" && state.storyFaction) {
          setStoryProgress((value) => {
            const faction = state.storyFaction as StoryFaction;
            const next = advanceStoryProgress(value, faction, state.stage);
            saveStoryProgress(next);
            return next;
          });
        } else {
          setCampaignStage((value) => {
            const next = Math.max(value, state.stage + 1);
            saveCampaignStage(next);
            return next;
          });
        }
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
        const { scale, offsetX, offsetY, dpr, width, height } = scaleRef.current;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, width, height);
        context.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);
        drawGame(
          context,
          state,
          spritesRef.current,
          ww2SpritesRef.current,
          weaponSpritesRef.current,
          supportSpritesRef.current,
          terrainRef.current,
          storyTerrainRef.current,
          airportRef.current,
        );
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
  }, [maybeShowContextTutorial, readInput, resizeCanvas, showTutorial]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "e"].includes(key)) {
        event.preventDefault();
        keysRef.current.add(key);
      }
      if (key === "q" && !event.repeat) {
        event.preventDefault();
        useMissile();
      }
      if (key === "t" && !event.repeat) {
        event.preventDefault();
        callTanker();
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
  }, [callTanker, startEndlessGame, togglePause, useMissile]);

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
      firing: false,
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
    joystickRef.current = { throttle: 0, turn: 0, firing: false };
    setJoystick({ x: 0, y: 0, active: false });
  }, []);

  const startMouseCannon = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    mouseFireRef.current = true;
  }, []);

  const stopMouseCannon = useCallback(() => {
    mouseFireRef.current = false;
  }, []);

  const plane = getPlaneMeta(selectedPlane);
  const hpPercent = clamp(hud.hp / Math.max(1, hud.maxHp), 0, 1) * 100;
  const fuelPercent = clamp(hud.fuel / Math.max(1, hud.maxFuel), 0, 1) * 100;
  const ammoPercent = clamp(hud.ammoReserve / Math.max(1, hud.maxAmmoReserve), 0, 1) * 100;
  const fuelCrashCountdown = hud.fuel <= 0 ? Math.max(0, Math.ceil(hud.fuelEmptyLimit - hud.fuelEmptyTimer)) : 0;
  const showBattleUi = phase === "running" || phase === "paused" || phase === "playerDying";
  const showPanel = phase !== "running" && phase !== "takeoff" && phase !== "playerDying";
  const showMainMenu = phase === "menu";
  const showHangar = phase === "hangar";
  const showOver = phase === "over";
  const showStageClear = phase === "stageClear";
  const showPause = phase === "paused";
  const endlessUnlocked = isEndlessUnlocked(campaignStage);
  const storyUnlocked = isStoryUnlocked(campaignStage);
  const visibleBlueprintPlaneIds = PLANE_IDS.filter((planeId) => !unlockedPlanes[planeId] && inventory.planeBlueprints[planeId] > 0);
  const totalPlaneBlueprints = visibleBlueprintPlaneIds.reduce((total, planeId) => total + inventory.planeBlueprints[planeId], 0);
  const nextDailyDay = getNextDailyDay(dailyCheckin);
  const dailyClaimable = canClaimDaily(dailyCheckin);
  const nextDailyReward = dailyRewards[nextDailyDay - 1] ?? dailyRewards[0];
  const dailyRewardText =
    nextDailyDay === 7
      ? `${formatReward(nextDailyReward)}、随机解锁一架未拥有战机`
      : nextDailyDay === 4
        ? `${formatReward(nextDailyReward)}、随机飞机蓝图`
        : formatReward(nextDailyReward);
  const usaStoryMission = getStoryMission("usa", storyProgress.usa);
  const japanStoryMission = getStoryMission("japan", storyProgress.japan);
  const homeTabs: { id: HomeTab; label: string }[] = [
    { id: "battle", label: "战斗" },
    { id: "upgrade", label: "升级" },
    { id: "shop", label: "商店" },
    { id: "inventory", label: "仓库" },
  ];
  const hangarGroups: { faction: PlaneFaction; title: string; planes: PlaneMeta[] }[] = [
    {
      faction: "china",
      title: "中国战斗机",
      planes: planeCatalog.filter((item) => item.faction === "china" && (unlockedPlanes[item.id] || inventory.planeBlueprints[item.id] > 0)),
    },
    {
      faction: "usa",
      title: "美国战斗机",
      planes: planeCatalog.filter((item) => item.faction === "usa" && (unlockedPlanes[item.id] || inventory.planeBlueprints[item.id] > 0)),
    },
    {
      faction: "russia",
      title: "俄罗斯战斗机",
      planes: planeCatalog.filter((item) => item.faction === "russia" && (unlockedPlanes[item.id] || inventory.planeBlueprints[item.id] > 0)),
    },
  ];
  const tutorialIsPointer = isTouchDevice && (tutorialPrompt === "missile" || tutorialPrompt === "refuel");
  const tutorialTitle =
    tutorialPrompt === "controls"
      ? "操作指南"
      : tutorialPrompt === "missile"
        ? "导弹已挂载"
        : "燃油耗尽";
  const tutorialText =
    tutorialPrompt === "controls"
      ? isTouchDevice
        ? "用左下角摇杆操控战机，机炮会自动开火，右下角按钮释放导弹和呼叫加油机。"
        : "用 WASD 操控战机：按住鼠标左键发射机炮，Q 导弹，T 呼叫加油机。"
      : tutorialPrompt === "missile"
        ? isTouchDevice
          ? "导弹按钮在这里。"
          : "按 Q 键释放追踪导弹。"
        : isTouchDevice
          ? "燃油不足时点这里呼叫加油机。"
          : "燃油耗尽时按 T 键呼叫加油机。";

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
            onPointerDown={startMouseCannon}
            onPointerUp={stopMouseCannon}
            onPointerCancel={stopMouseCannon}
            onLostPointerCapture={stopMouseCannon}
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
                      className={["radar-blip", blip.side === "enemy" ? "enemy" : "ally"].join(" ")}
                      key={blip.id}
                      style={{ left: `${blip.x}%`, top: `${blip.y}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="hud-strip" aria-live="polite">
                <div>
                  <span>{hud.mode === "story" ? `第 ${hud.stage} 章` : hud.mode === "stage" ? `第 ${hud.stage} 关` : "分数"}</span>
                  <strong>{hud.mode === "story" || hud.mode === "stage" ? `${hud.stageKills}/${hud.stageTarget}` : hud.score}</strong>
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

              {hud.mode === "story" && hud.missionTitle && (
                <div className="mission-brief" key={`${hud.storyFaction}-${hud.stage}`} aria-label="剧情任务简报">
                  <span>
                    {getStoryFactionLabel(hud.storyFaction ?? "usa")} · {hud.missionYear} · {hud.missionTheatre}
                  </span>
                  <strong>{hud.missionTitle}</strong>
                  <em>{hud.missionObjective}</em>
                </div>
              )}

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
                <div>
                  <span>机炮弹药</span>
                  <strong>
                    {hud.magazineAmmo}/{hud.ammoReserve}
                  </strong>
                </div>
                <div className="ammo-meter">
                  <i style={{ width: `${ammoPercent}%` }} />
                </div>
                <small>
                  加油机 T {hud.tankerCallsLeft}/{hud.tankerCallsMax}
                  {fuelCrashCountdown > 0 ? ` · 坠机 ${fuelCrashCountdown}s` : ""}
                </small>
              </div>

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
            <div className={["start-panel", showMainMenu ? "menu-panel" : "", showHangar ? "hangar-panel" : ""].filter(Boolean).join(" ")}>
              {showMainMenu && (
                <>
                  <p>无限空战 · {GAME_VERSION}版本</p>
                  <h1>飞机大战</h1>
                  <div className="main-plane-summary">
                    <div className={getPlanePreviewClass(selectedPlane)} aria-hidden="true">
                      <i />
                    </div>
                    <span>当前战机</span>
                    <strong>{plane.label}</strong>
                    <em>
                      {getFactionLabel(plane.faction)}阵营 · 血量 {getMaxHp(upgrades, selectedPlane)} / 燃油 {getMaxFuel(upgrades, selectedPlane)}
                    </em>
                  </div>
                  <button className="daily-card" type="button" onClick={claimDailyReward} disabled={!dailyClaimable}>
                    <span>每日签到 · 第 {nextDailyDay} 天</span>
                    <strong>{dailyClaimable ? dailyRewardText : "今日已领取"}</strong>
                  </button>
                  {rewardNotice && <div className="reward-toast">{rewardNotice}</div>}
                  <div className="mode-actions">
                    <button className="primary-action mode-action" type="button" onClick={startStageGame}>
                      <span>关卡出击</span>
                      <small>第 {campaignStage} 关 · 奖励 {getStageReward(campaignStage)}</small>
                    </button>
                    <button className="secondary-action mode-action" type="button" onClick={startEndlessGame} disabled={!endlessUnlocked}>
                      <span>无尽模式</span>
                      <small>{endlessUnlocked ? "开放空域 · 持续追击" : "通关第5关解锁"}</small>
                    </button>
                    <button className="secondary-action mode-action story-action" type="button" onClick={() => startStoryGame("usa")} disabled={!storyUnlocked}>
                      <span>美国剧情</span>
                      <small>
                        {storyUnlocked ? `第 ${storyProgress.usa} 章 · ${usaStoryMission.title}` : "通关第10关解锁"}
                      </small>
                    </button>
                    <button className="secondary-action mode-action story-action" type="button" onClick={() => startStoryGame("japan")} disabled={!storyUnlocked}>
                      <span>日本剧情</span>
                      <small>
                        {storyUnlocked ? `第 ${storyProgress.japan} 章 · ${japanStoryMission.title}` : "通关第10关解锁"}
                      </small>
                    </button>
                  </div>
                </>
              )}

              {showHangar && (
                <>
                  <p>{homeTab === "shop" ? "补给商店" : homeTab === "inventory" ? "蓝图仓库" : "战机升级"}</p>
                  <h1>{homeTab === "shop" ? "商店" : homeTab === "inventory" ? "仓库" : "升级"}</h1>
                  <div className="hangar-summary">
                    <div>
                      <span>战功</span>
                      <strong>{credits}</strong>
                    </div>
                    <div>
                      <span>升级材料</span>
                      <strong>{inventory.materials}</strong>
                    </div>
                    <div>
                      <span>飞机蓝图</span>
                      <strong>{totalPlaneBlueprints}</strong>
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
                  <div className="blueprint-strip" aria-label="升级蓝图库存">
                    {upgradeCatalog.map((meta) => (
                      <span key={meta.key}>
                        {upgradeBlueprintLabels[meta.key]} {inventory.upgradeBlueprints[meta.key]}
                      </span>
                    ))}
                  </div>
                  {rewardNotice && <div className="reward-toast">{rewardNotice}</div>}
                  {homeTab === "upgrade" && (
                    <>
                      <div className="plane-list" aria-label="选择战机">
                        {hangarGroups.map((group) => (
                          <section className="faction-section" key={group.faction}>
                            <div className="faction-title">
                              <span>{group.title}</span>
                              <small>
                                出击时随机对阵 {formatOpponentPool(group.faction)} 机群
                              </small>
                            </div>
                            <div className="plane-grid">
                              {group.planes.map((item) => {
                                const unlocked = unlockedPlanes[item.id];
                                const currentUpgrades = planeUpgrades[item.id] ?? defaultUpgrades;
                                const active = selectedPlane === item.id;
                                const unlockable = canAffordPlane(item.id, credits, inventory);
                                return (
                                  <button
                                    className={["plane-card", active ? "active" : "", unlocked ? "unlocked" : "locked"].filter(Boolean).join(" ")}
                                    type="button"
                                    key={item.id}
                                    onClick={() => (unlocked ? selectPlane(item.id) : unlockPlane(item.id))}
                                    disabled={!unlocked && !unlockable}
                                  >
                                    <div className={getPlanePreviewClass(item.id)} aria-hidden="true">
                                      <i />
                                    </div>
                                    <span>
                                      {item.label}
                                      <small>{item.role}</small>
                                    </span>
                                    <strong>
                                      {unlocked
                                        ? `血量 ${getMaxHp(currentUpgrades, item.id)} · 燃油 ${getMaxFuel(currentUpgrades, item.id)}`
                                        : `${unlockable ? "解锁" : "需要"} ${formatPlaneRequirement(item.id)}`}
                                    </strong>
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                      <div className="upgrade-list" aria-label="战机升级">
                        {upgradeCatalog.map((meta) => {
                          const level = upgrades[meta.key];
                          const maxed = level >= meta.max;
                          const affordable = !maxed && canAffordUpgrade(meta, level, credits, inventory);
                          return (
                            <button
                              className="upgrade-card"
                              type="button"
                              key={meta.key}
                              onClick={() => buyUpgrade(meta)}
                              disabled={maxed || !affordable}
                            >
                              <span>
                                {meta.label}
                                <small>
                                  {level}/{meta.max}
                                </small>
                              </span>
                              <em>{meta.description}</em>
                              <strong>{formatUpgradeRequirement(meta, level)}</strong>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {homeTab === "shop" && (
                    <>
                      {packOpening && (
                        <div className="pack-opening" key={packOpening.id} aria-live="polite">
                          <div className={`supply-crate crate-${packOpening.packId} is-opening`} aria-hidden="true" />
                          <div className="pack-opening-result">
                            <span>{packOpening.label}</span>
                            <strong>{packOpening.rewardText}</strong>
                          </div>
                        </div>
                      )}
                      <div className="shop-list" aria-label="商店礼包">
                        {shopPacks.map((pack) => (
                          <button
                            className="shop-card"
                            type="button"
                            key={pack.id}
                            onClick={() => buyShopPack(pack.id)}
                            disabled={credits < pack.cost}
                          >
                            <i className={`supply-crate crate-${pack.id}`} aria-hidden="true" />
                            <span>{pack.label}</span>
                            <em>{pack.description}</em>
                            <strong>{pack.cost} 战功</strong>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {homeTab === "inventory" && (
                    <div className="warehouse-grid" aria-label="蓝图仓库">
                      {visibleBlueprintPlaneIds.length > 0 ? (
                        visibleBlueprintPlaneIds.map((planeId) => (
                          <div className="warehouse-card" key={planeId}>
                            <div className={getPlanePreviewClass(planeId)} aria-hidden="true">
                              <i />
                            </div>
                            <span>{getPlaneMeta(planeId).label}蓝图</span>
                            <strong>{inventory.planeBlueprints[planeId]}</strong>
                          </div>
                        ))
                      ) : (
                        <div className="warehouse-empty">暂无飞机蓝图，去商店开启补给箱获取。</div>
                      )}
                    </div>
                  )}
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
                    <button
                      className="primary-action"
                      type="button"
                      onClick={() =>
                        hud.mode === "story" && hud.storyFaction
                          ? startRun("story", hud.stage, hud.storyFaction)
                          : hud.mode === "stage"
                            ? startRun("stage", hud.stage)
                            : startEndlessGame()
                      }
                    >
                      {hud.mode === "story" ? "重试任务" : hud.mode === "stage" ? "重试关卡" : "再次出击"}
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
                  <p>{hud.mode === "story" ? "任务完成" : "关卡完成"}</p>
                  <h1>{hud.mode === "story" ? `${hud.missionTitle} 完成` : `第 ${hud.stage} 关胜利`}</h1>
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
                      <span>{hud.mode === "story" ? "下一章" : "下一关"}</span>
                      <strong>{hud.stage + 1}</strong>
                    </div>
                  </div>
                  <div className="panel-actions">
                    <button className="primary-action" type="button" onClick={startNextStage}>
                      {hud.mode === "story" ? "下一章" : "下一关"}
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
              {(showMainMenu || showHangar) && (
                <div className="home-tabs" aria-label="主界面导航">
                  {homeTabs.map((tab) => (
                    <button
                      className={homeTab === tab.id ? "active" : ""}
                      type="button"
                      key={tab.id}
                      onClick={() => openHomeTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
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
                <button className="tanker-action" type="button" onClick={callTanker} disabled={hud.tankerCallsLeft <= 0}>
                  加油
                </button>
                <button className="missile-action" type="button" onClick={useMissile} disabled={hud.missileAmmo <= 0}>
                  导弹
                </button>
              </div>
            </div>
          )}

          {tutorialPrompt && (
            <div className={["tutorial-layer", tutorialIsPointer ? "is-pointer" : ""].filter(Boolean).join(" ")}>
              {tutorialIsPointer ? (
                <button
                  className={["tutorial-arrow", tutorialPrompt].join(" ")}
                  type="button"
                  onClick={() => dismissTutorial(tutorialPrompt)}
                  aria-label={tutorialText}
                >
                  <span>{tutorialText}</span>
                  <i />
                </button>
              ) : (
                <button className="tutorial-card" type="button" onClick={() => dismissTutorial(tutorialPrompt)}>
                  <span>{tutorialTitle}</span>
                  {tutorialPrompt === "controls" && isTouchDevice && (
                    <div className="tutorial-art joystick-guide-art" aria-hidden="true">
                      <i />
                    </div>
                  )}
                  {tutorialPrompt === "controls" && !isTouchDevice && (
                    <div className="tutorial-art keyboard-guide" aria-hidden="true">
                      <kbd className="key-w">W</kbd>
                      <kbd className="key-a">A</kbd>
                      <kbd className="key-s">S</kbd>
                      <kbd className="key-d">D</kbd>
                    </div>
                  )}
                  {tutorialPrompt === "missile" && !isTouchDevice && (
                    <div className="tutorial-art single-key-guide" aria-hidden="true">
                      <kbd>Q</kbd>
                    </div>
                  )}
                  {tutorialPrompt === "refuel" && !isTouchDevice && (
                    <div className="tutorial-art single-key-guide tanker-key" aria-hidden="true">
                      <kbd>T</kbd>
                    </div>
                  )}
                  <strong>{tutorialText}</strong>
                  <em>点击继续</em>
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
