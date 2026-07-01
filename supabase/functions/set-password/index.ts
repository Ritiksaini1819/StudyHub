import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Set password request started`);

  try {
    const body = await req.json();
    const { userId, password, confirmPassword } = body;

    // Validate input
    if (!userId || !password || !confirmPassword) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check passwords match
    if (password !== confirmPassword) {
      return new Response(JSON.stringify({ error: "Passwords do not match" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate password length (minimum 6 characters)
    if (password.length < 6) {
      return new Response(JSON.stringify({
        error: "Password must be at least 6 characters long"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user.user) {
      console.error(`[${requestId}] User not found:`, userError);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has password set
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("has_password")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error(`[${requestId}] Profile fetch error:`, profileError);
    }

    if (profile?.has_password) {
      return new Response(JSON.stringify({ error: "Password already set" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update user password in Supabase Auth
    // Supabase handles password hashing internally with bcrypt
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: password,
    });

    if (updateError) {
      console.error(`[${requestId}] Password update error:`, updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile to mark password as set
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ has_password: true, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileUpdateError) {
      console.error(`[${requestId}] Profile update error:`, profileUpdateError);
      // Don't fail - password is already set in auth
    }

    console.log(`[${requestId}] Password set successfully for user: ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Password set successfully",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
