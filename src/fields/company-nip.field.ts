import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
import { ID } from '../constants/ids';

export default defineField({
  universalIdentifier: ID.fieldNip,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'nip',
  type: FieldType.TEXT,
  label: 'NIP',
  description: 'NIP (10 cyfr). Sumę kontrolną sprawdza dodatek przy każdym zapisie.',
  icon: 'IconHash',
});
