import { defineLogicFunction } from 'twenty-sdk/define';
import { ID } from '../constants/ids';
import { validateCompanyNip } from '../validate-company-nip';

export default defineLogicFunction({
  universalIdentifier: ID.logicValidateNipCreated,
  name: 'validate-company-nip-created',
  description: 'Sprawdza sumę kontrolną NIP po utworzeniu firmy.',
  timeoutSeconds: 15,
  handler: validateCompanyNip,
  databaseEventTriggerSettings: {
    eventName: 'company.created',
  },
});
