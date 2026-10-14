const WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7];

/** Zostawia same cyfry; zdejmuje prefiks PL, myślniki, spacje. */
export function normalizeNip(input: string | number): string {
  let s = String(input ?? '').trim().toUpperCase();
  if (s.startsWith('PL')) s = s.slice(2);
  return s.replace(/\D/g, '');
}

export function isValidNip(nip: string): boolean {
  if (!/^\d{10}$/.test(nip)) return false;
  const digits = nip.split('').map(Number);
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * digits[i], 0);
  const check = sum % 11;
  return check !== 10 && check === digits[9];
}

export function formatNip(nip: string): string {
  return nip.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1-$2-$3-$4');
}
