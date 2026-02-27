// ── Court Dimensions ──
export const COURT_WIDTH = 40;
export const COURT_LENGTH = 60;
export const WALL_HEIGHT = 4;
export const WALL_THICKNESS = 1;
export const GOAL_WIDTH = 8;
export const GOAL_HEIGHT = 3;
export const GOAL_DEPTH = 3;

// ── Physics ──
export const BALL_RADIUS = 0.4;
export const BALL_MASS = 0.45;
export const BALL_RESTITUTION = 0.75;
export const WALL_RESTITUTION = 0.85;
export const PLAYER_RADIUS = 0.6;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_MASS = 75;
export const GRAVITY = -15;

// ── Gameplay ──
export const MATCH_DURATION = 300; // 5 minutes
export const MAX_GINGA = 100;
export const GINGA_CHARGE_RATE = 8; // per second passively
export const GINGA_CHARGE_ON_DRIBBLE = 15;
export const GINGA_CHARGE_ON_PASS = 10;
export const GINGA_COST = 100;
export const SHOOT_POWER = 28;
export const PASS_POWER = 16;
export const PLAYER_SPEED = 12;
export const SPRINT_MULTIPLIER = 1.4;
export const AI_REACTION_DELAY = 0.3;
export const BALL_POSSESSION_DIST = 1.8;

// ── Teams ──
export const TEAM_HOME = 0;
export const TEAM_AWAY = 1;

// ── Legend Roster ──
export const LEGENDS = [
  {
    id: 'pele',
    name: 'Pelé',
    title: 'The King',
    icon: '\u{1F451}',
    country: 'Brazil',
    speed: 80,
    power: 85,
    control: 95,
    color: 0xffcc00,
    specialName: 'King\'s Touch',
    specialDesc: 'Perfect first touch - instant ball control',
  },
  {
    id: 'ronaldinho',
    name: 'Ronaldinho',
    title: 'The Magician',
    icon: '\u{1FA84}',
    country: 'Brazil',
    speed: 85,
    power: 75,
    control: 98,
    color: 0x00cc66,
    specialName: 'Elastico',
    specialDesc: 'Teleport-dribble 3 units forward',
  },
  {
    id: 'r9',
    name: 'Ronaldo R9',
    title: 'The Phenomenon',
    icon: '\u{26A1}',
    country: 'Brazil',
    speed: 92,
    power: 95,
    control: 85,
    color: 0xff4400,
    specialName: 'Unstoppable Force',
    specialDesc: 'Massive momentum - knock defenders away',
  },
  {
    id: 'roberto_carlos',
    name: 'R. Carlos',
    title: 'The Bullet',
    icon: '\u{1F4A5}',
    country: 'Brazil',
    speed: 88,
    power: 99,
    control: 78,
    color: 0x0066ff,
    specialName: 'Banana Bolt',
    specialDesc: 'Extreme curve shot with Magnus effect',
  },
  {
    id: 'neymar',
    name: 'Neymar',
    title: 'The Trickster',
    icon: '\u{1F3AD}',
    country: 'Brazil',
    speed: 93,
    power: 78,
    control: 94,
    color: 0xffff00,
    specialName: 'Rainbow Flick',
    specialDesc: 'Lob the ball over defenders',
  },
  {
    id: 'messi',
    name: 'Messi',
    title: 'The GOAT',
    icon: '\u{1F410}',
    country: 'Argentina',
    speed: 90,
    power: 82,
    control: 99,
    color: 0x75aaff,
    specialName: 'Magnet Touch',
    specialDesc: 'Ball glued to feet - ultra-tight turns',
  },
  {
    id: 'cr7',
    name: 'C. Ronaldo',
    title: 'The Machine',
    icon: '\u{1F4AA}',
    country: 'Portugal',
    speed: 91,
    power: 97,
    control: 88,
    color: 0xff0044,
    specialName: 'Power Header',
    specialDesc: 'Massive jump + downward strike',
  },
];
