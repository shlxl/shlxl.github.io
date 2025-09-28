  javascript
  #!/usr/bin/env node
  import fs from 'node:fs';
  import path from 'node:path';
  import { program } from 'commander';
  import { resolveColumnDir } from './lib/columns.js';

  const BLOG_DIR = 'docs/blog';

  // Helper functions
  function slugify(s) {
    return String(s).toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]+/g, '')
      .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  function formatNow(tz) {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
    const pad = n => String(n).padStart(2, '0');
    return ${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())};
  }

  function ensureDir(d) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  function escapeYaml(s) {
    return String(s).replace(/"/g, '\\"');
  }

  // Commander setup
  if (typeof program.argument === 'function') {
    program.argument('[title]', 'Post title');
  } else if (typeof program.arguments === 'function') {
    program.arguments('[title]');
  }

  program
    .option('-t, --title <string>', 'Post title')
    .option('-d, --desc <string>', 'Post description', '')
    .option('--tags <string>', 'Comma-separated tags', '')
    .option('-c, --cat <string>', 'Category name')
    .option('--cover <string>', 'Cover image URL', '')
    .option('--date <string>', 'Post date')
    .option('-s, --slug <string>', 'Post slug')
    .option('--tz <string>', 'Timezone', 'Asia/Shanghai');

  program.parse(process.argv);

  const options = program.opts();
  const title = program.args[0] || options.title || '未命名文章';

  // Logic
  const desc = options.desc;
  const tags = options.tags.split(',').map(s => s.trim()).filter(Boolean);
  const cat = options.cat;
  const cover = options.cover;
  const date = options.date || formatNow(options.tz);
  let slug = options.slug || slugify(title);
  if (!slug) slug = 'post-' + formatNow(options.tz).replace(/[^\d]/g, '');

  if (!cat) {
    console.error('[new-post] 需要通过 --cat 指定分类名称（如 --cat "工程实践"）。');
    process.exit(1);
  }

  const year = date.slice(0, 4);
  const columnDir = resolveColumnDir(cat);
  const outDir = columnDir ? path.join(BLOG_DIR, columnDir) : path.join(BLOG_DIR, year);
  const outFile = path.join(outDir, ${slug}.md);

  ensureDir(outDir);

  if (fs.existsSync(outFile)) {
    console.error([new-post] 已存在：${outFile});
    process.exit(1);
  }

  const fm = [
    '---',
    title: "${escapeYaml(title)}",
    date: "${date}",
    description: "${escapeYaml(desc)}",
    tags: [${tags.join(', ')}],
    categories: [${cat}],
    cover ? cover: "${escapeYaml(cover)}" : null,
    'publish: true',
    'top: 1',
    '---',
    '',
    '> 写点什么吧……',
    ''
  ].filter(Boolean).join('\n');

  fs.writeFileSync(outFile, fm, 'utf8');
  console.log([new-post] 已创建：${outFile});