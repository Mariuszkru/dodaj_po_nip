import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
import { ID } from '../constants/ids';

export default defineField({
  universalIdentifier: ID.fieldFormaPrawna,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'formaPrawna',
  type: FieldType.TEXT,
  label: 'Forma prawna',
  icon: 'IconScale',
});
