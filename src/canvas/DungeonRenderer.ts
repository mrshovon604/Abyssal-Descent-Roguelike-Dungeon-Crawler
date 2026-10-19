/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DungeonFloor, Enemy, FloatingText, Particle, Player, Tile } from '../types/game';

export class DungeonRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public tileSize: number = 44;
  public cameraX: number = 0;
  public cameraY: number = 0;
  public targetCameraX: number = 0;
  public targetCameraY: number = 0;

  public screenShake: number = 0;
  public hitFlashTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
  }

  public triggerShake(amount: number = 8) {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  public triggerHitFlash() {
    this.hitFlashTimer = 0.08;
  }

  public render(
    dt: number,
    floor: DungeonFloor,
    player: Player,
    floatingTexts: FloatingText[],
    particles: Particle[],
    hoveredTile: { x: number; y: number } | null,
    validTargetTiles: { x: number; y: number }[] | null
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
    this.targetCameraX = player.x * this.tileSize + this.tileSize / 2 - width / 2;
    this.targetCameraY = player.y * this.tileSize + this.tileSize / 2 - height / 2;

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

    // 1. Render Map Tiles
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tile = floor.tiles[ty][tx];
        if (!tile.explored) continue; // Unexplored stays black

        const screenX = tx * this.tileSize;
        const screenY = ty * this.tileSize;

        ctx.save();
        // Fog of war alpha: visible = 1.0, explored = 0.28
        ctx.globalAlpha = tile.visible ? 1.0 : 0.28;

        this.drawTile(tile, screenX, screenY, floor.theme, now);

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

    // 2. Render Torchlight Radial Glow on Visible Area around player
    const playerScreenX = player.x * this.tileSize + this.tileSize / 2;
    const playerScreenY = player.y * this.tileSize + this.tileSize / 2;

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

      this.drawEnemy(enemy, now);
    });

    // 4. Render Player
    this.drawPlayer(player, now);

    // 5. Render Particle System
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * this.tileSize + this.tileSize / 2, p.y * this.tileSize + this.tileSize / 2, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 6. Render Floating Text
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
    } else {
      // Floor base
      const isAlt = (tile.x + tile.y) % 2 === 0;
      ctx.fillStyle = isAlt ? theme.floorAltColor : theme.floorColor;
      ctx.fillRect(sx, sy, tileSize, tileSize);

      // Flagstone borders
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, tileSize, tileSize);

      // Special tile decorations
      if (tile.type === 'stairs_down') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(sx + tileSize / 2, sy + tileSize / 2, tileSize * 0.38, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing portal ring
        const pulse = Math.sin(now * 4) * 0.15 + 0.85;
        ctx.strokeStyle = theme.accentColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sx + tileSize / 2, sy + tileSize / 2, tileSize * 0.32 * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌀', sx + tileSize / 2, sy + tileSize / 2);
      } else if (tile.type === 'stairs_up') {
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚪', sx + tileSize / 2, sy + tileSize / 2);
      } else if (tile.type === 'chest') {
        const isOpened = tile.chest?.opened;
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isOpened ? '📦' : '🧰', sx + tileSize / 2, sy + tileSize / 2);

        if (!isOpened) {
          // Chest shine
          ctx.strokeStyle = tile.chest?.rarity === 'epic' ? '#c084fc' : '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx + tileSize / 2, sy + tileSize / 2, tileSize * 0.38, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (tile.type === 'shrine') {
        const isUsed = tile.shrine?.used;
        ctx.font = '20px serif';
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
          ctx.font = '16px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tile.type === 'trap_spike' ? '⚙️' : '☣️', sx + tileSize / 2, sy + tileSize / 2);
        }
      }
    }
  }

  private drawPlayer(player: Player, now: number) {
    const { ctx, tileSize } = this;
    const px = player.x * tileSize + tileSize / 2;
    const py = player.y * tileSize + tileSize / 2;

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
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛡️', px, py + bob);

    // Weapon overlay
    const weaponIcon = player.equipment.weapon?.icon || '⚔️';
    ctx.font = '12px serif';
    ctx.fillText(weaponIcon, px + (player.facing === 'left' ? -14 : 14), py + bob - 6);

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

  private drawEnemy(enemy: Enemy, now: number) {
    const { ctx, tileSize } = this;
    const ex = enemy.x * tileSize + tileSize / 2;
    const ey = enemy.y * tileSize + tileSize / 2;

    const bob = Math.sin(now * 3 + enemy.x) * 2;

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(ex, ey + tileSize * 0.32, tileSize * 0.3, tileSize * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Monster circle badge
    ctx.fillStyle = enemy.isBoss ? '#450a0a' : '#1c1917';
    ctx.strokeStyle = enemy.isBoss ? '#ef4444' : enemy.color;
    ctx.lineWidth = enemy.isBoss ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(ex, ey + bob, tileSize * (enemy.isBoss ? 0.42 : 0.34), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Symbol/Icon
    ctx.font = enemy.isBoss ? '22px serif' : '18px serif';
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
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(ex - 16, intentY - 14, 32, 14, 3);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(enemy.intent.type === 'ranged_attack' ? `🎯${enemy.intent.value}` : `⚔️${enemy.intent.value}`, ex, intentY - 4);
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
