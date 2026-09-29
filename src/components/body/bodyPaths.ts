import type { MuscleKey } from '../../lib/types';

// Tracés exacts de la maquette (SPEC §5.4), viewBox 0 0 200 440.
// Ils servent au modèle 3D provisoire (extrusion) et au rendu 2D de secours.

export type PartKind = MuscleKey | 'neutral' | 'head';
export type BodyGroup = 'upper' | 'lower';

export interface BodyPart {
  kind: PartKind;
  group: BodyGroup;
  d?: string;
  ellipse?: [number, number, number, number]; // cx, cy, rx, ry
  rect?: [number, number, number, number, number]; // x, y, w, h, rx
}

const p = (kind: PartKind, group: BodyGroup, d: string): BodyPart => ({ kind, group, d });
const e = (kind: PartKind, group: BodyGroup, cx: number, cy: number, rx: number, ry: number): BodyPart => ({
  kind,
  group,
  ellipse: [cx, cy, rx, ry],
});
const r = (kind: PartKind, group: BodyGroup, x: number, y: number, w: number, h: number, rx: number): BodyPart => ({
  kind,
  group,
  rect: [x, y, w, h, rx],
});

export const SILHOUETTE: BodyPart[] = [
  e('head', 'upper', 100, 32, 17, 21),
  p('neutral', 'upper', 'M90 48 L110 48 L113 66 L87 66 Z'),
  p(
    'neutral',
    'upper',
    'M88 60 L112 60 L128 68 Q140 74 138 104 L132 112 Q130 160 126 192 Q114 202 102 208 L98 208 Q86 202 74 192 Q70 160 68 112 L62 104 Q60 74 72 68 Z',
  ),
  p('neutral', 'upper', 'M64 72 Q48 76 46 100 L44 140 L38 196 L42 218 L48 214 L48 196 L56 144 L62 104 Z'),
  p('neutral', 'upper', 'M136 72 Q152 76 154 100 L156 140 L162 196 L158 218 L152 214 L152 196 L144 144 L138 104 Z'),
  p(
    'neutral',
    'lower',
    'M72 186 Q86 198 98 206 L102 206 Q114 198 128 186 Q134 230 129 282 L127 300 Q133 330 125 370 L129 394 L107 394 L105 300 L102 214 L98 214 L95 300 L93 394 L71 394 L75 370 Q67 330 73 300 L71 282 Q66 230 72 186 Z',
  ),
];

const SHOULDERS = [
  p('shoulders', 'upper', 'M64 72 Q48 76 46 100 Q54 96 62 98 Q66 84 72 76 Z'),
  p('shoulders', 'upper', 'M136 72 Q152 76 154 100 Q146 96 138 98 Q134 84 128 76 Z'),
];

const ARM_UPPER = [
  'M46 103 Q42 120 44 140 Q50 144 56 140 Q60 122 62 102 Q54 99 46 103 Z',
  'M154 103 Q158 120 156 140 Q150 144 144 140 Q140 122 138 102 Q146 99 154 103 Z',
];

const FOREARMS = [
  p('forearms', 'upper', 'M44 144 Q38 168 38 196 Q44 200 48 196 Q56 170 56 144 Q50 148 44 144 Z'),
  p('forearms', 'upper', 'M156 144 Q162 168 162 196 Q156 200 152 196 Q144 170 144 144 Q150 148 156 144 Z'),
];

const HANDS = [e('neutral', 'upper', 43, 208, 6, 10), e('neutral', 'upper', 157, 208, 6, 10)];

const FEET = [
  p('neutral', 'lower', 'M75 378 L91 378 L93 392 Q82 396 71 392 Z'),
  p('neutral', 'lower', 'M125 378 L109 378 L107 392 Q118 396 129 392 Z'),
];

export const FRONT: BodyPart[] = [
  p('traps', 'upper', 'M89 58 Q78 65 66 71 L90 70 Z'),
  p('traps', 'upper', 'M111 58 Q122 65 134 71 L110 70 Z'),
  ...SHOULDERS,
  p('chest', 'upper', 'M98 76 L75 76 Q65 84 65 100 Q71 114 86 114 Q96 112 98 106 Z'),
  p('chest', 'upper', 'M102 76 L125 76 Q135 84 135 100 Q129 114 114 114 Q104 112 102 106 Z'),
  ...ARM_UPPER.map((d) => p('biceps', 'upper', d)),
  ...FOREARMS,
  ...HANDS,
  r('abs', 'upper', 88, 118, 10, 16, 3),
  r('abs', 'upper', 102, 118, 10, 16, 3),
  r('abs', 'upper', 88, 137, 10, 16, 3),
  r('abs', 'upper', 102, 137, 10, 16, 3),
  r('abs', 'upper', 88, 156, 10, 16, 3),
  r('abs', 'upper', 102, 156, 10, 16, 3),
  p('abs', 'upper', 'M89 175 L98 175 L98 200 Q93 196 89 186 Z'),
  p('abs', 'upper', 'M111 175 L102 175 L102 200 Q107 196 111 186 Z'),
  p('abs', 'upper', 'M69 112 Q76 118 85 118 L85 180 Q78 184 74 190 Q71 160 69 112 Z'),
  p('abs', 'upper', 'M131 112 Q124 118 115 118 L115 180 Q122 184 126 190 Q129 160 131 112 Z'),
  p('quads', 'lower', 'M74 196 Q68 230 72 280 Q80 292 94 284 Q98 250 98 208 Q88 202 74 196 Z'),
  p('quads', 'lower', 'M126 196 Q132 230 128 280 Q120 292 106 284 Q102 250 102 208 Q112 202 126 196 Z'),
  e('neutral', 'lower', 84, 292, 8, 6),
  e('neutral', 'lower', 116, 292, 8, 6),
  p('calves', 'lower', 'M74 300 Q70 330 76 370 Q82 378 88 370 Q94 334 92 300 Q84 296 74 300 Z'),
  p('calves', 'lower', 'M126 300 Q130 330 124 370 Q118 378 112 370 Q106 334 108 300 Q116 296 126 300 Z'),
  ...FEET,
];

export const BACK: BodyPart[] = [
  p('traps', 'upper', 'M100 54 L118 64 L136 72 L112 86 L100 122 L88 86 L64 72 L82 64 Z'),
  ...SHOULDERS,
  p('upperBack', 'upper', 'M66 100 Q68 130 78 158 Q86 166 91 170 L91 126 L86 90 Q76 86 66 100 Z'),
  p('upperBack', 'upper', 'M134 100 Q132 130 122 158 Q114 166 109 170 L109 126 L114 90 Q124 86 134 100 Z'),
  r('lowerBack', 'upper', 92, 126, 7, 64, 3),
  r('lowerBack', 'upper', 101, 126, 7, 64, 3),
  ...ARM_UPPER.map((d) => p('triceps', 'upper', d)),
  ...FOREARMS,
  ...HANDS,
  p('glutes', 'lower', 'M74 190 Q72 214 82 222 Q94 224 99 214 L99 198 Q88 192 74 190 Z'),
  p('glutes', 'lower', 'M126 190 Q128 214 118 222 Q106 224 101 214 L101 198 Q112 192 126 190 Z'),
  p('hamstrings', 'lower', 'M74 226 Q70 256 74 284 Q84 292 94 284 Q98 256 97 228 Q86 230 74 226 Z'),
  p('hamstrings', 'lower', 'M126 226 Q130 256 126 284 Q116 292 106 284 Q102 256 103 228 Q114 230 126 226 Z'),
  p('calves', 'lower', 'M74 300 Q66 326 74 354 Q82 364 90 354 Q96 326 92 300 Q84 296 74 300 Z'),
  p('calves', 'lower', 'M126 300 Q134 326 126 354 Q118 364 110 354 Q104 326 108 300 Q116 296 126 300 Z'),
  ...FEET,
];

/** Élément SVG équivalent (pour SVGLoader et le rendu 2D). */
export function partToSvg(part: BodyPart, attrs = ''): string {
  if (part.d) return `<path d="${part.d}" ${attrs}/>`;
  if (part.ellipse) {
    const [cx, cy, rx, ry] = part.ellipse;
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs}/>`;
  }
  const [x, y, w, h, rx] = part.rect!;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" ${attrs}/>`;
}
