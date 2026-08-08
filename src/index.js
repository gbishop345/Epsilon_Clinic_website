const ADMIN_HOST = "epsilon-health.com";
const ADMIN_STATUSES = new Set(["new", "contacted", "scheduled", "closed"]);
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function json(body, init = {}) {
  const response = Response.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isAdminPath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApiPath(pathname) {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function adminIdentity(request, url) {
  if (isLocalHost(url.hostname)) {
    return "local-preview@epsilon-health.com";
  }

  if (url.hostname !== ADMIN_HOST) {
    return null;
  }

  return request.headers.get("Cf-Access-Authenticated-User-Email");
}

function normalizeStatus(value) {
  const status = String(value || "new").trim().toLowerCase();
  return ADMIN_STATUSES.has(status) ? status : "new";
}

function normalizePresignup(row) {
  return {
    id: row.id,
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    email: row.email || "",
    phone: row.phone || "",
    interested_in: row.interested_in || "",
    how_can_we_help: row.how_can_we_help || "",
    status: normalizeStatus(row.status),
    submitted_at:
      row.submitted_at ||
      row.created_at ||
      row.submission_timestamp ||
      row.submitted_on ||
      null
  };
}

function timestampValue(value) {
  if (!value) return 0;
  const source = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(source)
    ? `${source.replace(" ", "T")}Z`
    : source;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function matchesSearch(row, query) {
  if (!query) return true;

  return [
    row.first_name,
    row.last_name,
    row.email,
    row.phone,
    row.interested_in,
    row.how_can_we_help,
    row.status
  ].some((value) => String(value || "").toLowerCase().includes(query));
}

async function listPresignups(env, url, identity) {
  if (!env.DB) {
    return json({ success: false, error: "Database binding is unavailable" }, { status: 503 });
  }

  const query = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 100);
  const requestedStatus = (url.searchParams.get("status") || "all").toLowerCase();
  const status = requestedStatus === "all" ? "all" : normalizeStatus(requestedStatus);
  const sort = url.searchParams.get("sort") === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(url.searchParams.get("page_size") || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );

  const result = await env.DB.prepare("SELECT * FROM presignups").all();
  const allRows = (result.results || []).map(normalizePresignup);
  const statusCounts = { new: 0, contacted: 0, scheduled: 0, closed: 0 };

  for (const row of allRows) {
    statusCounts[row.status] += 1;
  }

  const filtered = allRows
    .filter((row) => status === "all" || row.status === status)
    .filter((row) => matchesSearch(row, query))
    .sort((a, b) => {
      const dateDifference = timestampValue(a.submitted_at) - timestampValue(b.submitted_at);
      const idDifference = Number(a.id || 0) - Number(b.id || 0);
      return sort === "oldest" ? dateDifference || idDifference : -(dateDifference || idDifference);
    });

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const offset = (safePage - 1) * pageSize;

  return json({
    success: true,
    presignups: filtered.slice(offset, offset + pageSize),
    meta: {
      total: allRows.length,
      filtered: filtered.length,
      page: safePage,
      page_size: pageSize,
      page_count: pageCount,
      status_counts: statusCounts
    },
    admin: { email: identity }
  });
}

function isSameOriginWrite(request, url) {
  if (isLocalHost(url.hostname)) return true;
  return request.headers.get("Origin") === url.origin;
}

async function updatePresignupStatus(request, env, url, id) {
  if (!isSameOriginWrite(request, url)) {
    return json({ success: false, error: "Cross-origin request denied" }, { status: 403 });
  }

  if (!env.DB) {
    return json({ success: false, error: "Database binding is unavailable" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "A JSON request body is required" }, { status: 400 });
  }

  const status = String(body.status || "").trim().toLowerCase();
  if (!ADMIN_STATUSES.has(status)) {
    return json(
      { success: false, error: "Status must be New, Contacted, Scheduled, or Closed" },
      { status: 400 }
    );
  }

  const result = await env.DB.prepare("UPDATE presignups SET status = ? WHERE id = ?")
    .bind(status, id)
    .run();

  if (!result.meta?.changes) {
    return json({ success: false, error: "Signup not found" }, { status: 404 });
  }

  return json({ success: true, presignup: { id, status } });
}

async function handleAdminApi(request, env, url, identity) {
  if (url.pathname === "/api/admin/presignups") {
    if (request.method === "GET") {
      return listPresignups(env, url, identity);
    }

    return json(
      { success: false, error: "Method not allowed" },
      { status: 405, headers: { Allow: "GET" } }
    );
  }

  const statusRoute = url.pathname.match(/^\/api\/admin\/presignups\/(\d+)$/);
  if (statusRoute) {
    if (request.method === "PATCH") {
      return updatePresignupStatus(request, env, url, Number(statusRoute[1]));
    }

    return json(
      { success: false, error: "Method not allowed" },
      { status: 405, headers: { Allow: "PATCH" } }
    );
  }

  return json({ success: false, error: "Admin endpoint not found" }, { status: 404 });
}

async function handlePresignup(request, env) {
  try {
    const body = await request.json();

    const firstName = body.first_name?.trim();
    const lastName = body.last_name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim() || null;
    const interestedIn = body.interested_in?.trim();
    const howCanWeHelp = body.how_can_we_help?.trim() || null;

    if (!firstName || !lastName || !email || !interestedIn) {
      return json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const result = await env.DB.prepare(
      `INSERT INTO presignups
       (first_name, last_name, email, phone, interested_in, how_can_we_help)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(firstName, lastName, email, phone, interestedIn, howCanWeHelp)
      .run();

    return json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error(error);
    return json({ success: false, error: "Unable to submit inquiry" }, { status: 500 });
  }
}

function secureAdminAsset(response) {
  const secured = new Response(response.body, response);
  secured.headers.set("Cache-Control", "no-store");
  secured.headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'");
  secured.headers.set("Referrer-Policy", "no-referrer");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  secured.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return secured;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (isAdminApiPath(url.pathname)) {
      const identity = adminIdentity(request, url);
      if (!identity) {
        return json({ success: false, error: "Admin access required" }, { status: 403 });
      }

      try {
        return await handleAdminApi(request, env, url, identity);
      } catch (error) {
        console.error("Admin API error", error);
        return json({ success: false, error: "Unable to complete the admin request" }, { status: 500 });
      }
    }

    if (url.pathname === "/api/presignup") {
      if (request.method === "POST") return handlePresignup(request, env);
      return json(
        { success: false, error: "Method not allowed" },
        { status: 405, headers: { Allow: "POST" } }
      );
    }

    if (isAdminPath(url.pathname)) {
      if (url.hostname === `www.${ADMIN_HOST}`) {
        url.hostname = ADMIN_HOST;
        if (url.pathname === "/admin") url.pathname = "/admin/";
        return Response.redirect(url.toString(), 302);
      }

      if (url.pathname === "/admin" && (url.hostname === ADMIN_HOST || isLocalHost(url.hostname))) {
        url.pathname = "/admin/";
        return Response.redirect(url.toString(), 302);
      }

      const identity = adminIdentity(request, url);
      if (!identity) return new Response("Not found", { status: 404 });

      return secureAdminAsset(await env.ASSETS.fetch(request));
    }

    return env.ASSETS.fetch(request);
  }
};
