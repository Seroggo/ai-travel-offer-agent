import { strict as assert } from "node:assert/strict";
import { MockTourvisorAdapter } from "../../../supabase/functions/_shared/tourvisor/mock-adapter.ts";
import { TourvisorAdapterError } from "../../../supabase/functions/_shared/tourvisor/errors.ts";
import type { TourvisorAdapter } from "../../../supabase/functions/_shared/tourvisor/adapter.ts";
import type { TourvisorSearchParams } from "../../../supabase/functions/_shared/schemas/mod.ts";

function validParams(overrides: Partial<TourvisorSearchParams> = {}): TourvisorSearchParams {
  return {
    departureId: 1,
    countryId: 9001,
    dateFrom: "2026-08-10",
    dateTo: "2026-08-20",
    nightsFrom: 7,
    nightsTo: 9,
    adults: 2,
    currency: "RUB",
    onlyCharter: false,
    ...overrides,
  };
}

Deno.test("MockTourvisorAdapter: default scenario = success", async () => {
  const adapter = new MockTourvisorAdapter();
  const result = await adapter.startSearch(validParams());
  assert.equal(result.searchId, "900001");
});

Deno.test("MockTourvisorAdapter: startSearch returns string 900001", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "success" });
  const result = await adapter.startSearch(validParams());
  assert.equal(typeof result.searchId, "string");
  assert.equal(result.searchId, "900001");
});

Deno.test("MockTourvisorAdapter: invalid search params throws INVALID_SEARCH_PARAMS", async () => {
  const adapter = new MockTourvisorAdapter();
  await assert.rejects(
    () => adapter.startSearch(validParams({ departureId: 0 })),
    (err: unknown) => {
      assert.ok(err instanceof TourvisorAdapterError);
      assert.equal(err.code, "INVALID_SEARCH_PARAMS");
      assert.equal(err.retryable, false);
      return true;
    },
  );
});

Deno.test("MockTourvisorAdapter: success status completed and progress 100", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "success" });
  await adapter.startSearch(validParams());
  const status = await adapter.getSearchStatus("900001");
  assert.equal(status.state, "completed");
  assert.equal(status.progress, 100);
});

Deno.test("MockTourvisorAdapter: success results array of 6 hotels", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "success" });
  await adapter.startSearch(validParams());
  const results = await adapter.getSearchResults("900001") as unknown[];
  assert.equal(results.length, 6);
});

Deno.test("MockTourvisorAdapter: returned fixture is a clone (immutable)", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "success" });
  await adapter.startSearch(validParams());
  const first = await adapter.getSearchResults("900001") as Record<string, unknown>[];
  (first[0] as Record<string, unknown>).name = "MUTATED";
  const second = await adapter.getSearchResults("900001") as Record<string, unknown>[];
  assert.notEqual(second[0].name, "MUTATED");
  assert.equal(second[0].name, "DEMO Sun Family Resort");
});

Deno.test("MockTourvisorAdapter: processing state", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "processing" });
  await adapter.startSearch(validParams());
  const status = await adapter.getSearchStatus("900001");
  assert.equal(status.state, "processing");
  assert.equal(status.progress, 45);
});

Deno.test("MockTourvisorAdapter: processing results throws RESULTS_NOT_READY", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "processing" });
  await adapter.startSearch(validParams());
  await assert.rejects(
    () => adapter.getSearchResults("900001"),
    (err: unknown) => {
      assert.ok(err instanceof TourvisorAdapterError);
      assert.equal(err.code, "RESULTS_NOT_READY");
      return true;
    },
  );
});

Deno.test("MockTourvisorAdapter: complete scenario", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "complete" });
  await adapter.startSearch(validParams());
  const status = await adapter.getSearchStatus("900001");
  assert.equal(status.state, "completed");
  const results = await adapter.getSearchResults("900001") as unknown[];
  assert.equal(results.length, 6);
});

Deno.test("MockTourvisorAdapter: empty returns empty array", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "empty" });
  await adapter.startSearch(validParams());
  const results = await adapter.getSearchResults("900001") as unknown[];
  assert.equal(results.length, 0);
});

Deno.test("MockTourvisorAdapter: error throws with httpStatus 503 and retryable true", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "error" });
  await assert.rejects(
    () => adapter.startSearch(validParams()),
    (err: unknown) => {
      assert.ok(err instanceof TourvisorAdapterError);
      assert.equal(err.code, "MOCK_HTTP_ERROR");
      assert.equal(err.httpStatus, 503);
      assert.equal(err.retryable, true);
      return true;
    },
  );
});

Deno.test("MockTourvisorAdapter: invalid_response throws INVALID_MOCK_RESPONSE", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "invalid_response" });
  await assert.rejects(
    () => adapter.startSearch(validParams()),
    (err: unknown) => {
      assert.ok(err instanceof TourvisorAdapterError);
      assert.equal(err.code, "INVALID_MOCK_RESPONSE");
      assert.equal(err.retryable, false);
      return true;
    },
  );
});

Deno.test("MockTourvisorAdapter: partial_timeout state partial and progress 72", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "partial_timeout" });
  await adapter.startSearch(validParams());
  const status = await adapter.getSearchStatus("900001");
  assert.equal(status.state, "partial");
  assert.equal(status.progress, 72);
});

Deno.test("MockTourvisorAdapter: partial_timeout returns accumulated results", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "partial_timeout" });
  await adapter.startSearch(validParams());
  const results = await adapter.getSearchResults("900001") as unknown[];
  assert.equal(results.length, 6);
});

Deno.test("MockTourvisorAdapter: wrong searchId throws SEARCH_ID_MISMATCH", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "success" });
  await adapter.startSearch(validParams());
  await assert.rejects(
    () => adapter.getSearchStatus("wrong-id"),
    (err: unknown) => {
      assert.ok(err instanceof TourvisorAdapterError);
      assert.equal(err.code, "SEARCH_ID_MISMATCH");
      assert.equal(err.retryable, false);
      return true;
    },
  );
  await assert.rejects(
    () => adapter.getSearchResults("wrong-id"),
    (err: unknown) => {
      assert.ok(err instanceof TourvisorAdapterError);
      assert.equal(err.code, "SEARCH_ID_MISMATCH");
      return true;
    },
  );
});

Deno.test("MockTourvisorAdapter: flight_unavailable returns flights for correct tourId", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "flight_unavailable" });
  await adapter.startSearch(validParams());
  const result = await adapter.getTourFlights("fixture-tour-900105-a", "RUB") as Record<
    string,
    unknown
  >;
  assert.ok(result.flights);
});

Deno.test("MockTourvisorAdapter: flight_unavailable wrong tourId throws TOUR_ID_MISMATCH", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "flight_unavailable" });
  await adapter.startSearch(validParams());
  await assert.rejects(
    () => adapter.getTourFlights("wrong-tour-id", "RUB"),
    (err: unknown) => {
      assert.ok(err instanceof TourvisorAdapterError);
      assert.equal(err.code, "TOUR_ID_MISMATCH");
      return true;
    },
  );
});

Deno.test("MockTourvisorAdapter: getTourFlights in success throws FLIGHT_FIXTURE_NOT_CONFIGURED", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "success" });
  await adapter.startSearch(validParams());
  await assert.rejects(
    () => adapter.getTourFlights("fixture-tour-900105-a", "RUB"),
    (err: unknown) => {
      assert.ok(err instanceof TourvisorAdapterError);
      assert.equal(err.code, "FLIGHT_FIXTURE_NOT_CONFIGURED");
      return true;
    },
  );
});

Deno.test("MockTourvisorAdapter: raw response with extra fields is accepted by passthrough schema", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "success" });
  await adapter.startSearch(validParams());
  const status = await adapter.getSearchStatus("900001");
  assert.ok(typeof status.rawStatus === "string");
  assert.ok(status.minPrice !== undefined);
  assert.ok(status.timePassed !== undefined);
});

Deno.test("MockTourvisorAdapter: structurally compatible with TourvisorAdapter interface", () => {
  const adapter: TourvisorAdapter = new MockTourvisorAdapter();
  assert.ok(adapter);
});

Deno.test("MockTourvisorAdapter: numeric searchId from status fixture normalizes to string", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "success" });
  await adapter.startSearch(validParams());
  const status = await adapter.getSearchStatus("900001");
  assert.equal(typeof status.searchId, "string");
  assert.equal(status.searchId, "900001");
});

Deno.test("MockTourvisorAdapter: error scenario returns rejected Promise (not sync throw)", async () => {
  const adapter = new MockTourvisorAdapter({ scenario: "error" });
  await assert.rejects(
    () => adapter.startSearch(validParams()),
    (err: unknown) => {
      assert.ok(err instanceof TourvisorAdapterError);
      assert.equal(err.code, "MOCK_HTTP_ERROR");
      return true;
    },
  );
});
