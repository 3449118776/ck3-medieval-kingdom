// ==================== Leaflet地图渲染器（瓦片方案） ====================

import L from 'leaflet';
import type { County } from '../types';
import { MapSystem } from '../core/MapSystem';
import { GameEngine } from '../core/GameEngine';
import { MAP_COLS, MAP_ROWS, CELL_SIZE } from '../utils/constants';
import { NoiseGenerator } from '../utils/noise';

// 瓦片大小
const TILE_SIZE = 256;
// 每个格子对应的像素（1:1映射，不放大）
const PX_PER_CELL = 1;

export class LeafletMapRenderer {
  private map: L.Map | null = null;
  private engine: GameEngine;
  private mapSystem: MapSystem;
  private noise = new NoiseGenerator();
  private countyMarkers: L.LayerGroup | null = null;
  private boundsLayer: L.LayerGroup | null = null;
  private tileCache: Map<string, HTMLCanvasElement> = new Map();
  private mapWidth: number;
  private mapHeight: number;

  constructor(engine: GameEngine, mapSystem: MapSystem) {
    this.engine = engine;
    this.mapSystem = mapSystem;
    this.mapWidth = MAP_COLS * PX_PER_CELL;
    this.mapHeight = MAP_ROWS * PX_PER_CELL;
  }

  init(container: HTMLElement): void {
    // 创建Leaflet地图（Simple CRS）
    this.map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      attributionControl: false,
      zoomControl: false,
      maxBounds: [
        [-this.mapHeight * 0.5, -this.mapWidth * 0.5],
        [this.mapHeight * 1.5, this.mapWidth * 1.5]
      ],
      maxBoundsViscosity: 0.8
    });

    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [this.mapHeight, this.mapWidth]
    ];

    // 自定义瓦片图层
    const tileLayer = L.tileLayer('', {
      tileSize: TILE_SIZE,
      noWrap: true,
      bounds: L.latLngBounds([0, 0], [this.mapHeight, this.mapWidth])
    });

    // 重写createTile方法
    (tileLayer as any)._createTile = function(coords: L.Coords, done: () => void) {
      const tile = document.createElement('canvas');
      tile.width = TILE_SIZE;
      tile.height = TILE_SIZE;
      return tile;
    };

    // 使用GridLayer自定义瓦片
    const TerrainGrid = L.GridLayer.extend({
      createTile: (coords: L.Coords, done: () => void) => {
        const tile = this.createTerrainTile(coords);
        done();
        return tile;
      }
    });

    new TerrainGrid().addTo(this.map);

    // 添加领地边界
    this.drawCountyBorders();

    // 添加领地标记
    this.addCountyMarkers();

    // 缩放到玩家领地
    this.zoomToPlayer();

    // 添加缩放控件
    this.addCustomControls();
  }

  // 生成单个瓦片
  private createTerrainTile(coords: L.Coords): HTMLCanvasElement {
    const key = `${coords.x}_${coords.y}_${coords.z}`;
    const cached = this.tileCache.get(key);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
    const d = imageData.data;

    const zoom = Math.pow(2, coords.z);
    const tileSizeInMap = TILE_SIZE / zoom;

    for (let py = 0; py < TILE_SIZE; py++) {
      for (let px = 0; px < TILE_SIZE; px++) {
        // 瓦片坐标 → 地图坐标
        const mapX = (coords.x * tileSizeInMap + px / zoom);
        const mapY = (coords.y * tileSizeInMap + py / zoom);

        // 地图坐标 → 格子坐标
        const col = Math.min(MAP_COLS - 1, Math.max(0, Math.floor(mapX / PX_PER_CELL)));
        const row = Math.min(MAP_ROWS - 1, Math.max(0, Math.floor(mapY / PX_PER_CELL)));

        if (row >= MAP_ROWS || col >= MAP_COLS) {
          const fi = (py * TILE_SIZE + px) * 4;
          d[fi] = 10; d[fi+1] = 8; d[fi+2] = 6; d[fi+3] = 255;
          continue;
        }

        const cell = this.mapSystem.grid[row][col];
        const color = this.getTerrainColor(cell.terrain, cell.elevation);

        // 简单微地形（只在较高缩放级别）
        let r = color[0], g = color[1], b = color[2];

        if (coords.z >= 0) {
          const fx = mapX / 40;
          const fy = mapY / 40;
          const n = this.noise.noise2d(fx, fy);
          const variation = n * 0.15;
          r = Math.max(0, Math.min(1, r + variation));
          g = Math.max(0, Math.min(1, g + variation * 0.8));
          b = Math.max(0, Math.min(1, b + variation * 0.5));
        }

        // 简单光照
        if (coords.z >= -1) {
          const nx = (this.noise.noise2d(mapX / 20, mapY / 20) - 0.5) * 0.4;
          const light = Math.max(0.2, Math.min(1.0, 0.5 + nx));
          r *= light; g *= light; b *= light;
        }

        // 水面
        if (cell.terrain === 'water' || cell.elevation < 0.15) {
          const wave = Math.sin(mapX / 8) * Math.cos(mapY / 6) * 0.03;
          r = Math.max(0.02, r + wave);
          g = Math.max(0.02, g + wave);
          b = Math.max(0.02, b + wave);
        }

        const fi = (py * TILE_SIZE + px) * 4;
        d[fi] = Math.min(255, r * 255);
        d[fi + 1] = Math.min(255, g * 255);
        d[fi + 2] = Math.min(255, b * 255);
        d[fi + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // 在瓦片上绘制边界线（只在低缩放级别）
    if (coords.z >= -1) {
      this.drawBordersOnTile(ctx, coords);
    }

    // 缓存（限制缓存大小）
    if (this.tileCache.size > 200) {
      const firstKey = this.tileCache.keys().next().value;
      if (firstKey) this.tileCache.delete(firstKey);
    }
    this.tileCache.set(key, canvas);

    return canvas;
  }

  // 在瓦片上绘制边界
  private drawBordersOnTile(ctx: CanvasRenderingContext2D, coords: L.Coords): void {
    const zoom = Math.pow(2, coords.z);
    const tileSizeInMap = TILE_SIZE / zoom;
    const startCol = Math.floor(coords.x * tileSizeInMap / PX_PER_CELL);
    const endCol = Math.ceil((coords.x + 1) * tileSizeInMap / PX_PER_CELL);
    const startRow = Math.floor(coords.y * tileSizeInMap / PX_PER_CELL);
    const endRow = Math.ceil((coords.y + 1) * tileSizeInMap / PX_PER_CELL);

    const grid = this.mapSystem.grid;
    const world = this.engine.world;
    if (!world) return;
    const player = world.getPlayer();

    ctx.lineWidth = 1;

    for (let r = startRow; r < endRow && r < MAP_ROWS - 1; r++) {
      for (let c = startCol; c < endCol && c < MAP_COLS - 1; c++) {
        if (r < 0 || c < 0) continue;
        const cell = grid[r][c];
        const right = grid[r][c + 1];
        const bottom = grid[r + 1][c];

        // 右边界
        if (cell.countyId !== right.countyId && cell.countyId && right.countyId) {
          const isPlayer = (cell.countyId && player?.domain_titles.some(t => t.id === cell.countyId)) ||
                           (right.countyId && player?.domain_titles.some(t => t.id === right.countyId));
          ctx.strokeStyle = isPlayer ? 'rgba(201,168,76,0.8)' : 'rgba(40,32,20,0.5)';
          ctx.lineWidth = isPlayer ? 2 : 1;
          const sx = (c + 1) * PX_PER_CELL * zoom - coords.x * tileSizeInMap;
          const sy = r * PX_PER_CELL * zoom - coords.y * tileSizeInMap;
          const ey = (r + 1) * PX_PER_CELL * zoom - coords.y * tileSizeInMap;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, ey);
          ctx.stroke();
        }

        // 下边界
        if (cell.countyId !== bottom.countyId && cell.countyId && bottom.countyId) {
          const isPlayer = (cell.countyId && player?.domain_titles.some(t => t.id === cell.countyId)) ||
                           (bottom.countyId && player?.domain_titles.some(t => t.id === bottom.countyId));
          ctx.strokeStyle = isPlayer ? 'rgba(201,168,76,0.8)' : 'rgba(40,32,20,0.5)';
          ctx.lineWidth = isPlayer ? 2 : 1;
          const sx = c * PX_PER_CELL * zoom - coords.x * tileSizeInMap;
          const sy = (r + 1) * PX_PER_CELL * zoom - coords.y * tileSizeInMap;
          const ex = (c + 1) * PX_PER_CELL * zoom - coords.x * tileSizeInMap;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, sy);
          ctx.stroke();
        }
      }
    }
  }

  private getTerrainColor(terrain: string, elevation: number): [number, number, number] {
    const colors: Record<string, [number, number, number]> = {
      plains: [0.60, 0.73, 0.40],
      farmland: [0.67, 0.78, 0.47],
      forest: [0.39, 0.55, 0.31],
      hills: [0.72, 0.63, 0.47],
      mountains: [0.54, 0.50, 0.47],
      desert: [0.91, 0.78, 0.53],
      desert_mountains: [0.78, 0.67, 0.47],
      jungle: [0.24, 0.47, 0.24],
      marsh: [0.47, 0.63, 0.55],
      steppe: [0.71, 0.75, 0.47],
      flood_plains: [0.63, 0.78, 0.55],
      oasis: [0.55, 0.78, 0.47],
      drylands: [0.78, 0.71, 0.55],
      wetlands: [0.39, 0.59, 0.51],
      taiga: [0.31, 0.47, 0.39],
      snow: [0.91, 0.91, 0.94],
      snow_mountains: [0.85, 0.86, 0.88],
      coastal: [0.71, 0.78, 0.63],
      water: [0.20, 0.40, 0.67]
    };
    return colors[terrain] || [0.5, 0.5, 0.5];
  }

  // Leaflet领地边界线
  private drawCountyBorders(): void {
    this.boundsLayer = L.layerGroup().addTo(this.map!);
    // 边界已在瓦片中绘制，此处留空
  }

  // 添加领地标记
  private addCountyMarkers(): void {
    this.countyMarkers = L.layerGroup().addTo(this.map!);
    const world = this.engine.world;
    if (!world) return;
    const player = world.getPlayer();

    for (const [id, county] of world.counties) {
      const center = this.mapSystem.findCountyCenter(id);
      if (!center) continue;

      const isPlayer = player?.domain_titles.some(t => t.id === id);
      const latlng: L.LatLngExpression = [center.r * PX_PER_CELL, center.c * PX_PER_CELL];

      const icon = L.divIcon({
        className: 'county-marker',
        html: `
          <div class="county-pin ${isPlayer ? 'player' : ''}">
            <div class="pin-flag" style="background:${isPlayer ? '#c9a84c' : '#8b7340'}"></div>
            <div class="pin-dot" style="background:${isPlayer ? '#f0d060' : '#d4b870'}"></div>
            <div class="pin-label">${county.name}</div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      L.marker(latlng, { icon, interactive: true })
        .on('click', () => {
          if ((window as any).game?.showCountyDetail) {
            (window as any).game.showCountyDetail(id);
          }
        })
        .addTo(this.countyMarkers);
    }
  }

  private zoomToPlayer(): void {
    const player = this.engine.world?.getPlayer();
    if (!player || !this.map) return;
    if (player.domain_titles.length > 0) {
      const center = this.mapSystem.findCountyCenter(player.domain_titles[0].id);
      if (center) {
        this.map.setView([center.r * PX_PER_CELL, center.c * PX_PER_CELL], 0, { animate: true });
      }
    }
  }

  private addCustomControls(): void {
    if (!this.map) return;
    const self = this;
    const ZoomControl = L.Control.extend({
      options: { position: 'bottomright' as L.ControlPosition },
      onAdd: function(this: any) {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control ck3-zoom-control');
        div.innerHTML = `
          <button class="ck3-zoom-btn" id="ck3-zoom-in">+</button>
          <button class="ck3-zoom-btn" id="ck3-zoom-out">−</button>
          <button class="ck3-zoom-btn" id="ck3-zoom-reset">⌖</button>
        `;
        div.querySelector('#ck3-zoom-in')?.addEventListener('click', () => this.zoomIn());
        div.querySelector('#ck3-zoom-out')?.addEventListener('click', () => this.zoomOut());
        div.querySelector('#ck3-zoom-reset')?.addEventListener('click', () => self.zoomToPlayer());
        return div;
      }
    });
    new ZoomControl().addTo(this.map);
  }

  destroy(): void {
    this.tileCache.clear();
    if (this.countyMarkers) { this.countyMarkers.clearLayers(); this.countyMarkers = null; }
    if (this.boundsLayer) { this.boundsLayer.clearLayers(); this.boundsLayer = null; }
    if (this.map) { this.map.remove(); this.map = null; }
  }

  invalidateSize(): void {
    this.map?.invalidateSize();
  }
}
