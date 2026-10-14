/**
 * Klient BIR1 (GUS REGON) – SOAP 1.2 z sesją (nagłówek HTTP `sid`).
 * Działa po stronie serwera (CORS + sekret klucza API).
 */

export const REGON_URLS = {
  test: 'https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc',
  prod: 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc',
} as const;

const NS = 'http://CIS/BIR/PUBL/2014/07';
const NS_DTO = 'http://CIS/BIR/PUBL/2014/07/DataContract';

export type RegonEnv = keyof typeof REGON_URLS;

export class RegonError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'AUTH' | 'SESSION' | 'HTTP' | 'PARSE',
    message: string,
  ) {
    super(message);
  }
}

export type RegonRecord = Record<string, string>;

export function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}

/** Wyciąga zawartość <XResult>...</XResult> z surowej odpowiedzi (także MTOM multipart). */
export function extractResult(raw: string, operation: string): string {
  const re = new RegExp(`<(?:\\w+:)?${operation}Result[^>]*>([\\s\\S]*?)</(?:\\w+:)?${operation}Result>`);
  const m = raw.match(re);
  if (!m) {
    if (new RegExp(`<(?:\\w+:)?${operation}Result[^>]*/>`).test(raw)) return '';
    throw new RegonError('PARSE', `Brak ${operation}Result w odpowiedzi REGON`);
  }
  return m[1];
}

/** Parsuje <root><dane>...</dane>...</root> (płaskie elementy) do tablicy rekordów. */
export function parseDane(xml: string): RegonRecord[] {
  const decoded = decodeEntities(xml);
  const out: RegonRecord[] = [];
  const blocks = decoded.match(/<dane>[\s\S]*?<\/dane>/g) ?? [];
  for (const block of blocks) {
    const rec: RegonRecord = {};
    const fieldRe = /<([A-Za-z0-9_]+)(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/\1>)/g;
    let f: RegExpExecArray | null;
    const inner = block.replace(/^<dane>|<\/dane>$/g, '');
    // Wynik jest XML-em zakodowanym w XML-u: pierwsze dekodowanie wyżej odsłania znaczniki,
    // wartości pól trzeba zdekodować drugi raz (np. &amp;amp; -> &amp; -> &).
    while ((f = fieldRe.exec(inner))) rec[f[1]] = decodeEntities((f[2] ?? '').trim());
    out.push(rec);
  }
  return out;
}

function envelope(action: string, body: string, to: string): string {
  return `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="${NS}" xmlns:dat="${NS_DTO}">
<soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
<wsa:To>${to}</wsa:To>
<wsa:Action>${NS}/IUslugaBIRzewnPubl/${action}</wsa:Action>
</soap:Header>
<soap:Body>${body}</soap:Body>
</soap:Envelope>`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class RegonClient {
  private sid: string | null = null;
  private url: string;

  constructor(
    private apiKey: string,
    env: RegonEnv = 'test',
    private fetchImpl: typeof fetch = fetch,
  ) {
    this.url = REGON_URLS[env];
  }

  private async call(action: string, body: string, withSid: boolean): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/soap+xml; charset=utf-8',
    };
    if (withSid) {
      if (!this.sid) await this.login();
      headers.sid = this.sid!;
    }
    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      headers,
      body: envelope(action, body, this.url),
    });
    if (!res.ok) throw new RegonError('HTTP', `REGON HTTP ${res.status}`);
    return res.text();
  }

  async login(): Promise<void> {
    const raw = await this.call(
      'Zaloguj',
      `<ns:Zaloguj><ns:pKluczUzytkownika>${esc(this.apiKey)}</ns:pKluczUzytkownika></ns:Zaloguj>`,
      false,
    );
    const sid = extractResult(raw, 'Zaloguj').trim();
    if (!sid) throw new RegonError('AUTH', 'REGON odrzucił klucz API (pusty identyfikator sesji)');
    this.sid = sid;
  }

  /** Wywołanie z jednokrotnym ponowieniem po wygaśnięciu sesji (pusty wynik + brak sid). */
  private async withSession<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof RegonError && e.code === 'SESSION') {
        this.sid = null;
        return fn();
      }
      throw e;
    }
  }

  async searchByNip(nip: string): Promise<RegonRecord | null> {
    return this.withSession(async () => {
      const raw = await this.call(
        'DaneSzukajPodmioty',
        `<ns:DaneSzukajPodmioty><ns:pParametryWyszukiwania><dat:Nip>${esc(nip)}</dat:Nip></ns:pParametryWyszukiwania></ns:DaneSzukajPodmioty>`,
        true,
      );
      if (/sesj|session/i.test(raw) && !/DaneSzukajPodmiotyResult/.test(raw)) {
        throw new RegonError('SESSION', 'Sesja REGON wygasła');
      }
      const result = extractResult(raw, 'DaneSzukajPodmioty');
      const rows = parseDane(result);
      return rows[0] ?? null;
    });
  }

  async fullReport(regon: string, reportName: string): Promise<RegonRecord | null> {
    return this.withSession(async () => {
      const raw = await this.call(
        'DanePobierzPelnyRaport',
        `<ns:DanePobierzPelnyRaport><ns:pRegon>${esc(regon)}</ns:pRegon><ns:pNazwaRaportu>${esc(reportName)}</ns:pNazwaRaportu></ns:DanePobierzPelnyRaport>`,
        true,
      );
      const rows = parseDane(extractResult(raw, 'DanePobierzPelnyRaport'));
      return rows[0] ?? null;
    });
  }

  async fullReportAll(regon: string, reportName: string): Promise<RegonRecord[]> {
    return this.withSession(async () => {
      const raw = await this.call(
        'DanePobierzPelnyRaport',
        `<ns:DanePobierzPelnyRaport><ns:pRegon>${esc(regon)}</ns:pRegon><ns:pNazwaRaportu>${esc(reportName)}</ns:pNazwaRaportu></ns:DanePobierzPelnyRaport>`,
        true,
      );
      return parseDane(extractResult(raw, 'DanePobierzPelnyRaport'));
    });
  }

  async logout(): Promise<void> {
    if (!this.sid) return;
    try {
      await this.call(
        'Wyloguj',
        `<ns:Wyloguj><ns:pIdentyfikatorSesji>${esc(this.sid)}</ns:pIdentyfikatorSesji></ns:Wyloguj>`,
        true,
      );
    } catch {
      /* ignoruj */
    }
    this.sid = null;
  }
}

/** Dobór nazw raportów wg typu podmiotu zwróconego przez DaneSzukajPodmioty. */
export function reportNamesFor(rec: RegonRecord): { full: string; pkd: string } | null {
  const typ = rec.Typ;
  const silo = rec.SilosID;
  if (typ === 'P') return { full: 'BIR11OsPrawna', pkd: 'BIR11OsPrawnaPkd' };
  if (typ === 'F') {
    const fullBySilo: Record<string, string> = {
      '1': 'BIR11OsFizycznaDzialalnoscCeidg',
      '2': 'BIR11OsFizycznaDzialalnoscRolnicza',
      '3': 'BIR11OsFizycznaDzialalnoscPozostala',
      '4': 'BIR11OsFizycznaDzialalnoscSkreslonaDo20141108',
    };
    const full = fullBySilo[silo];
    return full ? { full, pkd: 'BIR11OsFizycznaPkd' } : null;
  }
  return null;
}
