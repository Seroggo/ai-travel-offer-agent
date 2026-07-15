export type TourNormalizationErrorCode =
  | "INVALID_NORMALIZATION_CONTEXT"
  | "INVALID_RESULTS_RESPONSE";

export class TourNormalizationError extends Error {
  readonly code: TourNormalizationErrorCode;
  readonly retryable: false;

  constructor(opts: { code: TourNormalizationErrorCode; message: string }) {
    super(opts.message);
    this.name = "TourNormalizationError";
    this.code = opts.code;
    this.retryable = false;
  }
}
