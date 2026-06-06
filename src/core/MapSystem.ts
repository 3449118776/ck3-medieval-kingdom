// ==================== 地图系统 ====================

import type { MapCell, TerrainType, County } from '../types';
import { NoiseGenerator } from '../utils/noise';
import { TERRAIN_COLORS, MAP_COLS, MAP_ROWS, CELL_SIZE, CACHE_SCALE } from '../utils/constants';

export class MapSystem {
  grid: MapCell[][] = [];
  private noise: NoiseGenerator;
  private terrainCache: Float32Array | null = null;
  private cacheCols: number = 0;
  private cacheRows: number = 0;

  constructor(seed?: number) {
    this.noise = new NoiseGenerator(seed);
  }

  init(counties: Map<string, County>): void {
    this.grid = [];
    
    // 生成基础地形
    for (let r = 0; r < MAP_ROWS; r++) {
      const row: MapCell[] = [];
      for (let c = 0; c < MAP_COLS; c++) {
        const nx = c / MAP_COLS;
        const ny = r / MAP_ROWS;
        const elevation = this.noise.generateElevation(nx, ny);
        const temperature = this.noise.generateTemperature(nx, ny);
        const moisture = this.noise.generateMoisture(nx, ny);
        
        const terrain = this.determineTerrain(elevation, temperature, moisture);
        
        row.push({
          row: r,
          col: c,
          terrain,
          elevation: Math.max(0, Math.min(1, elevation)),
          countyId: null
        });
      }
      this.grid.push(row);
    }

    // 分配领地
    this.assignCounties(counties);
    
    // 构建地形缓存
    this.buildTerrainCache();
  }

  private determineTerrain(elevation: number, temperature: number, moisture: number): TerrainType {
    if (elevation < 0.12) return 'water';
    if (elevation < 0.15) return 'coastal';
    if (elevation > 0.75) return temperature < 0.3 ? 'snow_mountains' : 'mountains';
    if (elevation > 0.55) return temperature < 0.3 ? 'snow' : 'hills';
    if (temperature > 0.7 && moisture < 0.3) return 'desert';
    if (temperature > 0.6 && moisture < 0.4) return 'drylands';
    if (moisture > 0.7 && temperature > 0.4) return 'wetlands';
    if (moisture > 0.6 && temperature > 0.3) return 'forest';
    if (temperature < 0.25) return 'taiga';
    if (temperature < 0.15) return 'snow';
    return 'plains';
  }

  private assignCounties(counties: Map<string, County>): void {
    const countyList = Array.from(counties.values());
    const centers: { r: number; c: number }[] = [];
    
    // 使用泊松盘采样生成领地中心
    const minDist = Math.min(MAP_ROWS, MAP_COLS) / Math.sqrt(countyList.length) * 0.8;
    let attempts = 0;
    
    while (centers.length < countyList.length && attempts < countyList.length * 50) {
      const c = Math.floor(Math.random() * MAP_COLS);
      const r = Math.floor(Math.random() * MAP_ROWS);
      
      // 确保不在水域
      if (this.grid[r][c].terrain === 'water') {
        attempts++;
        continue;
      }
      
      // 检查距离
      let tooClose = false;
      for (const center of centers) {
        const dist = Math.sqrt((c - center.c) ** 2 + (r - center.r) ** 2);
        if (dist < minDist) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        centers.push({ r, c });
      }
      attempts++;
    }

    // 使用Voronoi图分配格子
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        let closestIdx = 0;
        let closestDist = Infinity;
        
        for (let i = 0; i < centers.length; i++) {
          const dist = Math.sqrt((c - centers[i].c) ** 2 + (r - centers[i].r) ** 2);
          if (dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
          }
        }
        
        if (closestIdx < countyList.length) {
          this.grid[r][c].countyId = countyList[closestIdx].id;
        }
      }
    }
  }

  private buildTerrainCache(): void {
    this.cacheCols = Math.ceil(MAP_COLS / CACHE_SCALE);
    this.cacheRows = Math.ceil(MAP_ROWS / CACHE_SCALE);
    const stride = 8; // r, g, b, elev, nx, ny, temp, moisture
    this.terrainCache = new Float32Array(this.cacheCols * this.cacheRows * stride);

    for (let r = 0; r < this.cacheRows; r++) {
      for (let c = 0; c < this.cacheCols; c++) {
        const gr = Math.min(MAP_ROWS - 1, r * CACHE_SCALE);
        const gc = Math.min(MAP_COLS - 1, c * CACHE_SCALE);
        const cell = this.grid[gr][gc];
        const color = TERRAIN_COLORS[cell.terrain] || [128, 128, 128];
        
        const idx = (r * this.cacheCols + c) * stride;
        this.terrainCache[idx] = color[0] / 255;
        this.terrainCache[idx + 1] = color[1] / 255;
        this.terrainCache[idx + 2] = color[2] / 255;
        this.terrainCache[idx + 3] = cell.elevation;
        this.terrainCache[idx + 4] = 0; // nx
        this.terrainCache[idx + 5] = 0; // ny
        this.terrainCache[idx + 6] = 0; // temp
        this.terrainCache[idx + 7] = 0; // moisture
      }
    }
  }

  getTerrainCache(): { cache: Float32Array; cols: number; rows: number } | null {
    if (!this.terrainCache) return null;
    return {
      cache: this.terrainCache,
      cols: this.cacheCols,
      rows: this.cacheRows
    };
  }

  getCell(row: number, col: number): MapCell | null {
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return null;
    return this.grid[row][col];
  }

  findCountyCenter(countyId: string): { r: number; c: number } | null {
    let sumR = 0, sumC = 0, count = 0;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (this.grid[r][c].countyId === countyId) {
          sumR += r;
          sumC += c;
          count++;
        }
      }
    }
    return count > 0 ? { r: Math.round(sumR / count), c: Math.round(sumC / count) } : null;
  }
}