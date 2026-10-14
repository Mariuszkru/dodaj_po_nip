import { defineCommandMenuItem, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
import { ID } from '../constants/ids';

export default defineCommandMenuItem({
  universalIdentifier: ID.commandAddCompany,
  label: 'Dodaj firmę z NIP',
  shortLabel: 'Firma z NIP',
  isPinned: true,
  availabilityType: 'GLOBAL_OBJECT_CONTEXT',
  availabilityObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  frontComponentUniversalIdentifier: ID.frontAddCompany,
});
