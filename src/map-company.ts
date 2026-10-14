import type { RegonRecord } from './regon';
import type { BialaListaSubject } from './biala-lista';

/** Pola gotowe do wpisania w obiekt Company w Twenty. */
export type CompanyDraft = {
  name: string;
  nip: string; // 10 cyfr jako tekst; konwersja na liczbę zależy od typu pola w Twenty
  address: {
    addressStreet1: string;
    addressStreet2: string;
    addressCity: string;
    addressState: string;
    addressPostcode: string;
    addressCountry: string;
  };
  regon: string;
  krs: string;
  formaPrawna: string;
  pkdGlowne: string; // np. "62.01.Z – Działalność związana z oprogramowaniem"
  dataRozpoczeciaDzialalnosci: string; // YYYY-MM-DD lub ''
  statusVat: string; // Czynny | Zwolniony | Niezarejestrowany | ''
  typPodmiotu: 'osoba prawna' | 'osoba fizyczna' | 'inny' | '';
  zrodla: string[];
};

/** Pierwsza niepusta wartość spośród kluczy (obsługa prefiksów praw_ / fiz_). */
function pick(rec: RegonRecord | null | undefined, ...keys: string[]): string {
  if (!rec) return '';
  for (const k of keys) {
    const v = rec[k];
    if (v) return v.trim();
  }
  return '';
}

const isoDate = (s: string) => (s ? s.slice(0, 10) : '');

export function formatPostcode(code: string): string {
  const d = code.replace(/\D/g, '');
  return d.length === 5 ? `${d.slice(0, 2)}-${d.slice(2)}` : code;
}

export function formatStreet(street: string, building: string, flat: string): string {
  const number = [building, flat].filter(Boolean).join('/');
  return [street, number].filter(Boolean).join(' ').trim();
}

function titleCaseVoivodeship(s: string): string {
  return s ? s.toLowerCase() : '';
}

export function buildDraft(args: {
  nip: string;
  search: RegonRecord | null;
  full: RegonRecord | null;
  pkdRows: RegonRecord[];
  bl: BialaListaSubject | null;
}): CompanyDraft {
  const { nip, search, full, pkdRows, bl } = args;
  const zrodla: string[] = [];
  if (search) zrodla.push('REGON');
  if (bl) zrodla.push('Biała Lista VAT');

  const street = formatStreet(
    pick(search, 'Ulica') || pick(full, 'praw_adSiedzUlica_Nazwa', 'fiz_adSiedzUlica_Nazwa'),
    pick(search, 'NrNieruchomosci') || pick(full, 'praw_adSiedzNumerNieruchomosci', 'fiz_adSiedzNumerNieruchomosci'),
    pick(search, 'NrLokalu') || pick(full, 'praw_adSiedzNumerLokalu', 'fiz_adSiedzNumerLokalu'),
  );

  const city =
    pick(search, 'Miejscowosc') ||
    pick(full, 'praw_adSiedzMiejscowosc_Nazwa', 'fiz_adSiedzMiejscowosc_Nazwa');

  // Fallback bez REGON: Biała Lista zwraca adres jako jeden tekst ("ULICA 1, 00-001 MIASTO")
  const blAddress = !search && bl ? (bl.workingAddress || bl.residenceAddress || '') : '';

  const main = pkdRows.find((r) => (r.praw_pkdPrzewazajace ?? r.fiz_pkdPrzewazajace) === '1') ?? pkdRows[0];
  const pkdCode = pick(main, 'praw_pkdKod', 'fiz_pkdKod');
  const pkdName = pick(main, 'praw_pkdNazwa', 'fiz_pkdNazwa');

  const [blStreet = '', blTail = ''] = blAddress.split(/,\s*/);
  const blTailMatch = blTail.match(/^(\d{2}-\d{3})\s+(.+)$/);

  const typ = search?.Typ;
  return {
    name: pick(search, 'Nazwa') || pick(full, 'praw_nazwa', 'fiz_nazwa') || bl?.name || '',
    nip,
    address: {
      addressStreet1: street || blStreet,
      addressStreet2: '',
      addressCity: city || blTailMatch?.[2] || '',
      addressState: titleCaseVoivodeship(pick(search, 'Wojewodztwo')),
      addressPostcode: formatPostcode(
        pick(search, 'KodPocztowy') || pick(full, 'praw_adSiedzKodPocztowy', 'fiz_adSiedzKodPocztowy') || (blTailMatch?.[1] ?? ''),
      ),
      addressCountry: 'Polska',
    },
    regon: pick(search, 'Regon') || pick(full, 'praw_regon9', 'fiz_regon9') || bl?.regon || '',
    krs: bl?.krs || pick(full, 'praw_numerWRejestrzeEwidencji') || '',
    formaPrawna: pick(full, 'praw_podstawowaFormaPrawna_Nazwa', 'fiz_podstawowaFormaPrawna_Nazwa'),
    pkdGlowne: pkdCode ? `${pkdCode}${pkdName ? ' – ' + pkdName : ''}` : '',
    dataRozpoczeciaDzialalnosci: isoDate(
      pick(full, 'praw_dataRozpoczeciaDzialalnosci', 'fiz_dataRozpoczeciaDzialalnosci', 'praw_dataPowstania'),
    ),
    statusVat: bl?.statusVat ?? '',
    typPodmiotu: typ === 'P' ? 'osoba prawna' : typ === 'F' ? 'osoba fizyczna' : typ ? 'inny' : '',
    zrodla,
  };
}
