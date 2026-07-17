import { type SpikePipelineResult, type SpikeRequest, type SpikeTour } from "./types.ts";

export function runPipeline(
  request: SpikeRequest,
  rawResults: unknown[],
): SpikePipelineResult {
  const warnings: string[] = [];
  const candidates = extractCandidates(rawResults);

  if (candidates.length === 0) {
    warnings.push("No valid candidates extracted from raw results");
    return { ranked_tours: [], warnings };
  }

  const filtered = applyFilters(candidates, request);

  if (filtered.length === 0) {
    warnings.push("No tours match the specified filters");
    return { ranked_tours: [], warnings };
  }

  const bestPerHotel = pickBestPerHotel(filtered);
  const ranked = rankHotels(bestPerHotel, request).slice(0, 3);

  return { ranked_tours: ranked, warnings };
}

export function runPipelineWithCandidates(
  request: SpikeRequest,
  candidates: SpikeTour[],
): SpikePipelineResult {
  const warnings: string[] = [];

  if (candidates.length === 0) {
    warnings.push("No valid candidates extracted from raw results");
    return { ranked_tours: [], warnings };
  }

  const filtered = applyFilters(candidates, request);

  if (filtered.length === 0) {
    warnings.push("No tours match the specified filters");
    return { ranked_tours: [], warnings };
  }

  const bestPerHotel = pickBestPerHotel(filtered);
  const ranked = rankHotels(bestPerHotel, request).slice(0, 3);

  return { ranked_tours: ranked, warnings };
}

function extractCandidates(rawResults: unknown[]): SpikeTour[] {
  const candidates: SpikeTour[] = [];
  for (const raw of rawResults) {
    const hotel = raw as Record<string, unknown>;
    const tours = hotel.tours as Array<Record<string, unknown>> | undefined;
    if (!tours) continue;

    for (const tour of tours) {
      const hotelId = hotel.id as number | undefined;
      const tourId = tour.id as string | undefined;
      const price = tour.price as number | undefined;

      if (hotelId == null || tourId == null || price == null || price <= 0) continue;

      const mealObj = tour.meal as Record<string, unknown> | undefined;
      const opObj = tour.operator as Record<string, unknown> | undefined;
      const regionObj = hotel.region as Record<string, unknown> | undefined;
      const countryObj = hotel.country as Record<string, unknown> | undefined;

      candidates.push({
        hotel_id: hotelId,
        hotel_name: (hotel.name as string) ?? null,
        country_id: (countryObj?.id as number) ?? null,
        country: (countryObj?.name as string) ?? null,
        resort: (regionObj?.name as string) ?? null,
        hotel_category: (hotel.category as number) ?? null,
        hotel_rating: (hotel.rating as number) ?? null,
        distance_to_sea: (hotel.seaDistance as number) ?? null,
        tour_id: tourId,
        departure_date: (tour.date as string) ?? null,
        nights: (tour.nights as number) ?? null,
        meal: (mealObj?.name as string) ?? null,
        room: (tour.roomType as string) ?? null,
        tour_operator: (opObj?.name as string) ?? null,
        price: price,
        currency: (tour.currency as string) ?? null,
        hotel_availability: (tour.hotelPlace as number) === 0 ? "available" : "on_request",
        flight_availability: (tour.flightPlace as number) === 0 ? "available" : "on_request",
      });
    }
  }
  return candidates;
}

function applyFilters(candidates: SpikeTour[], request: SpikeRequest): SpikeTour[] {
  return candidates.filter((t) => {
    if (t.country_id !== request.country_id) return false;

    if (t.departure_date < request.date_from || t.departure_date > request.date_to) return false;

    if (t.nights < request.nights_from || t.nights > request.nights_to) return false;

    if (request.budget_max != null && request.budget_mode !== "unknown") {
      const limit = request.budget_mode === "soft" ? request.budget_max * 1.1 : request.budget_max;
      if (t.price > limit) return false;
    }

    if (request.meal != null && t.meal !== request.meal) return false;

    if (request.hotel_category_min != null && t.hotel_category < request.hotel_category_min) {
      return false;
    }

    if (request.hotel_rating_min != null && t.hotel_rating < request.hotel_rating_min) return false;

    return true;
  });
}

function pickBestPerHotel(candidates: SpikeTour[]): SpikeTour[] {
  const grouped = new Map<number, SpikeTour[]>();
  for (const c of candidates) {
    const list = grouped.get(c.hotel_id) ?? [];
    list.push(c);
    grouped.set(c.hotel_id, list);
  }

  const result: SpikeTour[] = [];
  for (const [, tours] of grouped) {
    tours.sort((a, b) => {
      const ratingDiff = (b.hotel_rating ?? 0) - (a.hotel_rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return a.price - b.price;
    });
    result.push(tours[0]);
  }
  return result;
}

function rankHotels(hotels: SpikeTour[], request: SpikeRequest): SpikeTour[] {
  return hotels.sort((a, b) => {
    const aInBudget = request.budget_max == null || request.budget_mode === "unknown" ||
      a.price <= request.budget_max;
    const bInBudget = request.budget_max == null || request.budget_mode === "unknown" ||
      b.price <= request.budget_max;

    if (aInBudget && !bInBudget) return -1;
    if (!aInBudget && bInBudget) return 1;

    const ratingDiff = (b.hotel_rating ?? 0) - (a.hotel_rating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;

    const catDiff = (b.hotel_category ?? 0) - (a.hotel_category ?? 0);
    if (catDiff !== 0) return catDiff;

    return a.price - b.price;
  });
}
