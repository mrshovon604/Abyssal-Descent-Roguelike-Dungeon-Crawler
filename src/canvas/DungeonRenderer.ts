/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DungeonFloor,
  Enemy,
  FloatingText,
  Particle,
  Player,
  ProjectileEffect,
  SlashEffect,
  Tile,
} from '../types/game';
import { soundEngine } from '../audio/soundEngine';

export class DungeonRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public tileSize: number = 46;
  public cameraX: number = 0;
  public cameraY: number = 0;
  public targetCameraX: number = 0;
  public targetCameraY: number = 0;

  public screenShake: number = 0;
  public hitFlashTimer: number = 0;

  // Smooth movement animation state
  private playerRenderX: number = -1;
  private playerRenderY: number = -1;
  private enemyRenderPositions: Map<string, { rx: number; ry: number }> = new Map();
  private readonly MOVE_LERP_SPEED = 14; // tiles per second interpolation speed

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
  }

  public setTileSize(newSize: number) {
    this.tileSize = Math.max(28, Math.min(68, Math.round(newSize)));
  }

  public triggerShake(amount: number = 8) {
    if (!soundEngine.getSettings().screenShake) return;
    this.screenShake = Math.max(this.screenShake, amount);
  }

  /** Call when changing floors or teleporting so positions snap instantly. */
  public resetPositions() {
    this.playerRenderX = -1;
    this.playerRenderY = -1;
    this.enemyRenderPositions.clear();
  }

  public triggerHitFlash() {
    if (!soundEngine.getSettings().screenShake) return;
    this.hitFlashTimer = 0.08;
  }

  public render(
    dt: number,
    floor: DungeonFloor,
    player: Player,
    floatingTexts: FloatingText[],
    particles: Particle[],
    hoveredTile: { x: number; y: number } | null,
    validTargetTiles: { x: number; y: number }[] | null,
    slashes: SlashEffect[] = [],
    projectiles: ProjectileEffect[] = []
  ) {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;

    // Update screen shake decay
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }

    // Camera smoothly lerps to center on player
    // Update smooth render positions
    if (this.playerRenderX < 0) {
      this.playerRenderX = player.x;
      this.playerRenderY = player.y;
    } else {
      const lerpFactor = Math.min(1, dt * this.MOVE_LERP_SPEED);
      this.playerRenderX += (player.x - this.playerRenderX) * lerpFactor;
      this.playerRenderY += (player.y - this.playerRenderY) * lerpFactor;
      // Snap when very close
      if (Math.abs(player.x - this.playerRenderX) < 0.01) this.playerRenderX = player.x;
      if (Math.abs(player.y - this.playerRenderY) < 0.01) this.playerRenderY = player.y;
    }

    // Update enemy smooth render positions
    const seenEnemyIds = new Set<string>();
    floor.enemies.forEach(enemy => {
      seenEnemyIds.add(enemy.id);
      const existing = this.enemyRenderPositions.get(enemy.id);
      if (!existing) {
        this.enemyRenderPositions.set(enemy.id, { rx: enemy.x, ry: enemy.y });
      } else {
        const lf = Math.min(1, dt * this.MOVE_LERP_SPEED);
        existing.rx += (enemy.x - existing.rx) * lf;
        existing.ry += (enemy.y - existing.ry) * lf;
        if (Math.abs(enemy.x - existing.rx) < 0.01) existing.rx = enemy.x;
        if (Math.abs(enemy.y - existing.ry) < 0.01) existing.ry = enemy.y;
      }
    });
    // Clean up dead enemies
    for (const id of this.enemyRenderPositions.keys()) {
      if (!seenEnemyIds.has(id)) this.enemyRenderPositions.delete(id);
    }

    this.targetCameraX = this.playerRenderX * this.tileSize + this.tileSize / 2 - width / 2;
    this.targetCameraY = this.playerRenderY * this.tileSize + this.tileSize / 2 - height / 2;

    this.cameraX += (this.targetCameraX - this.cameraX) * Math.min(1, dt * 10);
    this.cameraY += (this.targetCameraY - this.cameraY) * Math.min(1, dt * 10);

    // Clear background
    ctx.fillStyle = '#09080b';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(-Math.round(this.cameraX + shakeX), -Math.round(this.cameraY + shakeY));

    // Visible bounds calculation to cull offscreen tiles
    const minTileX = Math.max(0, Math.floor((this.cameraX - 100) / this.tileSize));
    const maxTileX = Math.min(floor.width - 1, Math.ceil((this.cameraX + width + 100) / this.tileSize));
    const minTileY = Math.max(0, Math.floor((this.cameraY - 100) / this.tileSize));
    const maxTileY = Math.min(floor.height - 1, Math.ceil((this.cameraY + height + 100) / this.tileSize));

    const now = performance.now() * 0.002;
    const torchPositions: { x: number; y: number }[] = [];

    // 1. Render Map Tiles & Decals
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tile = floor.tiles[ty][tx];
        if (!tile.explored) continue;

        const screenX = tx * this.tileSize;
        const screenY = ty * this.tileSize;

        ctx.save();
        ctx.globalAlpha = tile.visible ? 1.0 : 0.28;

        this.drawTile(tile, screenX, screenY, floor.theme, now);

        if (tile.visible && tile.hasTorch) {
          torchPositions.push({
            x: screenX + this.tileSize / 2,
            y: screenY + this.tileSize * 0.65,
          });
        }

        // Targeted skill overlay highlight
        if (validTargetTiles && validTargetTiles.some(t => t.x === tx && t.y === ty)) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.fillRect(screenX + 2, screenY + 2, this.tileSize - 4, this.tileSize - 4);
          ctx.strokeRect(screenX + 2, screenY + 2, this.tileSize - 4, this.tileSize - 4);
        }

        // Hover tile indicator
        if (hoveredTile && hoveredTile.x === tx && hoveredTile.y === ty && tile.visible) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(screenX + 1, screenY + 1, this.tileSize - 2, this.tileSize - 2);
        }

        ctx.restore();
      }
    }

    // 1.5 Render Boss AoE Slam Warning Telegraphs on Floor
    floor.enemies.forEach(enemy => {
      if (enemy.intent?.type === 'aoe_slam' && enemy.intent.aoeTiles) {
        const pulse = Math.sin(now * 8) * 0.2 + 0.45;
        enemy.intent.aoeTiles.forEach(t => {
          if (!floor.tiles[t.y]?.[t.x]?.visible) return;
          const sx = t.x * this.tileSize;
          const sy = t.y * this.tileSize;
          ctx.save();
          ctx.fillStyle = `rgba(244, 63, 94, ${pulse})`;
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.fillRect(sx + 2, sy + 2, this.tileSize - 4, this.tileSize - 4);
          ctx.strokeRect(sx + 2, sy + 2, this.tileSize - 4, this.tileSize - 4);
          ctx.font = `${Math.round(this.tileSize * 0.35)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚠️', sx + this.tileSize / 2, sy + this.tileSize / 2);
          ctx.restore();
        });
      }
    });

    // 2. Render Dynamic Wall Torch Flicker Pools
    torchPositions.forEach((tp, idx) => {
      const f = Math.sin(now * 5 + idx) * 5 + Math.cos(now * 3.5 + idx) * 3;
      const r = this.tileSize * 2.2 + f;
      const g = ctx.createRadialGradient(tp.x, tp.y, 4, tp.x, tp.y, r);
      g.addColorStop(0, 'rgba(251, 146, 60, 0.22)');
      g.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2.5 Render Torchlight Radial Glow around player
    const playerScreenX = this.playerRenderX * this.tileSize + this.tileSize / 2;
    const playerScreenY = this.playerRenderY * this.tileSize + this.tileSize / 2;

    const flicker = Math.sin(now * 3) * 6 + Math.cos(now * 5) * 4;
    const torchRadius = Math.max(120, player.visionRange * this.tileSize * 0.85 + flicker);

    const torchGrad = ctx.createRadialGradient(
      playerScreenX, playerScreenY, 10,
      playerScreenX, playerScreenY, torchRadius
    );
    torchGrad.addColorStop(0, 'rgba(251, 191, 36, 0.18)');
    torchGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
    torchGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = torchGrad;
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, torchRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Render Enemies (only if visible)
    floor.enemies.forEach(enemy => {
      const tile = floor.tiles[enemy.y]?.[enemy.x];
      if (!tile || !tile.visible) return;
      const rp = this.enemyRenderPositions.get(enemy.id);
      const erx = rp ? rp.rx : enemy.x;
      const ery = rp ? rp.ry : enemy.y;
      this.drawEnemy(enemy, now, erx, ery);
    });

    // 4. Render Player
    this.drawPlayer(player, now, this.playerRenderX, this.playerRenderY);

    // 5. Render Weapon Slash Arcs
    slashes.forEach(slash => {
      const progress = 1 - slash.life / slash.maxLife;
      const sx = slash.x * this.tileSize + this.tileSize / 2;
      const sy = slash.y * this.tileSize + this.tileSize / 2;
      const r = this.tileSize * 0.55;

      ctx.save();
      ctx.globalAlpha = Math.max(0, slash.life / slash.maxLife);
      ctx.strokeStyle = slash.color;
      ctx.lineWidth = Math.max(3, this.tileSize * 0.12 * (slash.life / slash.maxLife));
      ctx.lineCap = 'round';
      ctx.shadowColor = slash.color;
      ctx.shadowBlur = 10;

      const startAngle = slash.angle - 1.1 + progress * 0.6;
      const endAngle = slash.angle - 0.2 + progress * 1.4;
      ctx.beginPath();
      ctx.arc(sx, sy, r, startAngle, endAngle);
      ctx.stroke();
      ctx.restore();
    });

    // 6. Render Spell Projectiles & Rings
    projectiles.forEach(proj => {
      const progress = 1 - proj.life / proj.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, (proj.life / proj.maxLife) * 1.5));

      if (proj.type === 'frost_ring' || proj.type === 'meteor') {
        const cx = proj.targetX * this.tileSize + this.tileSize / 2;
        const cy = proj.targetY * this.tileSize + this.tileSize / 2;
        const maxR = (proj.radius || 2) * this.tileSize;
        const curR = proj.type === 'frost_ring' ? maxR * progress : maxR * (0.3 + progress * 0.7);

        ctx.strokeStyle = proj.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(cx, cy, curR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = proj.type === 'meteor' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.2)';
        ctx.fill();
      } else {
        const curX = (proj.startX + (proj.targetX - proj.startX) * progress) * this.tileSize + this.tileSize / 2;
        const curY = (proj.startY + (proj.targetY - proj.startY) * progress) * this.tileSize + this.tileSize / 2;
        const prevX = (proj.startX + (proj.targetX - proj.startX) * Math.max(0, progress - 0.25)) * this.tileSize + this.tileSize / 2;
        const prevY = (proj.startY + (proj.targetY - proj.startY) * Math.max(0, progress - 0.25)) * this.tileSize + this.tileSize / 2;

        // Trail
        ctx.strokeStyle = proj.color;
        ctx.lineWidth = proj.type === 'arrow' ? 2.5 : 5;
        ctx.lineCap = 'round';
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        // Projectile head
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(curX, curY, proj.type === 'arrow' ? 3 : 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // 7. Render Particle System
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * this.tileSize + this.tileSize / 2, p.y * this.tileSize + this.tileSize / 2, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 8. Render Floating Text
    floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = ft.opacity;
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillStyle = ft.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';

      const tx = ft.x * this.tileSize + this.tileSize / 2;
      const ty = ft.y * this.tileSize;

      ctx.strokeText(ft.text, tx, ty);
      ctx.fillText(ft.text, tx, ty);
      ctx.restore();
    });

    ctx.restore();

    // Fullscreen hit flash overlay
    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = `rgba(239, 68, 68, ${this.hitFlashTimer * 3})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private drawTile(tile: Tile, sx: number, sy: number, theme: DungeonFloor['theme'], now: number) {
    const { ctx, tileSize } = this;

    if (tile.type === 'wall') {
      // Wall Top
      ctx.fillStyle = theme.wallTopColor;
      ctx.fillRect(sx, sy, tileSize, tileSize * 0.7);

      // Wall Face (Depth)
      ctx.fillStyle = theme.wallColor;
      ctx.fillRect(sx, sy + tileSize * 0.7, tileSize, tileSize * 0.3);

      // Subtle brick hairline
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, tileSize, tileSize);

      // Wall Torch Sconce
      if (tile.hasTorch) {
        const flicker = Math.sin(now * 8 + tile.x) * 1.5;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx + tileSize * 0.45, sy + tileSize * 0.55, tileSize * 0.1, tileSize * 0.22);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(sx + tileSize / 2, sy + tileSize * 0.5 + flicker * 0.3, tileSize * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(sx + tileSize / 2, sy + tileSize * 0.5 + flicker * 0.3, tileSize * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Floor base
      const isAlt = (tile.x + tile.y) % 2 === 0;
      ctx.fillStyle = isAlt ? theme.floorAltColor : theme.floorColor;
      ctx.fillRect(sx, sy, tileSize, tileSize);

      // Flagstone borders
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, tileSize, tileSize);

      // Floor Decals (blood, scorch, moss, bones, cracks)
      if (tile.decal) {
        this.drawDecal(tile.decal, sx, sy, tileSize);
      }

      // Special tile decorations
      if (tile.type === 'stairs_down') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(sx + tileSize / 2, sy + tileSize / 2, tileSize * 0.38, 0, Math.PI * 2);
        ctx.fill();

        const pulse = Math.sin(now * 4) * 0.15 + 0.85;
        ctx.strokeStyle = theme.accentColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sx + tileSize / 2, sy + tileSize / 2, tileSize * 0.32 * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = `${Math.round(tileSize * 0.42)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌀', sx + tileSize / 2, sy + tileSize / 2);
      } else if (tile.type === 'stairs_up') {
        ctx.font = `${Math.round(tileSize * 0.42)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚪', sx + tileSize / 2, sy + tileSize / 2);
      } else if (tile.type === 'merchant') {
        const glow = Math.sin(now * 3) * 0.15 + 0.85;
        ctx.fillStyle = `rgba(16, 185, 129, ${0.22 * glow})`;
        ctx.beginPath();
        ctx.arc(sx + tileSize / 2, sy + tileSize / 2, tileSize * 0.44, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = `${Math.round(tileSize * 0.45)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚖️', sx + tileSize / 2, sy + tileSize / 2);
      } else if (tile.type === 'chest') {
        const isOpened = tile.chest?.opened;
        ctx.font = `${Math.round(tileSize * 0.45)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isOpened ? '📦' : '🧰', sx + tileSize / 2, sy + tileSize / 2);

        if (!isOpened) {
          ctx.strokeStyle = tile.chest?.rarity === 'epic' ? '#c084fc' : '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx + tileSize / 2, sy + tileSize / 2, tileSize * 0.38, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (tile.type === 'shrine') {
        const isUsed = tile.shrine?.used;
        ctx.font = `${Math.round(tileSize * 0.45)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isUsed ? '🏛️' : '✨', sx + tileSize / 2, sy + tileSize / 2);

        if (!isUsed) {
          const glow = Math.sin(now * 3) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(56, 189, 248, ${0.2 * glow})`;
          ctx.beginPath();
          ctx.arc(sx + tileSize / 2, sy + tileSize / 2, tileSize * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tile.type === 'trap_spike' || tile.type === 'trap_poison') {
        if (tile.trap?.revealed || tile.trap?.triggered) {
          ctx.font = `${Math.round(tileSize * 0.38)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tile.type === 'trap_spike' ? '⚙️' : '☣️', sx + tileSize / 2, sy + tileSize / 2);
        }
      }
    }
  }

  private drawDecal(decal: NonNullable<Tile['decal']>, sx: number, sy: number, tileSize: number) {
    const { ctx } = this;
    ctx.save();
    if (decal === 'blood') {
      ctx.fillStyle = 'rgba(185, 28, 28, 0.45)';
      ctx.beginPath();
      ctx.arc(sx + tileSize * 0.42, sy + tileSize * 0.55, tileSize * 0.18, 0, Math.PI * 2);
      ctx.arc(sx + tileSize * 0.62, sy + tileSize * 0.42, tileSize * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (decal === 'scorch') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.beginPath();
      ctx.arc(sx + tileSize * 0.5, sy + tileSize * 0.5, tileSize * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (decal === 'moss') {
      ctx.fillStyle = 'rgba(22, 101, 52, 0.35)';
      ctx.beginPath();
      ctx.arc(sx + tileSize * 0.25, sy + tileSize * 0.25, tileSize * 0.14, 0, Math.PI * 2);
      ctx.arc(sx + tileSize * 0.75, sy + tileSize * 0.72, tileSize * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (decal === 'cracks') {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + tileSize * 0.25, sy + tileSize * 0.3);
      ctx.lineTo(sx + tileSize * 0.52, sy + tileSize * 0.55);
      ctx.lineTo(sx + tileSize * 0.7, sy + tileSize * 0.45);
      ctx.stroke();
    } else if (decal === 'bones') {
      ctx.fillStyle = 'rgba(214, 211, 209, 0.3)';
      ctx.fillRect(sx + tileSize * 0.35, sy + tileSize * 0.6, tileSize * 0.28, 2);
      ctx.fillRect(sx + tileSize * 0.45, sy + tileSize * 0.52, 2, tileSize * 0.22);
    }
    ctx.restore();
  }

  private drawPlayer(player: Player, now: number, renderX: number, renderY: number) {
    const { ctx, tileSize } = this;
    const px = renderX * tileSize + tileSize / 2;
    const py = renderY * tileSize + tileSize / 2;

    const isInvisible = player.statusEffects.some(s => s.type === 'invisibility');
    const bob = Math.sin(now * 4) * 2;

    ctx.save();
    if (isInvisible) {
      ctx.globalAlpha = 0.45;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(px, py + tileSize * 0.32, tileSize * 0.32, tileSize * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player Hero Avatar Ring
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py + bob, tileSize * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Facing direction indicator or icon
    ctx.font = `${Math.round(tileSize * 0.44)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛡️', px, py + bob);

    // Weapon overlay
    const weaponIcon = player.equipment.weapon?.icon || '⚔️';
    ctx.font = `${Math.round(tileSize * 0.28)}px serif`;
    ctx.fillText(weaponIcon, px + (player.facing === 'left' ? -tileSize * 0.3 : tileSize * 0.3), py + bob - 5);

    // HP Bar above player
    const hpRatio = Math.max(0, player.stats.hp / player.stats.maxHp);
    const barW = tileSize * 0.8;
    const barH = 4;
    const barX = px - barW / 2;
    const barY = py - tileSize * 0.48;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = hpRatio > 0.4 ? '#22c55e' : '#ef4444';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.restore();
  }

  private drawEnemy(enemy: Enemy, now: number, renderX: number, renderY: number) {
    const { ctx, tileSize } = this;
    const ex = renderX * tileSize + tileSize / 2;
    const ey = renderY * tileSize + tileSize / 2;

    const bob = Math.sin(now * 3 + enemy.x) * 2;

    ctx.save();

    // Boss Phase 2 Enraged Aura
    if (enemy.isBoss && enemy.phase === 2) {
      const auraPulse = Math.sin(now * 8) * 0.12 + 0.5;
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
      ctx.beginPath();
      ctx.arc(ex, ey + bob, tileSize * auraPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(ex, ey + tileSize * 0.32, tileSize * 0.3, tileSize * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Monster circle badge
    ctx.fillStyle = enemy.isBoss ? '#450a0a' : '#1c1917';
    ctx.strokeStyle = enemy.isBoss ? (enemy.phase === 2 ? '#fbbf24' : '#ef4444') : enemy.color;
    ctx.lineWidth = enemy.isBoss ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(ex, ey + bob, tileSize * (enemy.isBoss ? 0.42 : 0.34), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Symbol/Icon
    ctx.font = `${Math.round(tileSize * (enemy.isBoss ? 0.5 : 0.4))}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(enemy.symbol, ex, ey + bob);

    // Status effect icons
    if (enemy.statusEffects.length > 0) {
      const statusIcons = enemy.statusEffects.map(s => {
        if (s.type === 'burn') return '🔥';
        if (s.type === 'poison') return '🧪';
        if (s.type === 'freeze') return '❄️';
        if (s.type === 'stun') return '💫';
        return '✨';
      }).join('');
      ctx.font = '10px serif';
      ctx.fillText(statusIcons, ex, ey - tileSize * 0.6);
    }

    // Enemy Intent Telegraph
    if (enemy.intent) {
      ctx.save();
      const intentY = ey - tileSize * 0.48 + Math.sin(now * 6) * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeStyle = enemy.intent.type === 'aoe_slam' ? '#fbbf24' : '#f43f5e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(ex - 18, intentY - 14, 36, 14, 3);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = enemy.intent.type === 'aoe_slam' ? '#fde047' : '#fca5a5';
      const label =
        enemy.intent.type === 'aoe_slam'
          ? `💥${enemy.intent.value}`
          : enemy.intent.type === 'ranged_attack'
          ? `🎯${enemy.intent.value}`
          : `⚔️${enemy.intent.value}`;
      ctx.fillText(label, ex, intentY - 4);
      ctx.restore();
    }

    // Health bar
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
    const barW = tileSize * (enemy.isBoss ? 0.9 : 0.7);
    const barH = enemy.isBoss ? 5 : 3.5;
    const barX = ex - barW / 2;
    const barY = ey + tileSize * 0.36;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = enemy.isBoss ? '#f43f5e' : (hpRatio > 0.4 ? '#ef4444' : '#b91c1c');
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.restore();
  }

  public screenToTile(screenX: number, screenY: number): { x: number; y: number } {
    const worldX = screenX + this.cameraX;
    const worldY = screenY + this.cameraY;
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize),
    };
  }
}
