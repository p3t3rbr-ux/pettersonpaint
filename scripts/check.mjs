import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";

const files=["public/index.html","public/assets/site.css","public/assets/site.js","public/admin/index.html","public/admin/admin.css","public/admin/admin.js","content/default.json","netlify.toml","netlify/functions/content.mjs","netlify/functions/upload.mjs","netlify/functions/page.mjs"];
await Promise.all(files.map(file=>access(resolve(file))));
for(const file of ["public/assets/site.js","public/admin/admin.js"]){new Function(await readFile(file,"utf8"))}
JSON.parse(await readFile("content/default.json","utf8"));
const html=await readFile("public/index.html","utf8");
for(const marker of ["og:title","og:description","og:image","twitter:card","canonical"]){if(!html.includes(marker))throw Error(`Missing ${marker}`)}
console.log(`Validation complete: ${files.length} critical files checked.`);
