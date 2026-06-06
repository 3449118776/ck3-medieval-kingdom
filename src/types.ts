// ==================== 核心类型定义 ====================

export interface Skills {
  martial: number;
  diplomacy: number;
  stewardship: number;
  intrigue: number;
  learning: number;
  prowess: number;
}

export interface County {
  id: string;
  name: string;
  culture: string;
  religion: string;
  terrain: TerrainType;
  elevation: number;
  population: number;
  tax_base: number;
  levy_base: number;
  garrison: number;
  development: number;
  control: number;
  happiness: number;
  unrest: number;
  loyalty: number;
  tradeIncome: number;
  ownerId: string | null;
}

export type TerrainType = 
  | 'plains' | 'farmland' | 'forest' | 'hills' 
  | 'mountains' | 'desert' | 'desert_mountains' 
  | 'jungle' | 'marsh' | 'steppe' | 'flood_plains' 
  | 'oasis' | 'drylands' | 'wetlands' | 'taiga' 
  | 'snow' | 'snow_mountains' | 'coastal' | 'water';

export interface Character {
  id: string;
  name: string;
  culture: string;
  religion: string;
  skills: Skills;
  traits: string[];
  domain_titles: County[];
  treasury: number;
  income_per_month: number;
  expense_per_month: number;
  prestige: number;
  piety: number;
  isPlayer: boolean;
}

export interface Army {
  id: string;
  name: string;
  ownerId: string;
  size: number;
  morale: number;
  location: string;
  destination: string | null;
}

export interface GameEvent {
  type: 'war' | 'diplomacy' | 'event' | 'economy' | 'death';
  msg: string;
  date: GameDate;
}

export interface GameDate {
  year: number;
  month: number;
  day: number;
}

export interface MapCell {
  row: number;
  col: number;
  terrain: TerrainType;
  elevation: number;
  countyId: string | null;
}

export interface MapViewport {
  x: number;
  y: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

export interface TouchState {
  active: boolean;
  lastX: number;
  lastY: number;
  startX: number;
  startY: number;
  lastDist: number;
  startTime: number;
  isPinch: boolean;
  isTap: boolean;
  lastTap: number | null;
}

export interface DragState {
  isDragging: boolean;
  lastX: number;
  lastY: number;
  startX: number;
  startY: number;
}

export type GameView = 
  | 'title' | 'domain' | 'map' | 'diplomacy' 
  | 'military' | 'economy' | 'events' | 'save' | 'load';

export interface AIConfig {
  enabled: boolean;
}

export interface SaveData {
  version: string;
  timestamp: number;
  world: WorldData;
  playedTurns: number;
}

export interface WorldData {
  characters: Record<string, Character>;
  counties: Record<string, County>;
  armies: Record<string, Army>;
  eventLog: GameEvent[];
  date: GameDate;
  playerId: string;
}
