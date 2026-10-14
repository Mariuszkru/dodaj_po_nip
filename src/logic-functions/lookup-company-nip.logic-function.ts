import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';
import { ID } from '../constants/ids';
import { lookupCompanyByNip } from '../lookup';
import { normalizeNip } from '../nip';

const run = async (event: RoutePayload) => {
  const { nip } = (event.body ?? {}) as { nip?: string };

  const regonApiKey = process.env.REGON_API_KEY;
  if (!regonApiKey) {
    return { ok: false, error: 'CONFIG', message: 'Brak zmiennej aplikacji REGON_API_KEY (ustaw ją w ustawieniach aplikacji).' };
  }

  const result = await lookupCompanyByNip(nip ?? '', {
    regonApiKey,
    regonEnv: process.env.REGON_ENV === 'prod' ? 'prod' : 'test',
  });
  if (!result.ok) return result;

  // Duplikat: firma z tym NIP-em już istnieje -> front otworzy istniejący rekord zamiast tworzyć nowy.
  const nipValue = normalizeNip(nip ?? '');
  const { CoreApiClient } = await import('twenty-client-sdk/core');
  const existing = await new CoreApiClient().query({
    companies: {
      __args: { filter: { nip: { eq: nipValue } }, first: 1 },
      edges: { node: { id: true, name: true } },
    },
  });
  const node = existing.companies?.edges?.[0]?.node;

  return { ...result, existing: node ? { id: node.id, name: node.name } : null };
};

const handler = async (event: RoutePayload) => {
  try {
    return await run(event);
  } catch (e) {
    const err = e as Error;
    console.error('lookup-company-nip failed', err?.stack ?? err);
    return { ok: false, error: 'INTERNAL', message: `Błąd funkcji: ${err?.name}: ${err?.message}` };
  }
};

export default defineLogicFunction({
  universalIdentifier: ID.logicLookup,
  name: 'lookup-company-nip',
  description: 'Pobiera dane firmy z REGON (GUS) i Białej Listy VAT na podstawie NIP-u.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/company/lookup-nip',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
