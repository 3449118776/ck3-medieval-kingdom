// ==================== UI渲染器 ====================

import type { GameView, Character, County, GameEvent } from '../types';
import { GameEngine } from '../core/GameEngine';
import { STAT_NAMES, STAT_ICONS, STAT_COLORS, TRAIT_NAMES } from '../utils/constants';

export class UIRenderer {
  private app: HTMLElement;
  private engine: GameEngine;

  constructor(appId: string, engine: GameEngine) {
    this.app = document.getElementById(appId)!;
    this.engine = engine;
  }

  render(): void {
    const view = this.engine.currentView;
    
    switch (view) {
      case 'title':
        this.renderTitleScreen();
        break;
      case 'domain':
        this.renderGameLayout(() => this.renderDomainOverview());
        break;
      case 'map':
        this.renderGameLayout(() => this.renderMapView());
        break;
      case 'diplomacy':
        this.renderGameLayout(() => this.renderDiplomacy());
        break;
      case 'military':
        this.renderGameLayout(() => this.renderMilitary());
        break;
      case 'economy':
        this.renderGameLayout(() => this.renderEconomy());
        break;
      case 'events':
        this.renderGameLayout(() => this.renderEvents());
        break;
      case 'save':
        this.renderGameLayout(() => this.renderSaveScreen());
        break;
      case 'load':
        this.renderGameLayout(() => this.renderLoadScreen());
        break;
    }
  }

  // 标题画面
  private renderTitleScreen(): void {
    this.app.innerHTML = `
      <div class="title-screen">
        <div class="title-content">
          <div class="title-crown">👑</div>
          <h1 class="title-text">中世纪王国</h1>
          <p class="title-sub">Crusader Kings Style Strategy</p>
          <div class="title-buttons">
            <button class="btn btn-primary btn-large" onclick="window.game.setView('domain'); window.game.startNewGame()">
              <span>⚔️</span> 开始游戏
            </button>
            <button class="btn btn-secondary" onclick="window.game.setView('load')">
              <span>📜</span> 读取存档
            </button>
            <button class="btn btn-secondary" onclick="window.game.setView('save')">
              <span>💾</span> 存档管理
            </button>
          </div>
        </div>
        <div class="title-version">v1.0.0</div>
      </div>
    `;
  }

  // 游戏主布局
  private renderGameLayout(contentRenderer: () => string): void {
    const world = this.engine.world;
    const player = world?.getPlayer() || null;
    
    this.app.innerHTML = `
      <div class="game-container">
        ${this.renderTopBar(world, player)}
        <div class="game-main">
          ${this.renderLeftPanel(player)}
          <div class="main-content" id="main-content">
            ${contentRenderer()}
          </div>
          ${this.renderRightNav()}
        </div>
        ${this.renderBottomBar(world, player)}
      </div>
    `;
  }

  private renderTopBar(world: any, player: Character | null): string {
    if (!world || !player) return '';
    return `
      <div class="top-bar">
        <div class="top-date">${world.getDateStr()}</div>
        <div class="top-resources">
          <div class="resource"><span class="res-icon">🪙</span><span class="res-val">${Math.floor(player.treasury)}</span></div>
          <div class="resource"><span class="res-icon">👑</span><span class="res-val">${player.prestige}</span></div>
          <div class="resource"><span class="res-icon">⛪</span><span class="res-val">${player.piety}</span></div>
          <div class="resource"><span class="res-icon">📅</span><span class="res-val">回合 ${world.playedTurns}</span></div>
        </div>
      </div>
    `;
  }

  private renderLeftPanel(player: Character | null): string {
    if (!player) return '';
    const titleName = player.domain_titles.length > 0 ? player.domain_titles[0].name : '无领地';
    
    let statsHtml = '';
    for (const stat of ['martial', 'diplomacy', 'stewardship', 'intrigue', 'learning', 'prowess'] as const) {
      const val = Math.round(player.skills[stat] || 0);
      statsHtml += `
        <div class="stat-row">
          <span class="stat-icon">${STAT_ICONS[stat]}</span>
          <span class="stat-name">${STAT_NAMES[stat]}</span>
          <span class="stat-value" style="color:${STAT_COLORS[stat]}">${val}</span>
        </div>
      `;
    }

    let traitsHtml = '';
    if (player.traits && player.traits.length) {
      traitsHtml = `<div class="traits-box">
        <div class="box-label">性格特质</div>
        <div class="traits-list">
          ${player.traits.map(t => `<span class="trait-tag">${TRAIT_NAMES[t] || t}</span>`).join('')}
        </div>
      </div>`;
    }

    return `
      <div class="left-panel">
        <div class="char-portrait-large">
          <span class="portrait-emoji">${titleName.charAt(0) || '👑'}</span>
          <div class="portrait-frame"></div>
        </div>
        <div class="char-name-plate">
          <div class="name">${player.name}</div>
          <div class="title">${titleName} 领主</div>
        </div>
        <div class="stat-list">${statsHtml}</div>
        ${traitsHtml}
      </div>
    `;
  }

  private renderRightNav(): string {
    const buttons = [
      { view: 'domain', icon: '🏰', label: '领地' },
      { view: 'map', icon: '🗺️', label: '地图' },
      { view: 'diplomacy', icon: '🤝', label: '外交' },
      { view: 'military', icon: '⚔️', label: '军事' },
      { view: 'economy', icon: '💰', label: '经济' },
      { view: 'events', icon: '📜', label: '事件' },
      { view: 'save', icon: '💾', label: '存档' }
    ];

    return `
      <div class="right-nav">
        ${buttons.map(b => `
          <button class="nav-btn ${this.engine.currentView === b.view ? 'active' : ''}" 
                  onclick="window.game.setView('${b.view}')"
                  title="${b.label}">
            <span class="nav-icon">${b.icon}</span>
            <span class="nav-label">${b.label}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  private renderBottomBar(world: any, player: Character | null): string {
    if (!world || !player) return '';
    const titleName = player.domain_titles.length > 0 ? player.domain_titles[0].name : '无领地';
    return `
      <div class="bottom-bar">
        <div class="bottom-hint">${titleName} · ${world.getDateStr()}</div>
        <button class="end-turn-btn" onclick="window.game.endTurn()">
          <span>⏭️</span> 结束回合
        </button>
      </div>
    `;
  }

  // 领地概览
  private renderDomainOverview(): string {
    const world = this.engine.world;
    const player = world?.getPlayer();
    if (!world || !player) return '<div class="empty-state">游戏未开始</div>';

    let treasuryHtml = '';
    let countiesHtml = '';
    let militaryHtml = '';

    // 国库
    const income = player.income_per_month || 0;
    treasuryHtml = `
      <div class="card">
        <div class="card-header">📊 国库</div>
        <div class="card-body">
          <div class="info-row"><span class="label">金币</span><span class="value" style="color:#ffd700">${Math.floor(player.treasury)}</span></div>
          <div class="info-row"><span class="label">月收入</span><span class="value" style="color:${income >= 0 ? '#7cb87c' : '#c9a0a0'}">${income >= 0 ? '+' : ''}${Math.floor(income)}</span></div>
          <div class="info-row"><span class="label">声望</span><span class="value">${player.prestige}</span></div>
          <div class="info-row"><span class="label">虔诚</span><span class="value">${player.piety}</span></div>
        </div>
      </div>
    `;

    // 领地列表
    countiesHtml = `
      <div class="card">
        <div class="card-header">🏰 领地 (${player.domain_titles.length})</div>
        <div class="card-body county-list">
          ${player.domain_titles.map(cty => `
            <div class="county-item" onclick="window.game.showCountyDetail('${cty.id}')">
              <div class="county-name">${cty.name}</div>
              <div class="county-info">
                <span>👥 ${(cty.population / 1000).toFixed(1)}k</span>
                <span>📈 ${Math.round(cty.development)}%</span>
                <span>🛡️ ${Math.round(cty.control)}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // 军事
    let totalLevy = 0, totalGarrison = 0;
    for (const cty of player.domain_titles) {
      totalLevy += cty.levy_base;
      totalGarrison += cty.garrison;
    }
    militaryHtml = `
      <div class="card">
        <div class="card-header">⚔️ 军事</div>
        <div class="card-body">
          <div class="info-row"><span class="label">总征召兵</span><span class="value" style="color:#c9a0a0">${totalLevy}</span></div>
          <div class="info-row"><span class="label">驻军</span><span class="value">${totalGarrison}</span></div>
          <div class="info-row"><span class="label">军事能力</span><span class="value" style="color:#c9a0a0">${Math.round(player.skills.martial)}</span></div>
        </div>
      </div>
    `;

    return `<div class="view-content"><h2 class="view-title">🏰 领地概览</h2>${treasuryHtml}${countiesHtml}${militaryHtml}</div>`;
  }

  // 地图视图
  private renderMapView(): string {
    return `
      <div class="map-view">
        <canvas id="map-canvas"></canvas>
        <div class="map-tooltip" id="map-tooltip"></div>
        <div class="map-legend">
          <div class="legend-title">地形图例</div>
          <div class="legend-item"><div class="legend-color" style="background:rgb(153,186,102)"></div>草地/平原</div>
          <div class="legend-item"><div class="legend-color" style="background:rgb(184,161,120)"></div>丘陵</div>
          <div class="legend-item"><div class="legend-color" style="background:rgb(138,128,120)"></div>山地</div>
          <div class="legend-item"><div class="legend-color" style="background:rgb(217,219,224)"></div>雪山</div>
          <div class="legend-item"><div class="legend-color" style="background:rgb(232,232,240)"></div>雪地</div>
          <div class="legend-item"><div class="legend-color" style="background:rgb(232,199,135)"></div>沙漠</div>
          <div class="legend-item"><div class="legend-color" style="background:rgb(51,102,171)"></div>水域</div>
        </div>
        <div class="map-controls">
          <button class="map-btn" id="map-zoom-in" title="放大">+</button>
          <button class="map-btn" id="map-zoom-out" title="缩小">−</button>
          <button class="map-btn" id="map-reset" title="重置">⌖</button>
        </div>
        <div class="compass">
          <div class="compass-inner">
            <span class="compass-n">N</span>
            <span class="compass-s">S</span>
            <span class="compass-e">E</span>
            <span class="compass-w">W</span>
          </div>
        </div>
      </div>
    `;
  }

  // 外交
  private renderDiplomacy(): string {
    const world = this.engine.world;
    const player = world?.getPlayer();
    if (!world || !player) return '';

    const others = Array.from(world.characters.values()).filter(c => c.id !== player.id);
    
    return `
      <div class="view-content">
        <h2 class="view-title">🤝 外交</h2>
        <div class="diplomacy-list">
          ${others.map(c => {
            const relation = Math.floor(50 + (c.skills.diplomacy || 5) * 3 - (player.skills.diplomacy || 5) * 2 + Math.random() * 10);
            const label = relation >= 70 ? '友好' : relation >= 40 ? '中立' : relation >= 20 ? '冷淡' : '敌对';
            const color = relation >= 70 ? '#7cb87c' : relation >= 40 ? '#d4c9b0' : relation >= 20 ? '#e8a040' : '#c9a0a0';
            return `
              <div class="diplomacy-card" onclick="window.game.showCharDetail('${c.id}')">
                <div class="dip-avatar">🏰</div>
                <div class="dip-info">
                  <div class="dip-name">${c.name}</div>
                  <div class="dip-culture">${c.culture} · ${c.domain_titles.length ? c.domain_titles[0].name : '-'}</div>
                </div>
                <div class="dip-relation">
                  <div class="relation-label" style="color:${color}">${label}</div>
                  <div class="relation-val">关系 ${relation}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // 军事
  private renderMilitary(): string {
    const world = this.engine.world;
    const player = world?.getPlayer();
    if (!world || !player) return '';

    let totalLevy = 0, totalGarrison = 0;
    for (const cty of player.domain_titles) {
      totalLevy += cty.levy_base;
      totalGarrison += cty.garrison;
    }

    return `
      <div class="view-content">
        <h2 class="view-title">⚔️ 军事</h2>
        <div class="card">
          <div class="card-header">📊 军力</div>
          <div class="card-body">
            <div class="info-row"><span class="label">总征召兵</span><span class="value" style="color:#c9a0a0">${totalLevy}</span></div>
            <div class="info-row"><span class="label">驻军</span><span class="value">${totalGarrison}</span></div>
            <div class="info-row"><span class="label">军事能力</span><span class="value" style="color:#c9a0a0">${Math.round(player.skills.martial)}</span></div>
          </div>
        </div>
      </div>
    `;
  }

  // 经济
  private renderEconomy(): string {
    const world = this.engine.world;
    const player = world?.getPlayer();
    if (!world || !player) return '';

    const income = player.income_per_month || 0;

    return `
      <div class="view-content">
        <h2 class="view-title">💰 经济</h2>
        <div class="card">
          <div class="card-header">📊 财政</div>
          <div class="card-body">
            <div class="info-row"><span class="label">金币</span><span class="value" style="color:#ffd700">${Math.floor(player.treasury)}</span></div>
            <div class="info-row"><span class="label">月收入</span><span class="value" style="color:${income >= 0 ? '#7cb87c' : '#c9a0a0'}">${income >= 0 ? '+' : ''}${Math.floor(income)}</span></div>
            <div class="info-row"><span class="label">领地数</span><span class="value">${player.domain_titles.length}</span></div>
          </div>
        </div>
      </div>
    `;
  }

  // 事件
  private renderEvents(): string {
    const world = this.engine.world;
    if (!world) return '';

    const events = world.eventLog.slice(-30).reverse();

    return `
      <div class="view-content">
        <h2 class="view-title">📜 事件</h2>
        ${events.length === 0 ? '<div class="empty-state">暂无事件</div>' : ''}
        <div class="events-list">
          ${events.map(evt => {
            const color = evt.type === 'war' ? '#c9a0a0' : evt.type === 'event' ? '#c9a84c' : '#8a7e6b';
            return `<div class="event-card" style="color:${color}">${evt.msg}</div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  // 存档
  private renderSaveScreen(): string {
    const slots = [0, 1, 2, 3, 4];
    
    return `
      <div class="view-content">
        <h2 class="view-title">💾 存档</h2>
        <div class="save-list">
          ${slots.map(slot => {
            const info = this.engine.getSaveInfo(slot);
            if (info.exists) {
              return `
                <div class="save-card" onclick="window.game.saveGame(${slot})">
                  <div class="save-slot">存档位 ${slot + 1}</div>
                  <div class="save-info">${info.playerName} — ${info.dateStr} | 回合 ${info.turn}</div>
                  <div class="save-date">${info.date}</div>
                </div>
              `;
            } else {
              return `
                <div class="save-card empty" onclick="window.game.saveGame(${slot})">
                  <div class="save-slot">存档位 ${slot + 1} — 空</div>
                </div>
              `;
            }
          }).join('')}
        </div>
      </div>
    `;
  }

  // 读档
  private renderLoadScreen(): string {
    const slots = [0, 1, 2, 3, 4];
    
    return `
      <div class="view-content">
        <h2 class="view-title">📜 读取存档</h2>
        <div class="save-list">
          ${slots.map(slot => {
            const info = this.engine.getSaveInfo(slot);
            if (info.exists) {
              return `
                <div class="save-card" onclick="window.game.loadGame(${slot})">
                  <div class="save-slot">存档位 ${slot + 1}</div>
                  <div class="save-info">${info.playerName} — ${info.dateStr} | 回合 ${info.turn}</div>
                </div>
              `;
            } else {
              return `
                <div class="save-card empty">
                  <div class="save-slot">存档位 ${slot + 1} — 空</div>
                </div>
              `;
            }
          }).join('')}
        </div>
        <button class="btn" onclick="window.game.setView('title')">← 返回</button>
      </div>
    `;
  }

  // 显示对话框
  showDialog(title: string, msg: string, onConfirm?: () => void): void {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog-box">
        <h3>${title}</h3>
        <p>${msg}</p>
        <div class="dialog-buttons">
          ${onConfirm ? `<button class="btn btn-primary" id="dialog-confirm">确认</button>` : ''}
          <button class="btn" id="dialog-close">${onConfirm ? '取消' : '确定'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    document.getElementById('dialog-close')?.addEventListener('click', () => {
      dialog.remove();
    });

    if (onConfirm) {
      document.getElementById('dialog-confirm')?.addEventListener('click', () => {
        onConfirm();
        dialog.remove();
      });
    }
  }

  // 领地详情
  renderCountyDetail(countyId: string): string {
    const world = this.engine.world;
    const county = world?.counties.get(countyId);
    const player = world?.getPlayer();
    if (!world || !county || !player) return '';

    const isPlayer = county.ownerId === player.id;

    return `
      <div class="view-content">
        <h2 class="view-title">🏰 ${county.name}</h2>
        <div class="card">
          <div class="card-header">📋 领地信息</div>
          <div class="card-body">
            <div class="info-row"><span class="label">文化</span><span class="value">${county.culture}</span></div>
            <div class="info-row"><span class="label">宗教</span><span class="value">${county.religion}</span></div>
            <div class="info-row"><span class="label">地形</span><span class="value">${county.terrain}</span></div>
            <div class="info-row"><span class="label">人口</span><span class="value">${county.population.toLocaleString()}</span></div>
            <div class="info-row"><span class="label">发展度</span><span class="value">${Math.round(county.development)}%</span></div>
            <div class="info-row"><span class="label">控制度</span><span class="value">${Math.round(county.control)}%</span></div>
            <div class="info-row"><span class="label">幸福度</span><span class="value">${Math.round(county.happiness)}%</span></div>
            <div class="info-row"><span class="label">动乱</span><span class="value">${Math.round(county.unrest)}%</span></div>
            <div class="info-row"><span class="label">忠诚度</span><span class="value">${Math.round(county.loyalty)}%</span></div>
          </div>
        </div>
        ${isPlayer ? `
          <div class="action-buttons">
            <button class="btn btn-primary" onclick="window.game.developCounty('${countyId}')">📈 发展 (50金)</button>
            <button class="btn btn-primary" onclick="window.game.improveControl('${countyId}')">🛡️ 加强控制 (30金)</button>
            <button class="btn btn-primary" onclick="window.game.pacifyPopulace('${countyId}')">🕊️ 安抚民众 (20金)</button>
          </div>
        ` : ''}
        <button class="btn" onclick="window.game.setView('domain')">← 返回</button>
      </div>
    `;
  }
}