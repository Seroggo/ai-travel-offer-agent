import { z } from "zod";

const RawMealSchema = z.object({
  id: z.union([z.number(), z.undefined(), z.null()]).optional(),
  name: z.union([z.string(), z.undefined(), z.null()]).optional(),
  russianName: z.union([z.string(), z.undefined(), z.null()]).optional(),
  fullName: z.union([z.string(), z.undefined(), z.null()]).optional(),
  fullRussianName: z.union([z.string(), z.undefined(), z.null()]).optional(),
}).passthrough();

const RawOperatorSchema = z.object({
  id: z.union([z.number(), z.undefined(), z.null()]).optional(),
  name: z.union([z.string(), z.undefined(), z.null()]).optional(),
  russianName: z.union([z.string(), z.undefined(), z.null()]).optional(),
  fullName: z.union([z.string(), z.undefined(), z.null()]).optional(),
}).passthrough();

const RawRegionSchema = z.object({
  id: z.union([z.number(), z.undefined(), z.null()]).optional(),
  name: z.union([z.string(), z.undefined(), z.null()]).optional(),
  countryId: z.union([z.number(), z.undefined(), z.null()]).optional(),
  regionId: z.union([z.number(), z.undefined(), z.null()]).optional(),
}).passthrough();

const RawCountrySchema = z.object({
  id: z.union([z.number(), z.undefined(), z.null()]).optional(),
  name: z.union([z.string(), z.undefined(), z.null()]).optional(),
}).passthrough();

export const RawTourSchema = z.object({
  id: z.union([z.string(), z.number(), z.undefined(), z.null()]).optional(),
  name: z.union([z.string(), z.undefined(), z.null()]).optional(),
  date: z.union([z.string(), z.undefined(), z.null()]).optional(),
  nights: z.union([z.number(), z.undefined(), z.null()]).optional(),
  flightNights: z.union([z.number(), z.undefined(), z.null()]).optional(),
  adults: z.union([z.number(), z.undefined(), z.null()]).optional(),
  childs: z.union([z.number(), z.undefined(), z.null()]).optional(),
  meal: z.union([RawMealSchema, z.undefined(), z.null()]).optional(),
  roomId: z.union([z.number(), z.string(), z.undefined(), z.null()]).optional(),
  roomType: z.union([z.string(), z.undefined(), z.null()]).optional(),
  placement: z.union([z.string(), z.undefined(), z.null()]).optional(),
  operator: z.union([RawOperatorSchema, z.undefined(), z.null()]).optional(),
  isCharter: z.union([z.boolean(), z.undefined(), z.null()]).optional(),
  isPromo: z.union([z.boolean(), z.undefined(), z.null()]).optional(),
  price: z.union([z.number(), z.undefined(), z.null()]).optional(),
  currency: z.union([z.string(), z.undefined(), z.null()]).optional(),
  fuelCharge: z.union([z.number(), z.undefined(), z.null()]).optional(),
  hotelPlace: z.union([z.number(), z.undefined(), z.null()]).optional(),
  flightPlace: z.union([z.number(), z.undefined(), z.null()]).optional(),
}).passthrough();

export const RawHotelSchema = z.object({
  id: z.union([z.number(), z.string(), z.undefined(), z.null()]).optional(),
  name: z.union([z.string(), z.undefined(), z.null()]).optional(),
  country: z.union([RawCountrySchema, z.undefined(), z.null()]).optional(),
  region: z.union([RawRegionSchema, z.undefined(), z.null()]).optional(),
  subRegion: z.union([RawRegionSchema, z.undefined(), z.null()]).optional(),
  category: z.union([z.number(), z.undefined(), z.null()]).optional(),
  rating: z.union([z.number(), z.undefined(), z.null()]).optional(),
  seaDistance: z.union([z.number(), z.undefined(), z.null()]).optional(),
  latitude: z.union([z.number(), z.undefined(), z.null()]).optional(),
  longitude: z.union([z.number(), z.undefined(), z.null()]).optional(),
  picturelink: z.union([z.string(), z.undefined(), z.null()]).optional(),
  tours: z.union([z.array(z.unknown()), z.undefined(), z.null()]).optional(),
}).passthrough();
