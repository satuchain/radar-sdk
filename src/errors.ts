export class RadarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RadarError";
  }
}

export class RadarAuthError extends RadarError {
  readonly status = 401;
  constructor(message = "Invalid or missing API key. Generate one at radar.satudex.com/account") {
    super(message);
    this.name = "RadarAuthError";
  }
}

export class RadarForbiddenError extends RadarError {
  readonly status = 403;
  constructor(message = "API key inactive: insufficient STU balance (need ≥ 10,000 STU on BNB Chain)") {
    super(message);
    this.name = "RadarForbiddenError";
  }
}

export class RadarRateLimitError extends RadarError {
  readonly status = 429;
  readonly retryAfter: number;
  constructor(retryAfter: number, message?: string) {
    super(message ?? `Rate limit exceeded. Retry after ${retryAfter}s`);
    this.name = "RadarRateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class RadarUpstreamError extends RadarError {
  readonly status: number;
  constructor(status: number, message?: string) {
    super(message ?? `Upstream error: HTTP ${status}`);
    this.name = "RadarUpstreamError";
    this.status = status;
  }
}
