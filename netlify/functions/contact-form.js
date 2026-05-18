/**
 * Netlify Function: Contact Form → Supabase CRM Lead Bridge
 *
 * Receives POST submissions from the contact form on mygrowthconsultants.com/contact/
 * and creates a new Prospect record in the Growth Partners Command Center CRM.
 *
 * ----- SETUP -----
 * 1. Add SUPABASE_URL env var in Netlify (your Supabase project URL)
 * 2. Add SUPABASE_SERVICE_KEY env var in Netlify (your Supabase service_role key)
 *    NOTE: Use the service_role key (not anon key) so we can bypass RLS for inserts.
 *
 * ----- WHAT IT DOES -----
 * 1. Parses the form submission (name, email, phone, business, message)
 * 2. Checks if a prospect with the same email already exists (dedup)
 * 3. If new: inserts a prospect record with status='inbound_lead', ai_score=50
 * 4. Creates a high-priority task: "Inbound lead from <name> — follow up within 24h"
 * 5. Returns a success/error JSON response
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://mygrowthconsultants.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed." }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server configuration error." }),
    };
  }

  // Parse form data (supports both JSON and URL-encoded)
  let name, email, phone, business, message;
  try {
    const contentType = event.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      const body = JSON.parse(event.body);
      name = body.name;
      email = body.email;
      phone = body.phone;
      business = body.business;
      message = body.message;
    } else {
      // URL-encoded form submission
      const params = new URLSearchParams(event.body);
      name = params.get("name");
      email = params.get("email");
      phone = params.get("phone");
      business = params.get("business");
      message = params.get("message");
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid form data." }),
    };
  }

  if (!name || !email || !message) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Name, email, and message are required." }),
    };
  }

  const sbHeaders = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  // Step 1: Check for existing prospect with same email (dedup)
  let existingProspect = null;
  try {
    const checkResp = await fetch(
      `${supabaseUrl}/rest/v1/prospects?email=eq.${encodeURIComponent(email)}&select=id,business_name,status&limit=1`,
      { headers: sbHeaders }
    );
    const checkData = await checkResp.json();
    if (Array.isArray(checkData) && checkData.length > 0) {
      existingProspect = checkData[0];
    }
  } catch (err) {
    console.error("Dedup check failed:", err.message);
  }

  let prospectId;

  if (existingProspect) {
    // Prospect already in CRM — just log the new contact attempt
    prospectId = existingProspect.id;
    console.log(`Existing prospect found: ${existingProspect.business_name} (${existingProspect.id})`);

    // Update notes to reflect re-contact
    await fetch(
      `${supabaseUrl}/rest/v1/prospects?id=eq.${prospectId}`,
      {
        method: "PATCH",
        headers: sbHeaders,
        body: JSON.stringify({
          notes: `[Re-contact via website form ${new Date().toISOString().split("T")[0]}]\nMessage: ${message}`,
          updated_at: new Date().toISOString(),
        }),
      }
    );
  } else {
    // Step 2: Create new prospect record
    const prospectPayload = {
      business_name: business || name,
      contact_name: name,
      email: email,
      phone: phone || null,
      city: null,
      state: null,
      business_type: "inbound_lead",
      status: "new",
      ai_score: 50,
      pain_points: ["inbound_contact"],
      notes: `Inbound contact via website form on ${new Date().toISOString().split("T")[0]}.\n\nMessage: ${message}`,
      source: "website_contact_form",
      created_at: new Date().toISOString(),
    };

    try {
      const insertResp = await fetch(
        `${supabaseUrl}/rest/v1/prospects`,
        {
          method: "POST",
          headers: sbHeaders,
          body: JSON.stringify(prospectPayload),
        }
      );
      const insertData = await insertResp.json();
      if (Array.isArray(insertData) && insertData.length > 0) {
        prospectId = insertData[0].id;
        console.log(`New prospect created: ${business || name} (${prospectId})`);
      } else {
        console.error("Prospect insert returned unexpected data:", insertData);
      }
    } catch (err) {
      console.error("Prospect insert failed:", err.message);
    }
  }

  // Step 3: Create a high-priority follow-up task
  if (prospectId) {
    const taskTitle = `Inbound lead: ${name} (${business || "no business listed"}) — follow up within 24h`;
    const taskPayload = {
      prospect_id: prospectId,
      title: taskTitle,
      description: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "not provided"}\nBusiness: ${business || "not provided"}\n\nMessage:\n${message}`,
      priority: "high",
      status: "pending",
      assigned_to: "john",
      due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      created_by: "website_form",
    };

    try {
      await fetch(
        `${supabaseUrl}/rest/v1/tasks`,
        {
          method: "POST",
          headers: sbHeaders,
          body: JSON.stringify(taskPayload),
        }
      );
      console.log(`Follow-up task created for ${name}`);
    } catch (err) {
      console.error("Task creation failed:", err.message);
    }
  }

  return {
    statusCode: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "ok",
      message: "Your message has been received. We'll be in touch within one business day.",
      existing: !!existingProspect,
    }),
  };
};
