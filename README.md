# @satuchain/radar-sdk

Official JavaScript/TypeScript SDK for the **SatuDex Radar API** — real-time token prices, DEX pairs, OHLCV candles, and trades on **SatuChain Mainnet**, SatuChain Testnet, and BNB Chain.

[![npm version](https://img.shields.io/npm/v/@satuchain/radar-sdk)](https://www.npmjs.com/package/@satuchain/radar-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Requirements

- An API key from [radar.satudex.com/account](https://radar.satudex.com/account)
- Hold ≥ **10,000 STU** on SatuChain Mainnet or BNB Chain to generate a key
- Node.js ≥ 18 (or any modern browser / edge runtime)

## Installation

```bash
npm install @satuchain/radar-sdk
```

## Quick Start

```js
import { RadarClient } from "@satuchain/radar-sdk";

const radar = new RadarClient("sk-satu-your-api-key");

// List trending tokens on SatuChain Mainnet
const { data: tokens } = await radar.getTokens({ sort: "trending", chainId: 10111945 });
for (const t of tokens) {
  const icon = radar.iconUrl(t.token.image); // full URL to token logo
  console.log(t.token.symbol, t.price, icon);
}

// Get a single token with all pairs
const { data: token } = await radar.getToken("0xTOKEN_ADDRESS");
console.log(token.attributes.symbol);
console.log(token.relationships.topPair?.price);
console.log(radar.iconUrl(token.attributes.image)); // token logo URL

// OHLCV candles (1m / 5m / 1h / 4h / 1d)
const { data: candles } = await radar.getCandles("0xPAIR_ADDRESS", { tf: "1h", limit: 100 });
for (const c of candles) {
  console.log(new Date(c.time * 1000), c.open, c.high, c.low, c.close, c.volume);
}

// Recent trades
const { data: trades } = await radar.getTrades("0xPAIR_ADDRESS", { limit: 50 });
for (const trade of trades) {
  console.log(trade.side, trade.price, trade.volumeQuote);
}

// Token price
const { data: price } = await radar.getPrice("0xTOKEN_ADDRESS");
console.log(price.priceUsd);
```

## Token Icons

Every token detail and list item includes an `image` field containing a **relative path**. Use `radar.iconUrl()` to get the full URL:

```js
const { data: token } = await radar.getToken("0xADDRESS");
const iconUrl = radar.iconUrl(token.attributes.image);
// → "https://radar.satudex.com/uploads/tokens/satu/0x.../logo.png"

// Download the icon (no API key needed for /uploads/)
const img = await fetch(iconUrl);
```

For list items:
```js
const { data: tokens } = await radar.getTokens({ chainId: 56 });
for (const t of tokens) {
  const iconUrl = radar.iconUrl(t.token.image);
  // use iconUrl in <img src={iconUrl} />
}
```

## API Reference

### `new RadarClient(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Your API key (`sk-satu-...`) |
| `baseUrl` | `string` | `https://radar.satudex.com/api/v1` | API base URL |
| `timeout` | `number` | `10000` | Request timeout in ms |

### Methods

| Method | Description |
|--------|-------------|
| `getTokens(opts?)` | List tokens — sort, filter by chain/DEX/query |
| `getToken(address, opts?)` | Single token detail + all pairs |
| `getPairs(opts?)` | List all trading pairs (paginated) |
| `getTrades(pairAddress, opts?)` | Recent trades for a pair |
| `getCandles(pairAddress, opts?)` | OHLCV candles (1m/5m/15m/1h/4h/1d) |
| `getPrice(tokenAddress, opts?)` | Current USD price for a token |
| `getPolicy(address, opts?)` | LP burn+lock secured check (Golden Tick gate) — **new in 1.2** |
| `getProfile(address, opts?)` | Read existing token profile data — **new in 1.2** |
| `getHolders(address, opts?)` | Top token holders sorted by balance — **new in 1.2** |
| `getBoost(address, opts?)` | Boost score, bomb status, verified flag — **new in 1.2** |
| `getUserSubmissions(wallet, opts?)` | Profiles submitted by a wallet — **new in 1.2** |
| `iconUrl(relativePath)` | Convert relative image path → full URL |

### Public sub-namespace (no API key required)

`radar.public.*` exposes endpoints that bypass API-key auth — designed for
external bots (Trending Bot, Buy Bot) and unauthenticated client widgets.
Subject to the global anonymous rate limit (60 req/min/IP).

| Method | Description |
|--------|-------------|
| `radar.public.getTrending(opts?)` | Top tokens by boost score with rank |
| `radar.public.getToken(address, opts?)` | Read-only token detail + verified + socials |
| `radar.public.getRecentAnnouncements(opts?)` | Recent Golden Tick verified tokens |
| `radar.public.getBoost(tokenAddress, opts?)` | Single token boost detail + leaderboard rank |

```js
// Public endpoints work even without a real API key (the constructor still
// requires one as a placeholder — pass any sk-satu-... string).
const { data: trending } = await radar.public.getTrending({
  chain: "satumainnet",
  limit: 10,
});
for (const t of trending) {
  console.log(`#${t.rank}`, t.symbol, "boost:", t.boostScore);
}
```

### Token-profile flow example

```js
// 1. Check eligibility before submitting
const { data: policy } = await radar.getPolicy("0xADDR", { chain: "satumainnet" });
if (!policy.eligible) {
  console.log("Not eligible:", policy.lpStatus?.securedSupplyPct, "% secured (need 80%)");
  return;
}

// 2. Read existing profile (for prefill on resubmit)
const { data: profile } = await radar.getProfile("0xADDR", { chain: "satumainnet" });
if (profile) {
  // pre-fill description, telegram, x, website, ...
}

// 3. After submit, track status across all your tokens
const { data: subs } = await radar.getUserSubmissions("0xWALLET");
for (const s of subs) console.log(s.symbol, s.status, s.verified ? "✓ Golden Tick" : "");
```

### Sort Keys (`getTokens`)

| Key | Description |
|-----|-------------|
| `trending` | By boost score (default) |
| `gainers` | Biggest 24h price gainers |
| `losers` | Biggest 24h price losers |
| `volume` | Highest 24h volume |
| `newest` | Recently added |
| `top` | Highest liquidity |

### Chain IDs

| Chain | ID |
|-------|----|
| SATU Mainnet | `10111945` |
| SATU Testnet | `17081945` |
| BNB Chain | `56` |

### DEX IDs

**SatuChain:** `satuswap`

**BNB Chain:** `pancakeswap` · `biswap` · `apeswap` · `sushiswap` · `four.meme` · `uniswap`

## Error Handling

```js
import { RadarClient, RadarAuthError, RadarRateLimitError } from "@satuchain/radar-sdk";

const radar = new RadarClient("sk-satu-...");

try {
  const { data } = await radar.getTokens();
} catch (err) {
  if (err instanceof RadarAuthError) {
    console.error("Invalid API key:", err.message);
  } else if (err instanceof RadarRateLimitError) {
    console.error(`Rate limited. Retry after ${err.retryAfter}s`);
  } else {
    console.error(err.message);
  }
}
```

| Error Class | HTTP | Description |
|-------------|------|-------------|
| `RadarAuthError` | 401 | Invalid/missing API key |
| `RadarForbiddenError` | 403 | Insufficient STU balance |
| `RadarRateLimitError` | 429 | Rate limit exceeded (`.retryAfter` in seconds) |
| `RadarUpstreamError` | 5xx | Server error |
| `RadarError` | — | Base error class |

## Rate Limits

| Tier | Min. Hold | Limit |
|------|-----------|-------|
| Anonymous (no API key, public endpoints only) | — | 60 req/min/IP |
| Basic | 10,000 STU on SatuChain Mainnet **or** BNB Chain | 300 req/min |
| Pro | 1,000,000 STU | 3,000 req/min |

Check remaining quota via `radar.rateLimit` after any request.

## CommonJS

```js
const { RadarClient } = require("@satuchain/radar-sdk");
```

## Links

- [SatuDex Radar](https://radar.satudex.com)
- [Get API Key](https://radar.satudex.com/account)
- [SATUCHAIN](https://satuchain.com)

## License

MIT © [SATU TEAM](https://satuchain.com)
