// ==================== 游戏引擎 ====================

import type { GameView, AIConfig, SaveData } from '../types';
import { World } from './World';
import { MapSystem } from './MapSystem';

export class GameEngine {
  world: World | null = null;
  mapSystem: MapSystem | null = null;
  currentView: GameView = 'title';
  aiConfig: AIConfig = { enabled: false };
  private saveKey = 'ck3_mobile_save';

  constructor() {
    this.loadAIConfig();
  }

  startNewGame(): void {
    const seed = Math.floor(Math.random() * 65536);
    this.world = new World(seed);
    this.mapSystem = new MapSystem(seed);
    
    this.world.init();
    if (this.mapSystem) {
      this.mapSystem.init(this.world.counties);
    }
    
    this.currentView = 'domain';
    
    const player = this.world.getPlayer();
    if (player) {
      this.world.logEvent('event', `${player.name} 登上了王座！`);
    }
  }

  endTurn(): void {
    if (!this.world) return;
    
    const player = this.world.getPlayer();
    if (!player) return;

    let totalTax = 0;
    let totalTrade = 0;

    for (const county of player.domain_titles) {
      totalTax += county.tax_base * (county.control / 100) * (1 + county.development / 100);
      totalTrade += county.tradeIncome || 0;
      county.population = Math.floor(county.population * 1.002);
      county.unrest = Math.max(0, county.unrest - 1);
      county.loyalty = Math.max(0, county.loyalty - 0.2);
    }

    player.treasury += totalTax + totalTrade;
    player.income_per_month = totalTax + totalTrade;

    for (const county of player.domain_titles) {
      county.development = Math.min(100, county.development + 0.1 + Math.random() * 0.3);
      county.control = Math.min(100, county.control + 0.2);
    }

    this.world.playedTurns++;
    this.world.nextMonth();
    this.world.logEvent('event', 
      `回合 ${this.world.playedTurns} | ${this.world.getDateStr()} | 收入 +${Math.floor(totalTax + totalTrade)} 金`
    );
  }

  // 存档
  saveGame(slot: number = 0): { success: boolean; error?: string } {
    if (!this.world) return { success: false, error: '游戏未开始' };

    try {
      const data: SaveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        world: this.world.serialize(),
        playedTurns: this.world.playedTurns
      };

      const key = `${this.saveKey}_${slot}`;
      localStorage.setItem(key, JSON.stringify(data));
      return { success: true };
    } catch (e) {
      return { success: false, error: '存储空间不足' };
    }
  }

  // 读档
  loadGame(slot: number = 0): { success: boolean; world?: World; error?: string } {
    try {
      const key = `${this.saveKey}_${slot}`;
      const saved = localStorage.getItem(key);
      if (!saved) return { success: false, error: '存档不存在' };

      const data: SaveData = JSON.parse(saved);
      this.world = World.deserialize(data.world);
      this.world.playedTurns = data.playedTurns;
      
      // 重建地图
      this.mapSystem = new MapSystem();
      this.mapSystem.init(this.world.counties);
      
      this.currentView = 'domain';
      return { success: true, world: this.world };
    } catch (e) {
      return { success: false, error: '存档损坏' };
    }
  }

  // 获取存档信息
  getSaveInfo(slot: number): { exists: boolean; playerName?: string; dateStr?: string; turn?: number; date?: string } {
    try {
      const key = `${this.saveKey}_${slot}`;
      const saved = localStorage.getItem(key);
      if (!saved) return { exists: false };

      const data: SaveData = JSON.parse(saved);
      const player = Object.values(data.world.characters).find(c => c.isPlayer);
      return {
        exists: true,
        playerName: player?.name || '未知',
        dateStr: `${data.world.date.year}年${data.world.date.month}月`,
        turn: data.playedTurns,
        date: new Date(data.timestamp).toLocaleString()
      };
    } catch {
      return { exists: false };
    }
  }

  private loadAIConfig(): void {
    try {
      const saved = localStorage.getItem('ck3_ai_config');
      if (saved) this.aiConfig = JSON.parse(saved);
    } catch { /* ignore */ }
  }

  saveAIConfig(): void {
    localStorage.setItem('ck3_ai_config', JSON.stringify(this.aiConfig));
  }

  // 领地操作
  developCounty(countyId: string): { success: boolean; msg?: string } {
    if (!this.world) return { success: false, msg: '游戏未开始' };
    const county = this.world.counties.get(countyId);
    const player = this.world.getPlayer();
    if (!county || !player) return { success: false, msg: '无效操作' };
    if (player.treasury < 50) return { success: false, msg: '需要50金币' };

    player.treasury -= 50;
    county.development = Math.min(100, county.development + 2 + Math.random() * 3);
    this.world.logEvent('event', `在 ${county.name} 投入发展`);
    return { success: true };
  }

  improveControl(countyId: string): { success: boolean; msg?: string } {
    if (!this.world) return { success: false, msg: '游戏未开始' };
    const county = this.world.counties.get(countyId);
    const player = this.world.getPlayer();
    if (!county || !player) return { success: false, msg: '无效操作' };
    if (player.treasury < 30) return { success: false, msg: '需要30金币' };

    player.treasury -= 30;
    county.control = Math.min(100, county.control + 5 + Math.random() * 5);
    this.world.logEvent('event', `在 ${county.name} 加强控制`);
    return { success: true };
  }

  pacifyPopulace(countyId: string): { success: boolean; msg?: string } {
    if (!this.world) return { success: false, msg: '游戏未开始' };
    const county = this.world.counties.get(countyId);
    const player = this.world.getPlayer();
    if (!county || !player) return { success: false, msg: '无效操作' };
    if (player.treasury < 20) return { success: false, msg: '需要20金币' };

    player.treasury -= 20;
    county.happiness = Math.min(100, county.happiness + 8);
    county.unrest = Math.max(0, county.unrest - 5);
    this.world.logEvent('event', `在 ${county.name} 安抚民众`);
    return { success: true };
  }
}