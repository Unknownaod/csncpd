
export default async function handler(req, res) {
  const requestId = crypto.randomUUID();

  const log = (event, details = {}) => {
    console.log(
      JSON.stringify({
        service: "cpdswat-oauth",
        route: "/api/token",
        requestId,
        event,
        time: new Date().toISOString(),
        ...details,
      })
    );
  };

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Request-ID", requestId);

  log("request.started", {
    method: req.method,
    host: req.headers.host || null,
  });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    log("request.rejected", { reason: "method_not_allowed" });

    return res.status(405).json({
      error: "method_not_allowed",
      request_id: requestId,
    });
  }

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const redirectUri = "https://cpdswat.xyz/api/auth/callback";

  const issuer = (
    process.env.OAUTH_ISSUER || "https://api.fades.lol"
  ).replace(/\/+$/, "");

  if (!clientId || !clientSecret) {
    log("configuration.failed", {
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
    });

    return res.status(500).json({
      error: "server_configuration_error",
      request_id: requestId,
    });
  }

  const {
    code,
    code_verifier,
    client_id,
    redirect_uri,
  } = req.body || {};

  if (
    typeof code !== "string" ||
    typeof code_verifier !== "string" ||
    client_id !== clientId ||
    redirect_uri !== redirectUri
  ) {
    log("request.rejected", {
      reason: "invalid_request",
      hasCode: typeof code === "string" && code.length > 0,
      hasVerifier:
        typeof code_verifier === "string" &&
        code_verifier.length > 0,
      clientIdMatches: client_id === clientId,
      redirectUriMatches: redirect_uri === redirectUri,
    });

    return res.status(400).json({
      error: "invalid_request",
      request_id: requestId,
    });
  }

  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(code_verifier)) {
    log("request.rejected", {
      reason: "invalid_code_verifier",
    });

    return res.status(400).json({
      error: "invalid_code_verifier",
      request_id: requestId,
    });
  }

  try {
    log("upstream.request.started", {
      issuer,
      endpoint: "/oauth/token",
      grantType: "authorization_code",
    });

    const upstream = await fetch(`${issuer}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Request-ID": requestId,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier,
      }),
    });

    const responseText = await upstream.text();

    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = null;
    }

    log("upstream.response.received", {
      status: upstream.status,
      ok: upstream.ok,
      contentType: upstream.headers.get("content-type"),
      responseIsJson: data !== null,
      upstreamError:
        data && typeof data.error === "string"
          ? data.error
          : null,
      upstreamDescription:
        data && typeof data.error_description === "string"
          ? data.error_description.slice(0, 300)
          : null,
      responsePreview:
        data === null
          ? responseText.slice(0, 500)
          : undefined,
    });

    if (data === null) {
      log("upstream.response.invalid_json", {
        status: upstream.status,
      });

      return res.status(502).json({
        error: "invalid_upstream_response",
        request_id: requestId,
      });
    }

    // Preserve the provider's OAuth status and error response.
    return res.status(upstream.status).json(data);
  } catch (error) {
    log("upstream.request.failed", {
      errorName: error?.name || "Error",
      errorMessage: error?.message || "Unknown error",
    });

    return res.status(502).json({
      error: "upstream_unavailable",
      request_id: requestId,
    });
  }
}
