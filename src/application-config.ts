import { defineApplication } from 'twenty-sdk/define';

import { ID } from 'src/constants/ids';
import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  applicationVariables: {
    REGON_API_KEY: {
      universalIdentifier: ID.varRegonKey,
      label: 'Klucz API REGON (BIR1)',
      isSecret: true,
    },
    REGON_ENV: {
      universalIdentifier: ID.varRegonEnv,
      label: 'Środowisko REGON (test lub prod)',
      description: 'Wpisz "test" (domyślnie) albo "prod".',
      value: 'test',
    },
  },
});
