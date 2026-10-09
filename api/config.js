
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const clientId = process.env.OAUTH_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({
      error: "server_configuration_error",
    });
  }

  return res.status(200).json({
    clientId,
    issuer: (
      process.env.OAUTH_ISSUER || "https://api.fades.lol"
    ).replace(/\/+$/, ""),
    redirectUri: "https://cpdswat.xyz/api/auth/callback",
  });
}
