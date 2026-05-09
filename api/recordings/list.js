const { kv } = require("@vercel/kv");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 50);
    const offset = parseInt(req.query.offset) || 0;

    // Get IDs sorted by time, newest first
    const ids = await kv.zrange("rec:list", 0, -1, { rev: true });
    const pageIds = ids.slice(offset, offset + limit);

    if (pageIds.length === 0) {
      return res.status(200).json({ recordings: [], total: ids.length });
    }

    // Fetch recordings in parallel
    const raw = await Promise.all(
      pageIds.map((id) => kv.get("rec:" + id))
    );

    const recordings = raw
      .filter(Boolean)
      .map((r) => {
        const rec = typeof r === "string" ? JSON.parse(r) : r;
        return {
          id: rec.id,
          name: rec.name,
          ts: rec.ts,
          dur: rec.dur,
          count: rec.ev ? rec.ev.length : 0,
        };
      });

    return res.status(200).json({
      recordings,
      total: ids.length,
      nextOffset: offset + limit < ids.length ? offset + limit : null,
    });
  } catch (err) {
    console.error("List error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
