// ==================== 世界管理器 ====================

import type { Character, County, Army, GameEvent, GameDate, WorldData, Skills } from '../types';
import { NoiseGenerator } from '../utils/noise';
import { 
  FIRST_NAMES, LAST_NAMES, CULTURES, RELIGIONS, 
  COUNTY_NAMES, STATS 
} from '../utils/constants';

export class World {
  characters: Map<string, Character> = new Map();
  counties: Map<string, County> = new Map();
  armies: Map<string, Army> = new Map();
  eventLog: GameEvent[] = [];
  date: GameDate = { year: 1066, month: 9, day: 1 };
  playerId: string = '';
  playedTurns: number = 0;
  private noise: NoiseGenerator;

  constructor(seed?: number) {
    this.noise = new NoiseGenerator(seed);
  }

  getPlayer(): Character | null {
    return this.playerId ? this.characters.get(this.playerId) || null : null;
  }

  getDateStr(): string {
    return `${this.date.year}年${this.date.month}月`;
  }

  nextMonth(): void {
    this.date.month++;
    if (this.date.month > 12) {
      this.date.month = 1;
      this.date.year++;
    }
  }

  generateCharacter(isPlayer: boolean = false): Character {
    const fname = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lname = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const culture = CULTURES[Math.floor(Math.random() * CULTURES.length)];
    const religion = RELIGIONS[Math.floor(Math.random() * RELIGIONS.length)];
    
    const skills: Skills = {
      martial: Math.max(1, Math.round(10 + this.gaussRandom(0, 4))),
      diplomacy: Math.max(1, Math.round(10 + this.gaussRandom(0, 4))),
      stewardship: Math.max(1, Math.round(10 + this.gaussRandom(0, 4))),
      intrigue: Math.max(1, Math.round(10 + this.gaussRandom(0, 4))),
      learning: Math.max(1, Math.round(10 + this.gaussRandom(0, 4))),
      prowess: Math.max(1, Math.round(10 + this.gaussRandom(0, 4)))
    };

    const id = `char_${Math.random().toString(36).substr(2, 9)}`;
    const char: Character = {
      id,
      name: `${fname} ${lname}`,
      culture,
      religion,
      skills,
      traits: this.generateTraits(),
      domain_titles: [],
      treasury: isPlayer ? 200 : Math.floor(Math.random() * 100),
      income_per_month: 0,
      expense_per_month: 0,
      prestige: Math.floor(Math.random() * 200),
      piety: Math.floor(Math.random() * 100),
      isPlayer
    };

    this.characters.set(id, char);
    if (isPlayer) this.playerId = id;
    return char;
  }

  generateCounty(index: number): County {
    const name = COUNTY_NAMES[index % COUNTY_NAMES.length];
    const culture = CULTURES[Math.floor(Math.random() * CULTURES.length)];
    const religion = RELIGIONS[Math.floor(Math.random() * RELIGIONS.length)];
    
    const id = `county_${index}`;
    const county: County = {
      id,
      name,
      culture,
      religion,
      terrain: 'plains',
      elevation: 0.5,
      population: Math.floor(1000 + Math.random() * 9000),
      tax_base: Math.floor(5 + Math.random() * 20),
      levy_base: Math.floor(50 + Math.random() * 200),
      garrison: Math.floor(100 + Math.random() * 300),
      development: Math.floor(Math.random() * 30),
      control: Math.floor(50 + Math.random() * 50),
      happiness: Math.floor(50 + Math.random() * 50),
      unrest: Math.floor(Math.random() * 20),
      loyalty: Math.floor(50 + Math.random() * 50),
      tradeIncome: Math.floor(Math.random() * 10),
      ownerId: null
    };

    this.counties.set(id, county);
    return county;
  }

  private generateTraits(): string[] {
    const allTraits = [
      'just', 'diligent', 'ambitious', 'brave', 'calm',
      'craven', 'deceitful', 'fickle', 'generous', 'greedy',
      'honest', 'humble', 'impatient', 'lazy', 'patient',
      'shy', 'stubborn', 'temperate', 'wrathful', 'cynical'
    ];
    const count = 2 + Math.floor(Math.random() * 3);
    const traits: string[] = [];
    const shuffled = [...allTraits].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      traits.push(shuffled[i]);
    }
    return traits;
  }

  private gaussRandom(mean: number = 0, stdDev: number = 1): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stdDev + mean;
  }

  init(): void {
    // 生成25个角色
    const kingIds: string[] = [];
    for (let i = 0; i < 25; i++) {
      const char = this.generateCharacter(i === 0);
      kingIds.push(char.id);
    }

    // 生成25个领地
    const countyIds: string[] = [];
    for (let i = 0; i < 25; i++) {
      const county = this.generateCounty(i);
      countyIds.push(county.id);
    }

    // 分配领地
    for (let i = 0; i < 25; i++) {
      const char = this.characters.get(kingIds[i])!;
      const county = this.counties.get(countyIds[i])!;
      county.ownerId = char.id;
      char.domain_titles.push(county);
    }

    // 生成事件日志
    this.logEvent('event', '游戏开始');
  }

  logEvent(type: GameEvent['type'], msg: string): void {
    this.eventLog.push({
      type,
      msg,
      date: { ...this.date }
    });
  }

  // 序列化
  serialize(): WorldData {
    const data: WorldData = {
      characters: {},
      counties: {},
      armies: {},
      eventLog: [...this.eventLog],
      date: { ...this.date },
      playerId: this.playerId
    };

    for (const [id, char] of this.characters) {
      data.characters[id] = { ...char };
    }
    for (const [id, county] of this.counties) {
      data.counties[id] = { ...county };
    }
    for (const [id, army] of this.armies) {
      data.armies[id] = { ...army };
    }

    return data;
  }

  // 反序列化
  static deserialize(data: WorldData): World {
    const world = new World();
    world.date = { ...data.date };
    world.playerId = data.playerId;

    for (const [id, charData] of Object.entries(data.characters)) {
      world.characters.set(id, { ...charData });
    }
    for (const [id, countyData] of Object.entries(data.counties)) {
      world.counties.set(id, { ...countyData });
    }
    for (const [id, armyData] of Object.entries(data.armies)) {
      world.armies.set(id, { ...armyData });
    }
    world.eventLog = [...data.eventLog];

    // 重建引用关系
    for (const char of world.characters.values()) {
      char.domain_titles = char.domain_titles
        .map((t: any) => world.counties.get(t.id || t))
        .filter(Boolean) as County[];
    }

    return world;
  }
}