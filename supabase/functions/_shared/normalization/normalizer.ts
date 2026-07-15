import { NormalizedTourSchema } from "../schemas/mod.ts";
import type { NormalizedTour } from "../schemas/mod.ts";
import { TourNormalizationError } from "./errors.ts";

export type NormalizationContext = {
  searchId: string;
  searchState: "completed" | "partial";
  destinationPriority: number;
  departureCity: string | null;
  fixtureData: boolean;
};

export type NormalizationRejectionCode =
  | "INVALID_HOTEL_OBJECT"
  | "INVALID_TOURS_COLLECTION"
  | "INVALID_TOUR_OBJECT"
  | "MISSING_CRITICAL_FIELDS"
  | "NORMALIZED_SCHEMA_REJECTED";

export type NormalizationRejection = {
  hotelIndex: number;
  tourIndex: number | null;
  tourId: string | null;
  code: NormalizationRejectionCode;
  missingFields: string[];
};

export type NormalizationResult = {
  tours: NormalizedTour[];
  rejected: NormalizationRejection[];
  rawHotelsCount: number;
  rawToursCount: number;
  normalizedToursCount: number;
  deduplicatedToursCount: number;
};

const optionalFieldOrder = [
  "hotel_category",
  "hotel_rating",
  "resort",
  "subregion",
  "sea_distance_value",
  "latitude",
  "longitude",
  "hotel_image_url",
  "tour_name",
  "flight_nights",
  "adults",
  "children_count",
  "meal_id",
  "meal_code",
  "meal_name",
  "meal_name_full",
  "room_id",
  "room_name",
  "accommodation",
  "tour_operator_id",
  "tour_operator",
  "is_charter",
  "is_promo",
  "fuel_charge",
] as const;

function toNullableString(val: unknown): string | null {
  if (typeof val === "string") return val || null;
  if (typeof val === "number") return String(val);
  return null;
}

function toNullableId(val: unknown): number | null {
  if (typeof val === "number" && Number.isInteger(val) && val > 0) return val;
  return null;
}

function toNullableNonNegativeInt(val: unknown): number | null {
  if (typeof val === "number" && Number.isInteger(val) && val >= 0) return val;
  return null;
}

function toNullableNonNegativeNumber(val: unknown): number | null {
  if (typeof val === "number" && isFinite(val) && val >= 0) return val;
  return null;
}

function toNullableBoolean(val: unknown): boolean | null {
  if (typeof val === "boolean") return val;
  return null;
}

function toSeaDistance(val: unknown): { value: number | null; unit: "unknown" | "m" } {
  if (typeof val === "number" && isFinite(val) && val > 0) {
    return { value: val, unit: "unknown" };
  }
  return { value: null, unit: "unknown" };
}

function toNullableLatitude(val: unknown): number | null {
  if (typeof val === "number" && isFinite(val) && val !== 0) return val;
  return null;
}

function toNullableLongitude(val: unknown): number | null {
  if (typeof val === "number" && isFinite(val) && val !== 0) return val;
  return null;
}

function toNullablePositiveIntFromMixed(val: unknown): number | null {
  if (typeof val === "number" && Number.isInteger(val) && val > 0) return val;
  return null;
}

function normalizeId(val: unknown): string | null {
  if (typeof val === "number" && Number.isInteger(val) && val > 0) return String(val);
  if (typeof val === "string" && val.length > 0) return val;
  return null;
}

function getMealCode(meal: Record<string, unknown> | null | undefined): string | null {
  if (!meal || typeof meal !== "object") return null;
  const name = (meal as Record<string, unknown>).name;
  if (typeof name === "string" && name.length > 0) return name;
  return null;
}

function getMealName(meal: Record<string, unknown> | null | undefined): string | null {
  if (!meal || typeof meal !== "object") return null;
  const m = meal as Record<string, unknown>;
  return toNullableString(m.russianName) ??
    toNullableString(m.fullRussianName) ??
    toNullableString(m.name) ??
    toNullableString(m.fullName) ??
    null;
}

function getMealNameFull(meal: Record<string, unknown> | null | undefined): string | null {
  if (!meal || typeof meal !== "object") return null;
  const m = meal as Record<string, unknown>;
  return toNullableString(m.fullRussianName) ??
    toNullableString(m.fullName) ??
    toNullableString(m.russianName) ??
    toNullableString(m.name) ??
    null;
}

function getOperatorName(operator: Record<string, unknown> | null | undefined): string | null {
  if (!operator || typeof operator !== "object") return null;
  const o = operator as Record<string, unknown>;
  return toNullableString(o.russianName) ??
    toNullableString(o.fullName) ??
    toNullableString(o.name) ??
    null;
}

function validateContext(context: NormalizationContext): void {
  if (typeof context.searchId !== "string" || context.searchId.length === 0) {
    throw new TourNormalizationError({
      code: "INVALID_NORMALIZATION_CONTEXT",
      message: "searchId must be a non-empty string",
    });
  }
  if (
    !Number.isInteger(context.destinationPriority) || context.destinationPriority < 1
  ) {
    throw new TourNormalizationError({
      code: "INVALID_NORMALIZATION_CONTEXT",
      message: "destinationPriority must be a positive integer",
    });
  }
  if (typeof context.departureCity !== "string" && context.departureCity !== null) {
    throw new TourNormalizationError({
      code: "INVALID_NORMALIZATION_CONTEXT",
      message: "departureCity must be a string or null",
    });
  }
  if (context.searchState !== "completed" && context.searchState !== "partial") {
    throw new TourNormalizationError({
      code: "INVALID_NORMALIZATION_CONTEXT",
      message: "searchState must be 'completed' or 'partial'",
    });
  }
  if (typeof context.fixtureData !== "boolean") {
    throw new TourNormalizationError({
      code: "INVALID_NORMALIZATION_CONTEXT",
      message: "fixtureData must be a boolean",
    });
  }
}

function collectMissingFields(tour: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const field of optionalFieldOrder) {
    if (tour[field] === null || tour[field] === undefined) {
      missing.push(field);
    }
  }
  return missing;
}

function collectDataWarnings(
  tour: Record<string, unknown>,
  context: NormalizationContext,
): string[] {
  const warnings: string[] = [];
  if (context.fixtureData) warnings.push("FIXTURE_DATA");
  if (context.searchState === "partial") warnings.push("PARTIAL_SEARCH");
  warnings.push("PRICE_NOT_ACTUALIZED");
  warnings.push("AVAILABILITY_NOT_VERIFIED");
  if (tour.sea_distance_value !== null && (tour.sea_distance_value as number) > 0) {
    warnings.push("SEA_DISTANCE_UNIT_UNKNOWN");
  }
  return warnings;
}

function normalizeHotel(
  hotel: Record<string, unknown>,
  hotelIndex: number,
  context: NormalizationContext,
): NormalizedTour[] {
  const rawTours = hotel.tours;
  if (!Array.isArray(rawTours) || rawTours.length === 0) {
    return [];
  }

  const hotelId = normalizeId(hotel.id);
  const hotelName = toNullableString(hotel.name);
  const countryObj = (typeof hotel.country === "object" && hotel.country !== null)
    ? (hotel.country as Record<string, unknown>)
    : null;
  const countryName = toNullableString(countryObj?.name);
  const countryId = toNullableId(countryObj?.id);

  const regionObj = (typeof hotel.region === "object" && hotel.region !== null)
    ? (hotel.region as Record<string, unknown>)
    : null;
  const resortName = toNullableString(regionObj?.name);
  const resortId = toNullableId(regionObj?.id);

  const subRegionObj = (typeof hotel.subRegion === "object" && hotel.subRegion !== null)
    ? (hotel.subRegion as Record<string, unknown>)
    : null;
  const subregionName = (() => {
    const name = toNullableString(subRegionObj?.name);
    if (name !== null && name.length > 0) return name;
    return null;
  })();
  const subregionId = toNullablePositiveIntFromMixed(subRegionObj?.id);

  const category = toNullablePositiveIntFromMixed(hotel.category);
  const rating = (() => {
    const r = hotel.rating;
    if (typeof r === "number" && isFinite(r) && r > 0) return r;
    return null;
  })();

  const seaDist = toSeaDistance(hotel.seaDistance);
  const lat = toNullableLatitude(hotel.latitude);
  const lng = toNullableLongitude(hotel.longitude);
  const img = toNullableString(hotel.picturelink);

  const results: NormalizedTour[] = [];

  for (let tourIndex = 0; tourIndex < rawTours.length; tourIndex++) {
    const rawTour = rawTours[tourIndex];
    if (!rawTour || typeof rawTour !== "object") {
      continue;
    }
    const tour = rawTour as Record<string, unknown>;

    const tourId = normalizeId(tour.id);
    const tourName = toNullableString(tour.name);
    const departureDate = toNullableString(tour.date);
    const nights = (() => {
      const n = tour.nights;
      if (typeof n === "number" && Number.isInteger(n) && n > 0) return n;
      return null;
    })();
    const price = (() => {
      const p = tour.price;
      if (typeof p === "number" && isFinite(p) && p > 0) return p;
      return null;
    })();
    const currency = toNullableString(tour.currency);

    const missingCritical: string[] = [];
    if (!hotelId) missingCritical.push("hotel_id");
    if (!hotelName) missingCritical.push("hotel_name");
    if (!countryName) missingCritical.push("country");
    if (!tourId) missingCritical.push("tour_id");
    if (!departureDate) missingCritical.push("departure_date");
    if (nights === null) missingCritical.push("nights");
    if (price === null) missingCritical.push("price");
    if (!currency) missingCritical.push("currency");

    if (missingCritical.length > 0) {
      continue;
    }

    const mealObj = (typeof tour.meal === "object" && tour.meal !== null)
      ? (tour.meal as Record<string, unknown>)
      : null;
    const mealId = toNullablePositiveIntFromMixed(mealObj?.id);
    const mealCode = getMealCode(mealObj);
    const mealName = getMealName(mealObj);
    const mealNameFull = getMealNameFull(mealObj);

    const roomId = (() => {
      const rid = tour.roomId;
      if (typeof rid === "number" && Number.isInteger(rid) && rid > 0) return String(rid);
      if (typeof rid === "string" && rid.length > 0) return rid;
      return null;
    })();
    const roomName = toNullableString(tour.roomType);
    const accommodation = toNullableString(tour.placement);

    const operatorObj = (typeof tour.operator === "object" && tour.operator !== null)
      ? (tour.operator as Record<string, unknown>)
      : null;
    const operatorId = toNullablePositiveIntFromMixed(operatorObj?.id);
    const operatorName = getOperatorName(operatorObj);

    const isCharter = toNullableBoolean(tour.isCharter);
    const isPromo = toNullableBoolean(tour.isPromo);

    const flightNights = toNullableNonNegativeInt(tour.flightNights);
    const adults = toNullableNonNegativeInt(tour.adults);
    const childrenCount = toNullableNonNegativeInt(tour.childs);
    const fuelCharge = toNullableNonNegativeNumber(tour.fuelCharge);
    const hotelPlace = toNullableNonNegativeInt(tour.hotelPlace);
    const flightPlace = toNullableNonNegativeInt(tour.flightPlace);

    const candidate: Record<string, unknown> = {
      schema_version: "0.2",
      search_id: context.searchId,
      search_state: context.searchState,
      destination_priority: context.destinationPriority,
      departure_city: context.departureCity,

      hotel_id: hotelId,
      hotel_name: hotelName,
      country_id: countryId,
      country: countryName,
      resort_id: resortId,
      resort: resortName,
      subregion_id: subregionId,
      subregion: subregionName,

      hotel_category: category,
      hotel_rating: rating,

      sea_distance_value: seaDist.value,
      sea_distance_unit: seaDist.unit,

      latitude: lat,
      longitude: lng,
      hotel_image_url: img,

      tour_id: tourId,
      tour_name: tourName,
      departure_date: departureDate,
      nights,
      flight_nights: flightNights,
      adults,
      children_count: childrenCount,

      meal_id: mealId,
      meal_code: mealCode,
      meal_name: mealName,
      meal_name_full: mealNameFull,

      room_id: roomId,
      room_name: roomName,
      accommodation,

      tour_operator_id: operatorId,
      tour_operator: operatorName,

      is_charter: isCharter,
      is_promo: isPromo,

      price,
      currency,
      fuel_charge: fuelCharge,
      price_status: "search",
      price_actualized_at: null,

      hotel_availability: "unknown",
      flight_availability: "unknown",

      hotel_place_raw: hotelPlace,
      flight_place_raw: flightPlace,

      availability_verification: "not_checked",

      source: "tourvisor",

      raw_reference: {
        search_id: context.searchId,
        hotel_id: hotelId,
        tour_id: tourId,
        hotel_index: hotelIndex,
        tour_index: tourIndex,
      },

      missing_fields: [],
      data_warnings: [],
    };

    candidate.missing_fields = collectMissingFields(candidate);
    candidate.data_warnings = collectDataWarnings(candidate, context);

    const parsed = NormalizedTourSchema.safeParse(candidate);
    if (!parsed.success) {
      continue;
    }

    results.push(parsed.data);
  }

  return results;
}

export function normalizeTourvisorResults(
  raw: unknown,
  context: NormalizationContext,
): NormalizationResult {
  validateContext(context);

  if (!Array.isArray(raw)) {
    throw new TourNormalizationError({
      code: "INVALID_RESULTS_RESPONSE",
      message: "Raw results must be an array",
    });
  }

  const rawHotels = raw as unknown[];
  const allTours: NormalizedTour[] = [];
  const rejected: NormalizationRejection[] = [];
  let rawToursCount = 0;

  for (let hotelIndex = 0; hotelIndex < rawHotels.length; hotelIndex++) {
    const hotel = rawHotels[hotelIndex];

    if (!hotel || typeof hotel !== "object") {
      rejected.push({
        hotelIndex,
        tourIndex: null,
        tourId: null,
        code: "INVALID_HOTEL_OBJECT",
        missingFields: [],
      });
      continue;
    }

    const hotelObj = hotel as Record<string, unknown>;
    const toursArr = hotelObj.tours;

    if (!Array.isArray(toursArr)) {
      rejected.push({
        hotelIndex,
        tourIndex: null,
        tourId: null,
        code: "INVALID_TOURS_COLLECTION",
        missingFields: [],
      });
      continue;
    }

    rawToursCount += toursArr.length;
    const normalized = normalizeHotel(hotelObj, hotelIndex, context);
    allTours.push(...normalized);
  }

  const deduped = deduplicateTours(allTours);

  return {
    tours: deduped.tours,
    rejected,
    rawHotelsCount: rawHotels.length,
    rawToursCount,
    normalizedToursCount: allTours.length,
    deduplicatedToursCount: deduped.removedCount,
  };
}

function deduplicateTours(
  tours: NormalizedTour[],
): { tours: NormalizedTour[]; removedCount: number } {
  const seen = new Map<string, NormalizedTour>();
  const order: string[] = [];

  for (const tour of tours) {
    const existing = seen.get(tour.tour_id);
    if (!existing) {
      seen.set(tour.tour_id, tour);
      order.push(tour.tour_id);
      continue;
    }

    const existingMissing = existing.missing_fields.length;
    const currentMissing = tour.missing_fields.length;

    if (currentMissing < existingMissing) {
      seen.set(tour.tour_id, tour);
    } else if (currentMissing === existingMissing) {
      if (tour.price < existing.price) {
        seen.set(tour.tour_id, tour);
      }
    }
  }

  const result = order.map((id) => seen.get(id)!).filter(Boolean);
  return {
    tours: result,
    removedCount: tours.length - result.length,
  };
}
