import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
import { ID } from '../constants/ids';

export default defineField({
  universalIdentifier: ID.fieldStatusVat,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'statusVat',
  type: FieldType.TEXT,
  label: 'Status VAT',
  icon: 'IconReceiptTax',
});
