// ─── SDK Options ─────────────────────────────────────────────────────────────

export interface RadarSDKOptions {
  /** Your API key — starts with sk-satu- */
  apiKey: string;
  /** Base URL (default: https://radar.satudex.com/api/v1) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
}

export interface RequestOptions {
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

// ─── Rate Limit ───────────────────────────────────────────────────────────────

export interface RateLimitInfo {
  limit: number;
  remaining: number;
}

// ─── Token ────────────────────────────────────────────────────────────────────

export interface TokenAttributes {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  /** Relative path to token logo, prefix with base host to get full URL */
  image: string | null;
  /** Chain ID */
  chainId: number;
  address: string;
}

export interface PairInfo {
  address: string;
  dexId: string | null;
  token0: string;
  token1: string;
  price: string | null;
  liquidityQuote: string | null;
  volume5m: string | null;
  volume1h: string | null;
  volume6h: string | null;
  volume24h: string | null;
  priceChange5m: string | null;
  priceChange1h: string | null;
  priceChange6h: string | null;
  priceChange24h: string | null;
  txns24h: number;
}

export interface TokenDetail {
  type: "token";
  id: string;
  attributes: TokenAttributes;
  relationships: {
    topPair: PairInfo | null;
    pairs: PairInfo[];
  };
}

export interface TokenDetailResponse {
  ok: true;
  data: TokenDetail;
}

// ─── Tokens List ─────────────────────────────────────────────────────────────

export type SortKey = "trending" | "gainers" | "losers" | "volume" | "newest" | "top";

export interface TokenListItem {
  no: number;
  token: {
    address: string;
    chainId: number;
    name: string | null;
    symbol: string | null;
    decimals: number | null;
    image: string | null;
  };
  pairAddress: string;
  dexId: string | null;
  price: string | null;
  priceChange5m: string | null;
  priceChange1h: string | null;
  priceChange6h: string | null;
  priceChange24h: string | null;
  volume24h: string | null;
  liquidityUsd: string | null;
  txns24h: number;
  boostScore: number;
  hasBomb: boolean;
}

export interface TokensListOptions extends RequestOptions {
  /** Number of results (default: 50, max: 200) */
  limit?: number;
  /** Sort order */
  sort?: SortKey;
  /** Search query — symbol, name, or address */
  q?: string;
  /** Chain ID (10111945 = SATU Mainnet, 17081945 = SATU Testnet, 56 = BNB Chain) */
  chainId?: number;
  /** Filter by DEX ID (e.g. "pancakeswap", "biswap") */
  dex?: string;
}

export interface TokensListResponse {
  ok: true;
  data: TokenListItem[];
}

// ─── Pairs ───────────────────────────────────────────────────────────────────

export interface Pair {
  address: string;
  chainId: number;
  token0: string;
  token1: string;
  dexId: string | null;
  createdAt: string;
  reserve0: string | null;
  reserve1: string | null;
  updatedAt: string;
}

export interface PairsResponse {
  ok: true;
  data: Pair[];
  nextCursor: string | null;
}

export interface PairsOptions extends RequestOptions {
  limit?: number;
  cursor?: string;
}

// ─── Trades ──────────────────────────────────────────────────────────────────

export interface Trade {
  id: string;
  chainId: number;
  pairAddress: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  maker: string | null;
  side: "buy" | "sell" | null;
  price: string | null;
  volumeQuote: string | null;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
}

export interface TradesResponse {
  ok: true;
  data: Trade[];
}

export interface TradesOptions extends RequestOptions {
  limit?: number;
  before?: number;
}

// ─── Candles ─────────────────────────────────────────────────────────────────

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandlesResponse {
  ok: true;
  data: Candle[];
}

export interface CandlesOptions extends RequestOptions {
  /** Timeframe (default: "1h") */
  tf?: Timeframe;
  limit?: number;
  from?: number;
  to?: number;
}

// ─── Price ───────────────────────────────────────────────────────────────────

export interface PriceResponse {
  ok: true;
  data: {
    address: string;
    priceUsd: string | null;
    pairAddress: string | null;
  };
}

// ─── Policy (LP burn + lock check, used by token-profile submit gate) ───────

export interface LpStatus {
  pairAddress: string;
  burnedSupplyPct: number;
  lockedSupplyPct: number;
  /** burned + locked combined */
  securedSupplyPct: number;
  burnedLpUsd: number;
  lockedLpUsd: number;
  isBurned: boolean;
  isLocked: boolean;
  /** true when securedSupplyPct ≥ minSecuredPct (default 80) */
  isSecured: boolean;
}

export interface PolicyResponse {
  ok: true;
  data: {
    chainId: number;
    chainKey: string;
    token: string;
    enforced: boolean;
    eligible: boolean;
    liquidityUsd: number;
    lpStatus: LpStatus | null;
    minLiquidityUsd: number;
    minSecuredPct: number;
    reason?: string;
  };
}

export interface PolicyOptions extends RequestOptions {
  /** Chain key — e.g. "satumainnet" (default), "satutestnet", "bsc" */
  chain?: string;
}

// ─── Token Profile (existing profile data — used for prefill UIs) ───────────

export interface TokenProfile {
  chainId: number;
  address: string;
  aboutToken: string | null;
  description: string | null;
  telegram: string | null;
  x: string | null;
  website: string | null;
  whitepaper: string | null;
  image: string | null;
  banner: string | null;
  status: "pending" | "approved" | "rejected";
  verified: boolean;
}

export interface ProfileResponse {
  ok: true;
  data: TokenProfile | null;
}

export interface ProfileOptions extends RequestOptions {
  chain?: string;
}

// ─── Holders ─────────────────────────────────────────────────────────────────

export interface Holder {
  address: string;
  /** Raw token amount as decimal string */
  value: string;
  /** % of total supply */
  share: number;
}

export interface HoldersResponse {
  ok: true;
  data: Holder[];
}

export interface HoldersOptions extends RequestOptions {
  chain?: string;
}

// ─── Boost ───────────────────────────────────────────────────────────────────

export interface BoostInfo {
  score: number;
  hasBomb: boolean;
  bombExpiresAt: string | null;
  maxScore: number;
  verified: boolean;
  verifiedAt: string | null;
  featured: boolean;
}

export interface BoostResponse {
  ok: true;
  data: BoostInfo;
}

// ─── User Submissions ───────────────────────────────────────────────────────

export interface UserSubmission {
  id: string;
  chainId: number;
  address: string;
  name: string | null;
  symbol: string | null;
  status: "pending" | "approved" | "rejected";
  verified: boolean;
  verifiedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  image: string | null;
  banner: string | null;
  description: string | null;
  website: string | null;
  x: string | null;
  telegram: string | null;
  submittedAt: string;
  updatedAt: string;
}

export interface UserSubmissionsResponse {
  ok: true;
  data: UserSubmission[];
}

export interface UserSubmissionsOptions extends RequestOptions {
  chain?: string;
}

// ─── Public bot endpoints (no API key required) ─────────────────────────────

export interface PublicTrendingItem {
  rank: number;
  address: string;
  symbol: string | null;
  name: string | null;
  chainId: number;
  txns24h: number;
  boostScore: number;
  hasBomb: boolean;
  featured: boolean;
  verified: boolean;
  verifiedAt: string | null;
  pairAddress: string | null;
  logoUrl: string | null;
  radarUrl: string | null;
}

export interface PublicTrendingResponse {
  ok: true;
  data: PublicTrendingItem[];
}

export interface PublicTrendingOptions extends RequestOptions {
  chain?: string;
  limit?: number;
}

export interface PublicTokenInfo {
  address: string;
  symbol: string | null;
  name: string | null;
  decimals: number | null;
  totalSupply: string | null;
  chainId: number;
  hidden: boolean;
  verified: boolean;
  verifiedAt: string | null;
  featured: boolean;
  profile: TokenProfile | null;
}

export interface PublicTokenResponse {
  ok: true;
  data: PublicTokenInfo;
}

export interface PublicTokenOptions extends RequestOptions {
  chain?: string;
}

export interface PublicAnnouncement {
  address: string;
  symbol: string | null;
  name: string | null;
  chainId: number;
  verifiedAt: string | null;
  message: string;
  pairAddress: string | null;
  logoUrl: string | null;
  radarUrl: string | null;
}

export interface PublicAnnouncementsResponse {
  ok: true;
  data: PublicAnnouncement[];
}

export interface PublicAnnouncementsOptions extends RequestOptions {
  chain?: string;
  limit?: number;
}

export interface PublicBoostResponse {
  ok: true;
  data: {
    address: string;
    score: number;
    rank: number | null;
    hasBomb: boolean;
    bombExpiresAt: string | null;
    verified: boolean;
    featured: boolean;
  };
}

export interface PublicBoostOptions extends RequestOptions {
  chain?: string;
}
