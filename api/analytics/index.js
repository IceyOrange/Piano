// PostHog capture proxy.
//
// The PostHog project API key is sensitive enough that we don't want it
// sitting in the client bundle (view-source / network tab would expose it).
// Instead the browser POSTs events here as plain JSON, and this function
// forwards them to the PostHog Ingest API with the key injected from a
// server-side environment variable (POSTHOG_KEY). The key never leaves the
// server.
//
// We accept a lightweight envelope so the client can fire batches:
//   { distinctId, events: [{ event, properties }] }
// and also a single-event shorthand:
//   { distinctId, event, properties }
//
// Events are buffered and flushed on visibilitychange, so this endpoint is
// usually hit once per page session with the full batch.

const POSTHOG_HOST = "https://us.i.posthog.com";
const INGEST_PATH = "/i/v0/e/";

function generateUuid() {
  // RFC4122 v4 — crypto is available in the Node runtime on Vercel.
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    var v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.POSTHOG_KEY;
  if (!key) {
    // No key configured — fail closed. The client treats any non-ok response
    // as a no-op, so analytics simply stays silent rather than crashing.
    return res.status(503).json({ error: "Analytics not configured" });
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  try {
    const body = req.body || {};
    const distinctId = body.distinctId || generateUuid();
    const now = new Date();
    const iso = now.toISOString();

    // Normalize into an events array.
    let events = body.events;
    if (!events && body.event) {
      events = [{ event: body.event, properties: body.properties || {} }];
    }
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "No events provided" });
    }

    const projectId = body.projectId || "anonymous";

    const payload = events.map((ev) => ({
      uuid: generateUuid(),
      distinct_id: distinctId,
      event: String(ev.event || "unknown"),
      properties: Object.assign(
        {
          $lib: "piano-proxy",
          $lib_version: "1.0.0",
          $current_url: ev.properties && ev.properties.$current_url,
          $session_id: body.sessionId,
          $device_id: distinctId,
          $timestamp: iso,
          $ip: null, // don't rely on client IP post-processing
        },
        ev.properties || {}
      ),
      // PostHog ingestion accepts an explicit timestamp; fall back to now.
      timestamp: (ev.properties && ev.properties.$timestamp) || iso,
      project_id: projectId,
    }));

    // Forward to PostHog ingest. Use the public batch endpoint with the key
    // in the POST body (Ingestion API) rather than as a query param, so it
    // never shows up in server access logs as a URL component.
    const upstream = await fetch(`${POSTHOG_HOST}${INGEST_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: key,
        historical_migration: false,
        batch: payload,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return res
        .status(502)
        .json({ error: "PostHog ingest failed", status: upstream.status, detail: text });
    }

    return res.status(200).json({ ok: true, ingested: payload.length });
  } catch (err) {
    return res.status(500).json({ error: "Analytics proxy error" });
  }
};
