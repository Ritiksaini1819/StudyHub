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
  console.log(`[${requestId}] Validate role change request started`);

  try {
    const body = await req.json();
    const { userId, newRole, referralCode } = body;

    // Validate input
    if (!userId || !newRole) {
      return new Response(JSON.stringify({ error: "User ID and new role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!['student', 'teacher'].includes(newRole)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error(`[${requestId}] Profile not found:`, profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentRole = profile.role;

    // If changing to teacher, validate referral code
    if (newRole === 'teacher' && currentRole === 'student') {
      if (!referralCode) {
        return new Response(JSON.stringify({ error: "Referral code is required to become a teacher" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate referral code using the existing database function
      const { data: isValid, error: validateError } = await supabase.rpc(
        "check_referral_code_valid",
        { input_code: referralCode }
      );

      if (validateError) {
        console.error(`[${requestId}] Validation error:`, validateError);
        return new Response(JSON.stringify({ error: "Error validating referral code" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!isValid) {
        return new Response(JSON.stringify({
          error: "Invalid or expired referral code. Please contact your administrator for a valid teacher referral code."
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record the referral code usage
      const { error: usageError } = await supabase.rpc(
        "validate_and_use_referral_code",
        {
          input_code: referralCode,
          user_id: userId,
        }
      );

      if (usageError) {
        console.error(`[${requestId}] Usage recording error:`, usageError);
        // Don't fail - role change can still proceed
      }
    }

    // Update the role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) {
      console.error(`[${requestId}] Role update error:`, updateError);
      return new Response(JSON.stringify({ error: "Failed to update role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${requestId}] Role changed from ${currentRole} to ${newRole} for user: ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Role updated to ${newRole}`,
      newRole,
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
