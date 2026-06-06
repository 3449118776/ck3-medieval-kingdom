// ==================== 游戏主入口（优化版）====================

import { GameEngine } from './core/GameEngine';
import { CK3Renderer } from './ui/CK3Renderer';
import './styles/ck3-layout.css';

// 动态导入Leaflet（懒加载）
let LeafletMapRenderer: typeof import('./ui/LeafletMapRenderer').LeafletMapRenderer | null = null;

class GameApp {
  engine: GameEngine;
  renderer: CK3Renderer;
  mapRenderer: any = null;

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

  // 懒加载地图渲染器
  private async loadMapRenderer(): Promise<any> {
    if (!LeafletMapRenderer) {
      const mod = await import('./ui/LeafletMapRenderer');
      LeafletMapRenderer = mod.LeafletMapRenderer;
      // 动态加载Leaflet CSS
      await import('leaflet/dist/leaflet.css');
    }
    return LeafletMapRenderer;
  }

  async setView(view: string): Promise<void> {
    // 清理地图
    if (this.mapRenderer) {
      this.mapRenderer.destroy();
      this.mapRenderer = null;
    }

    this.engine.currentView = view as any;
    this.renderer.render();

    // 初始化Leaflet地图（懒加载）
    if (view === 'map' && this.engine.mapSystem) {
      setTimeout(async () => {
        const container = document.getElementById('map-container');
        const ms = this.engine.mapSystem;
        if (container && ms) {
          const MapRendererClass = await this.loadMapRenderer();
          this.mapRenderer = new MapRendererClass(this.engine, ms);
          this.mapRenderer.init(container);
        }
      }, 50);
    }
  }

  async startNewGame(): Promise<void> {
    try {
      this.renderer.render();
      this.showLoading('正在生成世界...');

      setTimeout(async () => {
        try {
          this.engine.startNewGame();
          this.engine.currentView = 'map' as any;
          this.renderer.render();
          this.updateLoadingTip('正在渲染地图...');

          if (this.engine.mapSystem) {
            setTimeout(async () => {
              const container = document.getElementById('map-container');
              const ms = this.engine.mapSystem;
              if (container && ms) {
                const MapRendererClass = await this.loadMapRenderer();
                this.mapRenderer = new MapRendererClass(this.engine, ms);
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
    if (this.engine.currentView === 'map') {
      const world = this.engine.world;
      const player = world?.getPlayer();
      const titleName = player?.domain_titles.length ? player.domain_titles[0].name : '无领地';
      const hint = document.querySelector('.bottom-hint');
      if (hint) hint.textContent = `${titleName} · ${world?.getDateStr() || ''}`;
      
      const dateEl = document.querySelector('.top-date');
      if (dateEl) dateEl.textContent = world?.getDateStr() || '';

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

  async loadGame(slot: number): Promise<void> {
    const result = this.engine.loadGame(slot);
    if (result.success) {
      this.engine.currentView = 'map' as any;
      this.renderer.render();
      this.showLoading('正在读取存档...');

      setTimeout(async () => {
        this.updateLoadingTip('正在渲染地图...');
        if (this.engine.mapSystem) {
          setTimeout(async () => {
            const container = document.getElementById('map-container');
            const ms = this.engine.mapSystem;
            if (container && ms) {
              const MapRendererClass = await this.loadMapRenderer();
              this.mapRenderer = new MapRendererClass(this.engine, ms);
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
    const overlay = document.querySelector('.content-overlay .content-scroll');
    if (overlay) {
      overlay.innerHTML = this.renderer.renderCountyDetail(countyId);
    } else {
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

// ==================== 横屏锁定 ====================
function lockOrientation(): void {
  // 尝试使用Screen Orientation API锁定横屏
  const screenAny = screen as any;
  if (screenAny.orientation && screenAny.orientation.lock) {
    screenAny.orientation.lock('landscape').catch(() => {
      // 如果API不支持，使用CSS兜底
      console.log('Screen Orientation API not supported, using CSS fallback');
    });
  }

  // iOS Safari专用：监听方向变化
  window.addEventListener('orientationchange', () => {
    const orientation = (screen as any).orientation || window.orientation;
    if (orientation === 0 || orientation === 180) {
      // 竖屏状态
      document.body.style.transform = 'rotate(90deg)';
      document.body.style.transformOrigin = 'center center';
    } else {
      document.body.style.transform = '';
    }
  });
}

// ==================== 启动游戏 ====================
const app = new GameApp();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
    lockOrientation();
  });
} else {
  app.init();
  lockOrientation();
}

// ==================== PWA自动更新 ====================
let updateAvailable = false;

function showUpdateNotification(): void {
  // 创建更新提示条
  let bar = document.getElementById('update-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'update-bar';
    bar.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0;
      background: linear-gradient(90deg, #c9a84c, #d4af37);
      color: #1a1410;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      animation: slideDown 0.3s ease;
    `;
    document.body.appendChild(bar);
  }
  bar.innerHTML = `
    <span>🔄 发现新版本！点击更新获取最新内容</span>
    <button id="update-btn" style="
      background: #1a1410;
      color: #c9a84c;
      border: 1px solid #c9a84c;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
    ">立即更新</button>
  `;
  bar.style.display = 'flex';

  const btn = document.getElementById('update-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      // 触发页面刷新以加载新版本
      window.location.reload();
    });
  }
}

// 注册Service Worker并监听更新
if ('serviceWorker' in navigator) {
  const swPath = import.meta.env.BASE_URL ? import.meta.env.BASE_URL + 'sw.js' : '/sw.js';

  navigator.serviceWorker.register(swPath).then((registration) => {
    // 监听新的Service Worker安装
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 有新的SW等待激活
            updateAvailable = true;
            showUpdateNotification();
          }
        });
      }
    });

    // 定期检查更新（每30分钟）
    setInterval(() => {
      registration.update().catch(() => {});
    }, 30 * 60 * 1000);

  }).catch(() => {});

  // 监听来自SW的消息（当SW发现更新时）
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
      updateAvailable = true;
      showUpdateNotification();
    }
  });
}

// 页面可见性变化时检查更新
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update().catch(() => {});
    });
  }
});

// 防止移动端默认行为
document.addEventListener('contextmenu', (e) => e.preventDefault());

// 添加slideDown动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }
`;
document.head.appendChild(style);

export default app;
