import { z } from "zod";
import {
  AvailabilityStatusSchema,
  BudgetModeSchema,
  DestinationOfferSearchStateSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  PriceStatusSchema,
} from "./common.ts";

export const RankedOfferOptionSchema = z.object({
  rank: z.number().int().min(1),
  hotel_id: z.string().min(1),
  tour_id: z.string().min(1),
  hotel_name: z.string().min(1),
  country: z.string().min(1),
  resort: z.string().nullable(),
  hotel_category: z.number().int().min(1).max(5).nullable(),
  hotel_rating: z.number().min(0).max(5).nullable(),
  departure_date: IsoDateSchema,
  nights: z.number().int().min(1),
  meal_name: z.string().nullable(),
  room_name: z.string().nullable(),
  accommodation: z.string().nullable(),
  price: z.number().positive(),
  currency: z.string().min(1),
  price_status: PriceStatusSchema,
  flight_availability: AvailabilityStatusSchema,
  hotel_availability: AvailabilityStatusSchema,
  internal_score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  compromises: z.array(z.string()),
  verification_needed: z.array(z.string()),
}).strict();
export type RankedOfferOption = z.infer<typeof RankedOfferOptionSchema>;

export const DestinationOfferSchema = z.object({
  country: z.string().min(1),
  priority: z.number().int().min(1),
  search_state: DestinationOfferSearchStateSchema,
  raw_tours_count: z.number().int().nonnegative(),
  accepted_tours_count: z.number().int().nonnegative(),
  options: z.array(RankedOfferOptionSchema),
  rejection_summary: z.record(z.string(), z.number().int().nonnegative()),
  warnings: z.array(z.string()),
}).strict();
export type DestinationOffer = z.infer<typeof DestinationOfferSchema>;

export const AgentOfferOptionSchema = z.object({
  rank: z.number().int().min(1),
  headline: z.string().min(1),
  factual_details: z.array(z.string()),
  why_ranked_here: z.array(z.string()),
  compromises: z.array(z.string()),
  verify_before_sending: z.array(z.string()),
}).strict();
export type AgentOfferOption = z.infer<typeof AgentOfferOptionSchema>;

export const AgentDestinationSectionSchema = z.object({
  country: z.string().min(1),
  status_summary: z.string().min(1),
  options: z.array(AgentOfferOptionSchema),
  no_result_reason: z.string().nullable(),
}).strict();
export type AgentDestinationSection = z.infer<typeof AgentDestinationSectionSchema>;

export const AgentOfferBlockSchema = z.object({
  understood_request: z.string().min(1),
  assumptions: z.array(z.string()),
  unverified_requirements: z.array(z.string()),
  destination_sections: z.array(AgentDestinationSectionSchema),
  overall_recommendation: z.string().min(1),
  operational_warnings: z.array(z.string()),
}).strict();
export type AgentOfferBlock = z.infer<typeof AgentOfferBlockSchema>;

export const ClientOfferOptionSchema = z.object({
  rank: z.number().int().min(1),
  title: z.string().min(1),
  details: z.array(z.string()),
  selection_reason: z.string().min(1),
  compromise: z.string().nullable(),
}).strict();
export type ClientOfferOption = z.infer<typeof ClientOfferOptionSchema>;

export const ClientDestinationSectionSchema = z.object({
  country: z.string().min(1),
  options: z.array(ClientOfferOptionSchema),
}).strict();
export type ClientDestinationSection = z.infer<typeof ClientDestinationSectionSchema>;

export const ClientOfferBlockSchema = z.object({
  intro: z.string().min(1),
  destination_sections: z.array(ClientDestinationSectionSchema),
  closing: z.string().min(1),
  disclaimer: z.string().min(1),
}).strict();
export type ClientOfferBlock = z.infer<typeof ClientOfferBlockSchema>;

export const TravelOfferSchema = z.object({
  schema_version: z.literal("0.1"),
  request_id: z.string().min(1),
  created_at: IsoDateTimeSchema,

  request_summary: z.object({
    departure_city: z.string().min(1),
    destinations: z.array(z.string()),
    date_from: IsoDateSchema,
    date_to: IsoDateSchema,
    nights_from: z.number().int().min(1),
    nights_to: z.number().int().min(1),
    adults: z.number().int().min(1),
    children_ages: z.array(z.number().int().min(0).max(17)).max(3),
    budget_max: z.number().positive().nullable(),
    budget_mode: BudgetModeSchema,
    meal_preferences: z.array(z.string()),
    hotel_stars_min: z.number().int().min(1).max(5).nullable(),
    hotel_rating_min: z.number().min(0).max(5).nullable(),
  }).strict(),

  assumptions: z.array(z.string()),
  unverifiable_requirements: z.array(z.string()),

  destination_results: z.array(DestinationOfferSchema),

  agent_block: AgentOfferBlockSchema,
  client_block: ClientOfferBlockSchema,

  global_disclaimers: z.array(z.string()),
}).strict();
export type TravelOffer = z.infer<typeof TravelOfferSchema>;
