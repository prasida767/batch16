/**
 * Cloudflare Worker that forwards FPL API requests from a non-Vercel IP.
 *
 * Deploy (free): https://dash.cloudflare.com → Workers & Pages → Create Worker
 * Paste this file, deploy, copy the workers.dev URL, then set on Vercel:
 *
 *   FPL_PROXY_BASE_URL=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev
 *
 * Vercel Hobby IPs are often blocked by fantasy.premierleague.com (403).
 */
export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const target = new URL(
      incoming.pathname + incoming.search,
      "https://fantasy.premierleague.com/api/",
    );

    if (target.hostname !== "fantasy.premierleague.com") {
      return new Response("Bad host", { status: 400 });
    }

    return fetch(target, {
      method: "GET",
      headers: {
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "en-GB,en;q=0.9",
        Referer: "https://fantasy.premierleague.com/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
  },
};
