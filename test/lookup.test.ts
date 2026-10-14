import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isValidNip, normalizeNip } from '../src/nip';
import { parseDane, extractResult } from '../src/regon';
import { lookupCompanyByNip } from '../src/lookup';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const soap = (op: string, inner: string) =>
  `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><${op}Response xmlns="http://CIS/BIR/PUBL/2014/07"><${op}Result>${inner}</${op}Result></${op}Response></s:Body></s:Envelope>`;

test('NIP: walidacja i normalizacja', () => {
  assert.equal(normalizeNip('PL 526-104-08-28'), '5261040828');
  assert.ok(isValidNip('5261040828'));
  assert.ok(!isValidNip('5261040829'));
  assert.ok(!isValidNip('123'));
});

test('parseDane: rozpakowuje zakodowany XML i puste elementy', () => {
  const inner = esc('<root><dane><Regon>012345678</Regon><Nazwa>A &amp; B</Nazwa><Ulica/></dane></root>');
  const rows = parseDane(extractResult(soap('DaneSzukajPodmioty', inner), 'DaneSzukajPodmioty'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].Regon, '012345678');
  assert.equal(rows[0].Nazwa, 'A & B');
  assert.equal(rows[0].Ulica, '');
});

test('lookup: pełny przepływ na zamockowanych odpowiedziach', async () => {
  const searchXml = esc(
    '<root><dane><Regon>012345678</Regon><Nip>5261040828</Nip><Nazwa>ACME SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</Nazwa>' +
      '<Wojewodztwo>MAZOWIECKIE</Wojewodztwo><Miejscowosc>Warszawa</Miejscowosc><KodPocztowy>00950</KodPocztowy>' +
      '<Ulica>ul. Złota</Ulica><NrNieruchomosci>12</NrNieruchomosci><NrLokalu>3</NrLokalu><Typ>P</Typ><SilosID>6</SilosID></dane></root>',
  );
  const fullXml = esc(
    '<root><dane><praw_podstawowaFormaPrawna_Nazwa>SPÓŁKI Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</praw_podstawowaFormaPrawna_Nazwa>' +
      '<praw_dataRozpoczeciaDzialalnosci>2015-03-02</praw_dataRozpoczeciaDzialalnosci></dane></root>',
  );
  const pkdXml = esc(
    '<root><dane><praw_pkdKod>62.01.Z</praw_pkdKod><praw_pkdNazwa>Działalność związana z oprogramowaniem</praw_pkdNazwa><praw_pkdPrzewazajace>1</praw_pkdPrzewazajace></dane>' +
      '<dane><praw_pkdKod>62.02.Z</praw_pkdKod><praw_pkdNazwa>Doradztwo</praw_pkdNazwa><praw_pkdPrzewazajace>0</praw_pkdPrzewazajace></dane></root>',
  );

  const calls: string[] = [];
  const fetchMock = (async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.includes('wl-api.mf.gov.pl')) {
      return new Response(
        JSON.stringify({ result: { subject: { name: 'ACME', nip: '5261040828', statusVat: 'Czynny', regon: '012345678', krs: '0000123456' } } }),
        { status: 200 },
      );
    }
    const body = String(init?.body ?? '');
    const op = body.match(/IUslugaBIRzewnPubl\/(\w+)</)?.[1] ?? '';
    calls.push(op);
    if (op === 'Zaloguj') return new Response(soap('Zaloguj', 'SID123'));
    if (op === 'Wyloguj') return new Response(soap('Wyloguj', 'true'));
    assert.equal((init?.headers as Record<string, string>).sid, 'SID123');
    if (op === 'DaneSzukajPodmioty') return new Response(soap(op, searchXml));
    if (op === 'DanePobierzPelnyRaport') {
      return new Response(soap(op, body.includes('Pkd') ? pkdXml : fullXml));
    }
    return new Response('?', { status: 500 });
  }) as unknown as typeof fetch;

  const r = await lookupCompanyByNip('526-104-08-28', { regonApiKey: 'k', regonEnv: 'test', fetchImpl: fetchMock });
  assert.ok(r.ok);
  if (!r.ok) return;
  const d = r.draft;
  assert.equal(d.name, 'ACME SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ');
  assert.equal(d.address.addressStreet1, 'ul. Złota 12/3');
  assert.equal(d.address.addressPostcode, '00-950');
  assert.equal(d.address.addressCity, 'Warszawa');
  assert.equal(d.regon, '012345678');
  assert.equal(d.krs, '0000123456');
  assert.equal(d.statusVat, 'Czynny');
  assert.equal(d.pkdGlowne, '62.01.Z – Działalność związana z oprogramowaniem');
  assert.equal(d.dataRozpoczeciaDzialalnosci, '2015-03-02');
  assert.deepEqual(calls, ['Zaloguj', 'DaneSzukajPodmioty', 'DanePobierzPelnyRaport', 'DanePobierzPelnyRaport', 'Wyloguj']);
});

test('lookup: zły NIP nie wywołuje sieci', async () => {
  const fetchMock = (async () => {
    throw new Error('nie powinno być wywołane');
  }) as unknown as typeof fetch;
  const r = await lookupCompanyByNip('1234567890', { regonApiKey: 'k', fetchImpl: fetchMock });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, 'INVALID_NIP');
});

test('lookup: fallback na Białą Listę, gdy REGON nie zna NIP-u', async () => {
  const fetchMock = (async (url: string, init?: RequestInit) => {
    if (String(url).includes('wl-api.mf.gov.pl')) {
      return new Response(
        JSON.stringify({
          result: { subject: { name: 'BETA SP. Z O.O.', nip: '5261040828', statusVat: 'Czynny', krs: '0000999999', workingAddress: 'ZŁOTA 12/3, 00-950 WARSZAWA' } },
        }),
        { status: 200 },
      );
    }
    const op = String(init?.body ?? '').match(/IUslugaBIRzewnPubl\/(\w+)</)?.[1] ?? '';
    if (op === 'Zaloguj') return new Response(soap('Zaloguj', 'SID'));
    if (op === 'DaneSzukajPodmioty') return new Response(soap(op, ''));
    return new Response(soap(op, 'true'));
  }) as unknown as typeof fetch;

  const r = await lookupCompanyByNip('5261040828', { regonApiKey: 'k', fetchImpl: fetchMock });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.draft.name, 'BETA SP. Z O.O.');
  assert.equal(r.draft.address.addressStreet1, 'ZŁOTA 12/3');
  assert.equal(r.draft.address.addressPostcode, '00-950');
  assert.equal(r.draft.address.addressCity, 'WARSZAWA');
  assert.ok(r.warnings.some((w) => w.includes('Białej Listy')));
});
