import type {
  RadarSDKOptions,
  RequestOptions,
  RateLimitInfo,
  TokenDetailResponse,
  TokensListOptions,
  TokensListResponse,
  PairsOptions,
  PairsResponse,
  TradesOptions,
  TradesResponse,
  CandlesOptions,
  CandlesResponse,
  PriceResponse,
  PolicyOptions,
  PolicyResponse,
  ProfileOptions,
  ProfileResponse,
  HoldersOptions,
  HoldersResponse,
  BoostResponse,
  UserSubmissionsOptions,
  UserSubmissionsResponse,
  PublicTrendingOptions,
  PublicTrendingResponse,
  PublicTokenOptions,
  PublicTokenResponse,
  PublicAnnouncementsOptions,
  PublicAnnouncementsResponse,
  PublicBoostOptions,
  PublicBoostResponse,
} from "./types.js";
import {
  RadarError,
  RadarAuthError,
  RadarForbiddenError,
  RadarRateLimitError,
  RadarUpstreamError,
} from "./errors.js";

const DEFAULT_BASE_URL = "https://radar.satudex.com/api/v1";
const HOST_URL        = "https://radar.satudex.com";
const DEFAULT_TIMEOUT = 10_000;
const SDK_VERSION     = "1.2.0";

export class RadarClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly hostUrl: string;
  private readonly timeout: number;

  /** Rate-limit info from the most recent response */
  public rateLimit: RateLimitInfo | null = null;

  constructor(options: RadarSDKOptions | string) {
    if (typeof options === "string") {
      this.apiKey  = options;
      this.baseUrl = DEFAULT_BASE_URL;
      this.hostUrl = HOST_URL;
      this.timeout = DEFAULT_TIMEOUT;
    } else {
      this.apiKey  = options.apiKey;
      const base   = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
      this.baseUrl = base;
      // Derive host from baseUrl for icon helpers
      try {
        const u = new URL(base);
        this.hostUrl = u.origin;
      } catch {
        this.hostUrl = HOST_URL;
      }
      this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    }

    if (!this.apiKey.startsWith("sk-satu-")) {
      throw new RadarError("API key must start with sk-satu-");
    }
  }

  // ── Core request helper ──────────────────────────────────────────────────

  private async request<T>(path: string, opts?: RequestOptions): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    const signal =
      opts?.signal && typeof AbortSignal.any === "function"
        ? AbortSignal.any([opts.signal, controller.signal])
        : controller.signal;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
          "Accept": "application/json",
          "User-Agent": `@satuchain/radar-sdk/${SDK_VERSION}`,
        },
        signal,
      });
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === "AbortError") {
        throw new RadarError(`Request timed out after ${this.timeout}ms`);
      }
      throw new RadarError(`Network error: ${err?.message ?? String(err)}`);
    }

    clearTimeout(timer);

    // Capture rate-limit headers
    const rlLimit     = parseInt(res.headers.get("x-ratelimit-limit")     ?? "");
    const rlRemaining = parseInt(res.headers.get("x-ratelimit-remaining") ?? "");
    if (!isNaN(rlLimit)) {
      this.rateLimit = { limit: rlLimit, remaining: rlRemaining };
    }

    if (res.status === 401) {
      const body = await res.json().catch(() => ({})) as any;
      throw new RadarAuthError(body?.error?.message ?? body?.error);
    }
    if (res.status === 403) {
      const body = await res.json().catch(() => ({})) as any;
      throw new RadarForbiddenError(body?.error?.message ?? body?.error);
    }
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") ?? "60");
      const body = await res.json().catch(() => ({})) as any;
      throw new RadarRateLimitError(retryAfter, body?.error?.message ?? body?.error);
    }
    if (!res.ok) {
      throw new RadarUpstreamError(res.status);
    }

    const json = await res.json() as any;
    if (!json.ok) {
      throw new RadarError(json.error?.message ?? json.error ?? "API error");
    }

    return json as T;
  }

  // ── Icon helpers ─────────────────────────────────────────────────────────

  /**
   * Resolve a relative icon path returned by the API to a full URL.
   *
   * @example
   * const { data: token } = await radar.getToken("0xADDR");
   * const iconUrl = radar.iconUrl(token.attributes.image);
   * // → "https://radar.satudex.com/uploads/tokens/satu/0x.../logo.png"
   */
  iconUrl(relativePath: string | null | undefined): string | null {
    if (!relativePath) return null;
    if (relativePath.startsWith("http")) return relativePath;
    return `${this.hostUrl}${relativePath}`;
  }

  // ── Tokens ───────────────────────────────────────────────────────────────

  /**
   * List tokens with price, volume, liquidity and boost score.
   *
   * @example
   * const { data } = await radar.getTokens({ sort: "trending", chainId: 56 });
   * for (const t of data) {
   *   const icon = radar.iconUrl(t.token.image);
   *   console.log(t.token.symbol, t.price, icon);
   * }
   */
  async getTokens(options?: TokensListOptions): Promise<TokensListResponse> {
    const { signal, ...params } = options ?? {};
    const sp = new URLSearchParams();
    if (params.limit)   sp.set("limit",   String(params.limit));
    if (params.sort)    sp.set("sort",    params.sort);
    if (params.q)       sp.set("q",       params.q);
    if (params.chainId) sp.set("chainId", String(params.chainId));
    if (params.dex)     sp.set("dex",     params.dex);
    const qs = sp.toString();
    return this.request<TokensListResponse>(`/tokens${qs ? `?${qs}` : ""}`, { signal });
  }

  /**
   * Get full detail for a single token including all pairs.
   *
   * @example
   * const { data } = await radar.getToken("0xADDRESS");
   * console.log(data.attributes.symbol);
   * console.log(data.relationships.topPair?.price);
   * const icon = radar.iconUrl(data.attributes.image);
   */
  async getToken(address: string, opts?: { chain?: string; pool?: string } & RequestOptions): Promise<TokenDetailResponse> {
    const { signal, chain, pool } = opts ?? {};
    const sp = new URLSearchParams();
    if (chain) sp.set("chain", chain);
    if (pool)  sp.set("pool", pool);
    const qs = sp.toString();
    return this.request<TokenDetailResponse>(`/token/${address}${qs ? `?${qs}` : ""}`, { signal });
  }

  // ── Pairs ────────────────────────────────────────────────────────────────

  /**
   * List trading pairs (paginated via cursor).
   *
   * @example
   * const { data, nextCursor } = await radar.getPairs({ limit: 50 });
   * for (const pair of data) {
   *   console.log(pair.address, pair.dexId);
   * }
   */
  async getPairs(opts?: PairsOptions): Promise<PairsResponse> {
    const { signal, limit, cursor } = opts ?? {};
    const sp = new URLSearchParams();
    if (limit)  sp.set("limit",  String(limit));
    if (cursor) sp.set("cursor", cursor);
    const qs = sp.toString();
    return this.request<PairsResponse>(`/pairs${qs ? `?${qs}` : ""}`, { signal });
  }

  // ── Trades ───────────────────────────────────────────────────────────────

  /**
   * Get recent trades for a trading pair.
   *
   * @example
   * const { data } = await radar.getTrades("0xPAIR_ADDRESS", { limit: 50 });
   * for (const trade of data) {
   *   console.log(trade.side, trade.price, trade.volumeQuote);
   * }
   */
  async getTrades(pairAddress: string, opts?: TradesOptions): Promise<TradesResponse> {
    const { signal, limit, before } = opts ?? {};
    const sp = new URLSearchParams();
    if (limit)  sp.set("limit",  String(limit));
    if (before) sp.set("before", String(before));
    const qs = sp.toString();
    return this.request<TradesResponse>(`/pairs/${pairAddress}/trades${qs ? `?${qs}` : ""}`, { signal });
  }

  // ── Candles ──────────────────────────────────────────────────────────────

  /**
   * Get OHLCV candle data for a trading pair.
   *
   * @example
   * const { data } = await radar.getCandles("0xPAIR_ADDRESS", { tf: "1h", limit: 100 });
   * for (const c of data) {
   *   console.log(new Date(c.time * 1000), c.open, c.high, c.low, c.close, c.volume);
   * }
   */
  async getCandles(pairAddress: string, opts?: CandlesOptions): Promise<CandlesResponse> {
    const { signal, tf, limit, from, to } = opts ?? {};
    const sp = new URLSearchParams();
    if (tf)    sp.set("tf",    tf);
    if (limit) sp.set("limit", String(limit));
    if (from)  sp.set("from",  String(from));
    if (to)    sp.set("to",    String(to));
    const qs = sp.toString();
    return this.request<CandlesResponse>(`/pairs/${pairAddress}/candles${qs ? `?${qs}` : ""}`, { signal });
  }

  // ── Price ────────────────────────────────────────────────────────────────

  /**
   * Get the current USD price for a token by address.
   *
   * @example
   * const { data } = await radar.getPrice("0xTOKEN_ADDRESS");
   * console.log(data.priceUsd);
   */
  async getPrice(tokenAddress: string, opts?: RequestOptions): Promise<PriceResponse> {
    return this.request<PriceResponse>(`/price/${tokenAddress}`, opts);
  }

  // ── Policy (LP burn + lock secured check) ────────────────────────────────

  /**
   * Auto-detect LP secured status (burned + locked combined) for a token.
   * Used by the token-profile submit gate — if `eligible` is true the token
   * meets the listing requirements (liquidity ≥ $100 + LP secured ≥ 80%).
   *
   * @example
   * const { data } = await radar.getPolicy("0xADDR", { chain: "satumainnet" });
   * if (data.eligible) {
   *   console.log("Ready for Golden Tick — LP secured", data.lpStatus?.securedSupplyPct, "%");
   * }
   */
  async getPolicy(tokenAddress: string, opts?: PolicyOptions): Promise<PolicyResponse> {
    const { signal, chain } = opts ?? {};
    const sp = new URLSearchParams();
    if (chain) sp.set("chain", chain);
    const qs = sp.toString();
    return this.request<PolicyResponse>(`/token/${tokenAddress}/policy${qs ? `?${qs}` : ""}`, { signal });
  }

  // ── Existing token profile (for prefill UIs) ─────────────────────────────

  /**
   * Read the existing profile data for a token (description, socials, logo,
   * etc). Returns `data: null` if the token has no profile yet.
   *
   * @example
   * const { data: profile } = await radar.getProfile("0xADDR", { chain: "satumainnet" });
   * if (profile) prefillForm(profile);
   */
  async getProfile(tokenAddress: string, opts?: ProfileOptions): Promise<ProfileResponse> {
    const { signal, chain } = opts ?? {};
    const sp = new URLSearchParams();
    if (chain) sp.set("chain", chain);
    const qs = sp.toString();
    return this.request<ProfileResponse>(`/token/${tokenAddress}/profile${qs ? `?${qs}` : ""}`, { signal });
  }

  // ── Holders ──────────────────────────────────────────────────────────────

  /**
   * Get top holders of a token, sorted by balance descending.
   *
   * @example
   * const { data: holders } = await radar.getHolders("0xADDR");
   * for (const h of holders) console.log(h.address, h.value, `${h.share}%`);
   */
  async getHolders(tokenAddress: string, opts?: HoldersOptions): Promise<HoldersResponse> {
    const { signal, chain } = opts ?? {};
    const sp = new URLSearchParams();
    if (chain) sp.set("chain", chain);
    const qs = sp.toString();
    return this.request<HoldersResponse>(`/token/${tokenAddress}/holders${qs ? `?${qs}` : ""}`, { signal });
  }

  // ── Boost ────────────────────────────────────────────────────────────────

  /**
   * Get boost score, bomb status, verified flag, and featured flag for a token.
   *
   * @example
   * const { data } = await radar.getBoost("0xADDR");
   * console.log(`Boost: ${data.score}/${data.maxScore}, verified: ${data.verified}`);
   */
  async getBoost(tokenAddress: string, opts?: RequestOptions): Promise<BoostResponse> {
    return this.request<BoostResponse>(`/boost/${tokenAddress}`, opts);
  }

  // ── User Submissions ─────────────────────────────────────────────────────

  /**
   * List token profiles submitted by a wallet (with review status).
   *
   * Note: this hits `/api/user/...` directly (not `/api/v1/...`) — used to
   * power the user dashboard.
   *
   * @example
   * const { data } = await radar.getUserSubmissions("0xWALLET");
   * for (const sub of data) console.log(sub.symbol, sub.status, sub.verified);
   */
  async getUserSubmissions(wallet: string, opts?: UserSubmissionsOptions): Promise<UserSubmissionsResponse> {
    const { signal, chain } = opts ?? {};
    const sp = new URLSearchParams();
    if (chain) sp.set("chain", chain);
    const qs = sp.toString();
    return this.requestRoot<UserSubmissionsResponse>(`/api/user/${wallet}/submissions${qs ? `?${qs}` : ""}`, { signal });
  }

  // ── Public bot endpoints (no API key required) ───────────────────────────

  /**
   * Public endpoints — no API key required, suitable for external bots
   * (Trending Bot, Buy Bot) or unauthenticated client-side widgets. Subject
   * to a global rate limit (60 req/min/IP).
   */
  public readonly public = {
    /**
     * Top tokens by boost score with rank — for Trending Bot.
     *
     * @example
     * const { data } = await radar.public.getTrending({ chain: "satumainnet", limit: 10 });
     * for (const t of data) console.log(`#${t.rank}`, t.symbol, t.boostScore);
     */
    getTrending: async (opts?: PublicTrendingOptions): Promise<PublicTrendingResponse> => {
      const { signal, chain, limit } = opts ?? {};
      const sp = new URLSearchParams();
      if (chain) sp.set("chain", chain);
      if (limit) sp.set("limit", String(limit));
      const qs = sp.toString();
      return this.requestRoot<PublicTrendingResponse>(`/api/public/trending${qs ? `?${qs}` : ""}`, { signal }, false);
    },

    /**
     * Read-only token detail + verified + socials — for Buy Bot.
     */
    getToken: async (address: string, opts?: PublicTokenOptions): Promise<PublicTokenResponse> => {
      const { signal, chain } = opts ?? {};
      const sp = new URLSearchParams();
      if (chain) sp.set("chain", chain);
      const qs = sp.toString();
      return this.requestRoot<PublicTokenResponse>(`/api/public/token/${address}${qs ? `?${qs}` : ""}`, { signal }, false);
    },

    /**
     * Recent Golden Tick verified tokens, ready-to-post message format.
     */
    getRecentAnnouncements: async (opts?: PublicAnnouncementsOptions): Promise<PublicAnnouncementsResponse> => {
      const { signal, chain, limit } = opts ?? {};
      const sp = new URLSearchParams();
      if (chain) sp.set("chain", chain);
      if (limit) sp.set("limit", String(limit));
      const qs = sp.toString();
      return this.requestRoot<PublicAnnouncementsResponse>(`/api/public/announcements/recent${qs ? `?${qs}` : ""}`, { signal }, false);
    },

    /**
     * Single token boost detail + current rank in leaderboard.
     */
    getBoost: async (tokenAddress: string, opts?: PublicBoostOptions): Promise<PublicBoostResponse> => {
      const { signal, chain } = opts ?? {};
      const sp = new URLSearchParams();
      if (chain) sp.set("chain", chain);
      const qs = sp.toString();
      return this.requestRoot<PublicBoostResponse>(`/api/public/boost/${tokenAddress}${qs ? `?${qs}` : ""}`, { signal }, false);
    },
  };

  // ── Internal: request against the host root (for /api/user/* + /api/public/*) ──

  private async requestRoot<T>(path: string, opts?: RequestOptions, withApiKey = true): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    const signal =
      opts?.signal && typeof AbortSignal.any === "function"
        ? AbortSignal.any([opts.signal, controller.signal])
        : controller.signal;

    const headers: Record<string, string> = {
      "Accept": "application/json",
      "User-Agent": `@satuchain/radar-sdk/${SDK_VERSION}`,
    };
    if (withApiKey) headers["x-api-key"] = this.apiKey;

    let res: Response;
    try {
      res = await fetch(`${this.hostUrl}${path}`, { method: "GET", headers, signal });
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === "AbortError") throw new RadarError(`Request timed out after ${this.timeout}ms`);
      throw new RadarError(`Network error: ${err?.message ?? String(err)}`);
    }
    clearTimeout(timer);

    const rlLimit     = parseInt(res.headers.get("x-ratelimit-limit")     ?? "");
    const rlRemaining = parseInt(res.headers.get("x-ratelimit-remaining") ?? "");
    if (!isNaN(rlLimit)) this.rateLimit = { limit: rlLimit, remaining: rlRemaining };

    if (res.status === 401) {
      const body = await res.json().catch(() => ({})) as any;
      throw new RadarAuthError(body?.error?.message ?? body?.error);
    }
    if (res.status === 403) {
      const body = await res.json().catch(() => ({})) as any;
      throw new RadarForbiddenError(body?.error?.message ?? body?.error);
    }
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") ?? "60");
      const body = await res.json().catch(() => ({})) as any;
      throw new RadarRateLimitError(retryAfter, body?.error?.message ?? body?.error);
    }
    if (!res.ok) throw new RadarUpstreamError(res.status);

    const json = await res.json() as any;
    if (!json.ok) throw new RadarError(json.error?.message ?? json.error ?? "API error");
    return json as T;
  }
}

/** Alias */
export const SatuRadar = RadarClient;
