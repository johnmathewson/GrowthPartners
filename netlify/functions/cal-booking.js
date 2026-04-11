/**
 * Netlify Function: Cal.com Webhook Handler
 *
 * Receives BOOKING_CREATED webhooks from Cal.com and:
 * 1. Generates a unique, deterministic room name from the booking UID
 * 2. Updates the Cal.com booking location with the unique guest meeting URL
 *    via Cal.com v2 API
 *
 * ----- SETUP -----
 * 1. Add CAL_API_KEY env var in Netlify (your Cal.com API key)
 * 2. In Cal.com > Settings > Developer > Webhooks, add:
 *    URL: https://mygrowthconsultants.com/.netlify/functions/cal-booking
 *    Event: BOOKING_CREATED
 */

const SITE_URL = "https://mygrowthconsultants.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": SITE_URL,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function roomFromUid(uid) {
  return "consult-" + uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toLowerCase();
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed. Use POST." }),
    };
  }

  const calApiKey = process.env.CAL_API_KEY;
  if (!calApiKey) {
    console.error("Missing CAL_API_KEY environment variable");
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "CAL_API_KEY not configured" }),
    };
  }

  let payload;
  try {
    const body = JSON.parse(event.body);
    payload = body.payload;
  } catch (err) {
    console.error("Invalid webhook body:", err.message);
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (!payload || !payload.uid) {
    console.log("Webhook received but no booking UID found, skipping.");
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "skipped", reason: "no booking UID" }),
    };
  }

  const bookingUid = payload.uid;
  const room = roomFromUid(bookingUid);
  const attendees = payload.attendees || payload.responses?.attendees || [];
  const attendee = Array.isArray(attendees) ? attendees[0] : {};
  const attendeeName = attendee?.name || "Guest";

  const guestUrl =
    SITE_URL + "/meet/?room=" + encodeURIComponent(room) +
    "&name=" + encodeURIComponent(attendeeName);

  console.log(`Booking ${bookingUid}: room=${room}, guest=${attendeeName}, url=${guestUrl}`);

  // Try to reschedule/update the booking location via Cal.com v2 API
  try {
    const patchUrl = "https://api.cal.com/v2/bookings/" + bookingUid;

    const res = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + calApiKey,
        "cal-api-version": "2024-08-13",
      },
      body: JSON.stringify({
        location: guestUrl,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Cal.com v2 PATCH failed:", res.status, errText);
    } else {
      console.log("Cal.com booking location updated to:", guestUrl);
    }
  } catch (err) {
    console.error("Failed to update Cal.com booking:", err.message);
  }

  return {
    statusCode: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "ok",
      room,
      guestUrl,
    }),
  };
};
