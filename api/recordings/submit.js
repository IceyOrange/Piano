const { kv } = require("@vercel/kv");

function sanitize(str, maxLen) {
  return String(str || "")
    .trim()
    .replace(/<[^>]*>/g, "")
    .slice(0, maxLen);
}

function randomId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "r_";
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, title, ev, dur } = req.body || {};

    if (!title || !sanitize(title, 50)) {
      return res.status(400).json({ error: "Track name is required" });
    }
    if (!Array.isArray(ev) || ev.length === 0) {
      return res.status(400).json({ error: "Events array is required" });
    }
    if (ev.length > 2400) {
      return res.status(400).json({ error: "Too many events (max 2400)" });
    }
    if (typeof dur !== "number" || dur <= 0 || dur > 381000) {
      return res.status(400).json({ error: "Duration must be 1-381000ms" });
    }

    // Validate event format
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      if (typeof e.d !== "number" || typeof e.n !== "string" || typeof e.v !== "number") {
        return res.status(400).json({ error: "Invalid event at index " + i });
      }
      if (e.d < 0 || e.d > 381000) {
        return res.status(400).json({ error: "Event delta out of range at index " + i });
      }
    }

    // Rate limiting: 5 submissions per hour per IP
    const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    const rateKey = "rl:" + ip;
    const count = await kv.get(rateKey);
    if (count && parseInt(count) >= 5) {
      return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
    }

    const id = randomId();
    const recording = {
      id,
      name: sanitize(name, 30) || undefined,
      title: sanitize(title, 50),
      ts: Date.now(),
      dur: Math.round(dur),
      ev: ev.map((e) => ({
        d: Math.round(e.d),
        n: e.n,
        v: Math.round(e.v * 100) / 100,
      })),
    };

    await kv.set("rec:" + id, JSON.stringify(recording));
    await kv.zadd("rec:list", { score: recording.ts, member: id });

    // Update rate limit
    if (count) {
      await kv.incr(rateKey);
      await kv.expire(rateKey, 3600);
    } else {
      await kv.set(rateKey, 1, { ex: 3600 });
    }

    // Cap list at 500 entries (remove oldest)
    const total = await kv.zcard("rec:list");
    if (total > 500) {
      const removeCount = total - 500;
      const oldest = await kv.zrange("rec:list", 0, removeCount - 1);
      if (oldest.length > 0) {
        await kv.zrem("rec:list", oldest);
        // Clean up individual keys
        await Promise.all(
          oldest.map((id) => kv.del("rec:" + id))
        );
      }
    }

    return res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
