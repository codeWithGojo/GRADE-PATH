// Explicit public-file allowlist keeps server code, tests, data and secrets off the site.
import { mkdir, copyFile, rm, readFile, writeFile } from 'node:fs/promises';
import { createHash } from "node:crypto";
const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await rm(output, { recursive: true, force: true });
await mkdir(new URL('vendor/fonts/', output), { recursive: true });
const files = ['index.html', 'styles.css', 'surfaces.css', 'surfaces.js', 'favicon.svg', 'runner.html', 'core.js', 'catalog.js', 'account-lifecycle-ui.js', 'app.js', 'grades.js', 'study.js', 'exams.js', 'lab.js', 'online.js', 'school.js', 'projects.js', 'appearance.js', 'experience.js', 'vendor/pdf.min.mjs', 'vendor/pdf.worker.min.mjs', 'vendor/PDFJS-LICENSE.txt', 'vendor/fonts/sora.woff', 'vendor/fonts/inter.woff', 'vendor/fonts/sora-OFL.txt', 'vendor/fonts/inter-OFL.txt'];
for (const file of files) await copyFile(new URL(file, root), new URL(file, output));
const digest = createHash("sha256");
for (const file of [...files, "sw.js"]) digest.update(await readFile(new URL(file, root)));
const worker = (await readFile(new URL("sw.js", root), "utf8")).replace("__BUILD__", digest.digest("hex").slice(0, 16));
await writeFile(new URL("sw.js", output), worker);
console.log(`GradePath: ${files.length + 1} public files built.`);
