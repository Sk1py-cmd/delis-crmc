const ONES = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const ONES_F = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const TEENS = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

function plural(n: number, forms: [string, string, string]) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

function tripletToWords(n: number, feminine: boolean): string[] {
  const words: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;

  if (h) words.push(HUNDREDS[h]);
  if (t === 1) {
    words.push(TEENS[o]);
  } else {
    if (t) words.push(TENS[t]);
    if (o) words.push(feminine ? ONES_F[o] : ONES[o]);
  }
  return words;
}

/** Сумма прописью для узбекских сумов */
export function amountInWords(amount: number): string {
  const value = Math.floor(Math.abs(amount));
  if (value === 0) return "Ноль сум 00 тийин";

  const tiyin = Math.round((Math.abs(amount) - value) * 100);
  const groups: { value: number; feminine: boolean; forms: [string, string, string] }[] = [
    { value: Math.floor(value / 1_000_000_000) % 1000, feminine: false, forms: ["миллиард", "миллиарда", "миллиардов"] },
    { value: Math.floor(value / 1_000_000) % 1000, feminine: false, forms: ["миллион", "миллиона", "миллионов"] },
    { value: Math.floor(value / 1000) % 1000, feminine: true, forms: ["тысяча", "тысячи", "тысяч"] },
    { value: value % 1000, feminine: false, forms: ["", "", ""] },
  ];

  const words: string[] = [];
  groups.forEach((g) => {
    if (g.value === 0) return;
    words.push(...tripletToWords(g.value, g.feminine));
    if (g.forms[0]) words.push(plural(g.value, g.forms));
  });

  const text = words.join(" ");
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
  return `${capitalized} ${plural(value, ["сум", "сума", "сумов"])} ${String(tiyin).padStart(2, "0")} тийин`;
}
