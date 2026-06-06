// ==================== 游戏常量 ====================

import type { TerrainType } from '../types';

export const MAP_COLS = 200;
export const MAP_ROWS = 130;
export const CELL_SIZE = 20;
export const CACHE_SCALE = 4;

export const STATS = ['martial', 'diplomacy', 'stewardship', 'intrigue', 'learning', 'prowess'] as const;

export const STAT_NAMES: Record<string, string> = {
  martial: '军事',
  diplomacy: '外交',
  stewardship: '管理',
  intrigue: '谋略',
  learning: '学识',
  prowess: '勇武'
};

export const STAT_ICONS: Record<string, string> = {
  martial: '⚔️',
  diplomacy: '🤝',
  stewardship: '🏛️',
  intrigue: '🗡️',
  learning: '📚',
  prowess: '🛡️'
};

export const STAT_COLORS: Record<string, string> = {
  martial: '#e8a0a0',
  diplomacy: '#a0c0e8',
  stewardship: '#a0e8a0',
  intrigue: '#d0a0e8',
  learning: '#e8d0a0',
  prowess: '#e8a080'
};

export const TERRAIN_CN: Record<TerrainType, string> = {
  plains: '平原',
  farmland: '农田',
  forest: '森林',
  hills: '丘陵',
  mountains: '山地',
  desert: '沙漠',
  desert_mountains: '沙漠山地',
  jungle: '丛林',
  marsh: '沼泽',
  steppe: '草原',
  flood_plains: '泛滥平原',
  oasis: '绿洲',
  drylands: '旱地',
  wetlands: '湿地',
  taiga: '针叶林',
  snow: '雪地',
  snow_mountains: '雪山',
  coastal: '海岸',
  water: '水域'
};

export const TERRAIN_COLORS: Record<TerrainType, [number, number, number]> = {
  plains: [153, 186, 102],
  farmland: [170, 200, 120],
  forest: [100, 140, 80],
  hills: [184, 161, 120],
  mountains: [138, 128, 120],
  desert: [232, 199, 135],
  desert_mountains: [200, 170, 120],
  jungle: [60, 120, 60],
  marsh: [120, 160, 140],
  steppe: [180, 190, 120],
  flood_plains: [160, 200, 140],
  oasis: [140, 200, 120],
  drylands: [200, 180, 140],
  wetlands: [100, 150, 130],
  taiga: [80, 120, 100],
  snow: [232, 232, 240],
  snow_mountains: [217, 219, 224],
  coastal: [180, 200, 160],
  water: [51, 102, 171]
};

export const TRAIT_NAMES: Record<string, string> = {
  just: '公正',
  diligent: '勤奋',
  ambitious: '野心勃勃',
  brave: '勇敢',
  calm: '冷静',
  content: '知足',
  craven: '怯懦',
  deceitful: '狡诈',
  fickle: '反复无常',
  generous: '慷慨',
  greedy: '贪婪',
  gregarious: '合群',
  honest: '诚实',
  humble: '谦逊',
  impatient: '急躁',
  lazy: '懒惰',
  paranoid: '偏执',
  patient: '耐心',
  shy: '害羞',
  stubborn: '固执',
  temperate: '节制',
  trusting: '轻信',
  vengeful: '复仇心重',
  zealous: '狂热',
  cynical: '愤世嫉俗',
  arrogant: '傲慢',
  compassionate: '慈悲',
  sadistic: '虐待狂',
  wrathful: '暴怒'
};

export const FIRST_NAMES = [
  '埃德温','埃塞尔','贝奥武夫','埃塞尔伯特','阿尔弗雷德','哈罗德','戈德温',
  '利奥弗里克','西沃德','托斯蒂格','莫德','玛蒂尔达','埃莉诺','伊莎贝拉',
  '琼','玛格丽特','玛丽','安妮','凯瑟琳','伊丽莎白','亨利','威廉','理查',
  '约翰','爱德华','乔治','詹姆斯','查尔斯','罗伯特','托马斯','沃尔特',
  '休','罗杰','吉尔伯特','斯蒂芬','菲利普','路易','查理曼','奥托',
  '弗雷德里克','马克西米利安','鲁道夫','西吉斯蒙德','瓦茨拉夫','波列斯瓦夫'
];

export const LAST_NAMES = [
  '威塞克斯','麦西亚','诺森布里亚','东盎格利亚','肯特','萨塞克斯','埃塞克斯',
  '威塞克斯','戈德温森','哈罗德森','诺曼底','安茹','金雀花','兰开斯特',
  '约克','都铎','斯图亚特','汉诺威','萨克森','巴伐利亚','勃兰登堡',
  '霍亨索伦','哈布斯堡','卢森堡','维特尔斯巴赫','韦尔夫','阿斯坎尼'
];

export const CULTURES = [
  '英格兰','撒克逊','诺曼','法兰西','德意志','意大利','西班牙','北欧'
];

export const RELIGIONS = [
  '天主教','东正教','伊斯兰','异教','犹太教'
];

export const COUNTY_NAMES = [
  '威塞克斯','麦西亚','诺森布里亚','东盎格利亚','肯特','萨塞克斯',
  '埃塞克斯','威塞克斯','德文','康沃尔','多塞特','萨默塞特',
  '威尔特郡','伯克郡','汉普郡','赫里福德','伍斯特','沃里克',
  '莱斯特','北安普顿','剑桥','诺福克','萨福克','林肯',
  '约克','兰开夏','坎伯兰','诺森伯兰','达勒姆','柴郡',
  '斯塔福德','什罗普郡','赫特福德','贝德福德','白金汉','牛津',
  '格洛斯特','萨里','米德尔塞克斯','伦敦','肯特','苏塞克斯'
];
