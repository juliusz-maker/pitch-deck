#!/usr/bin/env node
/**
 * Multi-deck build system.
 *
 * Reads YAML manifests from content/decks/, concatenates
 * head.html + slides + tail variant, and writes output files.
 *
 * Each manifest specifies:
 *   title:    HTML <title>
 *   tail:     "full" (main deck with nav/tracking) or "minimal" (standalone)
 *   output:   filename in content/ (e.g. page.html)
 *   sections: slide groups with names and slide slugs
 *
 * Usage:
 *   node build.js              # build all decks
 *   node build.js main         # build only content/decks/main.yaml
 */
const { readFileSync, writeFileSync, readdirSync } = require('fs');
const { join, basename } = require('path');

const dir = join(__dirname, 'content');
const decksDir = join(dir, 'decks');

// --- Simple YAML parser (no deps) ---
function parseManifest(yamlText) {
  const result = { title: '', tail: 'full', output: '', sections: [] };
  let current = null;

  for (const line of yamlText.split('\n')) {
    const titleMatch = line.match(/^title:\s*"?(.+?)"?\s*$/);
    if (titleMatch) { result.title = titleMatch[1]; continue; }

    const tailMatch = line.match(/^tail:\s*(\w+)/);
    if (tailMatch) { result.tail = tailMatch[1]; continue; }

    const outputMatch = line.match(/^output:\s*(.+)/);
    if (outputMatch) { result.output = outputMatch[1].trim(); continue; }

    const nameMatch = line.match(/^\s+- name:\s*(.+)/);
    if (nameMatch) {
      current = { name: nameMatch[1].trim(), slides: [] };
      result.sections.push(current);
      continue;
    }

    const slideMatch = line.match(/^\s+- ([a-z0-9-]+)/);
    if (slideMatch && current) {
      current.slides.push(slideMatch[1]);
    }
  }
  return result;
}

// --- Determine which decks to build ---
const filterName = process.argv[2]; // optional: "main", "unit-economics", etc.
const manifests = readdirSync(decksDir)
  .filter(f => f.endsWith('.yaml'))
  .filter(f => !filterName || basename(f, '.yaml') === filterName);

if (manifests.length === 0) {
  console.error(`No manifests found${filterName ? ` matching "${filterName}"` : ''}`);
  process.exit(1);
}

// --- Read shared parts ---
const head = readFileSync(join(dir, 'head.html'), 'utf8');
const tails = {
  full: readFileSync(join(dir, 'tail.html'), 'utf8'),
};

// Load minimal tail if it exists
try {
  tails.minimal = readFileSync(join(dir, 'tail-minimal.html'), 'utf8');
} catch (e) {
  // tail-minimal.html is optional
}

// --- Build each deck ---
const results = [];

for (const file of manifests) {
  const yaml = readFileSync(join(decksDir, file), 'utf8');
  const manifest = parseManifest(yaml);
  const deckName = basename(file, '.yaml');

  // Read slides
  let slidesHtml = '';
  let slideCount = 0;
  for (const section of manifest.sections) {
    for (const slug of section.slides) {
      slidesHtml += readFileSync(join(dir, 'slides', `${slug}.html`), 'utf8');
      slideCount++;
    }
  }

  // Select tail
  const tail = tails[manifest.tail] || tails.full;

  // Inject title into head
  let deckHead = head.replace(
    /<title>.*?<\/title>/,
    `<title>${manifest.title}</title>`
  );

  // Assemble
  let output = deckHead + slidesHtml;

  if (manifest.tail === 'full') {
    // Generate groups/sectionNames JS for main deck nav
    const groups = [];
    const names = {};
    for (let i = 0; i < manifest.sections.length; i++) {
      names[i] = manifest.sections[i].name;
      for (let j = 0; j < manifest.sections[i].slides.length; j++) {
        groups.push(i);
      }
    }

    const commentParts = Object.entries(names).map(([k, v]) => `${k}:${v}`);
    const commentLine1 = commentParts.slice(0, 5).join(' | ');
    const commentLine2 = commentParts.slice(5).join(' | ');

    const groupsJs = [
      `  // ${commentLine1}`,
      `  // ${commentLine2}`,
      `  var groups = [${groups.join(', ')}];`,
    ].join('\n');

    const nameEntries = Object.entries(names);
    const nameLine1 = nameEntries.slice(0, 5).map(([k, v]) => `${k}: '${v}'`).join(', ');
    const nameLine2 = nameEntries.slice(5).map(([k, v]) => `${k}: '${v}'`).join(', ');

    const sectionNamesJs = [
      '  var sectionNames = {',
      `    ${nameLine1},`,
      `    ${nameLine2}`,
      '  };',
    ].join('\n');

    output += tail
      .replace('/*__SLIDE_GROUPS__*/', groupsJs)
      .replace('/*__SECTION_NAMES__*/', sectionNamesJs);
  } else {
    output += tail;
  }

  const outputPath = join(dir, manifest.output);
  writeFileSync(outputPath, output);
  results.push({ name: deckName, output: manifest.output, bytes: output.length, slides: slideCount });
}

// --- Report ---
for (const r of results) {
  console.log(`Built content/${r.output} (${r.bytes} bytes, ${r.slides} slides) [${r.name}]`);
}
