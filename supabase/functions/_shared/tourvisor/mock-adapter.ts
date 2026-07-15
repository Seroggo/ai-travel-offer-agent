import { TourvisorSearchParamsSchema } from "../schemas/mod.ts";
import type { TourvisorSearchParams } from "../schemas/mod.ts";
import type {
  SearchStartResult,
  SearchStatusResult,
  SearchStatusState,
  TourvisorAdapter,
} from "./adapter.ts";
import { TourvisorAdapterError } from "./errors.ts";
import {
  getFixtureComplete,
  getFixtureEmpty,
  getFixtureError,
  getFixtureFlightsUnavailable,
  getFixtureInvalidResponse,
  getFixturePartialTimeout,
  getFixtureProcessing,
  getFixtureResults,
  getFixtureStartSuccess,
  validateSearchStart,
  validateSearchStatus,
} from "./mock-fixtures.ts";

export type MockTourvisorScenario =
  | "success"
  | "processing"
  | "complete"
  | "empty"
  | "error"
  | "invalid_response"
  | "partial_timeout"
  | "flight_unavailable";

export type MockTourvisorAdapterOptions = {
  scenario?: MockTourvisorScenario;
};

const MOCK_SEARCH_ID = "900001";

export class MockTourvisorAdapter implements TourvisorAdapter {
  private scenario: MockTourvisorScenario;
  private searchId: string | null = null;

  constructor(opts: MockTourvisorAdapterOptions = {}) {
    this.scenario = opts.scenario ?? "success";
  }

  startSearch(params: TourvisorSearchParams): Promise<SearchStartResult> {
    const parsed = TourvisorSearchParamsSchema.safeParse(params);
    if (!parsed.success) {
      return Promise.reject(
        new TourvisorAdapterError({
          code: "INVALID_SEARCH_PARAMS",
          message: "Invalid search parameters",
          retryable: false,
        }),
      );
    }

    if (this.scenario === "error") {
      const fixture = getFixtureError();
      return Promise.reject(
        new TourvisorAdapterError({
          code: "MOCK_HTTP_ERROR",
          message: (fixture as { body?: { message?: string } }).body?.message ??
            "HTTP error",
          httpStatus: (fixture as { httpStatus?: number }).httpStatus ?? null,
          retryable: true,
        }),
      );
    }

    if (this.scenario === "invalid_response") {
      const raw = getFixtureInvalidResponse();
      const validation = validateSearchStart(raw);
      if (!validation.valid) {
        return Promise.reject(
          new TourvisorAdapterError({
            code: "INVALID_MOCK_RESPONSE",
            message: "Invalid mock response: searchId is not a valid number",
            retryable: false,
          }),
        );
      }
    }

    const raw = getFixtureStartSuccess();
    const validation = validateSearchStart(raw);
    if (!validation.valid) {
      return Promise.reject(
        new TourvisorAdapterError({
          code: "INVALID_MOCK_RESPONSE",
          message: "Invalid mock response",
          retryable: false,
        }),
      );
    }

    this.searchId = validation.searchId;
    return Promise.resolve({ searchId: this.searchId });
  }

  getSearchStatus(searchId: string): Promise<SearchStatusResult> {
    try {
      this.assertSearchId(searchId);

      let raw: unknown;
      let state: SearchStatusState;
      let progress: number;

      switch (this.scenario) {
        case "processing": {
          raw = getFixtureProcessing();
          state = "processing";
          progress = 45;
          break;
        }
        case "partial_timeout": {
          raw = getFixturePartialTimeout();
          state = "partial";
          progress = 72;
          break;
        }
        default: {
          raw = getFixtureComplete();
          state = "completed";
          progress = 100;
          break;
        }
      }

      const validation = validateSearchStatus(raw);
      if (!validation.valid) {
        return Promise.reject(
          new TourvisorAdapterError({
            code: "INVALID_MOCK_RESPONSE",
            message: "Invalid mock status response",
            retryable: false,
          }),
        );
      }

      const data = validation.data as {
        minPrice: number | null;
        status: string;
        timePassed: number | null;
      };

      return Promise.resolve({
        searchId,
        progress,
        state,
        rawStatus: data.status,
        minPrice: data.minPrice,
        timePassed: data.timePassed,
      });
    } catch (err) {
      if (err instanceof TourvisorAdapterError) {
        return Promise.reject(err);
      }
      return Promise.reject(err);
    }
  }

  getSearchResults(searchId: string): Promise<unknown> {
    try {
      this.assertSearchId(searchId);

      if (this.scenario === "processing") {
        return Promise.reject(
          new TourvisorAdapterError({
            code: "RESULTS_NOT_READY",
            message: "Search results are not ready yet",
            retryable: false,
          }),
        );
      }

      if (this.scenario === "empty") {
        return Promise.resolve(getFixtureEmpty());
      }

      return Promise.resolve(getFixtureResults());
    } catch (err) {
      if (err instanceof TourvisorAdapterError) {
        return Promise.reject(err);
      }
      return Promise.reject(err);
    }
  }

  getTourFlights(tourId: string, currency: string): Promise<unknown> {
    try {
      if (!currency || currency.trim().length === 0) {
        return Promise.reject(
          new TourvisorAdapterError({
            code: "INVALID_SEARCH_PARAMS",
            message: "Currency must be a non-empty string",
            retryable: false,
          }),
        );
      }

      if (this.scenario !== "flight_unavailable") {
        return Promise.reject(
          new TourvisorAdapterError({
            code: "FLIGHT_FIXTURE_NOT_CONFIGURED",
            message: "Flight fixture is not configured for this scenario",
            retryable: false,
          }),
        );
      }

      if (tourId !== "fixture-tour-900105-a") {
        return Promise.reject(
          new TourvisorAdapterError({
            code: "TOUR_ID_MISMATCH",
            message: `Tour ID ${tourId} does not match the configured fixture`,
            retryable: false,
          }),
        );
      }

      return Promise.resolve(getFixtureFlightsUnavailable());
    } catch (err) {
      if (err instanceof TourvisorAdapterError) {
        return Promise.reject(err);
      }
      return Promise.reject(err);
    }
  }

  private assertSearchId(searchId: string): void {
    if (searchId !== MOCK_SEARCH_ID) {
      throw new TourvisorAdapterError({
        code: "SEARCH_ID_MISMATCH",
        message: `Search ID ${searchId} does not match the active search`,
        retryable: false,
      });
    }
  }
}
