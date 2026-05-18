/**
 * Netlify Function: Cal.com Webhook Handler + Supabase CRM Lead Bridge
 *
 * Receives BOOKING_CREATED webhooks from Cal.com and:
 * 1. Generates a unique, deterministic room name from the booking UID
 * 2. Updates the Cal.com booking location with the unique guest meeting URL via Cal.com v2 API
 * 3. Creates or updates a Prospect record in the Growth Partners Command Center CRM
 * 4. Creates a Discovery Call record linked to the prospect
 * 5. Creates a high-priority task for John to prepare for the call
 *
 * ----- SETUP -----
 * 1. Add CAL_API_KEY env var in Netlify (your Cal.com API key)
 * 2. Add SUPABASE_URL env var in Netlify (your Supabase project URL)
 * 3. Add SUPABASE_SERVICE_KEY env var in Netlify (your Supabase service_role key)
 * 4. In Cal.com > Settings > Developer > Webhooks, add:
 *    URL: https://mygrowthconsultants.com/.netlify/functions/cal-booking
 *    Events: BOOKING_CREATED, BOOKING_RESCHEDULED
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
  const attendeeEmail = attendee?.email || null;
  const scheduledAt = payload.startTime || payload.scheduled_at || null;

  // Extract additional booking metadata from Cal.com form responses
  const responses = payload.responses || {};
  const businessName = responses.company?.value || responses.business?.value || null;
  const phone = responses.phone?.value || attendee?.phone || null;
  const bookingNotes = responses.notes?.value || responses.message?.value || null;

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

  // ===== SUPABASE CRM SYNC =====
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase env vars not set — skipping CRM sync");
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok", room, guestUrl, crm: "skipped" }),
    };
  }

  const sbHeaders = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  // Dedup: check if prospect with this email already exists
  let prospectId = null;
  if (attendeeEmail) {
    try {
      const checkResp = await fetch(
        `${supabaseUrl}/rest/v1/prospects?email=eq.${encodeURIComponent(attendeeEmail)}&select=id,business_name&limit=1`,
        { headers: sbHeaders }
      );
      const checkData = await checkResp.json();
      if (Array.isArray(checkData) && checkData.length > 0) {
        prospectId = checkData[0].id;
        console.log(`Existing prospect found: ${checkData[0].business_name} (${prospectId})`);
        await fetch(`${supabaseUrl}/rest/v1/prospects?id=eq.${prospectId}`, {
          method: "PATCH",
          headers: sbHeaders,
          body: JSON.stringify({
            status: "discovery_scheduled",
            notes: `[Discovery call booked via Cal.com on ${new Date().toISOString().split("T")[0]}]\nCal.com UID: ${bookingUid}`,
            updated_at: new Date().toISOString(),
          }),
        });
      }
    } catch (err) {
      console.error("Prospect dedup check failed:", err.message);
    }
  }

  // Create new prospect if not found
  if (!prospectId) {
    try {
      const insertResp = await fetch(`${supabaseUrl}/rest/v1/prospects`, {
        method: "POST",
        headers: sbHeaders,
        body: JSON.stringify({
          business_name: businessName || attendeeName,
          contact_name: attendeeName,
          email: attendeeEmail,
          phone: phone || null,
          business_type: "inbound_booking",
          status: "discovery_scheduled",
          ai_score: 60,
          pain_points: ["booked_consultation"],
          notes: `Booked a free consultation via Cal.com on ${new Date().toISOString().split("T")[0]}.\nCal.com UID: ${bookingUid}${bookingNotes ? `\n\nBooking notes: ${bookingNotes}` : ""}`,
          source: "cal_booking",
          created_at: new Date().toISOString(),
        }),
      });
      const insertData = await insertResp.json();
      if (Array.isArray(insertData) && insertData.length > 0) {
        prospectId = insertData[0].id;
        console.log(`New prospect created: ${businessName || attendeeName} (${prospectId})`);
      }
    } catch (err) {
      console.error("Prospect insert failed:", err.message);
    }
  }

  // Create Discovery Call record
  if (prospectId && scheduledAt) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/discovery_calls`, {
        method: "POST",
        headers: sbHeaders,
        body: JSON.stringify({
          prospect_id: prospectId,
          scheduled_at: scheduledAt,
          jitsi_room_name: room,
          status: "scheduled",
          notes: `Booked via Cal.com. UID: ${bookingUid}. Guest URL: ${guestUrl}`,
        }),
      });
      console.log(`Discovery call record created for prospect ${prospectId}`);
    } catch (err) {
      console.error("Discovery call insert failed:", err.message);
    }
  }

  // Create high-priority task for John
  if (prospectId) {
    const callDate = scheduledAt
      ? new Date(scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "TBD";
    const taskTitle = `Discovery call with ${attendeeName}${businessName ? ` (${businessName})` : ""} — ${callDate}`;
    try {
      await fetch(`${supabaseUrl}/rest/v1/tasks`, {
        method: "POST",
        headers: sbHeaders,
        body: JSON.stringify({
          prospect_id: prospectId,
          title: taskTitle,
          description: `Name: ${attendeeName}\nEmail: ${attendeeEmail || "not provided"}\nPhone: ${phone || "not provided"}\nBusiness: ${businessName || "not provided"}\nScheduled: ${callDate}\nRoom: ${guestUrl}${bookingNotes ? `\n\nBooking notes: ${bookingNotes}` : ""}`,
          priority: "high",
          status: "pending",
          assigned_to: "john",
          due_date: scheduledAt ? scheduledAt.split("T")[0] : new Date(Date.now() + 86400000).toISOString().split("T")[0],
          created_by: "cal_webhook",
        }),
      });
      console.log(`Task created for discovery call with ${attendeeName}`);
    } catch (err) {
      console.error("Task creation failed:", err.message);
    }
  }

  return {
    statusCode: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "ok",
      room,
      guestUrl,
      crm: prospectId ? "synced" : "skipped",
      prospectId,
    }),
  };
};
