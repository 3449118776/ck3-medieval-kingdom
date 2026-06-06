// ==================== 地图渲染器 ====================

import type { MapViewport, MapCell, County } from '../types';
import { MapSystem } from '../core/MapSystem';
import { GameEngine } from '../core/GameEngine';
import { MAP_COLS, MAP_ROWS, CELL_SIZE, CACHE_SCALE } from '../utils/constants';
import { NoiseGenerator } from '../utils/noise';

export class MapRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private viewport: MapViewport = { x: 0, y: 0, zoom: 1, minZoom: 0.3, maxZoom: 4 };
  private dragState = { isDragging: false, lastX: 0, lastY: 0, startX: 0, startY: 0 };
  private touchState = { active: false, lastX: 0, lastY: 0, startX: 0, startY: 0, lastDist: 0, startTime: 0, isPinch: false, isTap: false, lastTap: null as number | null };
  private noise = new NoiseGenerator();
  private engine: GameEngine;
  private resizeHandler: (() => void) | null = null;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  init(container: HTMLElement): void {
    this.canvas = document.getElementById('map-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // 设置初始视角到玩家领地
    const player = this.engine.world?.getPlayer();
    const mapSystem = this.engine.mapSystem;
    if (player && mapSystem && player.domain_titles.length > 0) {
      const center = mapSystem.findCountyCenter(player.domain_titles[0].id);
      if (center) {
        this.viewport.x = center.c * CELL_SIZE - this.canvas.width / 2;
        this.viewport.y = center.r * CELL_SIZE - this.canvas.height / 2;
      }
    }

    this.drawFrame();
    this.bindEvents();

    // 响应式调整
    this.resizeHandler = () => {
      this.resizeCanvas();
      this.drawFrame();
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  destroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.canvas) {
      this.canvas.onmousemove = null;
      this.canvas.onmouseleave = null;
      this.canvas.onmousedown = null;
      this.canvas.onmouseup = null;
      this.canvas.removeEventListener('wheel', this.handleWheel);
      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    }
    window.removeEventListener('mousemove', this.handleDragMove);
    if ((window as any)._mapMouseUpHandler) {
      window.removeEventListener('mouseup', (window as any)._mapMouseUpHandler);
    }
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;
    const container = this.canvas.parentElement;
    if (!container) return;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }

  private bindEvents(): void {
    if (!this.canvas) return;

    this.canvas.onmousemove = (e) => this.handleHover(e);
    this.canvas.onmouseleave = () => {
      const tip = document.getElementById('map-tooltip');
      if (tip) tip.style.display = 'none';
    };
    this.canvas.onmousedown = (e) => this.startDrag(e);
    this.canvas.onmouseup = (e) => this.endDrag(e);

    (window as any)._mapMouseUpHandler = (e: MouseEvent) => this.endDrag(e);
    window.addEventListener('mouseup', (window as any)._mapMouseUpHandler);
    window.addEventListener('mousemove', this.handleDragMove);

    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd);

    // 缩放按钮
    document.getElementById('map-zoom-in')?.addEventListener('click', () => this.zoom(1.3));
    document.getElementById('map-zoom-out')?.addEventListener('click', () => this.zoom(1 / 1.3));
    document.getElementById('map-reset')?.addEventListener('click', () => this.resetView());
  }

  private zoom(factor: number): void {
    if (!this.canvas) return;
    const newZoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, this.viewport.zoom * factor));
    if (newZoom === this.viewport.zoom) return;

    const W = this.canvas.width / 2;
    const H = this.canvas.height / 2;
    const ratio = newZoom / this.viewport.zoom;
    this.viewport.x = (W + this.viewport.x) * ratio - W;
    this.viewport.y = (H + this.viewport.y) * ratio - H;
    this.viewport.zoom = newZoom;
    this.clampViewport();
    this.drawFrame();
  }

  private resetView(): void {
    const player = this.engine.world?.getPlayer();
    const mapSystem = this.engine.mapSystem;
    if (player && mapSystem && player.domain_titles.length > 0) {
      const center = mapSystem.findCountyCenter(player.domain_titles[0].id);
      if (center && this.canvas) {
        this.viewport.zoom = 1;
        this.viewport.x = center.c * CELL_SIZE - this.canvas.width / 2;
        this.viewport.y = center.r * CELL_SIZE - this.canvas.height / 2;
      }
    }
    this.clampViewport();
    this.drawFrame();
  }

  private startDrag(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.dragState.isDragging = true;
    this.dragState.lastX = e.clientX;
    this.dragState.lastY = e.clientY;
    this.dragState.startX = e.clientX;
    this.dragState.startY = e.clientY;
    if (this.canvas) this.canvas.style.cursor = 'grabbing';
  }

  private endDrag(e: MouseEvent): void {
    this.dragState.isDragging = false;
    if (this.canvas) this.canvas.style.cursor = 'grab';
  }

  private handleDragMove = (e: MouseEvent): void => {
    if (!this.dragState.isDragging) return;
    const dx = e.clientX - this.dragState.lastX;
    const dy = e.clientY - this.dragState.lastY;
    this.dragState.lastX = e.clientX;
    this.dragState.lastY = e.clientY;
    this.viewport.x -= dx;
    this.viewport.y -= dy;
    this.clampViewport();
    this.drawFrame();
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.8 : 1.25;
    this.zoom(factor);
  };

  private handleHover(e: MouseEvent): void {
    const cell = this.screenToCell(e.clientX, e.clientY);
    const tip = document.getElementById('map-tooltip');
    if (!tip || !this.canvas) return;

    if (cell) {
      tip.style.display = 'block';
      const rect = this.canvas.getBoundingClientRect();
      tip.style.left = (e.clientX - rect.left + 15) + 'px';
      tip.style.top = (e.clientY - rect.top + 10) + 'px';

      const world = this.engine.world;
      const cty = cell.countyId ? world?.counties.get(cell.countyId) : null;
      tip.innerHTML = `
        <b>${cell.terrain}</b><br>
        海拔: ${(cell.elevation * 100).toFixed(0)}%<br>
        坐标: (${cell.col}, ${cell.row})
        ${cty ? `<br>领地: ${cty.name}` : ''}
      `;
    } else {
      tip.style.display = 'none';
    }
  }

  // 触摸事件
  private handleTouchStart = (e: TouchEvent): void => {
    const touches = e.touches;
    if (touches.length === 1) {
      e.preventDefault();
      this.touchState.active = true;
      this.touchState.lastX = touches[0].clientX;
      this.touchState.lastY = touches[0].clientY;
      this.touchState.startX = touches[0].clientX;
      this.touchState.startY = touches[0].clientY;
      this.touchState.startTime = Date.now();
      this.touchState.isPinch = false;
      this.touchState.isTap = true;
      this.dragState.isDragging = true;
      this.dragState.lastX = touches[0].clientX;
      this.dragState.lastY = touches[0].clientY;
    } else if (touches.length === 2) {
      e.preventDefault();
      this.touchState.active = true;
      this.touchState.isPinch = true;
      this.touchState.isTap = false;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      this.touchState.lastDist = Math.sqrt(dx * dx + dy * dy);
      this.touchState.lastX = (touches[0].clientX + touches[1].clientX) / 2;
      this.touchState.lastY = (touches[0].clientY + touches[1].clientY) / 2;
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.touchState.active) return;
    const touches = e.touches;

    if (touches.length === 1 && !this.touchState.isPinch) {
      e.preventDefault();
      const dx = touches[0].clientX - this.touchState.lastX;
      const dy = touches[0].clientY - this.touchState.lastY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.touchState.isTap = false;

      this.viewport.x -= dx;
      this.viewport.y -= dy;
      this.clampViewport();
      this.drawFrame();

      this.touchState.lastX = touches[0].clientX;
      this.touchState.lastY = touches[0].clientY;
    } else if (touches.length === 2) {
      e.preventDefault();
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const mx = (touches[0].clientX + touches[1].clientX) / 2;
      const my = (touches[0].clientY + touches[1].clientY) / 2;

      if (this.touchState.lastDist > 0) {
        const scale = dist / this.touchState.lastDist;
        if (this.canvas) {
          const rect = this.canvas.getBoundingClientRect();
          const mxLocal = mx - rect.left;
          const myLocal = my - rect.top;
          const newZoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, this.viewport.zoom * scale));
          const ratio = newZoom / this.viewport.zoom;
          this.viewport.x = (mxLocal + this.viewport.x) * ratio - mxLocal;
          this.viewport.y = (myLocal + this.viewport.y) * ratio - myLocal;
          this.viewport.zoom = newZoom;
          this.clampViewport();
          this.drawFrame();
        }
      }

      // 平移
      const panDx = mx - this.touchState.lastX;
      const panDy = my - this.touchState.lastY;
      this.viewport.x -= panDx;
      this.viewport.y -= panDy;
      this.clampViewport();
      this.drawFrame();

      this.touchState.lastDist = dist;
      this.touchState.lastX = mx;
      this.touchState.lastY = my;
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    const elapsed = Date.now() - this.touchState.startTime;
    if (this.touchState.isTap && elapsed < 300 && e.touches.length === 0) {
      const dist = Math.sqrt(
        Math.pow(this.touchState.startX - this.touchState.lastX, 2) +
        Math.pow(this.touchState.startY - this.touchState.lastY, 2)
      );
      if (dist < 10) {
        // 双击检测
        if (this.touchState.lastTap && Date.now() - this.touchState.lastTap < 400) {
          this.zoom(this.viewport.zoom >= 2 ? 0.5 : 2.5);
          this.touchState.lastTap = null;
        } else {
          this.touchState.lastTap = Date.now();
        }
      }
    }
    this.touchState.active = false;
    this.touchState.isPinch = false;
    this.dragState.isDragging = false;
  };

  private screenToCell(screenX: number, screenY: number): MapCell | null {
    if (!this.canvas) return null;
    const rect = this.canvas.getBoundingClientRect();
    const z = this.viewport.zoom;
    const cs = CELL_SIZE * z;
    const col = Math.floor((screenX - rect.left + this.viewport.x) / cs);
    const row = Math.floor((screenY - rect.top + this.viewport.y) / cs);

    const mapSystem = this.engine.mapSystem;
    if (!mapSystem) return null;
    return mapSystem.getCell(row, col);
  }

  private clampViewport(): void {
    if (!this.canvas) return;
    const mapW = MAP_COLS * CELL_SIZE * this.viewport.zoom;
    const mapH = MAP_ROWS * CELL_SIZE * this.viewport.zoom;
    const maxX = Math.max(0, mapW - this.canvas.width);
    const maxY = Math.max(0, mapH - this.canvas.height);
    this.viewport.x = Math.max(-this.canvas.width * 0.2, Math.min(maxX + this.canvas.width * 0.2, this.viewport.x));
    this.viewport.y = Math.max(-this.canvas.height * 0.2, Math.min(maxY + this.canvas.height * 0.2, this.viewport.y));
  }

  // 绘制地图帧
  drawFrame(): void {
    if (!this.ctx || !this.canvas) return;
    const mapSystem = this.engine.mapSystem;
    if (!mapSystem) return;

    const cache = mapSystem.getTerrainCache();
    if (!cache) return;

    const W = this.canvas.width;
    const H = this.canvas.height;
    const z = this.viewport.zoom;
    const tc = cache.cache;
    const cols = cache.cols;
    const rows = cache.rows;
    const ccs = (MAP_COLS * CELL_SIZE) / cols;
    const SPAN = 8;

    const id = this.ctx.createImageData(W, H);
    const d = id.data;

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const gx = (px + this.viewport.x) / ccs / z;
        const gy = (py + this.viewport.y) / ccs / z;

        const cx = Math.floor(gx);
        const cy = Math.floor(gy);
        const tx = gx - cx;
        const ty = gy - cy;

        const x0 = Math.max(0, Math.min(cols - 1, cx));
        const x1 = Math.max(0, Math.min(cols - 1, cx + 1));
        const y0 = Math.max(0, Math.min(rows - 1, cy));
        const y1 = Math.max(0, Math.min(rows - 1, cy + 1));

        const i00 = (y0 * cols + x0) * SPAN;
        const i10 = (y0 * cols + x1) * SPAN;
        const i01 = (y1 * cols + x0) * SPAN;
        const i11 = (y1 * cols + x1) * SPAN;

        // 双线性插值颜色
        const r0 = tc[i00] + (tc[i10] - tc[i00]) * tx;
        const r1 = tc[i01] + (tc[i11] - tc[i01]) * tx;
        const R = r0 + (r1 - r0) * ty;
        const g0 = tc[i00 + 1] + (tc[i10 + 1] - tc[i00 + 1]) * tx;
        const g1 = tc[i01 + 1] + (tc[i11 + 1] - tc[i01 + 1]) * tx;
        const G = g0 + (g1 - g0) * ty;
        const b0 = tc[i00 + 2] + (tc[i10 + 2] - tc[i00 + 2]) * tx;
        const b1 = tc[i01 + 2] + (tc[i11 + 2] - tc[i01 + 2]) * tx;
        const B = b0 + (b1 - b0) * ty;

        // 高程
        const e00 = tc[i00 + 3], e10 = tc[i10 + 3];
        const e01 = tc[i01 + 3], e11 = tc[i11 + 3];
        const e0 = e00 + (e10 - e00) * tx;
        const e1 = e01 + (e11 - e01) * tx;
        const elev = e0 + (e1 - e0) * ty;

        // 微地形噪声
        let fbmVal = 0, fAmp = 0.8, fFreq = 1.5, fMax = 0;
        for (let fo = 0; fo < 4; fo++) {
          fbmVal += this.noise.noise2d(gx * fFreq * 3, gy * fFreq * 3) * fAmp;
          fMax += fAmp;
          fAmp *= 0.5;
          fFreq *= 2.3;
        }
        fbmVal /= fMax;

        // 光照
        const nx = (fbmVal - 0.5) * (elev < 0.15 ? 0.3 : 0.8);
        const ny = (fbmVal - 0.5) * (elev < 0.15 ? 0.3 : 0.8);
        const light = this.calculateLighting(nx, ny);

        // 纹理噪声
        const noise = (this.hash(px * 7 + py, py * 13 + px) - 0.5) * 0.12;
        const finalLight = Math.max(0.06, Math.min(1.0, light + noise));

        // 水面波纹
        let finalR = R, finalG = G, finalB = B;
        if (elev < 0.15) {
          const wave = Math.sin(gx * 40 + gy * 8) * Math.cos(gy * 35 + gx * 5) * 0.03;
          finalR = Math.max(0.02, Math.min(1.0, R + wave));
          finalG = Math.max(0.02, Math.min(1.0, G + wave));
          finalB = Math.max(0.02, Math.min(1.0, B + wave));
        }

        // 颜色变化
        const colorVar = (fbmVal - 0.5) * 0.35;
        finalR = Math.max(0.02, Math.min(1.0, finalR + colorVar));
        finalG = Math.max(0.02, Math.min(1.0, finalG + colorVar * 0.75));
        finalB = Math.max(0.02, Math.min(1.0, finalB + colorVar * 0.5));

        const fi = (py * W + px) * 4;
        d[fi] = Math.min(255, finalR * 255 * finalLight);
        d[fi + 1] = Math.min(255, finalG * 255 * finalLight);
        d[fi + 2] = Math.min(255, finalB * 255 * finalLight);
        d[fi + 3] = 255;
      }
    }

    this.ctx.putImageData(id, 0, 0);

    // 绘制领地标签
    this.drawCountyLabels();
    this.drawCompass();
  }

  private calculateLighting(nx: number, ny: number): number {
    const lx = 0.3, ly = -0.5, lz = 0.8;
    const len = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const dot = nx * (lx / len) + ny * (ly / len) + (lz / len);
    return Math.max(0.15, Math.min(1.0, dot * 0.7 + 0.35));
  }

  private hash(x: number, y: number): number {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
  }

  private drawCountyLabels(): void {
    if (!this.ctx || !this.canvas || !this.engine.world || !this.engine.mapSystem) return;

    const W = this.canvas.width;
    const H = this.canvas.height;
    const z = this.viewport.zoom;
    const drawn = new Set<string>();

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // 只遍历有领地的格子，优化性能
    const mapSystem = this.engine.mapSystem;
    const world = this.engine.world;
    const player = world.getPlayer();

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const cell = mapSystem.grid[r][c];
        if (!cell.countyId || drawn.has(cell.countyId)) continue;
        drawn.add(cell.countyId);

        const cty = world.counties.get(cell.countyId);
        if (!cty) continue;

        const isPlayer = player && player.domain_titles.some(t => t.id === cty.id);
        const scx = (c * CELL_SIZE - this.viewport.x / z) * z;
        const scy = (r * CELL_SIZE - this.viewport.y / z) * z;

        if (scx < -80 || scx > W + 80 || scy < -40 || scy > H + 40) continue;

        // 标签背景
        this.ctx.fillStyle = isPlayer ? 'rgba(201,168,76,0.85)' : 'rgba(30,25,18,0.75)';
        const tw = this.ctx.measureText(cty.name).width;
        this.ctx.fillRect(scx - tw / 2 - 4, scy - 12, tw + 8, 22);

        // 文字
        this.ctx.fillStyle = isPlayer ? '#fff' : '#d4c9b0';
        this.ctx.font = 'bold 12px Cinzel, serif';
        this.ctx.fillText(cty.name, scx, scy);

        // 城市标记
        this.ctx.fillStyle = isPlayer ? '#f0d060' : '#d4b870';
        this.ctx.beginPath();
        this.ctx.arc(scx, scy - 2, isPlayer ? 6 : 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 旗帜
        this.ctx.fillStyle = isPlayer ? '#c9a84c' : '#8b7340';
        this.ctx.fillRect(scx - 1, scy - 12, 2, 10);
        this.ctx.fillStyle = isPlayer ? '#e04040' : '#a06060';
        this.ctx.beginPath();
        this.ctx.moveTo(scx - 1, scy - 13);
        this.ctx.lineTo(scx + 4, scy - 9);
        this.ctx.lineTo(scx - 1, scy - 7);
        this.ctx.fill();
      }
    }
  }

  private drawCompass(): void {
    if (!this.ctx) return;
    const cx = 30, cy = 30, cr = 18;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(13,10,8,0.7)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(139,115,85,0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(201,168,76,0.8)';
    this.ctx.font = 'bold 10px Cinzel, serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('N', cx, cy - 6);
    this.ctx.fillText('S', cx, cy + 12);
    this.ctx.fillText('E', cx + 10, cy + 4);
    this.ctx.fillText('W', cx - 10, cy + 4);
  }
}