// ==================== 游戏主入口 ====================

import { GameEngine } from './core/GameEngine';
import { CK3Renderer } from './ui/CK3Renderer';
import { LeafletMapRenderer } from './ui/LeafletMapRenderer';
import 'leaflet/dist/leaflet.css';
import './styles/ck3-layout.css';

class GameApp {
  engine: GameEngine;
  renderer: CK3Renderer;
  mapRenderer: LeafletMapRenderer | null = null;

  constructor() {
    this.engine = new GameEngine();
    this.renderer = new CK3Renderer('app', this.engine);
    this.setupGlobalMethods();
  }

  private setupGlobalMethods(): void {
    (window as any).game = {
      setView: (view: string) => this.setView(view as any),
      startNewGame: () => this.startNewGame(),
      endTurn: () => this.endTurn(),
      saveGame: (slot: number) => this.saveGame(slot),
      loadGame: (slot: number) => this.loadGame(slot),
      showCountyDetail: (id: string) => this.showCountyDetail(id),
      showCharDetail: (id: string) => this.showCharDetail(id),
      developCounty: (id: string) => this.developCounty(id),
      improveControl: (id: string) => this.improveControl(id),
      pacifyPopulace: (id: string) => this.pacifyPopulace(id),
    };
  }

  init(): void {
    this.renderer.render();
    // 隐藏初始加载画面
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
      setTimeout(() => loading.remove(), 500);
    }
  }

  setView(view: string): void {
    // 清理地图
    if (this.mapRenderer) {
      this.mapRenderer.destroy();
      this.mapRenderer = null;
    }

    this.engine.currentView = view as any;
    this.renderer.render();

    // 初始化Leaflet地图
    if (view === 'map' && this.engine.mapSystem) {
      setTimeout(() => {
        const container = document.getElementById('map-container');
        const ms = this.engine.mapSystem;
        if (container && ms) {
          this.mapRenderer = new LeafletMapRenderer(this.engine, ms);
          this.mapRenderer.init(container);
        }
      }, 50);
    }
  }

  startNewGame(): void {
    try {
      // 显示加载界面
      this.renderer.render(); // 先渲染UI框架
      this.showLoading('正在生成世界...');

      // 延迟执行，让加载界面先显示
      setTimeout(() => {
        try {
          this.engine.startNewGame();
          this.engine.currentView = 'map' as any;
          this.renderer.render();
          this.updateLoadingTip('正在渲染地图...');

          // 初始化Leaflet地图
          if (this.engine.mapSystem) {
            setTimeout(() => {
              const container = document.getElementById('map-container');
              const ms = this.engine.mapSystem;
              if (container && ms) {
                this.mapRenderer = new LeafletMapRenderer(this.engine, ms);
                this.mapRenderer.init(container);
                this.hideLoading();
              }
            }, 100);
          } else {
            this.hideLoading();
          }
        } catch (e) {
          this.hideLoading();
          console.error('启动游戏失败:', e);
          this.renderer.showDialog('游戏启动失败', '请刷新页面重试');
        }
      }, 200);
    } catch (e) {
      console.error('启动游戏失败:', e);
      this.renderer.showDialog('游戏启动失败', '请刷新页面重试');
    }
  }

  endTurn(): void {
    this.engine.endTurn();
    // 地图视图时只更新悬浮面板，不重建地图
    if (this.engine.currentView === 'map') {
      // 重新渲染悬浮面板
      const world = this.engine.world;
      const player = world?.getPlayer();
      const titleName = player?.domain_titles.length ? player.domain_titles[0].name : '无领地';
      const hint = document.querySelector('.bottom-hint');
      if (hint) hint.textContent = `${titleName} · ${world?.getDateStr() || ''}`;
      
      const dateEl = document.querySelector('.top-date');
      if (dateEl) dateEl.textContent = world?.getDateStr() || '';

      // 更新资源
      if (player) {
        const vals = document.querySelectorAll('.res-val');
        if (vals[0]) vals[0].textContent = Math.floor(player.treasury).toString();
        if (vals[1]) vals[1].textContent = player.prestige.toString();
        if (vals[2]) vals[2].textContent = player.piety.toString();
        if (vals[3]) vals[3].textContent = `R${world?.playedTurns || 0}`;
      }
    } else {
      this.renderer.render();
    }
  }

  saveGame(slot: number): void {
    const result = this.engine.saveGame(slot);
    if (result.success) {
      this.renderer.showDialog('保存成功', `已保存到存档位 ${slot + 1}`);
      if (this.engine.currentView === 'save') this.renderer.render();
    } else {
      this.renderer.showDialog('保存失败', result.error || '无法保存');
    }
  }

  loadGame(slot: number): void {
    const result = this.engine.loadGame(slot);
    if (result.success) {
      this.engine.currentView = 'map' as any;
      this.renderer.render();
      this.showLoading('正在读取存档...');

      setTimeout(() => {
        this.updateLoadingTip('正在渲染地图...');
        if (this.engine.mapSystem) {
          setTimeout(() => {
            const container = document.getElementById('map-container');
            const ms = this.engine.mapSystem;
            if (container && ms) {
              this.mapRenderer = new LeafletMapRenderer(this.engine, ms);
              this.mapRenderer.init(container);
              this.hideLoading();
            }
          }, 100);
        } else {
          this.hideLoading();
        }
      }, 200);
    } else {
      this.renderer.showDialog('读取失败', result.error || '存档无法读取');
    }
  }

  showCountyDetail(countyId: string): void {
    // 在内容覆盖层显示
    const overlay = document.querySelector('.content-overlay .content-scroll');
    if (overlay) {
      overlay.innerHTML = this.renderer.renderCountyDetail(countyId);
    } else {
      // 如果没有覆盖层，创建一个
      const gameContainer = document.querySelector('.game-container');
      if (gameContainer) {
        const div = document.createElement('div');
        div.className = 'content-overlay';
        div.innerHTML = `<div class="content-scroll">${this.renderer.renderCountyDetail(countyId)}</div>`;
        gameContainer.appendChild(div);
      }
    }
  }

  showCharDetail(charId: string): void {
    const world = this.engine.world;
    const char = world?.characters.get(charId);
    if (!char) return;
    this.renderer.showDialog(
      char.name,
      `文化: ${char.culture}\n宗教: ${char.religion}\n领地: ${char.domain_titles.length}个`
    );
  }

  developCounty(id: string): void {
    const result = this.engine.developCounty(id);
    if (result.success) {
      this.showCountyDetail(id);
    } else {
      this.renderer.showDialog('操作失败', result.msg || '无法执行');
    }
  }

  improveControl(id: string): void {
    const result = this.engine.improveControl(id);
    if (result.success) {
      this.showCountyDetail(id);
    } else {
      this.renderer.showDialog('操作失败', result.msg || '无法执行');
    }
  }

  pacifyPopulace(id: string): void {
    const result = this.engine.pacifyPopulace(id);
    if (result.success) {
      this.showCountyDetail(id);
    } else {
      this.renderer.showDialog('操作失败', result.msg || '无法执行');
    }
  }

  // 加载界面控制
  private showLoading(tip?: string): void {
    const el = document.getElementById('game-loading');
    if (el) {
      el.style.display = 'flex';
      if (tip) this.updateLoadingTip(tip);
    }
  }

  private hideLoading(): void {
    const el = document.getElementById('game-loading');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.display = 'none';
        el.style.opacity = '';
      }, 300);
    }
  }

  private updateLoadingTip(tip: string): void {
    const el = document.getElementById('game-loading-tip');
    if (el) el.textContent = tip;
  }
}

// 启动游戏
const app = new GameApp();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// 注册Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// 防止移动端默认行为
document.addEventListener('contextmenu', (e) => e.preventDefault());

export default app;
