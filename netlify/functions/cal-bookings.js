/**
 * Netlify Function: Upcoming Bookings
 *
 * Fetches upcoming bookings from Cal.com API and returns them
 * with deterministic room names for the host dashboard.
 *
 * GET /.netlify/functions/cal-bookings?pin=YOUR_HOST_PIN
 */

const SITE_URL = "https://mygrowthconsultants.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": SITE_URL,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function roomFromUid(uid) {
  return "consult-" + uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toLowerCase();
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Verify host PIN
  const params = event.queryStringParameters || {};
  const hostPin = process.env.HOST_PIN;
  if (hostPin && params.pin !== hostPin) {
    return {
      statusCode: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid PIN" }),
    };
  }

  const calApiKey = process.env.CAL_API_KEY;
  if (!calApiKey) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "CAL_API_KEY not configured" }),
    };
  }

  try {
    // Fetch upcoming bookings (status=upcoming)
    const now = new Date().toISOString();
    const url =
      "https://api.cal.com/v1/bookings?apiKey=" + calApiKey +
      "&status=upcoming&afterStart=" + encodeURIComponent(now);

    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      console.error("Cal.com API error:", res.status, errText);
      return {
        statusCode: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to fetch bookings from Cal.com" }),
      };
    }

    const data = await res.json();
    const bookings = (data.bookings || []).map((b) => {
      const attendee = (b.attendees && b.attendees[0]) || {};
      const room = roomFromUid(b.uid);
      return {
        id: b.id,
        uid: b.uid,
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
        attendeeName: attendee.name || "Guest",
        attendeeEmail: attendee.email || "",
        room,
        guestUrl:
          SITE_URL + "/meet/?room=" + encodeURIComponent(room) +
          "&name=" + encodeURIComponent(attendee.name || "Guest"),
      };
    });

    // Sort by start time ascending
    bookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ bookings }),
    };
  } catch (err) {
    console.error("Error fetching bookings:", err.message);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
