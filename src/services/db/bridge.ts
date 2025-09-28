import { supabase } from "@/middleware/supabase";
export async function setBridgeValue(
  token: string,
  value: string
): Promise<{ success: boolean; skipped?: boolean }> {
  // 1. Check if token already exists
  const { data: existing, error: selectError } = await supabase
    .from("bridge")
    .select("token")
    .eq("token", token)
    .maybeSingle();

  if (selectError) {
    console.error("Select error:", selectError.message);
    throw new Error(selectError.message);
  }

  // 2. If it exists → skip insert
  if (existing) {
    return { success: true, skipped: true };
  }

  // 3. If not → insert
  const { error: insertError } = await supabase
    .from("bridge")
    .insert([{ token, value }]);

  if (insertError) {
    console.error("Insert error:", insertError.message);
    throw new Error(insertError.message);
  }

  return { success: true };
}

export async function getBridgeValue(token: string): Promise<{
  success: boolean;
  value: string;
}> {
  let { data, error } = await supabase
    .from("bridge")
    .select("value")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.log("Fetch error:", error.message);
    throw new Error(
      `error fetching bridge value:        
                ${error.message}        
                `
    );
  }
  console.log("data", data?.value);
  if (!data) {
    return {
      success: false,
      value: "",
    };
  }

  return {
    success: true,
    value: data.value || "",
  };
}
