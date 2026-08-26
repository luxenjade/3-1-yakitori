import { readFile } from "node:fs/promises";

const envFile = await readFile(new URL("../.env", import.meta.url), "utf8").catch(() => "");
const values = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return index === -1 ? ["", ""] : [line.slice(0, index), line.slice(index + 1)];
    }),
);

const url = values.VITE_SUPABASE_URL;
const key = values.VITE_SUPABASE_ANON_KEY ?? values.VITE_SUPABASE_KEY;

if (!url || !key) {
  console.error("Supabase設定が不足しています。.env に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。");
  process.exit(1);
}

const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/items?select=id&limit=1`, {
  headers: { apikey: key },
});

if (!response.ok) {
  console.error(`Supabaseへの接続に失敗しました (HTTP ${response.status})。`);
  process.exit(1);
}

console.log("Supabase REST APIへの接続を確認しました。");
