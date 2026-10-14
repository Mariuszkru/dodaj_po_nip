/** Biała Lista VAT (MF) – darmowe, bez klucza. Uzupełnienie danych z REGON: status VAT, KRS, rachunki. */

export type BialaListaSubject = {
  name?: string;
  nip?: string;
  statusVat?: string; // Czynny | Zwolniony | Niezarejestrowany
  regon?: string;
  krs?: string | null;
  residenceAddress?: string | null;
  workingAddress?: string | null;
  registrationLegalDate?: string | null;
  accountNumbers?: string[];
};

export async function fetchBialaLista(
  nip: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BialaListaSubject | null> {
  const date = new Date().toISOString().slice(0, 10);
  const res = await fetchImpl(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${date}`, {
    headers: { Accept: 'application/json' },
  });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Biała Lista HTTP ${res.status}`);
  const json = (await res.json()) as { result?: { subject?: BialaListaSubject | null } };
  return json.result?.subject ?? null;
}
