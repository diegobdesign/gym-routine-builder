import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(import.meta.dirname || __dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data } = await supabase.from("machines").select("id, name, category, brand").order("category").order("name");
  console.log(JSON.stringify(data, null, 2));
}

main();
