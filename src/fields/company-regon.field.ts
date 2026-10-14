import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
import { ID } from '../constants/ids';

export default defineField({
  universalIdentifier: ID.fieldRegon,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'regon',
  type: FieldType.TEXT,
  label: 'REGON',
  icon: 'IconHash',
});
