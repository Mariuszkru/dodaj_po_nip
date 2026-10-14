import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, closeSidePanel, enqueueSnackbar, navigate } from 'twenty-sdk/front-component';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { ID } from '../constants/ids';
import type { CompanyDraft } from '../map-company';

type LookupResponse =
  | { ok: true; draft: CompanyDraft; warnings: string[]; existing: { id: string; name: string } | null }
  | { ok: false; error: string; message: string };

const box: React.CSSProperties = { padding: 16, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'inherit' };
const input: React.CSSProperties = { padding: '6px 8px', borderRadius: 4, border: '1px solid rgba(128, 128, 128, 0.5)', background: 'transparent', color: 'inherit', width: '100%', boxSizing: 'border-box' };
const button: React.CSSProperties = { padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(128, 128, 128, 0.5)', background: 'rgba(128, 128, 128, 0.15)', color: 'inherit', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const label: React.CSSProperties = { fontSize: 12, opacity: 0.7 };

const AddCompanyByNip = () => {
  const [nip, setNip] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CompanyDraft | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [existing, setExisting] = useState<{ id: string; name: string } | null>(null);

  const openCompany = async (id: string) => {
    await navigate(AppPath.RecordShowPage, { objectNameSingular: 'company', objectRecordId: id });
    await closeSidePanel();
  };

  const fetchData = async () => {
    setBusy(true);
    setError(null);
    setDraft(null);
    setExisting(null);
    try {
      const res = (await new RestApiClient().post('/s/company/lookup-nip', { nip })) as unknown as LookupResponse;
      if (!res.ok) {
        setError(res.message);
      } else {
        setDraft(res.draft);
        setWarnings(res.warnings);
        setExisting(res.existing);
      }
    } catch (e) {
      setError(`Błąd połączenia: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const created = await new CoreApiClient().mutation({
        createCompany: {
          __args: {
            data: {
              name: draft.name,
              nip: draft.nip,
              address: draft.address,
              regon: draft.regon,
              krs: draft.krs,
              formaPrawna: draft.formaPrawna,
              pkdGlowne: draft.pkdGlowne,
              statusVat: draft.statusVat,
              ...(draft.dataRozpoczeciaDzialalnosci ? { dataRozpoczeciaDzialalnosci: draft.dataRozpoczeciaDzialalnosci } : {}),
            },
          },
          id: true,
        },
      });
      await enqueueSnackbar({ message: 'Firma dodana', variant: 'success' });
      await openCompany(created.createCompany.id);
    } catch (e) {
      setError(`Nie udało się zapisać: ${(e as Error).message}`);
      setBusy(false);
    }
  };

  const set = (patch: Partial<CompanyDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setAddr = (patch: Partial<CompanyDraft['address']>) => setDraft((d) => (d ? { ...d, address: { ...d.address, ...patch } } : d));

  return (
    <div style={box}>
      <div>
        <div style={label}>NIP</div>
        <input
          style={input}
          value={nip}
          placeholder="np. 526-104-08-28"
          onChange={(e) => setNip(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && nip && !busy && fetchData()}
          autoFocus
        />
      </div>
      <button style={{ ...button, opacity: busy || !nip ? 0.5 : 1, cursor: busy || !nip ? 'not-allowed' : 'pointer' }} disabled={busy || !nip} onClick={fetchData}>
        {busy && !draft ? 'Pobieram…' : 'Pobierz dane'}
      </button>

      {error && <div style={{ color: '#e5484d', background: 'rgba(229, 72, 77, 0.12)', padding: 10, borderRadius: 4 }}>{error}</div>}

      {existing && (
        <div style={{ background: 'rgba(245, 166, 35, 0.18)', border: '1px solid rgba(245, 166, 35, 0.5)', color: 'inherit', padding: 10, borderRadius: 4 }}>
          Firma z tym NIP-em już istnieje: <b>{existing.name}</b>.{' '}
          <button style={button} onClick={() => openCompany(existing.id)}>Otwórz istniejącą</button>
        </div>
      )}

      {draft && !existing && (
        <>
          {warnings.map((w) => (
            <div key={w} style={{ fontSize: 12, color: 'inherit', background: 'rgba(245, 166, 35, 0.18)', padding: '6px 8px', borderRadius: 4 }}>⚠ {w}</div>
          ))}
          <div><div style={label}>Nazwa</div><input style={input} value={draft.name} onChange={(e) => set({ name: e.target.value })} /></div>
          <div><div style={label}>Ulica i numer</div><input style={input} value={draft.address.addressStreet1} onChange={(e) => setAddr({ addressStreet1: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><div style={label}>Kod</div><input style={input} value={draft.address.addressPostcode} onChange={(e) => setAddr({ addressPostcode: e.target.value })} /></div>
            <div style={{ flex: 2 }}><div style={label}>Miasto</div><input style={input} value={draft.address.addressCity} onChange={(e) => setAddr({ addressCity: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><div style={label}>REGON</div><input style={input} value={draft.regon} onChange={(e) => set({ regon: e.target.value })} /></div>
            <div style={{ flex: 1 }}><div style={label}>KRS</div><input style={input} value={draft.krs} onChange={(e) => set({ krs: e.target.value })} /></div>
          </div>
          <div><div style={label}>Forma prawna</div><input style={input} value={draft.formaPrawna} onChange={(e) => set({ formaPrawna: e.target.value })} /></div>
          <div><div style={label}>PKD główne</div><input style={input} value={draft.pkdGlowne} onChange={(e) => set({ pkdGlowne: e.target.value })} /></div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Status VAT: {draft.statusVat || '—'} · Start działalności: {draft.dataRozpoczeciaDzialalnosci || '—'} · Źródła: {draft.zrodla.join(', ')}
          </div>
          <button style={{ ...button, opacity: busy || !draft.name ? 0.5 : 1, cursor: busy || !draft.name ? 'not-allowed' : 'pointer' }} disabled={busy || !draft.name} onClick={save}>{busy ? 'Zapisuję…' : 'Dodaj firmę'}</button>
        </>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: ID.frontAddCompany,
  name: 'add-company-by-nip',
  description: 'Okno dodawania firmy po NIP-ie (dane z REGON i Białej Listy VAT).',
  component: AddCompanyByNip,
});
