import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
import { ID } from '../constants/ids';

export default defineField({
  universalIdentifier: ID.fieldKrs,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'krs',
  type: FieldType.TEXT,
  label: 'KRS',
  icon: 'IconHash',
});
