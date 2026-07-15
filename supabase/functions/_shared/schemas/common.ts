import { z } from "zod";

export const IsoDateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "Must be YYYY-MM-DD format",
).refine(
  (val) => {
    const d = new Date(val + "T00:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
  },
  { message: "Must be a valid calendar date" },
);
export type IsoDate = z.infer<typeof IsoDateSchema>;

export const IsoDateTimeSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
  "Must be ISO 8601 datetime format",
).refine(
  (val) => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  },
  { message: "Must be a valid datetime" },
);
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

export const RequirementModeSchema = z.enum(["required", "preferred", "any"]);
export type RequirementMode = z.infer<typeof RequirementModeSchema>;

export const BudgetModeSchema = z.enum(["hard", "soft", "unknown"]);
export type BudgetMode = z.infer<typeof BudgetModeSchema>;

export const BudgetSourceSchema = z.enum([
  "provided",
  "missing",
  "explicitly_unknown",
]);
export type BudgetSource = z.infer<typeof BudgetSourceSchema>;

export const AvailabilityStatusSchema = z.enum([
  "unknown",
  "available",
  "on_request",
  "unavailable",
]);
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>;

export const PriceStatusSchema = z.enum(["search", "actualized"]);
export type PriceStatus = z.infer<typeof PriceStatusSchema>;

export const DestinationSearchStateSchema = z.enum([
  "pending",
  "starting",
  "processing",
  "completed",
  "partial",
  "empty",
  "failed",
  "timed_out",
]);
export type DestinationSearchState = z.infer<typeof DestinationSearchStateSchema>;

export const DestinationOfferSearchStateSchema = z.enum([
  "completed",
  "partial",
  "empty",
  "failed",
  "timed_out",
]);
export type DestinationOfferSearchState = z.infer<
  typeof DestinationOfferSearchStateSchema
>;
