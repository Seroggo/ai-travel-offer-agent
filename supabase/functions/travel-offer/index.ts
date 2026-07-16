import { runPipeline } from "../_shared/spike/pipeline.ts";
import { buildOffer } from "../_shared/spike/build-offer.ts";
import type { SpikeRequest } from "../_shared/spike/types.ts";
import searchResults from "../../../tests/fixtures/tourvisor/search-results.json" with {
  type: "json",
};

type MockScenario = "success" | "empty" | "error";

type RequestBody = {
  request: SpikeRequest;
  mock_scenario: MockScenario;
};

export async function handleTravelOfferRequest(
  request: Request,
): Promise<Response> {
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
  Deno.serve(handleTravelOfferRequest);
}
