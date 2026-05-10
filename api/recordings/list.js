const { kv } = require("@vercel/kv");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 50);
    const offset = parseInt(req.query.offset) || 0;
    const sort = req.query.sort === "hot" ? "hot" : "new";

    // Get IDs sorted by time, newest first
    let ids = await kv.zrange("rec:list", 0, -1, { rev: true });

    if (ids.length === 0) {
      return res.status(200).json({ recordings: [], total: 0 });
    }

    // Fetch play counts for all IDs
    const playKeys = ids.map((id) => "plays:" + id);
    const playCounts = await kv.mget(...playKeys);

    if (sort === "hot") {
      // Build [id, count] pairs and sort by plays descending, then by time
      const withPlays = ids.map((id, i) => ({
        id,
        plays: parseInt(playCounts[i]) || 0,
      }));
      withPlays.sort((a, b) => b.plays - a.plays);
      ids = withPlays.map((p) => p.id);
    }

    const pageIds = ids.slice(offset, offset + limit);

    if (pageIds.length === 0) {
      return res.status(200).json({ recordings: [], total: ids.length });
    }

    // Fetch play counts for the page
    const pagePlayKeys = pageIds.map((id) => "plays:" + id);
    const pagePlays = await kv.mget(...pagePlayKeys);

    // Fetch recordings in parallel
    const raw = await Promise.all(
      pageIds.map((id) => kv.get("rec:" + id))
    );

    const recordings = raw
      .filter(Boolean)
      .map((r, i) => {
        const rec = typeof r === "string" ? JSON.parse(r) : r;
        return {
          id: rec.id,
          name: rec.name,
          title: rec.title || undefined,
          ts: rec.ts,
          dur: rec.dur,
          count: rec.ev ? rec.ev.length : 0,
          plays: parseInt(pagePlays[i]) || 0,
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
