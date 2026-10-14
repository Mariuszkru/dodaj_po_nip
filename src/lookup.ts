import { isValidNip, normalizeNip } from './nip';
import { RegonClient, RegonError, reportNamesFor, type RegonEnv, type RegonRecord } from './regon';
import { fetchBialaLista, type BialaListaSubject } from './biala-lista';
import { buildDraft, type CompanyDraft } from './map-company';

export type LookupResult =
  | { ok: true; draft: CompanyDraft; warnings: string[] }
  | { ok: false; error: 'INVALID_NIP' | 'NOT_FOUND' | 'UPSTREAM'; message: string };

export type LookupConfig = {
  regonApiKey: string;
  regonEnv?: RegonEnv; // domyślnie 'test'
  fetchImpl?: typeof fetch;
};

/**
 * Główna funkcja: NIP -> gotowy szkic rekordu Company.
 * REGON jest źródłem podstawowym; Biała Lista (VAT, KRS) i raporty szczegółowe są best-effort
 * – ich awaria daje ostrzeżenie, ale nie przerywa operacji.
 */
export async function lookupCompanyByNip(rawNip: string, cfg: LookupConfig): Promise<LookupResult> {
  const nip = normalizeNip(rawNip);
  if (!isValidNip(nip)) {
    return { ok: false, error: 'INVALID_NIP', message: 'Nieprawidłowy NIP (zła długość lub suma kontrolna).' };
  }

  const warnings: string[] = [];
  const client = new RegonClient(cfg.regonApiKey, cfg.regonEnv ?? 'test', cfg.fetchImpl ?? fetch);

  let search: RegonRecord | null = null;
  let full: RegonRecord | null = null;
  let pkdRows: RegonRecord[] = [];

  const blPromise: Promise<BialaListaSubject | null> = fetchBialaLista(nip, cfg.fetchImpl ?? fetch).catch((e) => {
    warnings.push(`Biała Lista niedostępna: ${(e as Error).message}`);
    return null;
  });

  try {
    search = await client.searchByNip(nip);
    if (search) {
      const names = reportNamesFor(search);
      if (names && search.Regon) {
        try {
          full = await client.fullReport(search.Regon, names.full);
        } catch (e) {
          warnings.push(`Raport szczegółowy REGON niedostępny: ${(e as Error).message}`);
        }
        try {
          pkdRows = await client.fullReportAll(search.Regon, names.pkd);
        } catch (e) {
          warnings.push(`Raport PKD niedostępny: ${(e as Error).message}`);
        }
      }
    }
  } catch (e) {
    if (e instanceof RegonError && (e.code === 'AUTH' || e.code === 'HTTP' || e.code === 'PARSE' || e.code === 'SESSION')) {
      warnings.push(`REGON: ${e.message}`);
    } else {
      throw e;
    }
  } finally {
    await client.logout();
  }

  const bl = await blPromise;

  if (!search && !bl) {
    const regonProblem = warnings.some((w) => w.startsWith('REGON:'));
    return regonProblem
      ? { ok: false, error: 'UPSTREAM', message: warnings.join(' ') }
      : { ok: false, error: 'NOT_FOUND', message: 'Nie znaleziono podmiotu o tym NIP-ie w REGON ani na Białej Liście.' };
  }
  if (!search) warnings.push('Brak danych w REGON – uzupełniono wyłącznie z Białej Listy VAT (adres z jednego tekstu, sprawdź go; brak formy prawnej i PKD).');

  return { ok: true, draft: buildDraft({ nip, search, full, pkdRows, bl }), warnings };
}
