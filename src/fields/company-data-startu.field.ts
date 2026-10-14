import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
import { ID } from '../constants/ids';

export default defineField({
  universalIdentifier: ID.fieldDataStartu,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'dataRozpoczeciaDzialalnosci',
  type: FieldType.DATE,
  label: 'Data rozpoczęcia działalności',
  icon: 'IconCalendarEvent',
});
