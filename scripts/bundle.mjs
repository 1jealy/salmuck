// 모든 파일을 HTML 한 장으로 묶는다(미리보기·단일 파일 배포용).
// 글꼴은 실제로 쓰는 글자만 남겨(서브셋) data URI로 넣는다. 서브셋에는 Python fonttools가 필요하다.
//   pip install fonttools brotli
// 사용법: node scripts/bundle.mjs [출력경로]   기본: dist/suneung.html
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'dist', 'suneung.html');
const read = (p) => readFileSync(join(root, p), 'utf8');

const modules = ['src/data.js', 'src/game.js', 'src/closeup.js', 'src/pixel.js', 'src/card.js', 'src/main.js'];
const sources = modules.map(read);
const modName = (p) => '__' + p.replace(/^.*\//, '').replace(/\.js$/, '').replace(/\W/g, '_');

// 모듈마다 자기 범위를 갖게 감싸고, import/export를 변수 연결로 바꾼다.
const js = modules.map((p, i) => {
  const exported = [];
  let code = sources[i]
    .replace(/^import\s*\{([^}]*)\}\s*from\s*['"]\.\/([^'"]+)['"];?\s*$/gm, (_, names, file) => {
      const list = names.split(',').map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/\s+as\s+/, ': '));
      return `const { ${list.join(', ')} } = ${modName(file)};`;
    })
    .replace(/^export\s*\{([^}]*)\};?\s*$/gm, (_, names) => {
      names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => exported.push(n));
      return '';
    })
    .replace(/^export\s+((?:async\s+)?function\s+(\w+)|const\s+(\w+)|let\s+(\w+)|class\s+(\w+))/gm, (m, decl, f, c, l, k) => {
      exported.push(f || c || l || k);
      return decl;
    });
  return `// ---- ${p}\nconst ${modName(p)} = (() => {\n${code}\nreturn { ${exported.join(', ')} };\n})();`;
}).join('\n');

const html = read('index.html');
const app = html.slice(html.indexOf('<!-- app:start -->'), html.indexOf('<!-- app:end -->') + '<!-- app:end -->'.length);
let css = read('style.css');

// 글꼴 서브셋
const used = new Set([...sources.join('') + html + css]);
for (let c = 0x20; c < 0x7f; c++) used.add(String.fromCharCode(c));
'▶·…“”‘’—'.split('').forEach((c) => used.add(c));
const tmp = mkdtempSync(join(tmpdir(), 'galmuri-'));
const textFile = join(tmp, 'chars.txt');
writeFileSync(textFile, [...used].join(''));
for (const name of ['Galmuri11', 'Galmuri11-Bold']) {
  const src = join(root, 'fonts', `${name}.woff2`);
  const dst = join(tmp, `${name}.woff2`);
  let data;
  try {
    execFileSync('pyftsubset', [src, `--text-file=${textFile}`, '--flavor=woff2', `--output-file=${dst}`], { stdio: 'ignore' });
    data = readFileSync(dst);
  } catch (e) {
    console.warn(`서브셋 실패, 전체 글꼴을 넣습니다: ${name}`);
    data = readFileSync(src);
  }
  css = css.replace(`url("fonts/${name}.woff2")`, `url("data:font/woff2;base64,${data.toString('base64')}")`);
}

const page = `<title>수능 감독관</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${css}
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
console.log(`wrote ${out} (${Math.round(page.length / 1024)} KB)`);
