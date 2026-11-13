import Phaser from 'phaser';

export interface WorldTorchData {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  phase: number;
}

export interface WorldPillarData {
  x: number;
  y: number;
  radius: number;
  heightScale: number;
}

export interface ShadowLightInput {
  x: number;
  y: number;
  radius: number;
  strength: number;
  isPlayer: boolean;
}

interface TorchPoolSlot {
  active: boolean;
  worldX: number;
  worldY: number;
  phase: number;
  baseRadius: number;
  currentRadius: number;
  currentIntensity: number;
  brazier: Phaser.GameObjects.Image;
  flame: Phaser.GameObjects.Image;
  groundGlow: Phaser.GameObjects.Image;
}

interface PillarPoolSlot {
  active: boolean;
  worldX: number;
  worldY: number;
  radius: number;
  heightScale: number;
  sprite: Phaser.GameObjects.Image;
}

const CELL_SIZE = 420;
const MAX_TORCH_SLOTS = 14;
const MAX_PILLAR_SLOTS = 16;
const MAX_SHADOW_LIGHTS = 6;

const STARTER_TORCH_OFFSETS = [
  { dx: -150, dy: -125, phase: 0.7 },
  { dx: 165, dy: 130, phase: 2.9 },
];

function hashCell(cx: number, cy: number, salt: number): number {
  let h = Math.imul(cx, 374761393) ^ Math.imul(cy, 668265263) ^ Math.imul(salt, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Computes soft real-time occlusion [0..1] for a target point relative to a point light
 * when terrain pillars or a colossal boss sit between the light and the target.
 */
export function computePointShadowOcclusion(
  lightX: number,
  lightY: number,
  targetX: number,
  targetY: number,
  pillars: readonly WorldPillarData[],
  pillarCount: number,
  bossX?: number,
  bossY?: number,
  bossRadius: number = 0
): number {
  const vx = targetX - lightX;
  const vy = targetY - lightY;
  const distSq = vx * vx + vy * vy;
  if (distSq < 16) return 0;

  const dist = Math.sqrt(distSq);
  const invDist = 1 / dist;
  const dirX = vx * invDist;
  const dirY = vy * invDist;

  let maxOcclusion = 0;

  for (let i = 0; i < pillarCount; i++) {
    const p = pillars[i];
    const ox = p.x - lightX;
    const oy = p.y - lightY;
    const proj = ox * dirX + oy * dirY;
    if (proj <= 6 || proj >= dist - 4) continue;

    const perpX = ox - dirX * proj;
    const perpY = oy - dirY * proj;
    const perpDistSq = perpX * perpX + perpY * perpY;

    // Slight perspective widening along distance from occluder (penumbra cone)
    const coneFactor = dist / Math.max(18, proj);
    const umbraRadius = p.radius * 0.92 * Math.min(2.4, 0.75 + 0.25 * coneFactor);
    const penumbraRadius = umbraRadius + 16;

    if (perpDistSq >= penumbraRadius * penumbraRadius) continue;

    const perpDist = Math.sqrt(perpDistSq);
    if (perpDist <= umbraRadius) {
      maxOcclusion = Math.max(maxOcclusion, 0.92);
      if (maxOcclusion >= 0.92) return maxOcclusion;
    } else {
      const t = 1 - (perpDist - umbraRadius) / (penumbraRadius - umbraRadius);
      maxOcclusion = Math.max(maxOcclusion, t * 0.92);
    }
  }

  if (bossRadius > 0 && bossX !== undefined && bossY !== undefined) {
    const ox = bossX - lightX;
    const oy = bossY - lightY;
    const proj = ox * dirX + oy * dirY;
    if (proj > bossRadius * 0.5 && proj < dist - bossRadius * 0.5) {
      const perpX = ox - dirX * proj;
      const perpY = oy - dirY * proj;
      const perpDistSq = perpX * perpX + perpY * perpY;
      const penumbraR = bossRadius + 18;
      if (perpDistSq < penumbraR * penumbraR) {
        const perpDist = Math.sqrt(perpDistSq);
        const occ =
          perpDist <= bossRadius
            ? 0.85
            : (1 - (perpDist - bossRadius) / 18) * 0.85;
        if (occ > maxOcclusion) maxOcclusion = occ;
      }
    }
  }

  return maxOcclusion;
}

export class ShadowCasterSystem {
  private scene: Phaser.Scene;
  private spawnX: number;
  private spawnY: number;

  private groundShadowGraphics: Phaser.GameObjects.Graphics;
  private entityShadowOverlayGraphics: Phaser.GameObjects.Graphics;

  private torchPool: TorchPoolSlot[] = [];
  private pillarPool: PillarPoolSlot[] = [];

  // Zero-allocation read-only snapshots exposed to MainScene & DarknessScene
  private activeTorchData: WorldTorchData[] = [];
  private activeTorchCount: number = 0;
  private activePillarData: WorldPillarData[] = [];
  private activePillarCount: number = 0;
  private shadowLights: ShadowLightInput[] = [];
  private shadowLightCount: number = 0;

  private emberAccumMs: number = 0;

  constructor(scene: Phaser.Scene, spawnX: number, spawnY: number) {
    this.scene = scene;
    this.spawnX = spawnX;
    this.spawnY = spawnY;

    this.ensureTextures();

    // Ground cast shadows strictly above floor (depth 0) and below world props/entities
    this.groundShadowGraphics = scene.add.graphics().setDepth(6);
    this.groundShadowGraphics.disableInteractive();

    // Subtle shadow bands cast onto enemy bodies inside pillar/boss shadow cones
    this.entityShadowOverlayGraphics = scene.add.graphics().setDepth(21);
    this.entityShadowOverlayGraphics.disableInteractive();

    for (let i = 0; i < MAX_TORCH_SLOTS; i++) {
      const groundGlow = scene.add
        .image(0, 0, 'world_torch_ground_glow')
        .setDepth(4)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false);
      groundGlow.disableInteractive();

      const brazier = scene.add
        .image(0, 0, 'world_torch_brazier')
        .setOrigin(0.5, 0.85)
        .setDepth(19)
        .setVisible(false);
      brazier.disableInteractive();

      const flame = scene.add
        .image(0, 0, 'world_torch_flame')
        .setOrigin(0.5, 0.82)
        .setDepth(20)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false);
      flame.disableInteractive();

      this.torchPool.push({
        active: false,
        worldX: 0,
        worldY: 0,
        phase: 0,
        baseRadius: 165,
        currentRadius: 165,
        currentIntensity: 1,
        brazier,
        flame,
        groundGlow,
      });

      this.activeTorchData.push({ x: 0, y: 0, radius: 165, intensity: 1, phase: 0 });
    }

    for (let i = 0; i < MAX_PILLAR_SLOTS; i++) {
      const sprite = scene.add
        .image(0, 0, 'world_pillar_stone')
        .setOrigin(0.5, 0.78)
        .setDepth(19)
        .setVisible(false);
      sprite.disableInteractive();

      this.pillarPool.push({
        active: false,
        worldX: 0,
        worldY: 0,
        radius: 22,
        heightScale: 1,
        sprite,
      });

      this.activePillarData.push({ x: 0, y: 0, radius: 22, heightScale: 1 });
    }

    for (let i = 0; i < MAX_SHADOW_LIGHTS; i++) {
      this.shadowLights.push({
        x: 0,
        y: 0,
        radius: 0,
        strength: 1,
        isPlayer: false,
      });
    }
  }

  private ensureTextures() {
    const texMgr = this.scene.textures;

    if (!texMgr.exists('world_torch_brazier')) {
      const tex = texMgr.createCanvas('world_torch_brazier', 44, 64);
      if (tex) {
        const ctx = tex.getContext();
        // Ground stone base plate
        ctx.fillStyle = '#181b21';
        ctx.beginPath();
        ctx.ellipse(22, 56, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3a414d';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Iron post
        const postGrad = ctx.createLinearGradient(18, 22, 26, 56);
        postGrad.addColorStop(0, '#545c69');
        postGrad.addColorStop(0.5, '#2b3038');
        postGrad.addColorStop(1, '#14161a');
        ctx.fillStyle = postGrad;
        ctx.fillRect(19, 23, 6, 33);

        // Forged iron bowl sconce
        ctx.fillStyle = '#232730';
        ctx.beginPath();
        ctx.moveTo(10, 20);
        ctx.lineTo(34, 20);
        ctx.lineTo(29, 30);
        ctx.lineTo(15, 30);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#646d7a';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Hot ember bed inside sconce
        const coalGrad = ctx.createRadialGradient(22, 20, 1, 22, 20, 10);
        coalGrad.addColorStop(0, '#fff2b2');
        coalGrad.addColorStop(0.45, '#f28b25');
        coalGrad.addColorStop(1, '#7a1c14');
        ctx.fillStyle = coalGrad;
        ctx.beginPath();
        ctx.ellipse(22, 20, 9.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        tex.refresh();
      }
    }

    if (!texMgr.exists('world_torch_flame')) {
      const tex = texMgr.createCanvas('world_torch_flame', 36, 48);
      if (tex) {
        const ctx = tex.getContext();
        // Outer crimson-amber halo
        const outer = ctx.createRadialGradient(18, 30, 2, 18, 26, 18);
        outer.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
        outer.addColorStop(0.45, 'rgba(242, 130, 35, 0.72)');
        outer.addColorStop(0.82, 'rgba(205, 36, 36, 0.25)');
        outer.addColorStop(1, 'rgba(180, 20, 20, 0)');
        ctx.fillStyle = outer;
        ctx.fillRect(0, 0, 36, 48);

        // Stylized flame tongue
        const tongue = ctx.createLinearGradient(18, 6, 18, 40);
        tongue.addColorStop(0, 'rgba(255, 195, 70, 0.2)');
        tongue.addColorStop(0.4, 'rgba(255, 145, 40, 0.92)');
        tongue.addColorStop(1, 'rgba(255, 246, 196, 1)');
        ctx.fillStyle = tongue;
        ctx.beginPath();
        ctx.moveTo(18, 6);
        ctx.quadraticCurveTo(28, 22, 24, 36);
        ctx.quadraticCurveTo(18, 41, 12, 36);
        ctx.quadraticCurveTo(8, 22, 18, 6);
        ctx.fill();

        // Bright white-gold core
        ctx.fillStyle = 'rgba(255, 250, 220, 0.95)';
        ctx.beginPath();
        ctx.ellipse(18, 31, 4.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        tex.refresh();
      }
    }

    if (!texMgr.exists('world_torch_ground_glow')) {
      const size = 192;
      const tex = texMgr.createCanvas('world_torch_ground_glow', size, size);
      if (tex) {
        const ctx = tex.getContext();
        const half = size / 2;
        const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
        grad.addColorStop(0, 'rgba(255, 184, 88, 0.34)');
        grad.addColorStop(0.35, 'rgba(242, 125, 45, 0.2)');
        grad.addColorStop(0.7, 'rgba(195, 54, 38, 0.08)');
        grad.addColorStop(1, 'rgba(180, 32, 28, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        tex.refresh();
      }
    }

    if (!texMgr.exists('world_pillar_stone')) {
      const tex = texMgr.createCanvas('world_pillar_stone', 64, 84);
      if (tex) {
        const ctx = tex.getContext();
        // Ground rubble base
        ctx.fillStyle = '#15181e';
        ctx.beginPath();
        ctx.ellipse(32, 68, 24, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2d333e';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Broken obsidian shaft
        const shaftGrad = ctx.createLinearGradient(14, 18, 50, 68);
        shaftGrad.addColorStop(0, '#414855');
        shaftGrad.addColorStop(0.45, '#262b33');
        shaftGrad.addColorStop(1, '#12151a');
        ctx.fillStyle = shaftGrad;
        ctx.beginPath();
        ctx.moveTo(15, 67);
        ctx.lineTo(17, 22);
        ctx.lineTo(27, 13);
        ctx.lineTo(39, 18);
        ctx.lineTo(47, 24);
        ctx.lineTo(49, 67);
        ctx.quadraticCurveTo(32, 74, 15, 67);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#525b6b';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Chiseled top fracture facet
        ctx.fillStyle = '#4e5666';
        ctx.beginPath();
        ctx.moveTo(17, 22);
        ctx.lineTo(27, 13);
        ctx.lineTo(39, 18);
        ctx.lineTo(47, 24);
        ctx.lineTo(34, 29);
        ctx.lineTo(23, 27);
        ctx.closePath();
        ctx.fill();

        // Subtle weathering cracks
        ctx.strokeStyle = '#0c0e12';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(26, 30);
        ctx.lineTo(29, 44);
        ctx.lineTo(24, 56);
        ctx.moveTo(39, 34);
        ctx.lineTo(36, 48);
        ctx.stroke();

        tex.refresh();
      }
    }
  }

  public getTorchesSnapshot(): { items: readonly WorldTorchData[]; count: number } {
    return { items: this.activeTorchData, count: this.activeTorchCount };
  }

  public getPillarsSnapshot(): { items: readonly WorldPillarData[]; count: number } {
    return { items: this.activePillarData, count: this.activePillarCount };
  }

  /**
   * Streams deterministic torches & ruined stone pillars around the camera viewport,
   * updates flickering torch flames, and optionally spawns occasional warm ember sparks.
   */
  public updateWorldProps(
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    timeSec: number,
    deltaMs: number,
    isLowQuality: boolean,
    onTorchEmber?: (x: number, y: number) => void
  ) {
    const margin = 220;
    const minCx = Math.floor((camX - margin) / CELL_SIZE);
    const maxCx = Math.floor((camX + viewW + margin) / CELL_SIZE);
    const minCy = Math.floor((camY - margin) / CELL_SIZE);
    const maxCy = Math.floor((camY + viewH + margin) / CELL_SIZE);

    let torchIdx = 0;
    let pillarIdx = 0;

    // Guaranteed starter torches near initial clearing so dynamic shadows are visible immediately
    for (let i = 0; i < STARTER_TORCH_OFFSETS.length && torchIdx < MAX_TORCH_SLOTS; i++) {
      const st = STARTER_TORCH_OFFSETS[i];
      const tx = this.spawnX + st.dx;
      const ty = this.spawnY + st.dy;
      if (
        tx >= camX - margin &&
        tx <= camX + viewW + margin &&
        ty >= camY - margin &&
        ty <= camY + viewH + margin
      ) {
        this.activateTorchSlot(torchIdx++, tx, ty, 175, st.phase, timeSec);
      }
    }

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        // Cell roll for Pillar
        const pillarRoll = hashCell(cx, cy, 11);
        let pillarX = 0;
        let pillarY = 0;
        let hasPillar = false;

        if (pillarRoll < 0.42 && pillarIdx < MAX_PILLAR_SLOTS) {
          const px = cx * CELL_SIZE + 85 + hashCell(cx, cy, 12) * (CELL_SIZE - 170);
          const py = cy * CELL_SIZE + 85 + hashCell(cx, cy, 13) * (CELL_SIZE - 170);
          const dxSpawn = px - this.spawnX;
          const dySpawn = py - this.spawnY;
          // Never block starting position or starter torches
          if (dxSpawn * dxSpawn + dySpawn * dySpawn > 195 * 195) {
            hasPillar = true;
            pillarX = px;
            pillarY = py;
            const radius = 21 + hashCell(cx, cy, 14) * 5;
            const heightScale = 0.92 + hashCell(cx, cy, 15) * 0.28;
            this.activatePillarSlot(pillarIdx++, px, py, radius, heightScale);
          }
        }

        // Cell roll for Torch (avoid duplicating starter torches in spawn cell)
        const torchRoll = hashCell(cx, cy, 21);
        if (torchRoll < 0.34 && torchIdx < MAX_TORCH_SLOTS) {
          const tx = cx * CELL_SIZE + 90 + hashCell(cx, cy, 22) * (CELL_SIZE - 180);
          const ty = cy * CELL_SIZE + 90 + hashCell(cx, cy, 23) * (CELL_SIZE - 180);
          const dxSpawn = tx - this.spawnX;
          const dySpawn = ty - this.spawnY;
          if (dxSpawn * dxSpawn + dySpawn * dySpawn > 240 * 240) {
            const tooCloseToPillar =
              hasPillar && (tx - pillarX) * (tx - pillarX) + (ty - pillarY) * (ty - pillarY) < 95 * 95;
            if (!tooCloseToPillar) {
              const baseR = 152 + hashCell(cx, cy, 24) * 28;
              const phase = hashCell(cx, cy, 25) * Math.PI * 2;
              this.activateTorchSlot(torchIdx++, tx, ty, baseR, phase, timeSec);
            }
          }
        }
      }
    }

    this.activeTorchCount = torchIdx;
    this.activePillarCount = pillarIdx;

    for (let i = torchIdx; i < MAX_TORCH_SLOTS; i++) {
      const slot = this.torchPool[i];
      if (slot.active) {
        slot.active = false;
        slot.brazier.setVisible(false);
        slot.flame.setVisible(false);
        slot.groundGlow.setVisible(false);
      }
    }

    for (let i = pillarIdx; i < MAX_PILLAR_SLOTS; i++) {
      const slot = this.pillarPool[i];
      if (slot.active) {
        slot.active = false;
        slot.sprite.setVisible(false);
      }
    }

    // Subtle rising torch embers (throttled for 60 FPS)
    if (onTorchEmber && torchIdx > 0 && !isLowQuality) {
      this.emberAccumMs += deltaMs;
      if (this.emberAccumMs >= 180) {
        this.emberAccumMs = 0;
        const pick = Math.floor(Math.random() * torchIdx);
        const t = this.activeTorchData[pick];
        if (
          t.x >= camX - 40 &&
          t.x <= camX + viewW + 40 &&
          t.y >= camY - 40 &&
          t.y <= camY + viewH + 40
        ) {
          onTorchEmber(t.x + (Math.random() - 0.5) * 10, t.y - 38);
        }
      }
    }
  }

  private activateTorchSlot(
    index: number,
    wx: number,
    wy: number,
    baseRadius: number,
    phase: number,
    timeSec: number
  ) {
    const slot = this.torchPool[index];
    const flicker =
      Math.sin(timeSec * 9.5 + phase) * 0.6 +
      Math.sin(timeSec * 16.7 + phase * 1.4) * 0.4;
    const radius = baseRadius * (1 + flicker * 0.065);
    const intensity = 0.88 + flicker * 0.12;

    slot.active = true;
    slot.worldX = wx;
    slot.worldY = wy;
    slot.phase = phase;
    slot.baseRadius = baseRadius;
    slot.currentRadius = radius;
    slot.currentIntensity = intensity;

    slot.brazier.setPosition(wx, wy).setVisible(true);
    slot.flame
      .setPosition(wx + flicker * 1.1, wy - 33)
      .setScale(0.92 + flicker * 0.1, 0.96 + Math.abs(flicker) * 0.16)
      .setAlpha(0.84 + flicker * 0.14)
      .setVisible(true);
    slot.groundGlow
      .setPosition(wx, wy - 8)
      .setDisplaySize(radius * 1.9, radius * 1.9)
      .setAlpha(0.72 * intensity)
      .setVisible(true);

    const out = this.activeTorchData[index];
    out.x = wx;
    out.y = wy - 16;
    out.radius = radius;
    out.intensity = intensity;
    out.phase = phase;
  }

  private activatePillarSlot(
    index: number,
    wx: number,
    wy: number,
    radius: number,
    heightScale: number
  ) {
    const slot = this.pillarPool[index];
    slot.active = true;
    slot.worldX = wx;
    slot.worldY = wy;
    slot.radius = radius;
    slot.heightScale = heightScale;

    slot.sprite
      .setPosition(wx, wy)
      .setScale(radius / 22, (radius / 22) * heightScale)
      .setVisible(true);

    const out = this.activePillarData[index];
    out.x = wx;
    out.y = wy;
    out.radius = radius;
    out.heightScale = heightScale;
  }

  /**
   * Smoothly pushes an entity out of solid terrain pillars so combat never snags.
   */
  public resolvePillarPushout(
    sprite: Phaser.Physics.Arcade.Sprite,
    entityRadius: number
  ) {
    for (let i = 0; i < this.activePillarCount; i++) {
      const p = this.activePillarData[i];
      const dx = sprite.x - p.x;
      const dy = sprite.y - p.y;
      const minDist = p.radius + entityRadius;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDist * minDist) {
        if (distSq < 0.001) {
          sprite.x += minDist;
        } else {
          const dist = Math.sqrt(distSq);
          const push = minDist - dist;
          sprite.x += (dx / dist) * push;
          sprite.y += (dy / dist) * push;
        }
      }
    }
  }

  /**
   * Renders real-time dynamic shadows cast by light sources (player lantern, world torches, boss)
   * across terrain pillars, enemies, and the player character.
   */
  public renderDynamicShadows(params: {
    player: Phaser.Physics.Arcade.Sprite;
    playerLightRadius: number;
    enemies: readonly Phaser.Physics.Arcade.Sprite[];
    boss: Phaser.Physics.Arcade.Sprite | null;
    camX: number;
    camY: number;
    viewW: number;
    viewH: number;
    isLowQuality: boolean;
  }) {
    const {
      player,
      playerLightRadius,
      enemies,
      boss,
      camX,
      camY,
      viewW,
      viewH,
      isLowQuality,
    } = params;

    this.groundShadowGraphics.clear();
    this.entityShadowOverlayGraphics.clear();

    // 1. Collect prioritized shadow-casting light sources near viewport
    let lCount = 0;
    const pSlot = this.shadowLights[lCount++];
    pSlot.x = player.x;
    pSlot.y = player.y;
    pSlot.radius = playerLightRadius * 1.08;
    pSlot.strength = 1.0;
    pSlot.isPlayer = true;

    const maxTorchCasters = isLowQuality ? 2 : 4;
    let addedTorches = 0;
    for (let i = 0; i < this.activeTorchCount && addedTorches < maxTorchCasters && lCount < MAX_SHADOW_LIGHTS; i++) {
      const t = this.activeTorchData[i];
      if (
        t.x + t.radius < camX - 60 ||
        t.x - t.radius > camX + viewW + 60 ||
        t.y + t.radius < camY - 60 ||
        t.y - t.radius > camY + viewH + 60
      ) {
        continue;
      }
      const slot = this.shadowLights[lCount++];
      slot.x = t.x;
      slot.y = t.y;
      slot.radius = t.radius * 1.1;
      slot.strength = 0.85 * t.intensity;
      slot.isPlayer = false;
      addedTorches++;
    }

    if (boss && boss.active && lCount < MAX_SHADOW_LIGHTS) {
      const bSlot = this.shadowLights[lCount++];
      bSlot.x = boss.x;
      bSlot.y = boss.y;
      bSlot.radius = 230;
      bSlot.strength = 0.65;
      bSlot.isPlayer = false;
    }

    this.shadowLightCount = lCount;

    // 2. Cast geometric umbra & penumbra shadow cones from Terrain Pillars & Torch Stands
    for (let li = 0; li < lCount; li++) {
      const light = this.shadowLights[li];
      for (let pi = 0; pi < this.activePillarCount; pi++) {
        const pillar = this.activePillarData[pi];
        this.drawOccluderShadowWedge(
          light,
          pillar.x,
          pillar.y,
          pillar.radius * 0.96,
          190 * pillar.heightScale,
          isLowQuality
        );
      }

      // Torch braziers also cast crisp short shadows when lit by Player Lantern or another Torch
      if (light.isPlayer) {
        for (let ti = 0; ti < this.activeTorchCount; ti++) {
          const torch = this.activeTorchData[ti];
          this.drawOccluderShadowWedge(light, torch.x, torch.y + 16, 11, 72, true);
        }
      }
    }

    // 3. Player character casts dynamic shadow away from nearby Torches (and subtle lantern base pool)
    this.groundShadowGraphics.fillStyle(0x04060c, 0.34);
    this.groundShadowGraphics.fillEllipse(player.x, player.y + 34, 42, 16);

    for (let li = 1; li < lCount; li++) {
      const light = this.shadowLights[li];
      this.drawEntityCastShadow(light, player.x, player.y + 32, 22, 62, 0.44);
    }

    // 4. Cast directional shadows for every active visible Enemy & Boss,
    //    AND project real-time shadow shading onto enemies inside pillar shadow cones
    const bossActive = Boolean(boss && boss.active);
    const bossX = bossActive ? boss!.x : 0;
    const bossY = bossActive ? boss!.y : 0;
    const bossShadowR = bossActive ? 52 : 0;

    const maxShadowsPerEnemy = isLowQuality ? 1 : 2;
    const margin = 90;

    for (let ei = 0; ei < enemies.length; ei++) {
      const enemy = enemies[ei];
      if (!enemy.active) continue;
      if (
        enemy.x < camX - margin ||
        enemy.x > camX + viewW + margin ||
        enemy.y < camY - margin ||
        enemy.y > camY + viewH + margin
      ) {
        continue;
      }

      const edata = enemy.getData('data') as
        | {
            type: 'wisp' | 'imp' | 'spitter' | 'brute' | 'boss';
            isElite?: boolean;
            shadowShade?: number;
          }
        | undefined;
      if (!edata) continue;

      const isBoss = edata.type === 'boss';
      const footOffset =
        isBoss
          ? 64
          : edata.type === 'brute'
            ? 34
            : edata.type === 'spitter'
              ? 30
              : edata.type === 'imp'
                ? 22
                : 14;
      const shadowWidth =
        isBoss
          ? 74
          : edata.type === 'brute'
            ? 38
            : edata.type === 'spitter'
              ? 24
              : edata.type === 'imp'
                ? 26
                : 16;
      const baseShadowLen = isBoss ? 145 : edata.type === 'brute' ? 84 : 56;
      const scaleFactor = enemy.scaleX / (isBoss ? 0.95 : edata.type === 'brute' ? 0.52 : 0.4);
      const footX = enemy.x;
      const footY = enemy.y + footOffset;

      // Ground contact shadow beneath feet
      this.groundShadowGraphics.fillStyle(0x04060c, isBoss ? 0.46 : 0.32);
      this.groundShadowGraphics.fillEllipse(
        footX,
        footY,
        shadowWidth * 1.45 * Math.min(1.5, scaleFactor),
        shadowWidth * 0.56
      );

      // Find up to 2 strongest lights illuminating this enemy & compute directional shadow + occlusion
      let bestIdx1 = -1;
      let bestScore1 = 0;
      let bestIdx2 = -1;
      let bestScore2 = 0;

      // Track total direct illumination vs occluded illumination so pillars cast shadows onto enemies
      let bestUnoccludedLit = 0;
      let bestActualLit = 0;

      for (let li = 0; li < lCount; li++) {
        const light = this.shadowLights[li];
        const dx = enemy.x - light.x;
        const dy = enemy.y - light.y;
        const dSq = dx * dx + dy * dy;
        const rSq = light.radius * light.radius;
        if (dSq >= rSq) continue;

        const dist = Math.sqrt(dSq);
        const falloff = Math.max(0, 1 - dist / light.radius);
        const rawScore = falloff * light.strength;

        const occ = computePointShadowOcclusion(
          light.x,
          light.y,
          enemy.x,
          enemy.y,
          this.activePillarData,
          this.activePillarCount,
          isBoss ? undefined : bossX,
          isBoss ? undefined : bossY,
          isBoss ? 0 : bossShadowR
        );
        const effectiveLit = rawScore * (1 - occ * 0.85);

        if (rawScore > bestUnoccludedLit) bestUnoccludedLit = rawScore;
        if (effectiveLit > bestActualLit) bestActualLit = effectiveLit;

        if (effectiveLit > bestScore1) {
          bestScore2 = bestScore1;
          bestIdx2 = bestIdx1;
          bestScore1 = effectiveLit;
          bestIdx1 = li;
        } else if (effectiveLit > bestScore2) {
          bestScore2 = effectiveLit;
          bestIdx2 = li;
        }
      }

      if (bestIdx1 !== -1) {
        this.drawEntityCastShadow(
          this.shadowLights[bestIdx1],
          footX,
          footY,
          shadowWidth * Math.min(1.4, scaleFactor),
          baseShadowLen * Math.min(1.4, scaleFactor),
          0.46 * bestScore1 + 0.12
        );
      }
      if (maxShadowsPerEnemy > 1 && bestIdx2 !== -1 && bestScore2 > 0.1) {
        this.drawEntityCastShadow(
          this.shadowLights[bestIdx2],
          footX,
          footY,
          shadowWidth * Math.min(1.4, scaleFactor) * 0.9,
          baseShadowLen * Math.min(1.4, scaleFactor) * 0.9,
          0.34 * bestScore2 + 0.08
        );
      }

      // Compute how deeply this enemy is cast inside an occluder shadow while within light range
      let shadeFactor = 0;
      if (bestUnoccludedLit > 0.08) {
        shadeFactor = Math.max(0, Math.min(1, 1 - bestActualLit / bestUnoccludedLit));
      }
      edata.shadowShade = shadeFactor;

      // Render a crisp cast-shadow band over the enemy sprite when caught in a pillar/boss shadow
      if (!isLowQuality && shadeFactor > 0.25 && enemy.alpha > 0.22) {
        const bandAlpha = Math.min(0.45, shadeFactor * 0.52 * enemy.alpha);
        this.entityShadowOverlayGraphics.fillStyle(0x05070e, bandAlpha);
        this.entityShadowOverlayGraphics.fillEllipse(
          enemy.x,
          enemy.y + footOffset * 0.2,
          shadowWidth * 1.45,
          footOffset * 1.35
        );
      }
    }
  }

  private drawOccluderShadowWedge(
    light: ShadowLightInput,
    ox: number,
    oy: number,
    occluderRadius: number,
    maxShadowLength: number,
    singlePass: boolean
  ) {
    const dx = ox - light.x;
    const dy = oy - light.y;
    const distSq = dx * dx + dy * dy;
    const reachLimit = light.radius + occluderRadius;
    if (distSq >= reachLimit * reachLimit || distSq <= (occluderRadius + 2) * (occluderRadius + 2)) {
      return;
    }

    const dist = Math.sqrt(distSq);
    const baseAngle = Math.atan2(dy, dx);
    const sinTheta = Math.min(0.92, occluderRadius / dist);
    const halfSpread = Math.asin(sinTheta);

    const falloff = Math.max(0.08, 1 - dist / reachLimit);
    const shadowLen = Math.min(maxShadowLength, Math.max(48, (light.radius - dist) * 0.92 + 44));
    const umbraAlpha = Math.min(0.54, (0.24 + 0.3 * falloff) * light.strength);

    const a1 = baseAngle - halfSpread;
    const a2 = baseAngle + halfSpread;
    const perp1 = baseAngle - Math.PI * 0.5;
    const perp2 = baseAngle + Math.PI * 0.5;

    const n1x = ox + Math.cos(perp1) * occluderRadius;
    const n1y = oy + Math.sin(perp1) * occluderRadius;
    const n2x = ox + Math.cos(perp2) * occluderRadius;
    const n2y = oy + Math.sin(perp2) * occluderRadius;

    const f1x = n1x + Math.cos(a1) * shadowLen;
    const f1y = n1y + Math.sin(a1) * shadowLen;
    const f2x = n2x + Math.cos(a2) * shadowLen;
    const f2y = n2y + Math.sin(a2) * shadowLen;

    if (!singlePass) {
      // Soft outer penumbra
      const penSpread = halfSpread + 0.14;
      const p1x = n1x + Math.cos(baseAngle - penSpread) * (shadowLen * 1.08);
      const p1y = n1y + Math.sin(baseAngle - penSpread) * (shadowLen * 1.08);
      const p2x = n2x + Math.cos(baseAngle + penSpread) * (shadowLen * 1.08);
      const p2y = n2y + Math.sin(baseAngle + penSpread) * (shadowLen * 1.08);

      this.groundShadowGraphics.fillStyle(0x03050b, umbraAlpha * 0.44);
      this.groundShadowGraphics.beginPath();
      this.groundShadowGraphics.moveTo(n1x, n1y);
      this.groundShadowGraphics.lineTo(p1x, p1y);
      this.groundShadowGraphics.lineTo(p2x, p2y);
      this.groundShadowGraphics.lineTo(n2x, n2y);
      this.groundShadowGraphics.closePath();
      this.groundShadowGraphics.fillPath();
    }

    // Crisp inner umbra wedge
    this.groundShadowGraphics.fillStyle(0x03050b, umbraAlpha);
    this.groundShadowGraphics.beginPath();
    this.groundShadowGraphics.moveTo(n1x, n1y);
    this.groundShadowGraphics.lineTo(f1x, f1y);
    this.groundShadowGraphics.lineTo(f2x, f2y);
    this.groundShadowGraphics.lineTo(n2x, n2y);
    this.groundShadowGraphics.closePath();
    this.groundShadowGraphics.fillPath();
  }

  private drawEntityCastShadow(
    light: ShadowLightInput,
    footX: number,
    footY: number,
    baseWidth: number,
    maxLength: number,
    alpha: number
  ) {
    const dx = footX - light.x;
    const dy = footY - light.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < 9 || distSq >= light.radius * light.radius) return;

    const dist = Math.sqrt(distSq);
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Shadow stretches longer as entity moves outward from the light source
    const distRatio = Math.min(1, dist / light.radius);
    const length = maxLength * (0.42 + 0.78 * distRatio);
    const clampedAlpha = Math.min(0.5, alpha * (1 - distRatio * 0.62));
    if (clampedAlpha <= 0.03) return;

    const perpX = -dirY;
    const perpY = dirX;
    const halfBase = baseWidth * 0.5;
    const halfTip = baseWidth * 0.22;

    const tipX = footX + dirX * length;
    const tipY = footY + dirY * length;

    this.groundShadowGraphics.fillStyle(0x03050b, clampedAlpha);
    this.groundShadowGraphics.beginPath();
    this.groundShadowGraphics.moveTo(footX + perpX * halfBase, footY + perpY * halfBase);
    this.groundShadowGraphics.lineTo(tipX + perpX * halfTip, tipY + perpY * halfTip);
    this.groundShadowGraphics.lineTo(tipX - perpX * halfTip, tipY - perpY * halfTip);
    this.groundShadowGraphics.lineTo(footX - perpX * halfBase, footY - perpY * halfBase);
    this.groundShadowGraphics.closePath();
    this.groundShadowGraphics.fillPath();

    // Rounded shadow cap at far end
    this.groundShadowGraphics.fillCircle(tipX, tipY, halfTip);
  }

  public destroy() {
    this.groundShadowGraphics?.destroy();
    this.entityShadowOverlayGraphics?.destroy();
    for (let i = 0; i < this.torchPool.length; i++) {
      this.torchPool[i].brazier.destroy();
      this.torchPool[i].flame.destroy();
      this.torchPool[i].groundGlow.destroy();
    }
    for (let i = 0; i < this.pillarPool.length; i++) {
      this.pillarPool[i].sprite.destroy();
    }
    this.torchPool = [];
    this.pillarPool = [];
  }
}
