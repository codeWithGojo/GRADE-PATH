// Explicit public-file allowlist keeps server code, tests, data and secrets off the site.
import { mkdir, copyFile, rm, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await rm(output, { recursive: true, force: true });
await mkdir(new URL('vendor/fonts/', output), { recursive: true });
const files = ['index.html', 'styles.css', 'favicon.svg', 'runner.html', 'core.js', 'catalog.js', 'app.js', 'grades.js', 'study.js', 'exams.js', 'lab.js', 'online.js', 'school.js', 'appearance.js', 'experience.js', 'vendor/pdf.min.mjs', 'vendor/pdf.worker.min.mjs', 'vendor/PDFJS-LICENSE.txt', 'vendor/fonts/sora.woff', 'vendor/fonts/inter.woff', 'vendor/fonts/sora-OFL.txt', 'vendor/fonts/inter-OFL.txt'];
for (const file of files) await copyFile(new URL(file, root), new URL(file, output));
await writeFile(new URL('status.json', output), JSON.stringify({ online: false, aiConfigured: false, billingMode: '', account: null }));
console.log(`GradePath: ${files.length} public files built. Online services are not enabled in this static deployment.`);
