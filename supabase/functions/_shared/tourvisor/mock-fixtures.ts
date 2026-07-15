import { z } from "zod";

import searchStartSuccess from "../../../../tests/fixtures/tourvisor/search-start-success.json" with {
  type: "json",
};
import searchProcessing from "../../../../tests/fixtures/tourvisor/search-processing.json" with {
  type: "json",
};
import searchComplete from "../../../../tests/fixtures/tourvisor/search-complete.json" with {
  type: "json",
};
import searchEmpty from "../../../../tests/fixtures/tourvisor/search-empty.json" with {
  type: "json",
};
import searchError from "../../../../tests/fixtures/tourvisor/search-error.json" with {
  type: "json",
};
import searchInvalidResponse from "../../../../tests/fixtures/tourvisor/search-invalid-response.json" with {
  type: "json",
};
import searchPartialTimeout from "../../../../tests/fixtures/tourvisor/search-partial-timeout.json" with {
  type: "json",
};
import searchResults from "../../../../tests/fixtures/tourvisor/search-results.json" with {
  type: "json",
};
import tourFlightsUnavailable from "../../../../tests/fixtures/tourvisor/tour-flights-unavailable.json" with {
  type: "json",
};

function clone<T>(obj: T): T {
  return structuredClone(obj);
}

export function getFixtureStartSuccess() {
  return clone(searchStartSuccess);
}

export function getFixtureProcessing() {
  return clone(searchProcessing);
}

export function getFixtureComplete() {
  return clone(searchComplete);
}

export function getFixtureEmpty() {
  return clone(searchEmpty);
}

export function getFixtureError() {
  return clone(searchError);
}

export function getFixtureInvalidResponse() {
  return clone(searchInvalidResponse);
}

export function getFixturePartialTimeout() {
  return clone(searchPartialTimeout);
}

export function getFixtureResults() {
  return clone(searchResults);
}

export function getFixtureFlightsUnavailable() {
  return clone(tourFlightsUnavailable);
}

const SearchIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^[1-9]\d*$/),
]).transform(String);

const SearchStartResponseSchema = z.object({
  searchId: SearchIdSchema,
}).passthrough();

const SearchStatusResponseSchema = z.object({
  searchId: SearchIdSchema,
  progress: z.number().finite().min(0).max(100),
  status: z.string(),
  minPrice: z.union([z.number().finite().nonnegative(), z.null()]),
  timePassed: z.union([z.number().finite().nonnegative(), z.null()]),
}).passthrough();

export function validateSearchStart(raw: unknown) {
  const parsed = SearchStartResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { valid: false as const };
  }
  const searchId = String(parsed.data.searchId);
  return { valid: true as const, searchId };
}

export function validateSearchStatus(raw: unknown) {
  const parsed = SearchStatusResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { valid: false as const };
  }
  return { valid: true as const, data: parsed.data };
}
