/**
 * Подстановка переводов в текст серверно-отрендеренных страниц.
 *
 * Ключ подставляется только на границе слова: короткие слова не должны
 * «съедать» середину длинных — «сум» не превращает «сумма» в «so'mма»,
 * а «Все» — «Всего» в «Barchasigo». Порядок — от длинных ключей к коротким,
 * чтобы целые фразы («Все заказы») выигрывали у своих слов-частей («Все»).
 */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function translateText(text: string, dict: Record<string, string>): string {
  const trimmed = text.trim();
  if (!trimmed) return text;

  // Exact match first
  if (dict[trimmed]) {
    return text.replace(trimmed, dict[trimmed]);
  }

  let next = text;
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (!next.includes(key)) continue;
    // (^|[^буква/цифра]) слева и (?!буква/цифра) справа — без lookbehind,
    // чтобы не зависеть от поддержки браузера.
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(key)}(?![\\p{L}\\p{N}])`, "gu");
    next = next.replace(re, (_m, pre: string) => pre + dict[key]);
  }
  return next;
}
