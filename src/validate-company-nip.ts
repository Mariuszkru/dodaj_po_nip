import { CoreApiClient } from 'twenty-client-sdk/core';
import { isValidNip, normalizeNip } from './nip';

type CompanyEvent = {
  recordId: string;
  properties: { after?: { nip?: string | null } };
};

/**
 * Twenty nie pozwala zablokować zapisu z dodatku, więc walidacja działa po zapisie:
 * poprawny NIP jest normalizowany do 10 cyfr, błędny jest czyszczony i zgłaszany notatką.
 */
export async function validateCompanyNip(event: CompanyEvent) {
  const raw = event.properties?.after?.nip;
  if (!raw) return { ok: true, action: 'none' };

  const nip = normalizeNip(raw);
  const client = new CoreApiClient();

  if (isValidNip(nip)) {
    if (nip === raw) return { ok: true, action: 'none' };
    await client.mutation({
      updateCompany: { __args: { id: event.recordId, data: { nip } }, id: true },
    });
    return { ok: true, action: 'normalized', nip };
  }

  await client.mutation({
    updateCompany: { __args: { id: event.recordId, data: { nip: null } }, id: true },
  });
  try {
    const note = await client.mutation({
      createNote: {
        __args: {
          data: {
            title: 'Błędny NIP – wartość usunięta',
            bodyV2: {
              markdown: `Wpisany NIP "${raw}" ma nieprawidłową długość lub sumę kontrolną, więc pole zostało wyczyszczone.`,
            },
          },
        },
        id: true,
      },
    });
    await client.mutation({
      createNoteTarget: {
        __args: { data: { noteId: note.createNote.id, targetCompanyId: event.recordId } },
        id: true,
      },
    });
  } catch {
    /* notatka best-effort */
  }
  return { ok: false, action: 'cleared', value: raw };
}
