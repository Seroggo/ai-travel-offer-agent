import { z } from "zod";
import { NormalizedTourSchema } from "./normalized-tour.ts";

export const FilterCodeSchema = z.enum([
  "MISSING_CRITICAL_DATA",
  "COUNTRY_MISMATCH",
  "DATE_MISMATCH",
  "NIGHTS_MISMATCH",
  "TRAVELLER_COMPOSITION_MISMATCH",
  "HARD_BUDGET_EXCEEDED",
  "SOFT_BUDGET_LIMIT_EXCEEDED",
  "REQUIRED_MEAL_MISMATCH",
  "REQUIRED_STARS_MISMATCH",
  "REQUIRED_RATING_MISMATCH",
  "REQUIRED_RESORT_MISMATCH",
  "DIRECT_FLIGHT_MISMATCH",
  "FLIGHT_UNAVAILABLE",
  "VERIFIED_EXCLUDED_FEATURE",
]);
export type FilterCode = z.infer<typeof FilterCodeSchema>;

export const WarningCodeSchema = z.enum([
  "PRICE_ABOVE_SOFT_BUDGET",
  "PRICE_NOT_ACTUALIZED",
  "AVAILABILITY_NOT_VERIFIED",
  "HOTEL_AVAILABILITY_UNKNOWN",
  "PARTIAL_SEARCH",
  "MISSING_RATING",
  "MISSING_ROOM",
  "UNVERIFIABLE_REQUIREMENT",
]);
export type WarningCode = z.infer<typeof WarningCodeSchema>;

export const FilterDecisionSchema = z.object({
  accepted: z.boolean(),
  rejection_codes: z.array(FilterCodeSchema),
  warning_codes: z.array(WarningCodeSchema),
}).strict().refine(
  (data) => {
    if (data.accepted && data.rejection_codes.length > 0) return false;
    return true;
  },
  {
    message: "accepted=true must have empty rejection_codes",
    path: ["rejection_codes"],
  },
).refine(
  (data) => {
    if (!data.accepted && data.rejection_codes.length === 0) return false;
    return true;
  },
  {
    message: "accepted=false must have at least one rejection_code",
    path: ["rejection_codes"],
  },
);
export type FilterDecision = z.infer<typeof FilterDecisionSchema>;

export const RankingExplanationSchema = z.object({
  strengths: z.array(z.string()),
  compromises: z.array(z.string()),
  verification_needed: z.array(z.string()),
}).strict();
export type RankingExplanation = z.infer<typeof RankingExplanationSchema>;

export const ScoreComponentsSchema = z.object({
  price: z.number().min(0).max(100),
  hotel_rating: z.number().min(0).max(100),
  meal: z.number().min(0).max(100),
  hotel_category: z.number().min(0).max(100),
  date_nights: z.number().min(0).max(100),
  resort: z.number().min(0).max(100),
  services: z.number().min(0).max(100),
  completeness: z.number().min(0).max(100),
}).strict();
export type ScoreComponents = z.infer<typeof ScoreComponentsSchema>;

export const RankedTourSchema = NormalizedTourSchema.extend({
  rank: z.number().int().min(1),
  score: z.number().min(0).max(100),
  score_components: ScoreComponentsSchema,
  strengths: z.array(z.string()),
  compromises: z.array(z.string()),
  verification_needed: z.array(z.string()),
  warning_codes: z.array(WarningCodeSchema),
}).strict();
export type RankedTour = z.infer<typeof RankedTourSchema>;
