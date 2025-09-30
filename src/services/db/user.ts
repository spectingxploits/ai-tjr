import { supabase } from "@/middleware/supabase";

export async function setConnectedStatus(
  user_tg_id: string,
  connected: boolean,
  shared_pubkey: string,
  wallet_address: string
): Promise<{ new_status: boolean }> {
  const { data: user, error: upsertError } = await supabase
    .from("users")
    .upsert(
      {
        tg_id: user_tg_id,
        connected: connected,
        shared_pubkey,
        wallet_address,
      },
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

export async function setSec(
  user_tg_id: string,
  sec: string
): Promise<boolean> {
  const { data: user, error: upsertError } = await supabase
    .from("users")
    .upsert(
      {
        tg_id: user_tg_id,
        sec,
      },
      { onConflict: "tg_id" } // 👈 ensures conflict handled by updating
    )
    .select()
    .single();

  if (upsertError) {
    console.error("Upsert error:", upsertError.message);
    throw new Error(
      `error setting user sec:
      ${upsertError.message}
    `
    );
  }
  return user.sec != null;
}

export async function setPubKey(
  user_tg_id: string,
  pub: string
): Promise<boolean> {
  const { data: user, error: upsertError } = await supabase
    .from("users")
    .upsert(
      {
        tg_id: user_tg_id,
        pub,
      },
      { onConflict: "tg_id" } // 👈 ensures conflict handled by updating
    )
    .select()
    .single();

  if (upsertError) {
    console.error("Upsert error:", upsertError.message);
    throw new Error(
      `error setting user pub:
      ${upsertError.message}
    `
    );
  }
  return user.pub != null;
}
export async function getUser(user_tg_id: string): Promise<{
  connected: boolean;
  shared_pubkey: string;
  wallet_address: string;
  sec: string;
  user_pub_key: string;
}> {
  const { data, error } = await supabase
    .from("users")
    .select("connected, shared_pubkey, wallet_address, sec, pub")
    .eq("tg_id", user_tg_id)
    .maybeSingle();

  if (error) {
    console.log("Fetch error:", error.message);
    throw new Error(
      `error fetching user(getUser):
                ${error.message}
                `
    );
  }
  console.log("data", data?.connected, data?.shared_pubkey);
  if (!data) {
    return {
      connected: false,
      shared_pubkey: "",
      wallet_address: "",
      sec: "",
      user_pub_key: "",
    };
  }

  return {
    connected: data.connected,
    shared_pubkey: data.shared_pubkey || "",
    wallet_address: data.wallet_address || "",
    sec: data.sec || "",
    user_pub_key: data.pub || "",
  };
}
