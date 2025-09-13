import { supabase } from "@/lib/supabase";
import { ExchangeCreds } from "@/models/interfaces";

export async function setupUserExchangeData(params: ExchangeCreds) {
  try {
    const { data: ex_data, error: insertError } = await supabase
      .from("users")
      .insert(params)
      .select()
      .single();

    if (insertError) {
      throw new Error(
        `error fetching user(getUser):
      ${insertError.message}
      `
      );
    }

    return true;
  } catch (e) {
    console.error("Error setting up user exchange data:", e);
  }
}
