/**
 * Netlify Serverless Function: JaaS (Jitsi as a Service) JWT Token Generator
 *
 * Generates signed JWT tokens for authenticated JaaS video meetings.
 *
 * ----- ENVIRONMENT VARIABLE SETUP (Netlify Dashboard) -----
 *
 * 1. Go to your Netlify site dashboard > Site settings > Environment variables
 *
 * 2. Add the following variables:
 *
 *    JAAS_API_KEY_ID
 *      - Your JaaS API key ID (the "kid" value from the 8x8 admin console).
 *      - Found at: https://jaas.8x8.vc/#/apikeys
 *      - Example: "vpaas-magic-cookie-52d2fb052ed44eeda28067f20b0f2812/abc123"
 *
 *    JAAS_PRIVATE_KEY
 *      - The full RSA private key in PEM format.
 *      - Download from the 8x8 admin console when you create an API key.
 *      - Paste the entire key including -----BEGIN RSA PRIVATE KEY----- and
 *        -----END RSA PRIVATE KEY----- lines.
 *      - Important: Netlify preserves newlines in env vars, so paste as-is.
 *        If newlines are lost, replace literal "\n" sequences with real newlines
 *        (handled automatically by this function).
 *
 * 3. Redeploy after adding the variables.
 *
 * ----- USAGE -----
 *
 * GET /.netlify/functions/jitsi-token?room=my-room&name=John&email=john@example.com&moderator=true
 *
 * Query parameters:
 *   room      - Meeting room name (required)
 *   name      - Display name for the participant (required)
 *   email     - Participant email address (optional)
 *   moderator - "true" to grant moderator privileges (optional, defaults to false)
 */

const jwt = require("jsonwebtoken");

// JaaS application identifier (your vpaas tenant ID)
const JAAS_APP_ID = "vpaas-magic-cookie-52d2fb052ed44eeda28067f20b0f2812";

// CORS-allowed origin
const ALLOWED_ORIGIN = "https://mygrowthconsultants.com";

// Standard CORS headers applied to every response
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Normalize a PEM private key that may have had its newlines stripped.
 * Netlify sometimes stores multi-line env vars with literal "\n" strings
 * instead of actual newline characters.
 * Also handles PKCS#8 format (BEGIN PRIVATE KEY) by creating a crypto KeyObject.
 */
const crypto = require("crypto");

function normalizePrivateKey(key) {
  if (!key) return key;
  let pem = key;
  // If the key is base64-encoded (no PEM header), decode it first
  if (!pem.includes("-----BEGIN")) {
    pem = Buffer.from(pem, "base64").toString("utf8");
  }
  // Replace literal two-character "\n" sequences with real newlines
  pem = pem.replace(/\\n/g, "\n");
  // Strip Windows carriage returns
  pem = pem.replace(/\r/g, "");
  // Convert PEM string to a crypto KeyObject (works with both PKCS#8 and PKCS#1)
  return crypto.createPrivateKey(pem);
}

exports.handler = async (event) => {
  // ---- Handle CORS preflight ----
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  // ---- Validate HTTP method ----
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed. Use GET." }),
    };
  }

  // ---- Check environment variables ----
  const apiKeyId = process.env.JAAS_API_KEY_ID;
  const rawPrivateKey = process.env.JAAS_PRIVATE_KEY;

  if (!apiKeyId) {
    console.error("Missing JAAS_API_KEY_ID environment variable");
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Server configuration error: JAAS_API_KEY_ID is not set. "
          + "Add it in Netlify > Site settings > Environment variables. "
          + "Get the value from https://jaas.8x8.vc/#/apikeys",
      }),
    };
  }

  if (!rawPrivateKey) {
    console.error("Missing JAAS_PRIVATE_KEY environment variable");
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Server configuration error: JAAS_PRIVATE_KEY is not set. "
          + "Add your RSA private key (PEM format) in Netlify > Site settings > "
          + "Environment variables.",
      }),
    };
  }

  const privateKey = normalizePrivateKey(rawPrivateKey);

  // ---- Parse query parameters ----
  const params = event.queryStringParameters || {};
  const room = params.room;
  const name = params.name;
  const email = params.email || "";
  const isModerator = params.moderator === "true";
  const pin = params.pin || "";

  // ---- PIN check for moderator / host access ----
  const hostPin = process.env.HOST_PIN;
  if (isModerator && hostPin && pin !== hostPin) {
    return {
      statusCode: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid host PIN." }),
    };
  }

  if (!room) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: 'Missing required query parameter: "room"',
      }),
    };
  }

  if (!name) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: 'Missing required query parameter: "name"',
      }),
    };
  }

  // ---- Build JWT payload ----
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: "chat",
    aud: "jitsi",
    iat: now,
    exp: now + 7200, // 2 hours
    nbf: now - 10,   // small grace period for clock skew
    sub: JAAS_APP_ID,
    context: {
      user: {
        name,
        email,
        moderator: isModerator,
      },
      features: {
        livestreaming: false,
        recording: true,
        transcription: false,
        "outbound-call": false,
      },
    },
    room,
  };

  // ---- Sign the token ----
  try {
    const token = jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      header: {
        alg: "RS256",
        typ: "JWT",
        kid: apiKeyId,
      },
    });

    // Build the full meeting URL with token embedded
    const meetUrl =
      `https://mygrowthconsultants.com/meet/`
      + `?room=${encodeURIComponent(room)}`
      + `&token=${encodeURIComponent(token)}`
      + `&name=${encodeURIComponent(name)}`;

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ token, room, meetUrl }),
    };
  } catch (err) {
    console.error("JWT signing failed:", err.message);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to generate JWT token. Verify that JAAS_PRIVATE_KEY "
          + "contains a valid RSA private key in PEM format.",
        detail: err.message,
      }),
    };
  }
};
