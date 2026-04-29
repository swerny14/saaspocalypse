/**
 * Single entry point for the canonical taxonomy. Importing from this file
 * (instead of the individual taxonomy modules) keeps consumers decoupled
 * from the file layout and makes it cheap to relocate entries later.
 */
export * from "./types";
export { STACK_COMPONENTS, FINGERPRINT_NAME_OVERRIDES } from "./stack_components";
export { CAPABILITIES } from "./capabilities";
export { MARKET_SEGMENTS } from "./market_segments";
export { BUSINESS_MODELS } from "./business_models";
