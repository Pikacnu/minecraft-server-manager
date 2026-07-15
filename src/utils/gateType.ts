// Gate-related runtime exports — separate file so importing
// general types from @/utils/type does NOT pull in configType.ts
// (which has top-level fetch + Bun imports — browser-incompatible)

export {
  GATE_FIELD_DEFINITIONS,
  GATE_DEFAULT_CONFIG,
  gateConfigZodSchema,
  getDefaultByPath,
} from './configType';
export type {
  FieldEntry as GateFieldEntry,
  InferredValueType,
} from './configType';
