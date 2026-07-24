"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GAME_WIDTH = 480;
const GAME_HEIGHT = 720;
const PLAYER_RADIUS = 18;
const BEST_SCORE_KEY = "plane-battle-best-score";

type GamePhase = "ready" | "running" | "paused" | "over";
type EnemyKind = "scout" | "fighter" | "tank" | "boss";
type PowerKind = "heal" | "shield" | "rapid" | "spread" | "bomb";

type Vector = {
  x: number;
  y: number;
};

type Player = {
  x: number;
  y: number;
  fireTimer: number;
  invulnerable: number;
};

type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  power: number;
};

type EnemyBullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  speed: number;
  drift: number;
  phase: number;
  fireTimer: number;
  shootEvery: number;
  points: number;
  vx: number;
};

type PowerUp = {
  id: number;
  kind: PowerKind;
  x: number;
  y: number;
  vy: number;
  life: number;
};

type Explosion = {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
};

type Star = {
  x: number;
  y: number;
  r: number;
  speed: number;
  alpha: number;
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

type GameState = {
  phase: GamePhase;
  player: Player;
  bullets: Bullet[];
  enemyBullets: EnemyBullet[];
  enemies: Enemy[];
  powerUps: PowerUp[];
  explosions: Explosion[];
  stars: Star[];
  floaters: Floater[];
  score: number;
  bestScore: number;
  lives: number;
  level: number;
  bombs: number;
  shield: number;
  rapidTimer: number;
  spreadTimer: number;
  spawnTimer: number;
  nextBossScore: number;
  shake: number;
  time: number;
  nextId: number;
};

type HudState = {
  score: number;
  bestScore: number;
  lives: number;
  level: number;
  bombs: number;
  shield: number;
  rapid: number;
  spread: number;
};

const initialHud: HudState = {
  score: 0,
  bestScore: 0,
  lives: 3,
  level: 1,
  bombs: 2,
  shield: 0,
  rapid: 0,
  spread: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function normalize(x: number, y: number): Vector {
  const length = Math.hypot(x, y);
  if (length <= 0.001) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

function readBestScore() {
  if (typeof window === "undefined") {
    return 0;
  }

  const stored = Number(window.localStorage.getItem(BEST_SCORE_KEY));
  return Number.isFinite(stored) ? stored : 0;
}

function saveBestScore(score: number) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score));
  }
}

function makeId(state: GameState) {
  state.nextId += 1;
  return state.nextId;
}

function createStars() {
  return Array.from({ length: 90 }, () => ({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    r: randomBetween(0.7, 2.2),
    speed: randomBetween(26, 130),
    alpha: randomBetween(0.28, 0.9),
  }));
}

function createGameState(bestScore: number): GameState {
  return {
    phase: "ready",
    player: {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 86,
      fireTimer: 0,
      invulnerable: 0,
    },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    powerUps: [],
    explosions: [],
    stars: createStars(),
    floaters: [],
    score: 0,
    bestScore,
    lives: 3,
    level: 1,
    bombs: 2,
    shield: 0,
    rapidTimer: 0,
    spreadTimer: 0,
    spawnTimer: 0.55,
    nextBossScore: 1400,
    shake: 0,
    time: 0,
    nextId: 0,
  };
}

function snapshot(state: GameState): HudState {
  return {
    score: state.score,
    bestScore: state.bestScore,
    lives: state.lives,
    level: state.level,
    bombs: state.bombs,
    shield: state.shield,
    rapid: Math.ceil(state.rapidTimer),
    spread: Math.ceil(state.spreadTimer),
  };
}

function addExplosion(
  state: GameState,
  x: number,
  y: number,
  maxRadius: number,
  color: string,
  life = 0.42,
) {
  state.explosions.push({
    id: makeId(state),
    x,
    y,
    radius: 2,
    maxRadius,
    life,
    maxLife: life,
    color,
  });
}

function addFloater(
  state: GameState,
  text: string,
  x: number,
  y: number,
  color = "#f8fafc",
) {
  state.floaters.push({
    id: makeId(state),
    text,
    x,
    y,
    vy: -30,
    life: 0.8,
    maxLife: 0.8,
    color,
  });
}

function circleHitsRect(
  cx: number,
  cy: number,
  radius: number,
  rect: { x: number; y: number; w: number; h: number },
) {
  const closestX = clamp(cx, rect.x - rect.w / 2, rect.x + rect.w / 2);
  const closestY = clamp(cy, rect.y - rect.h / 2, rect.y + rect.h / 2);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function addPlayerShot(state: GameState) {
  const spread = state.spreadTimer > 0;
  const rapid = state.rapidTimer > 0;
  const angles = spread ? [-0.26, 0, 0.26] : [0];

  for (const angle of angles) {
    state.bullets.push({
      id: makeId(state),
      x: state.player.x + Math.sin(angle) * 12,
      y: state.player.y - 24,
      vx: Math.sin(angle) * 260,
      vy: -690 * Math.cos(angle),
      radius: rapid ? 4.5 : 4,
      power: rapid ? 1.25 : 1,
    });
  }

  state.player.fireTimer = rapid ? 0.095 : 0.17;
}

function spawnEnemy(state: GameState) {
  const hasBoss = state.enemies.some((enemy) => enemy.kind === "boss");
  if (state.score >= state.nextBossScore && !hasBoss) {
    state.nextBossScore += 1650 + state.level * 180;
    state.enemies.push({
      id: makeId(state),
      kind: "boss",
      x: GAME_WIDTH / 2,
      y: -70,
      w: 118,
      h: 74,
      hp: 34 + state.level * 4,
      maxHp: 34 + state.level * 4,
      speed: 60,
      drift: 0,
      phase: Math.random() * Math.PI * 2,
      fireTimer: 1.1,
      shootEvery: 1.35,
      points: 420 + state.level * 40,
      vx: 92 + state.level * 3,
    });
    addFloater(state, "警报", GAME_WIDTH / 2, 92, "#fb7185");
    return;
  }

  const roll = Math.random();
  const level = state.level;
  const kind: EnemyKind =
    roll > 0.82 && level > 2 ? "tank" : roll > 0.46 ? "fighter" : "scout";
  const tank = kind === "tank";
  const fighter = kind === "fighter";
  const w = tank ? 54 : fighter ? 44 : 34;
  const h = tank ? 50 : fighter ? 42 : 34;
  const hp = tank ? 4 + Math.floor(level / 2) : fighter ? 2 + Math.floor(level / 4) : 1;

  state.enemies.push({
    id: makeId(state),
    kind,
    x: randomBetween(34, GAME_WIDTH - 34),
    y: -42,
    w,
    h,
    hp,
    maxHp: hp,
    speed: randomBetween(88, 126) + level * (tank ? 6 : 9),
    drift: tank ? 14 : randomBetween(26, 64),
    phase: Math.random() * Math.PI * 2,
    fireTimer: fighter ? randomBetween(0.9, 1.7) : tank ? randomBetween(1.1, 1.8) : 99,
    shootEvery: fighter ? 1.75 : tank ? 1.45 : 99,
    points: tank ? 90 : fighter ? 55 : 25,
    vx: 0,
  });
}

function fireEnemy(state: GameState, enemy: Enemy) {
  if (enemy.kind === "boss") {
    const angles = [-0.42, -0.22, 0, 0.22, 0.42];
    for (const angle of angles) {
      state.enemyBullets.push({
        id: makeId(state),
        x: enemy.x,
        y: enemy.y + enemy.h / 2 - 4,
        vx: Math.sin(angle) * 170,
        vy: Math.cos(angle) * 250,
        radius: 6,
      });
    }
    enemy.fireTimer = Math.max(0.78, enemy.shootEvery - state.level * 0.035);
    return;
  }

  const aimX = state.player.x - enemy.x;
  const aimY = state.player.y - enemy.y;
  const aim = normalize(aimX, aimY);
  const speed = enemy.kind === "tank" ? 238 : 210;

  state.enemyBullets.push({
    id: makeId(state),
    x: enemy.x,
    y: enemy.y + enemy.h / 2,
    vx: aim.x * speed,
    vy: Math.max(120, aim.y * speed),
    radius: enemy.kind === "tank" ? 5.7 : 4.8,
  });
  enemy.fireTimer = Math.max(0.75, enemy.shootEvery - state.level * 0.045);
}

function spawnPowerUp(state: GameState, x: number, y: number) {
  if (Math.random() > 0.18) {
    return;
  }

  const kinds: PowerKind[] = ["heal", "shield", "rapid", "spread", "bomb"];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];

  state.powerUps.push({
    id: makeId(state),
    kind,
    x,
    y,
    vy: 90,
    life: 8,
  });
}

function applyPowerUp(state: GameState, kind: PowerKind) {
  if (kind === "heal") {
    state.lives = Math.min(5, state.lives + 1);
    addFloater(state, "+生命", state.player.x, state.player.y - 26, "#86efac");
  }

  if (kind === "shield") {
    state.shield = Math.min(4, state.shield + 1);
    addFloater(state, "+护盾", state.player.x, state.player.y - 26, "#67e8f9");
  }

  if (kind === "rapid") {
    state.rapidTimer = Math.max(state.rapidTimer, 9);
    addFloater(state, "速射", state.player.x, state.player.y - 26, "#facc15");
  }

  if (kind === "spread") {
    state.spreadTimer = Math.max(state.spreadTimer, 9);
    addFloater(state, "散射", state.player.x, state.player.y - 26, "#c4b5fd");
  }

  if (kind === "bomb") {
    state.bombs = Math.min(5, state.bombs + 1);
    addFloater(state, "+爆弹", state.player.x, state.player.y - 26, "#fb923c");
  }
}

function damagePlayer(state: GameState, x: number, y: number) {
  if (state.player.invulnerable > 0 || state.phase !== "running") {
    return;
  }

  state.shake = Math.max(state.shake, 12);
  addExplosion(state, x, y, 48, "#fb7185", 0.5);

  if (state.shield > 0) {
    state.shield -= 1;
    state.player.invulnerable = 0.75;
    addFloater(state, "护盾", state.player.x, state.player.y - 34, "#67e8f9");
    return;
  }

  state.lives -= 1;
  state.player.invulnerable = 1.35;

  if (state.lives <= 0) {
    state.phase = "over";
    addExplosion(state, state.player.x, state.player.y, 92, "#fb923c", 0.8);
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveBestScore(state.score);
    }
  }
}

function destroyEnemy(state: GameState, enemy: Enemy) {
  state.score += enemy.points;
  const nextLevel = Math.floor(state.score / 620) + 1;
  if (nextLevel > state.level) {
    state.level = nextLevel;
    state.bombs = Math.min(5, state.bombs + 1);
    addFloater(state, `等级 ${nextLevel}`, GAME_WIDTH / 2, 118, "#facc15");
  }

  addExplosion(
    state,
    enemy.x,
    enemy.y,
    enemy.kind === "boss" ? 96 : enemy.kind === "tank" ? 52 : 36,
    enemy.kind === "boss" ? "#fb923c" : "#f97316",
    enemy.kind === "boss" ? 0.75 : 0.42,
  );
  addFloater(state, `+${enemy.points}`, enemy.x, enemy.y - 12, "#fde68a");
  spawnPowerUp(state, enemy.x, enemy.y);
}

function dropBomb(state: GameState) {
  if (state.phase !== "running" || state.bombs <= 0) {
    return;
  }

  state.bombs -= 1;
  state.shake = Math.max(state.shake, 18);
  state.enemyBullets = [];
  addExplosion(state, GAME_WIDTH / 2, GAME_HEIGHT / 2, 360, "#38bdf8", 0.5);

  for (const enemy of state.enemies) {
    enemy.hp -= enemy.kind === "boss" ? 10 : 8;
  }

  const destroyed = state.enemies.filter((enemy) => enemy.hp <= 0);
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  for (const enemy of destroyed) {
    destroyEnemy(state, enemy);
  }
}

function updateGame(state: GameState, dt: number, input: Vector) {
  state.time += dt;

  for (const star of state.stars) {
    star.y += star.speed * dt * (state.phase === "running" ? 1 : 0.36);
    if (star.y > GAME_HEIGHT + 5) {
      star.y = -5;
      star.x = Math.random() * GAME_WIDTH;
      star.r = randomBetween(0.7, 2.2);
      star.speed = randomBetween(26, 130);
      star.alpha = randomBetween(0.28, 0.9);
    }
  }

  for (const explosion of state.explosions) {
    explosion.life -= dt;
    const progress = 1 - explosion.life / explosion.maxLife;
    explosion.radius = explosion.maxRadius * clamp(progress, 0, 1);
  }
  state.explosions = state.explosions.filter((explosion) => explosion.life > 0);

  for (const floater of state.floaters) {
    floater.life -= dt;
    floater.y += floater.vy * dt;
  }
  state.floaters = state.floaters.filter((floater) => floater.life > 0);
  state.shake = Math.max(0, state.shake - dt * 34);

  if (state.phase !== "running") {
    return;
  }

  state.rapidTimer = Math.max(0, state.rapidTimer - dt);
  state.spreadTimer = Math.max(0, state.spreadTimer - dt);
  state.player.invulnerable = Math.max(0, state.player.invulnerable - dt);

  const moving = Math.hypot(input.x, input.y) > 0.01;
  const playerSpeed = moving ? 318 : 0;
  state.player.x = clamp(
    state.player.x + input.x * playerSpeed * dt,
    PLAYER_RADIUS + 8,
    GAME_WIDTH - PLAYER_RADIUS - 8,
  );
  state.player.y = clamp(
    state.player.y + input.y * playerSpeed * dt,
    92,
    GAME_HEIGHT - PLAYER_RADIUS - 18,
  );

  state.player.fireTimer -= dt;
  if (state.player.fireTimer <= 0) {
    addPlayerShot(state);
  }

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy(state);
    state.spawnTimer =
      Math.max(0.34, 1.05 - state.level * 0.05) * randomBetween(0.74, 1.24);
  }

  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
  }
  state.bullets = state.bullets.filter(
    (bullet) =>
      bullet.y > -24 &&
      bullet.y < GAME_HEIGHT + 24 &&
      bullet.x > -24 &&
      bullet.x < GAME_WIDTH + 24,
  );

  for (const enemy of state.enemies) {
    if (enemy.kind === "boss") {
      enemy.y = Math.min(94, enemy.y + enemy.speed * dt);
      if (enemy.y >= 94) {
        enemy.x += enemy.vx * dt;
        if (enemy.x < 76 || enemy.x > GAME_WIDTH - 76) {
          enemy.vx *= -1;
          enemy.x = clamp(enemy.x, 76, GAME_WIDTH - 76);
        }
      }
    } else {
      enemy.y += enemy.speed * dt;
      enemy.x += Math.sin(state.time * 2.2 + enemy.phase) * enemy.drift * dt;
    }

    enemy.fireTimer -= dt;
    if (enemy.fireTimer <= 0 && enemy.y > 28) {
      fireEnemy(state, enemy);
    }
  }
  state.enemies = state.enemies.filter((enemy) => enemy.y < GAME_HEIGHT + 86);

  for (const bullet of state.enemyBullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
  }
  state.enemyBullets = state.enemyBullets.filter(
    (bullet) =>
      bullet.y > -32 &&
      bullet.y < GAME_HEIGHT + 34 &&
      bullet.x > -34 &&
      bullet.x < GAME_WIDTH + 34,
  );

  for (const powerUp of state.powerUps) {
    powerUp.y += powerUp.vy * dt;
    powerUp.life -= dt;
  }
  state.powerUps = state.powerUps.filter(
    (powerUp) => powerUp.y < GAME_HEIGHT + 36 && powerUp.life > 0,
  );

  const destroyedEnemies = new Set<number>();
  const usedBullets = new Set<number>();

  for (const bullet of state.bullets) {
    for (const enemy of state.enemies) {
      if (destroyedEnemies.has(enemy.id)) {
        continue;
      }

      if (
        circleHitsRect(bullet.x, bullet.y, bullet.radius, {
          x: enemy.x,
          y: enemy.y,
          w: enemy.w,
          h: enemy.h,
        })
      ) {
        usedBullets.add(bullet.id);
        enemy.hp -= bullet.power;
        addExplosion(state, bullet.x, bullet.y, 12, "#fef3c7", 0.18);
        if (enemy.hp <= 0) {
          destroyedEnemies.add(enemy.id);
          destroyEnemy(state, enemy);
        }
        break;
      }
    }
  }

  state.bullets = state.bullets.filter((bullet) => !usedBullets.has(bullet.id));
  state.enemies = state.enemies.filter((enemy) => !destroyedEnemies.has(enemy.id));

  for (const enemy of state.enemies) {
    if (
      circleHitsRect(state.player.x, state.player.y, PLAYER_RADIUS, {
        x: enemy.x,
        y: enemy.y,
        w: enemy.w * 0.86,
        h: enemy.h * 0.86,
      })
    ) {
      damagePlayer(state, enemy.x, enemy.y);
      if (enemy.kind !== "boss") {
        enemy.hp = 0;
      }
    }
  }
  const collidedEnemies = state.enemies.filter((enemy) => enemy.hp <= 0);
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  for (const enemy of collidedEnemies) {
    destroyEnemy(state, enemy);
  }

  const usedEnemyBullets = new Set<number>();
  for (const bullet of state.enemyBullets) {
    if (Math.hypot(bullet.x - state.player.x, bullet.y - state.player.y) < bullet.radius + 13) {
      usedEnemyBullets.add(bullet.id);
      damagePlayer(state, bullet.x, bullet.y);
    }
  }
  state.enemyBullets = state.enemyBullets.filter(
    (bullet) => !usedEnemyBullets.has(bullet.id),
  );

  const collectedPowerUps = new Set<number>();
  for (const powerUp of state.powerUps) {
    if (Math.hypot(powerUp.x - state.player.x, powerUp.y - state.player.y) < 28) {
      collectedPowerUps.add(powerUp.id);
      applyPowerUp(state, powerUp.kind);
      addExplosion(state, powerUp.x, powerUp.y, 34, "#22c55e", 0.34);
    }
  }
  state.powerUps = state.powerUps.filter(
    (powerUp) => !collectedPowerUps.has(powerUp.id),
  );
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState) {
  const { x, y } = state.player;
  const blink = state.player.invulnerable > 0 && Math.floor(state.time * 18) % 2 === 0;

  if (blink) {
    ctx.globalAlpha = 0.48;
  }

  if (state.shield > 0 || state.player.invulnerable > 0) {
    ctx.save();
    ctx.globalAlpha = 0.32 + Math.sin(state.time * 7) * 0.08;
    ctx.strokeStyle = state.shield > 0 ? "#67e8f9" : "#fef3c7";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 30 + Math.sin(state.time * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#d9f99d";
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(13, 18);
  ctx.lineTo(0, 10);
  ctx.lineTo(-13, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(-36, 18);
  ctx.lineTo(-10, 13);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(12, -2);
  ctx.lineTo(36, 18);
  ctx.lineTo(10, 13);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(-9, 20);
  ctx.lineTo(-2, 31);
  ctx.lineTo(1, 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9, 20);
  ctx.lineTo(2, 31);
  ctx.lineTo(-1, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.ellipse(0, -10, 5, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
  if (enemy.kind === "boss") {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = "#991b1b";
    drawRoundRect(ctx, -54, -25, 108, 50, 8);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(0, 34);
    ctx.lineTo(-66, 4);
    ctx.lineTo(-48, -20);
    ctx.lineTo(48, -20);
    ctx.lineTo(66, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(-30, 6, 6, 0, Math.PI * 2);
    ctx.arc(30, 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#020617";
    drawRoundRect(ctx, -42, -42, 84, 7, 4);
    ctx.fill();
    ctx.fillStyle = "#22c55e";
    drawRoundRect(ctx, -42, -42, 84 * (enemy.hp / enemy.maxHp), 7, 4);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const wobble = Math.sin(time * 7 + enemy.phase) * 1.5;
  ctx.rotate(wobble * 0.01);
  ctx.fillStyle = enemy.kind === "tank" ? "#fb923c" : enemy.kind === "fighter" ? "#f43f5e" : "#a78bfa";
  ctx.beginPath();
  ctx.moveTo(0, enemy.h / 2);
  ctx.lineTo(enemy.w / 2, -enemy.h / 4);
  ctx.lineTo(9, -enemy.h / 2);
  ctx.lineTo(0, -enemy.h / 3);
  ctx.lineTo(-9, -enemy.h / 2);
  ctx.lineTo(-enemy.w / 2, -enemy.h / 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.ellipse(0, 1, enemy.w * 0.16, enemy.h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  if (enemy.maxHp > 1) {
    ctx.fillStyle = "#0f172a";
    drawRoundRect(ctx, -enemy.w / 2, -enemy.h / 2 - 8, enemy.w, 4, 3);
    ctx.fill();
    ctx.fillStyle = "#86efac";
    drawRoundRect(ctx, -enemy.w / 2, -enemy.h / 2 - 8, enemy.w * (enemy.hp / enemy.maxHp), 4, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawPowerUp(ctx: CanvasRenderingContext2D, powerUp: PowerUp, time: number) {
  const pulse = 1 + Math.sin(time * 8) * 0.08;
  const colorMap: Record<PowerKind, string> = {
    heal: "#22c55e",
    shield: "#06b6d4",
    rapid: "#eab308",
    spread: "#8b5cf6",
    bomb: "#f97316",
  };
  const textMap: Record<PowerKind, string> = {
    heal: "+",
    shield: "盾",
    rapid: "速",
    spread: "散",
    bomb: "爆",
  };

  ctx.save();
  ctx.translate(powerUp.x, powerUp.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = colorMap[powerUp.kind];
  ctx.shadowColor = colorMap[powerUp.kind];
  ctx.shadowBlur = 16;
  drawRoundRect(ctx, -14, -14, 28, 28, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#020617";
  ctx.font = "700 16px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(textMap[powerUp.kind], 0, 1);
  ctx.restore();
}

function drawGame(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();
  ctx.fillStyle = "#07111f";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, "#07111f");
  sky.addColorStop(0.46, "#10243a");
  sky.addColorStop(1, "#111827");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
  ctx.lineWidth = 1;
  for (let y = (state.time * 44) % 58; y < GAME_HEIGHT; y += 58) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y);
    ctx.stroke();
  }

  for (const star of state.stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = star.r > 1.6 ? "#f8fafc" : "#93c5fd";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const shakeX = state.shake ? randomBetween(-state.shake, state.shake) * 0.18 : 0;
  const shakeY = state.shake ? randomBetween(-state.shake, state.shake) * 0.18 : 0;
  ctx.translate(shakeX, shakeY);

  for (const powerUp of state.powerUps) {
    drawPowerUp(ctx, powerUp, state.time);
  }

  for (const bullet of state.bullets) {
    ctx.fillStyle = "#fef08a";
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 12;
    drawRoundRect(ctx, bullet.x - 3, bullet.y - 13, 6, 21, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  for (const enemy of state.enemies) {
    drawEnemy(ctx, enemy, state.time);
  }

  for (const bullet of state.enemyBullets) {
    ctx.fillStyle = "#fb7185";
    ctx.shadowColor = "#fb7185";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawPlayer(ctx, state);

  for (const explosion of state.explosions) {
    const alpha = clamp(explosion.life / explosion.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = explosion.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.24;
    ctx.fillStyle = explosion.color;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.radius * 0.68, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const floater of state.floaters) {
    const alpha = clamp(floater.life / floater.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = floater.color;
    ctx.font = "700 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(floater.text, floater.x, floater.y);
    ctx.globalAlpha = 1;
  }

  if (state.phase === "paused") {
    ctx.fillStyle = "rgba(2, 6, 23, 0.42)";
    ctx.fillRect(-shakeX, -shakeY, GAME_WIDTH, GAME_HEIGHT);
  }

  ctx.restore();
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const keyboardRef = useRef(new Set<string>());
  const joystickInputRef = useRef<Vector>({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  const scaleRef = useRef({ x: 1, y: 1, dpr: 1 });
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [hud, setHud] = useState<HudState>(initialHud);
  const [joystick, setJoystick] = useState({ x: 0, y: 0, active: false });

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    scaleRef.current = {
      x: rect.width / GAME_WIDTH,
      y: rect.height / GAME_HEIGHT,
      dpr,
    };
  }, []);

  const syncHud = useCallback(() => {
    const state = gameRef.current;
    if (!state) {
      return;
    }

    setHud(snapshot(state));
    setPhase(state.phase);
  }, []);

  const readInput = useCallback(() => {
    const keys = keyboardRef.current;
    let x = 0;
    let y = 0;

    if (keys.has("arrowleft") || keys.has("a")) x -= 1;
    if (keys.has("arrowright") || keys.has("d")) x += 1;
    if (keys.has("arrowup") || keys.has("w")) y -= 1;
    if (keys.has("arrowdown") || keys.has("s")) y += 1;

    const keyboard = normalize(x, y);
    const joystickValue = joystickInputRef.current;
    return normalize(keyboard.x + joystickValue.x, keyboard.y + joystickValue.y);
  }, []);

  const startGame = useCallback(() => {
    const best = Math.max(readBestScore(), gameRef.current?.bestScore ?? 0);
    const nextState = createGameState(best);
    nextState.phase = "running";
    gameRef.current = nextState;
    setPhase("running");
    setHud(snapshot(nextState));
  }, []);

  const togglePause = useCallback(() => {
    const state = gameRef.current;
    if (!state) {
      return;
    }

    if (state.phase === "running") {
      state.phase = "paused";
    } else if (state.phase === "paused") {
      state.phase = "running";
    } else {
      startGame();
      return;
    }
    syncHud();
  }, [startGame, syncHud]);

  const useBomb = useCallback(() => {
    const state = gameRef.current;
    if (!state) {
      return;
    }
    dropBomb(state);
    syncHud();
  }, [syncHud]);

  useEffect(() => {
    const initialState = createGameState(readBestScore());
    gameRef.current = initialState;
    setHud(snapshot(initialState));

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (stageRef.current) {
      observer.observe(stageRef.current);
    }

    let last = performance.now();
    let hudTimer = 0;

    const tick = (now: number) => {
      const state = gameRef.current;
      if (!state) {
        return;
      }

      const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
      last = now;
      const previousPhase = state.phase;
      updateGame(state, dt, readInput());

      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (context && canvas) {
        const { x, y, dpr } = scaleRef.current;
        context.setTransform(dpr * x, 0, 0, dpr * y, 0, 0);
        drawGame(context, state);
        context.setTransform(1, 0, 0, 1, 0, 0);
      }

      hudTimer += dt;
      if (hudTimer > 0.08 || previousPhase !== state.phase) {
        hudTimer = 0;
        setHud(snapshot(state));
        if (previousPhase !== state.phase) {
          setPhase(state.phase);
        }
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      observer.disconnect();
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [readInput, resizeCanvas]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const controls = [
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
        "a",
        "d",
        "w",
        "s",
      ];

      if (controls.includes(key)) {
        event.preventDefault();
        keyboardRef.current.add(key);
      }

      if (key === " " && !event.repeat) {
        event.preventDefault();
        useBomb();
      }

      if (key === "p" && !event.repeat) {
        togglePause();
      }

      if (key === "enter" && !event.repeat) {
        startGame();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keyboardRef.current.delete(event.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startGame, togglePause, useBomb]);

  const handleJoystickMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = Math.min(rect.width, rect.height) * 0.34;
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const distance = Math.min(maxDistance, Math.hypot(rawX, rawY));
    const angle = Math.atan2(rawY, rawX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    joystickInputRef.current = normalize(x / maxDistance, y / maxDistance);
    setJoystick({ x, y, active: true });
  }, []);

  const handleJoystickStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      handleJoystickMove(event);
    },
    [handleJoystickMove],
  );

  const resetJoystick = useCallback(() => {
    joystickInputRef.current = { x: 0, y: 0 };
    setJoystick({ x: 0, y: 0, active: false });
  }, []);

  const panelTitle =
    phase === "over" ? "战机坠毁" : phase === "paused" ? "战斗暂停" : "飞机大战";
  const panelAction = phase === "running" ? "重新开始" : phase === "paused" ? "继续战斗" : "开始战斗";

  return (
    <main className="game-shell">
      <section className="game-stage-wrap" aria-label="飞机大战游戏区">
        <div className="game-stage" ref={stageRef}>
          <canvas
            ref={canvasRef}
            className="game-canvas"
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            aria-label="飞机大战画面"
          />

          <div className="hud-strip" aria-live="polite">
            <div>
              <span>分数</span>
              <strong>{hud.score}</strong>
            </div>
            <div>
              <span>生命</span>
              <strong>{hud.lives}</strong>
            </div>
            <div>
              <span>等级</span>
              <strong>{hud.level}</strong>
            </div>
            <div>
              <span>爆弹</span>
              <strong>{hud.bombs}</strong>
            </div>
          </div>

          {phase !== "running" && (
            <div className="start-panel">
              <p>{panelTitle}</p>
              <h1>飞机大战</h1>
              <div className="panel-score">
                <span>最高分</span>
                <strong>{hud.bestScore}</strong>
              </div>
              <button className="primary-action" type="button" onClick={startGame}>
                {panelAction}
              </button>
            </div>
          )}

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
                  style={{
                    transform: `translate(${joystick.x}px, ${joystick.y}px)`,
                  }}
                />
              </div>
            </div>

            <div className="action-cluster">
              <button type="button" onClick={useBomb} disabled={hud.bombs <= 0 || phase !== "running"}>
                爆弹
              </button>
              <button type="button" onClick={togglePause}>
                {phase === "paused" ? "继续" : "暂停"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="cockpit-panel" aria-label="游戏状态">
        <div className="brand-lockup">
          <span>空域作战</span>
          <h2>飞机大战</h2>
        </div>

        <div className="stat-grid">
          <div>
            <span>当前分数</span>
            <strong>{hud.score}</strong>
          </div>
          <div>
            <span>最高分</span>
            <strong>{hud.bestScore}</strong>
          </div>
          <div>
            <span>生命</span>
            <strong>{hud.lives}</strong>
          </div>
          <div>
            <span>等级</span>
            <strong>{hud.level}</strong>
          </div>
          <div>
            <span>护盾</span>
            <strong>{hud.shield}</strong>
          </div>
          <div>
            <span>爆弹</span>
            <strong>{hud.bombs}</strong>
          </div>
        </div>

        <div className="boost-row">
          <div className={hud.rapid > 0 ? "boost active" : "boost"}>
            <span>速射</span>
            <strong>{hud.rapid}</strong>
          </div>
          <div className={hud.spread > 0 ? "boost active" : "boost"}>
            <span>散射</span>
            <strong>{hud.spread}</strong>
          </div>
        </div>

        <div className="desktop-actions">
          <button type="button" onClick={startGame}>
            {phase === "over" ? "再来一局" : "开始"}
          </button>
          <button type="button" onClick={togglePause}>
            {phase === "paused" ? "继续" : "暂停"}
          </button>
          <button type="button" onClick={useBomb} disabled={hud.bombs <= 0 || phase !== "running"}>
            爆弹
          </button>
        </div>
      </aside>
    </main>
  );
}
