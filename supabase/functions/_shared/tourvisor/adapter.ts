import type { TourvisorSearchParams } from "../schemas/mod.ts";

export type SearchStartResult = {
  searchId: string;
};

export type SearchStatusState = "processing" | "completed" | "partial";

export type SearchStatusResult = {
  searchId: string;
  progress: number;
  state: SearchStatusState;
  rawStatus: string | null;
  minPrice: number | null;
  timePassed: number | null;
};

export interface TourvisorAdapter {
  startSearch(params: TourvisorSearchParams): Promise<SearchStartResult>;
  getSearchStatus(searchId: string): Promise<SearchStatusResult>;
  getSearchResults(searchId: string): Promise<unknown>;
  getTourFlights(tourId: string, currency: string): Promise<unknown>;
}
