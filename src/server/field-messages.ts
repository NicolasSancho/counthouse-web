import "server-only";

import type { FieldErrorCode } from "@/server/api/schema";

/**
 * The wording of a field error. The API sends a stable `code` per field and the web app words
 * it; the API's own `message` is for logs. `label` names the field in a sentence, such as
 * "your email". The record is exhaustive, so a code added to the contract fails `typecheck` here
 * until it has a message.
 */
const MESSAGES: Record<FieldErrorCode, (label: string) => string> = {
  REQUIRED: (label) => `Enter ${label}.`,
  TOO_SHORT: (label) => `${capitalize(label)} is too short.`,
  TOO_LONG: (label) => `${capitalize(label)} is too long.`,
  OUT_OF_RANGE: (label) => `${capitalize(label)} is out of range.`,
  INVALID_FORMAT: (label) => `${capitalize(label)} is not in the right format.`,
  INVALID_VALUE: (label) => `${capitalize(label)} is not a valid value.`,
  SKU_TAKEN: () => "Another variant already uses this SKU.",
  DUPLICATE_COMBINATION: () => "Another variant already has these options.",
};

export function fieldMessage(code: FieldErrorCode, label: string): string {
  return MESSAGES[code](label);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
