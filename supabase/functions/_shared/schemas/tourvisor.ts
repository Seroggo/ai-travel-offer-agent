import { z } from "zod";
import { IsoDateSchema } from "./common.ts";

export const TourvisorSearchParamsSchema = z.object({
  departureId: z.number().int().positive(),
  countryId: z.number().int().positive(),

  dateFrom: IsoDateSchema,
  dateTo: IsoDateSchema,

  nightsFrom: z.number().int().min(1).max(28),
  nightsTo: z.number().int().min(1).max(28),

  adults: z.number().int().min(1).max(6),
  childs: z.array(z.number().int().min(0).max(17)).max(3).optional(),

  meal: z.number().int().positive().optional(),
  hotelCategory: z.number().int().min(1).max(5).optional(),
  hotelRating: z.union([z.literal(0), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .optional(),

  regionIds: z.array(z.number().int().positive()).optional(),
  hotelServices: z.array(z.number().int().positive()).optional(),

  priceTo: z.number().positive().optional(),

  currency: z.string().min(1, "Currency must be non-empty"),
  onlyCharter: z.boolean(),
  onlyDirect: z.boolean().optional(),
}).strict().refine(
  (data) => {
    const from = new Date(data.dateFrom + "T00:00:00Z");
    const to = new Date(data.dateTo + "T00:00:00Z");
    if (from > to) return false;
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 21) return false;
    return true;
  },
  {
    message: "dateFrom must be <= dateTo and range <= 21 days",
    path: ["dateFrom"],
  },
).refine(
  (data) => {
    if (data.nightsFrom > data.nightsTo) return false;
    if (data.nightsTo - data.nightsFrom > 10) return false;
    return true;
  },
  {
    message: "nightsFrom must be <= nightsTo and difference <= 10",
    path: ["nightsFrom"],
  },
);
export type TourvisorSearchParams = z.infer<typeof TourvisorSearchParamsSchema>;
