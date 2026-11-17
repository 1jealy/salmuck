// 모든 파일을 HTML 한 장으로 묶는다(미리보기·단일 파일 배포용).
// 사용법: node scripts/bundle.mjs [출력경로]   기본: dist/suneung.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'dist', 'suneung.html');
const read = (p) => readFileSync(join(root, p), 'utf8');

// 의존 순서대로
const modules = ['src/data.js', 'src/game.js', 'src/pixel.js', 'src/card.js', 'src/main.js'];
const js = modules
  .map((p) => `// ---- ${p}\n` + read(p)
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+(?=(async\s+)?(function|const|let|class)\b)/gm, ''))
  .join('\n');

const html = read('index.html');
const app = html.slice(html.indexOf('<!-- app:start -->'), html.indexOf('<!-- app:end -->') + '<!-- app:end -->'.length);
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/)[0];

const page = `<title>수능 감독관</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
${read('style.css')}
</style>
${app}
<script>
(() => {
${js}
})();
</script>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`wrote ${out} (${page.length} bytes)`);
