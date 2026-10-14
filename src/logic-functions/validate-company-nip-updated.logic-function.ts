import { defineLogicFunction } from 'twenty-sdk/define';
import { ID } from '../constants/ids';
import { validateCompanyNip } from '../validate-company-nip';

export default defineLogicFunction({
  universalIdentifier: ID.logicValidateNipUpdated,
  name: 'validate-company-nip-updated',
  description: 'Sprawdza sumę kontrolną NIP po zmianie firmy.',
  timeoutSeconds: 15,
  handler: validateCompanyNip,
  databaseEventTriggerSettings: {
    eventName: 'company.updated',
    updatedFields: ['nip'],
  },
});
