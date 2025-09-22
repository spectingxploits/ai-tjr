import { supabase } from "@/middleware/supabase";

export async function setConnectedStatus(
  user_tg_id: number,
  connected: boolean,
  shared_pubkey: string
): Promise<{ new_status: boolean }> {
  let { data: user, error: upsertError } = await supabase
    .from("users")
    .upsert(
      { tg_id: user_tg_id, connected: connected, shared_pubkey },
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

export async function getConnectedStatus(user_tg_id: number): Promise<{
  connected: boolean;
  shared_pubkey: string;
}> {
  let { data, error } = await supabase
    .from("users")
    .select("connected, shared_pubkey")
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
  console.log("data", data?.connected, data?.shared_pubkey);
  if (!data) {
    return {
      connected: false,
      shared_pubkey: "",
    };
  }

  return {
    connected: data.connected,
    shared_pubkey: data.shared_pubkey || "",
  };
}
