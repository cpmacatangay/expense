import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = "payment-qr";

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function listPaths(prefix = "") {
  const paths = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null || entry.metadata === null) {
        paths.push(...(await listPaths(path)));
      } else {
        paths.push(path);
      }
    }

    if (data.length < limit) break;
    offset += data.length;
  }

  return paths;
}

const paths = await listPaths();
if (paths.length === 0) {
  console.log("The payment-qr bucket is already empty.");
  process.exit(0);
}

for (let index = 0; index < paths.length; index += 100) {
  const chunk = paths.slice(index, index + 100);
  const { error } = await supabase.storage.from(bucket).remove(chunk);
  if (error) throw error;
  console.log(`Removed ${Math.min(index + chunk.length, paths.length)}/${paths.length}`);
}

console.log("Payment QR bucket emptied.");
