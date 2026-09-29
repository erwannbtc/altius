import knowledgeRaw from './knowledge.md?raw';
import { normalize } from '../lib/exercises';

// Base de connaissances (couche 2) : injectée en entier pour Claude,
// et par extraits pertinents pour le petit modèle local (contexte limité).

export const KNOWLEDGE = knowledgeRaw;

interface Section {
  title: string;
  keywords: string[];
  text: string;
}

const SECTIONS: Section[] = knowledgeRaw
  .split(/\n(?=## )/)
  .filter((s) => s.startsWith('## '))
  .map((s) => {
    const lines = s.split('\n');
    const title = lines[0].replace(/^## /, '').trim();
    const kwLine = lines.find((l) => l.startsWith('Mots-clés:')) ?? '';
    const keywords = kwLine
      .replace('Mots-clés:', '')
      .split(',')
      .map((k) => normalize(k))
      .filter(Boolean);
    return { title, keywords, text: s.trim() };
  });

/** Sections les plus pertinentes pour une question (recherche par mots-clés). */
export function relevantKnowledge(question: string, max = 2, maxChars = 4500): string {
  const q = normalize(question);
  const words = new Set(q.split(' ').filter((w) => w.length > 2));
  const scored = SECTIONS.map((s) => {
    let score = 0;
    for (const k of s.keywords) {
      if (q.includes(k)) score += 3;
      else if (k.split(' ').some((part) => words.has(part))) score += 1;
    }
    if (words.has(normalize(s.title))) score += 2;
    return { s, score };
  })
    .filter((x) => x.score > 0 && x.s.title !== 'Comment utiliser cette base')
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
  const safety = SECTIONS.find((s) => s.title.startsWith('Sécurité'));
  let out = scored.map((x) => x.s.text).join('\n\n');
  if (safety && !scored.some((x) => x.s === safety)) out += `\n\n${safety.text}`;
  return out.slice(0, maxChars);
}
