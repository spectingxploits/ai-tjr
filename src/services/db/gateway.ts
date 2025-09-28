import { supabase } from "@/middleware/supabase";

export async function getGatewayId(user_tg_id: string): Promise<string> {
  let { data, error } = await supabase
    .from("users")
    .select("gateway_id")
    .eq("tg_id", user_tg_id)
    .maybeSingle();

  if (error) {
    console.log("Fetch error:", error.message);
    throw new Error(
      `error fetching user(getGatewayId):
                ${error.message}
                `
    );
  }
  console.log("data", data?.gateway_id);
  if (!data) {
    return "";
  }

  return data.gateway_id || "";
}

export async function setGatewayId(
  user_tg_id: string,
  gateway_id: string
): Promise<boolean> {
  let { data: user, error: upsertError } = await supabase
    .from("users")
    .upsert(
      {
        tg_id: user_tg_id,
        gateway_id,
      },
      { onConflict: "tg_id" } // 👈 ensures conflict handled by updating
    )
    .select()
    .single();

  if (upsertError) {
    console.error("Upsert error:", upsertError.message);
    throw new Error(
      `error setting user gateway_id:
          ${upsertError.message}
        `
    );
  }
  return user.id != null;
}
