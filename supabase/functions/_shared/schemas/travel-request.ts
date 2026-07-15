import { z } from "zod";
import {
  BudgetModeSchema,
  BudgetSourceSchema,
  IsoDateSchema,
  RequirementModeSchema,
} from "./common.ts";

export const DestinationSchema = z.object({
  country_name: z.string().min(1, "Country name must be non-empty"),
  country_id: z.number().int().positive().nullable(),
  priority: z.number().int().min(1, "Priority must be >= 1"),
  resort_preferences: z.array(z.string()),
  resort_mode: RequirementModeSchema,
  region_ids: z.array(z.number().int().positive()),
  hotel_service_ids: z.array(z.number().int().positive()),
}).strict();
export type Destination = z.infer<typeof DestinationSchema>;

export const TravelSearchRequestSchema = z.object({
  schema_version: z.literal("0.4"),
  free_text: z.string().min(1, "free_text must be non-empty"),

  departure_city: z.string().nullable(),
  departure_id: z.number().int().positive().nullable(),

  destinations: z.array(DestinationSchema),

  date_from: IsoDateSchema.nullable(),
  date_to: IsoDateSchema.nullable(),
  nights_from: z.number().int().min(1).max(28).nullable(),
  nights_to: z.number().int().min(1).max(28).nullable(),

  adults: z.number().int().min(1).max(6).nullable(),
  children_ages: z.array(z.number().int().min(0).max(17)).max(3),

  budget_max: z.number().positive().nullable(),
  budget_mode: BudgetModeSchema,
  budget_source: BudgetSourceSchema,

  currency: z.string().min(1, "Currency must be non-empty"),

  meal_preferences: z.array(z.string()),
  meal_id: z.number().int().positive().nullable(),
  meal_mode: RequirementModeSchema,

  hotel_stars_min: z.number().int().min(1).max(5).nullable(),
  hotel_stars_mode: RequirementModeSchema,

  hotel_rating_min: z.number().min(0).max(5).nullable(),
  hotel_rating_mode: RequirementModeSchema,

  direct_flight_only: z.boolean(),
  charter_only: z.boolean(),

  max_sea_distance_m: z.number().nonnegative().nullable(),
  sea_distance_mode: RequirementModeSchema,

  hotel_preferences: z.array(z.string()),
  required_features: z.array(z.string()),
  excluded_features: z.array(z.string()),

  assumptions: z.array(z.string()),
  unverifiable_requirements: z.array(z.string()),

  missing_required_fields: z.array(z.string()),
  missing_recommended_fields: z.array(z.string()),
}).strict().refine(
  (data) => {
    if (data.nights_from !== null && data.nights_to !== null) {
      if (data.nights_from > data.nights_to) return false;
      if (data.nights_to - data.nights_from > 10) return false;
    }
    return true;
  },
  {
    message: "nights_from must be <= nights_to and difference <= 10",
    path: ["nights_from"],
  },
).refine(
  (data) => {
    if (data.date_from !== null && data.date_to !== null) {
      const from = new Date(data.date_from + "T00:00:00Z");
      const to = new Date(data.date_to + "T00:00:00Z");
      if (from > to) return false;
      const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 21) return false;
    }
    return true;
  },
  {
    message: "date_from must be <= date_to and range <= 21 days",
    path: ["date_from"],
  },
).refine(
  (data) => {
    if (
      (data.budget_mode === "hard" || data.budget_mode === "soft") &&
      data.budget_source !== "provided"
    ) {
      return false;
    }
    if (
      (data.budget_mode === "hard" || data.budget_mode === "soft") &&
      (data.budget_max === null || data.budget_max <= 0)
    ) {
      return false;
    }
    if (
      data.budget_mode === "unknown" &&
      data.budget_max !== null
    ) {
      return false;
    }
    if (
      data.budget_mode === "unknown" &&
      data.budget_source !== "missing" &&
      data.budget_source !== "explicitly_unknown"
    ) {
      return false;
    }
    return true;
  },
  {
    message: "Budget mode/source/max combination is invalid",
    path: ["budget_mode"],
  },
);
export type TravelSearchRequest = z.infer<typeof TravelSearchRequestSchema>;
