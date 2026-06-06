// ==================== CK3风格 UI渲染器 ====================

import type { GameView, Character } from '../types';
import { GameEngine } from '../core/GameEngine';
import { STAT_NAMES, STAT_ICONS, STAT_COLORS, TRAIT_NAMES } from '../utils/constants';

export class CK3Renderer {
  private app: HTMLElement;
  private engine: GameEngine;

  constructor(appId: string, engine: GameEngine) {
    this.app = document.getElementById(appId)!;
    this.engine = engine;
  }

  render(): void {
    const view = this.engine.currentView;
    switch (view) {
      case 'title': this.renderTitle(); break;
      default: this.renderGameView(view); break;
    }
  }

  // ===== 标题画面 =====
  private renderTitle(): void {
    this.app.innerHTML = `
      <div class="title-screen">
        <div class="title-content">
          <div class="title-crown">👑</div>
          <h1 class="title-text">中世纪王国</h1>
          <p class="title-sub">CRUSADER KINGS</p>
          <div class="title-buttons">
            <button class="btn btn-primary btn-large" onclick="window.game.startNewGame()">
              <span>⚔️</span> 开始游戏
            </button>
            <button class="btn" onclick="window.game.setView('load')">
              <span>📜</span> 读取存档
            </button>
          </div>
        </div>
        <div class="title-version">v2.0.0</div>
      </div>
    `;
  }

  // ===== 游戏主视图 =====
  private renderGameView(view: GameView): void {
    const world = this.engine.world;
    const player = world?.getPlayer();
    const isMapView = view === 'map';

    this.app.innerHTML = `
      <div class="game-container">
        ${isMapView ? '<div class="map-fullscreen" id="map-container"></div>' : ''}
        ${this.renderTopBar()}
        ${isMapView ? this.renderFloatingPanels(player) : ''}
        ${this.renderTabBar(view)}
        ${this.renderBottomBar()}
        ${!isMapView ? `<div class="content-overlay"><div class="content-scroll">${this.renderContent(view)}</div></div>` : ''}
        <div class="game-loading-overlay" id="game-loading" style="display:none">
          <div class="game-loading-box">
            <div class="game-loading-icon">⚔️</div>
            <div class="game-loading-title">加载中...</div>
            <div class="game-loading-bar"><div class="game-loading-bar-inner"></div></div>
            <div class="game-loading-tip" id="game-loading-tip">正在生成世界...</div>
          </div>
        </div>
      </div>
    `;
  }

  // ===== CK3顶部栏 =====
  private renderTopBar(): string {
    const world = this.engine.world;
    const player = world?.getPlayer();
    if (!world || !player) return '';

    return `
      <div class="top-bar">
        <div class="top-date">${world.getDateStr()}</div>
        <div class="top-resources">
          <div class="resource"><span class="res-icon">🪙</span><span class="res-val">${Math.floor(player.treasury)}</span></div>
          <div class="resource"><span class="res-icon">👑</span><span class="res-val">${player.prestige}</span></div>
          <div class="resource"><span class="res-icon">⛪</span><span class="res-val">${player.piety}</span></div>
          <div class="resource"><span class="res-icon">📅</span><span class="res-val">R${world.playedTurns}</span></div>
        </div>
      </div>
    `;
  }

  // ===== CK3底部栏 =====
  private renderBottomBar(): string {
    const world = this.engine.world;
    const player = world?.getPlayer();
    const titleName = player?.domain_titles.length ? player.domain_titles[0].name : '无领地';
    return `
      <div class="bottom-bar">
        <div class="bottom-hint">${titleName} · ${world?.getDateStr() || ''}</div>
        <button class="end-turn-btn" onclick="window.game.endTurn()">
          <span>⏭️</span> 结束回合
        </button>
      </div>
    `;
  }

  // ===== CK3底部标签栏 =====
  private renderTabBar(active: GameView): string {
    const tabs = [
      { view: 'map' as GameView, icon: '🗺️', label: '地图' },
      { view: 'domain' as GameView, icon: '🏰', label: '领地' },
      { view: 'diplomacy' as GameView, icon: '🤝', label: '外交' },
      { view: 'military' as GameView, icon: '⚔️', label: '军事' },
      { view: 'economy' as GameView, icon: '💰', label: '经济' },
      { view: 'events' as GameView, icon: '📜', label: '事件' },
      { view: 'save' as GameView, icon: '💾', label: '存档' },
    ];

    return `
      <div class="tab-bar">
        ${tabs.map(t => `
          <button class="tab-btn ${active === t.view ? 'active' : ''}" onclick="window.game.setView('${t.view}')">
            <span class="tab-icon">${t.icon}</span>
            <span class="tab-label">${t.label}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  // ===== 悬浮面板（地图视图时显示） =====
  private renderFloatingPanels(player: Character | null | undefined): string {
    if (!player) return '';

    const titleName = player.domain_titles.length > 0 ? player.domain_titles[0].name : '无领地';

    // 属性条
    let statsHtml = '';
    for (const stat of ['martial', 'diplomacy', 'stewardship', 'intrigue', 'learning', 'prowess'] as const) {
      const val = Math.round(player.skills[stat] || 0);
      const pct = Math.min(100, val * 4);
      statsHtml += `
        <div class="stat-bar-row">
          <span class="stat-bar-icon">${STAT_ICONS[stat]}</span>
          <div class="stat-bar-track">
            <div class="stat-bar-fill" style="width:${pct}%;background:${STAT_COLORS[stat]}"></div>
          </div>
          <span class="stat-bar-val">${val}</span>
        </div>
      `;
    }

    // 特质
    let traitsHtml = '';
    if (player.traits?.length) {
      traitsHtml = `
        <div class="traits-row">
          ${player.traits.slice(0, 5).map(t => `<span class="trait-tag">${TRAIT_NAMES[t] || t}</span>`).join('')}
        </div>
      `;
    }

    // 迷你信息面板
    const income = player.income_per_month || 0;
    let totalLevy = 0, totalPop = 0;
    for (const cty of player.domain_titles) {
      totalLevy += cty.levy_base;
      totalPop += cty.population;
    }

    return `
      <div class="floating-panel char-panel">
        <div class="char-panel-header">
          <div class="char-portrait">
            <span class="portrait-emoji">${titleName.charAt(0) || '👑'}</span>
          </div>
          <div class="char-info">
            <div class="char-name">${player.name}</div>
            <div class="char-title">${titleName} 领主</div>
          </div>
        </div>
        <div class="stat-bars">${statsHtml}</div>
        ${traitsHtml}
      </div>

      <div class="floating-panel mini-panel">
        <div class="mini-panel-title">📊 概况</div>
        <div class="mini-info-row"><span class="label">月收入</span><span class="value" style="color:${income >= 0 ? '#7cb87c' : '#c9a0a0'}">${income >= 0 ? '+' : ''}${Math.floor(income)}</span></div>
        <div class="mini-info-row"><span class="label">征召兵</span><span class="value">${totalLevy}</span></div>
        <div class="mini-info-row"><span class="label">总人口</span><span class="value">${(totalPop / 1000).toFixed(1)}k</span></div>
        <div class="mini-info-row"><span class="label">领地</span><span class="value">${player.domain_titles.length}</span></div>
      </div>
    `;
  }

  // ===== 内容面板（非地图视图） =====
  private renderContent(view: GameView): string {
    switch (view) {
      case 'domain': return this.renderDomain();
      case 'diplomacy': return this.renderDiplomacy();
      case 'military': return this.renderMilitary();
      case 'economy': return this.renderEconomy();
      case 'events': return this.renderEvents();
      case 'save': return this.renderSave();
      case 'load': return this.renderLoad();
      default: return '';
    }
  }

  // 领地概览
  private renderDomain(): string {
    const world = this.engine.world;
    const player = world?.getPlayer();
    if (!world || !player) return '<div class="empty-state">游戏未开始</div>';

    const income = player.income_per_month || 0;
    let totalLevy = 0, totalGarrison = 0;
    for (const cty of player.domain_titles) {
      totalLevy += cty.levy_base;
      totalGarrison += cty.garrison;
    }

    return `
      <h2 class="view-title">🏰 领地概览</h2>
      <div class="card">
        <div class="card-header">📊 国库</div>
        <div class="card-body">
          <div class="info-row"><span class="label">金币</span><span class="value" style="color:#ffd700">${Math.floor(player.treasury)}</span></div>
          <div class="info-row"><span class="label">月收入</span><span class="value" style="color:${income >= 0 ? '#7cb87c' : '#c9a0a0'}">${income >= 0 ? '+' : ''}${Math.floor(income)}</span></div>
          <div class="info-row"><span class="label">声望</span><span class="value">${player.prestige}</span></div>
          <div class="info-row"><span class="label">虔诚</span><span class="value">${player.piety}</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">⚔️ 军事</div>
        <div class="card-body">
          <div class="info-row"><span class="label">征召兵</span><span class="value" style="color:#c9a0a0">${totalLevy}</span></div>
          <div class="info-row"><span class="label">驻军</span><span class="value">${totalGarrison}</span></div>
          <div class="info-row"><span class="label">军事</span><span class="value" style="color:#c9a0a0">${Math.round(player.skills.martial)}</span></div>
        </div>
      </div>
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
  }

  // 外交
  private renderDiplomacy(): string {
    const world = this.engine.world;
    const player = world?.getPlayer();
    if (!world || !player) return '';

    const others = Array.from(world.characters.values()).filter(c => c.id !== player.id);
    return `
      <h2 class="view-title">🤝 外交</h2>
      <div class="diplomacy-list">
        ${others.map(c => {
          const rel = Math.floor(50 + (c.skills.diplomacy || 5) * 3 - (player.skills.diplomacy || 5) * 2 + Math.random() * 10);
          const label = rel >= 70 ? '友好' : rel >= 40 ? '中立' : rel >= 20 ? '冷淡' : '敌对';
          const color = rel >= 70 ? '#7cb87c' : rel >= 40 ? '#d4c9b0' : rel >= 20 ? '#e8a040' : '#c9a0a0';
          return `
            <div class="diplomacy-card" onclick="window.game.showCharDetail('${c.id}')">
              <div class="dip-avatar">🏰</div>
              <div class="dip-info">
                <div class="dip-name">${c.name}</div>
                <div class="dip-culture">${c.culture} · ${c.domain_titles.length ? c.domain_titles[0].name : '-'}</div>
              </div>
              <div class="dip-relation">
                <div class="relation-label" style="color:${color}">${label}</div>
                <div class="relation-val">${rel}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 军事
  private renderMilitary(): string {
    const world = this.engine.world;
    const player = world?.getPlayer();
    if (!world || !player) return '';

    let totalLevy = 0, totalGarrison = 0;
    for (const cty of player.domain_titles) { totalLevy += cty.levy_base; totalGarrison += cty.garrison; }

    return `
      <h2 class="view-title">⚔️ 军事</h2>
      <div class="card">
        <div class="card-header">📊 军力</div>
        <div class="card-body">
          <div class="info-row"><span class="label">征召兵</span><span class="value" style="color:#c9a0a0">${totalLevy}</span></div>
          <div class="info-row"><span class="label">驻军</span><span class="value">${totalGarrison}</span></div>
          <div class="info-row"><span class="label">军事能力</span><span class="value" style="color:#c9a0a0">${Math.round(player.skills.martial)}</span></div>
          <div class="info-row"><span class="label">勇武</span><span class="value">${Math.round(player.skills.prowess)}</span></div>
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
    let totalTax = 0, totalTrade = 0;
    for (const cty of player.domain_titles) {
      totalTax += cty.tax_base * (cty.control / 100);
      totalTrade += cty.tradeIncome || 0;
    }

    return `
      <h2 class="view-title">💰 经济</h2>
      <div class="card">
        <div class="card-header">📊 财政</div>
        <div class="card-body">
          <div class="info-row"><span class="label">金币</span><span class="value" style="color:#ffd700">${Math.floor(player.treasury)}</span></div>
          <div class="info-row"><span class="label">月收入</span><span class="value" style="color:${income >= 0 ? '#7cb87c' : '#c9a0a0'}">${income >= 0 ? '+' : ''}${Math.floor(income)}</span></div>
          <div class="info-row"><span class="label">税收</span><span class="value">${Math.floor(totalTax)}</span></div>
          <div class="info-row"><span class="label">贸易</span><span class="value">${Math.floor(totalTrade)}</span></div>
          <div class="info-row"><span class="label">管理能力</span><span class="value">${Math.round(player.skills.stewardship)}</span></div>
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
      <h2 class="view-title">📜 事件日志</h2>
      ${events.length === 0 ? '<div class="empty-state">暂无事件</div>' : ''}
      <div class="events-list">
        ${events.map(evt => {
          const color = evt.type === 'war' ? '#c9a0a0' : evt.type === 'event' ? '#c9a84c' : '#8a7e6b';
          return `<div class="event-card" style="color:${color}">${evt.msg}</div>`;
        }).join('')}
      </div>
    `;
  }

  // 存档
  private renderSave(): string {
    return `
      <h2 class="view-title">💾 存档</h2>
      <div class="save-list">
        ${[0,1,2,3,4].map(slot => {
          const info = this.engine.getSaveInfo(slot);
          return info.exists
            ? `<div class="save-card" onclick="window.game.saveGame(${slot})"><div class="save-slot">存档位 ${slot+1}</div><div class="save-info">${info.playerName} — ${info.dateStr} | R${info.turn}</div></div>`
            : `<div class="save-card empty" onclick="window.game.saveGame(${slot})"><div class="save-slot">存档位 ${slot+1} — 空</div></div>`;
        }).join('')}
      </div>
    `;
  }

  // 读档
  private renderLoad(): string {
    return `
      <h2 class="view-title">📜 读取存档</h2>
      <div class="save-list">
        ${[0,1,2,3,4].map(slot => {
          const info = this.engine.getSaveInfo(slot);
          return info.exists
            ? `<div class="save-card" onclick="window.game.loadGame(${slot})"><div class="save-slot">存档位 ${slot+1}</div><div class="save-info">${info.playerName} — ${info.dateStr} | R${info.turn}</div></div>`
            : `<div class="save-card empty"><div class="save-slot">存档位 ${slot+1} — 空</div></div>`;
        }).join('')}
      </div>
      <button class="btn" onclick="window.game.setView('title')" style="margin-top:12px">← 返回</button>
    `;
  }

  // 领地详情
  renderCountyDetail(countyId: string): string {
    const world = this.engine.world;
    const county = world?.counties.get(countyId);
    const player = world?.getPlayer();
    if (!world || !county || !player) return '';

    const isPlayer = county.ownerId === player.id;
    return `
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
    `;
  }

  // 对话框
  showDialog(title: string, msg: string, onConfirm?: () => void): void {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog-box">
        <h3>${title}</h3>
        <p>${msg}</p>
        <div class="dialog-buttons">
          ${onConfirm ? '<button class="btn btn-primary" id="dialog-confirm">确认</button>' : ''}
          <button class="btn" id="dialog-close">${onConfirm ? '取消' : '确定'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    document.getElementById('dialog-close')?.addEventListener('click', () => dialog.remove());
    if (onConfirm) {
      document.getElementById('dialog-confirm')?.addEventListener('click', () => { onConfirm(); dialog.remove(); });
    }
  }
}
