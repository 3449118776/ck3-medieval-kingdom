// ==================== 噪声生成器 ====================

export class NoiseGenerator {
  private perm: number[] = [];
  private p: number[] = [];

  constructor(seed: number = Math.random() * 65536) {
    this.initPerm(seed);
  }

  private initPerm(seed: number): void {
    const perm = new Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    
    // Fisher-Yates shuffle with seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    
    this.perm = perm;
    this.p = [...perm, ...perm];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2d(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.p[X] + Y;
    const B = this.p[X + 1] + Y;

    return this.lerp(v,
      this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
      this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1))
    );
  }

  fbm(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let max = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2d(x * frequency, y * frequency);
      max += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / max;
  }

  // 生成地形高度图
  generateElevation(x: number, y: number): number {
    let e = this.fbm(x, y, 6);
    e = Math.pow(Math.abs(e), 1.2);
    
    // 添加边缘衰减
    const dx = (x - 0.5) * 2;
    const dy = (y - 0.5) * 2;
    const edgeDist = 1 - Math.max(Math.abs(dx), Math.abs(dy));
    e *= Math.max(0, Math.min(1, (edgeDist - 0.08) / 0.45));
    
    return e;
  }

  // 生成温度图
  generateTemperature(x: number, y: number): number {
    return this.fbm(x * 2 + 100, y * 2 + 100, 3);
  }

  // 生成湿度图
  generateMoisture(x: number, y: number): number {
    return this.fbm(x * 3 + 200, y * 3 + 200, 3);
  }
}

export function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}
