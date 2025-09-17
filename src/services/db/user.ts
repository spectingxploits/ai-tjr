import { supabase } from "@/lib/supabase";

export async function setConnectedStatus(
  user_tg_id: number,
  connected: boolean
): Promise<{ new_status: boolean }> {
  let { data: user, error: upsertError } = await supabase
    .from("users")
    .upsert(
      { tg_id: user_tg_id, connected: connected },
      { onConflict: "tg_id" } // 👈 ensures conflict handled by updating
    )
    .select()
    .single();

  if (upsertError) {
    console.error("Upsert error:", upsertError.message);
    throw new Error(
      `error setting user connected status:
      ${upsertError.message}
    `
    );
  }
  return { new_status: user.connected };
}

export async function getConnectedStatus(user_tg_id: number): Promise<boolean> {
  let { data, error } = await supabase
    .from("users")
    .select("connected")
    .eq("tg_id", user_tg_id)
    .single();

  if (error) {
    console.log("Fetch error:", error.message);
    throw new Error(
      `error fetching user(getConnectedStatus):
                ${error.message}
                `
    );
  }

  if (!data) {
    return false;
  }

  return data.connected;
}
