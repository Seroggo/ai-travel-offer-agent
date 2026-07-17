import { runPipeline, runPipelineWithCandidates } from "../_shared/spike/pipeline.ts";
import { buildOffer } from "../_shared/spike/build-offer.ts";
import type { SpikeRequest, SpikeTour } from "../_shared/spike/types.ts";
import { searchTours, type TourCandidate, TourvisorError } from "../_shared/tourvisor/client.ts";
import searchResults from "../../../tests/fixtures/tourvisor/search-results.json" with {
  type: "json",
};

type MockScenario = "success" | "empty" | "error";

type RequestBody = {
  request: SpikeRequest;
  mock_scenario: MockScenario;
};

export type HandlerConfig = {
  internalApiToken?: string;
  tourvisorJwt?: string;
  tourSource?: string;
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<void>;
};

function tourCandidateToSpikeTour(candidates: TourCandidate[], countryId: number): SpikeTour[] {
  return candidates.map((c) => ({
    hotel_id: c.hotel_id,
    hotel_name: c.hotel_name ?? "",
    country_id: countryId,
    country: c.country ?? "",
    resort: c.resort ?? "",
    hotel_category: c.hotel_category ?? 0,
    hotel_rating: c.hotel_rating ?? 0,
    distance_to_sea: 0,
    tour_id: c.tour_id,
    departure_date: c.departure_date ?? "",
    nights: c.nights ?? 0,
    meal: c.meal ?? "",
    room: c.room ?? "",
    tour_operator: c.tour_operator ?? "",
    price: c.price,
    currency: c.currency ?? "RUB",
    hotel_availability: c.hotel_availability ?? "unknown",
    flight_availability: c.flight_availability ?? "unknown",
  }));
}

export async function handleTravelOfferRequest(
  request: Request,
  config?: HandlerConfig,
): Promise<Response> {
  const expectedToken = config?.internalApiToken ?? Deno.env.get("INTERNAL_API_TOKEN");
  if (!expectedToken) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
  const providedToken = request.headers.get("X-Internal-Token");
  if (providedToken !== expectedToken) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "content-type": "application/json" } },
    );
  }

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const tourSource = config?.tourSource ?? Deno.env.get("TOUR_SOURCE") ?? "mock";

  if (tourSource === "real") {
    const rawJwt = config?.tourvisorJwt ?? Deno.env.get("TOURVISOR_JWT");
    const jwt = rawJwt?.trim();
    const jwtIsValid = jwt != null && jwt.length > 0 &&
      !/[\r\n]/.test(jwt) &&
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(jwt);
    if (!jwtIsValid) {
      return new Response(
        JSON.stringify({
          status: "error",
          error_code: "TOUR_SOURCE_ERROR",
          message: "Tourvisor JWT not configured.",
        }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }

    const { departure_id } = body.request;
    if (!departure_id) {
      return new Response(
        JSON.stringify({
          status: "error",
          error_code: "TOUR_SOURCE_ERROR",
          message: "Missing departure_id for Tourvisor search.",
        }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }

    try {
      const { results, warnings } = await searchTours(
        {
          departure_id,
          country_id: body.request.country_id,
          date_from: body.request.date_from,
          date_to: body.request.date_to,
          nights_from: body.request.nights_from,
          nights_to: body.request.nights_to,
          adults: body.request.adults,
          children_ages: body.request.children_ages,
          budget_max: body.request.budget_max,
          meal_id: body.request.meal_id ?? null,
          hotel_category: body.request.hotel_category_min,
          hotel_rating: body.request.hotel_rating_min,
          currency: "RUB",
          charter_only: true,
        },
        { jwt, fetchFn: config?.fetchFn, sleepFn: config?.sleepFn },
      );

      const spikeTours = tourCandidateToSpikeTour(results, body.request.country_id);
      const pipelineResult = runPipelineWithCandidates(body.request, spikeTours);
      pipelineResult.warnings.push(...warnings);
      const offer = buildOffer(pipelineResult.ranked_tours);

      const responseStatus = pipelineResult.ranked_tours.length > 0 ? "success" : "empty";

      return new Response(
        JSON.stringify({
          status: responseStatus,
          ranked_tours: pipelineResult.ranked_tours,
          agent_summary: offer.agent_summary,
          client_message: offer.client_message,
          warnings: pipelineResult.warnings,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    } catch (e) {
      if (e instanceof TourvisorError) {
        return new Response(
          JSON.stringify({
            status: "error",
            error_code: "TOUR_SOURCE_ERROR",
            message: "Не удалось получить варианты туров.",
          }),
          { status: 502, headers: { "content-type": "application/json" } },
        );
      }
      throw e;
    }
  }

  if (body.mock_scenario === "error") {
    return new Response(
      JSON.stringify({
        status: "error",
        error_code: "TOUR_SOURCE_ERROR",
        message: "Не удалось получить варианты туров.",
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  const rawResults = body.mock_scenario === "empty" ? [] : structuredClone(searchResults);
  const pipelineResult = runPipeline(body.request, rawResults);
  const offer = buildOffer(pipelineResult.ranked_tours);

  const responseStatus = pipelineResult.ranked_tours.length > 0 ? "success" : "empty";

  return new Response(
    JSON.stringify({
      status: responseStatus,
      ranked_tours: pipelineResult.ranked_tours,
      agent_summary: offer.agent_summary,
      client_message: offer.client_message,
      warnings: pipelineResult.warnings,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

if (import.meta.main) {
  Deno.serve((req: Request) => handleTravelOfferRequest(req));
}
