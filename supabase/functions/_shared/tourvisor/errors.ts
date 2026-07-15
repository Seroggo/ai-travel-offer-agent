export type TourvisorAdapterErrorCode =
  | "INVALID_SEARCH_PARAMS"
  | "MOCK_HTTP_ERROR"
  | "INVALID_MOCK_RESPONSE"
  | "SEARCH_ID_MISMATCH"
  | "RESULTS_NOT_READY"
  | "FLIGHT_FIXTURE_NOT_CONFIGURED"
  | "TOUR_ID_MISMATCH";

export class TourvisorAdapterError extends Error {
  readonly code: TourvisorAdapterErrorCode;
  readonly httpStatus: number | null;
  readonly retryable: boolean;

  constructor(opts: {
    code: TourvisorAdapterErrorCode;
    message: string;
    httpStatus?: number | null;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(opts.message);
    this.name = "TourvisorAdapterError";
    this.code = opts.code;
    this.httpStatus = opts.httpStatus ?? null;
    this.retryable = opts.retryable ?? false;
    if (opts.cause !== undefined) {
      this.cause = opts.cause;
    }
  }
}
