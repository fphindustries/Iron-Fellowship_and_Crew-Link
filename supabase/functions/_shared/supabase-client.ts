import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createServiceRoleClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const supabase = createServiceRoleClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}
