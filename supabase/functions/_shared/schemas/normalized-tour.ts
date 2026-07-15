import { z } from "zod";
import {
  AvailabilityStatusSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  PriceStatusSchema,
} from "./common.ts";

export const RawReferenceSchema = z.object({
  search_id: z.string().min(1),
  hotel_id: z.string().min(1),
  tour_id: z.string().min(1),
  hotel_index: z.number().int().min(0),
  tour_index: z.number().int().min(0),
}).strict();
export type RawReference = z.infer<typeof RawReferenceSchema>;

export const NormalizedTourSchema = z.object({
  schema_version: z.literal("0.2"),

  search_id: z.string().min(1),
  search_state: z.enum(["completed", "partial"]),
  destination_priority: z.number().int().min(1),
  departure_city: z.string().nullable(),

  hotel_id: z.string().min(1),
  hotel_name: z.string().min(1),
  country_id: z.number().int().positive().nullable(),
  country: z.string().min(1),
  resort_id: z.number().int().positive().nullable(),
  resort: z.string().nullable(),
  subregion_id: z.number().int().positive().nullable(),
  subregion: z.string().nullable(),

  hotel_category: z.number().int().min(1).max(5).nullable(),
  hotel_rating: z.number().min(0).max(5).nullable(),

  sea_distance_value: z.number().nonnegative().nullable(),
  sea_distance_unit: z.enum(["unknown", "m"]),

  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  hotel_image_url: z.string().nullable(),

  tour_id: z.string().min(1),
  tour_name: z.string().nullable(),
  departure_date: IsoDateSchema,
  nights: z.number().int().min(1),
  flight_nights: z.number().int().nonnegative().nullable(),
  adults: z.number().int().nonnegative().nullable(),
  children_count: z.number().int().nonnegative().nullable(),

  meal_id: z.number().int().positive().nullable(),
  meal_code: z.string().nullable(),
  meal_name: z.string().nullable(),
  meal_name_full: z.string().nullable(),

  room_id: z.string().nullable(),
  room_name: z.string().nullable(),
  accommodation: z.string().nullable(),

  tour_operator_id: z.number().int().positive().nullable(),
  tour_operator: z.string().nullable(),

  is_charter: z.boolean().nullable(),
  is_promo: z.boolean().nullable(),

  price: z.number().positive(),
  currency: z.string().min(1),
  fuel_charge: z.number().nonnegative().nullable(),
  price_status: PriceStatusSchema,
  price_actualized_at: IsoDateTimeSchema.nullable(),

  hotel_availability: AvailabilityStatusSchema,
  flight_availability: AvailabilityStatusSchema,

  hotel_place_raw: z.number().int().nonnegative().nullable(),
  flight_place_raw: z.number().int().nonnegative().nullable(),
  availability_verification: z.enum(["not_checked", "verified", "failed"]),

  source: z.literal("tourvisor"),

  raw_reference: RawReferenceSchema,

  missing_fields: z.array(z.string()),
  data_warnings: z.array(z.string()),
}).strict().refine(
  (data) => {
    if (data.price_status === "actualized" && !data.price_actualized_at) {
      return false;
    }
    return true;
  },
  {
    message: "price_actualized_at is required when price_status is actualized",
    path: ["price_actualized_at"],
  },
);
export type NormalizedTour = z.infer<typeof NormalizedTourSchema>;
