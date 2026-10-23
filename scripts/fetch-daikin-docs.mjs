#!/usr/bin/env node
/**
 * Fetch Daikin Onecta API documentation from the Kong Developer Portal.
 * Requires a one-time interactive login (session persisted in .playwright-daikin/).
 *
 * Usage: yarn fetch-daikin-docs
 */

import { chromium } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORTAL_BASE = 'https://developer.cloud.daikineurope.com';
const USER_DATA_DIR = join(ROOT, '.playwright-daikin');
const OUTPUT_DIR = join(ROOT, '.daikin-api-docs');
const RAW_DIR = join(OUTPUT_DIR, '_raw');
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

function slugify(value) {
  return String(value ?? 'untitled')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'untitled';
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function saveJson(path, data) {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(data, null, 2), 'utf8');
}

async function saveText(path, text) {
  await ensureDir(dirname(path));
  await writeFile(path, text, 'utf8');
}

async function saveRaw(name, data) {
  await saveJson(join(RAW_DIR, name), data);
}

function extractDocumentSlug(doc, docDetail) {
  const candidates = [
    docDetail?.slug,
    docDetail?.path,
    doc?.slug,
    doc?.path,
    docDetail?.title,
    doc?.title,
    doc?.name,
    doc?.id,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      const cleaned = c.replace(/^\/+/, '').split('/').pop();
      if (cleaned && !/^[0-9a-f-]{36}$/i.test(cleaned)) {
        return slugify(cleaned);
      }
    }
  }
  return slugify(doc?.id ?? docDetail?.id ?? 'document');
}

function extractDocumentContent(docDetail) {
  if (typeof docDetail?.content === 'string') return docDetail.content;
  if (typeof docDetail?.body === 'string') return docDetail.body;
  if (typeof docDetail?.markdown === 'string') return docDetail.markdown;
  if (typeof docDetail?.text === 'string') return docDetail.text;
  if (docDetail?.data?.content) return String(docDetail.data.content);
  return null;
}

async function apiGet(request, path, options = {}) {
  const url = path.startsWith('http') ? path : `${PORTAL_BASE}${path}`;
  const response = await request.get(url, {
    headers: options.headers,
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _rawText: text };
  }
  if (!response.ok()) {
    const err = new Error(`HTTP ${response.status()} for ${url}`);
    err.status = response.status();
    err.body = json;
    throw err;
  }
  return json;
}

function relOutput(path) {
  return relative(OUTPUT_DIR, path).replace(/\\/g, '/');
}

async function isAuthenticated(request) {
  try {
    await apiGet(request, '/api/v2/developer/me');
    return true;
  } catch (err) {
    return err.status !== 401 && err.status !== 403 ? Promise.reject(err) : false;
  }
}

async function waitForAuthentication(page, request) {
  console.log('Connexion requise au portail Daikin Developer.');
  console.log('Connectez-vous dans la fenêtre Chromium avec votre compte Onecta…');

  await page.goto(`${PORTAL_BASE}/`, { waitUntil: 'domcontentloaded' });

  const deadline = Date.now() + LOGIN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isAuthenticated(request)) {
      console.log('Session authentifiée.');
      return;
    }
    await page.waitForTimeout(2000);
  }
  throw new Error(`Timeout après ${LOGIN_TIMEOUT_MS / 1000}s — login non détecté.`);
}

async function fetchProducts(request) {
  const data = await apiGet(request, '/api/v2/products');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

async function fetchProductVersions(request, productId) {
  try {
    const data = await apiGet(request, `/api/v2/products/${productId}/versions`);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  } catch (err) {
    console.warn(`  Versions indisponibles pour ${productId}: ${err.message}`);
    await saveRaw(`versions-error-${productId}.json`, err.body ?? { message: err.message });
    return [];
  }
}

async function fetchProductDocuments(request, productId) {
  try {
    const data = await apiGet(request, `/api/v2/products/${productId}/documents`, {
      headers: { Accept: 'application/vnd.konnect.document-tree+json' },
    });
    return flattenDocumentTree(data);
  } catch (err) {
    console.warn(`  Documents indisponibles pour ${productId}: ${err.message}`);
    await saveRaw(`documents-error-${productId}.json`, err.body ?? { message: err.message });
    return [];
  }
}

function flattenDocumentTree(node, acc = []) {
  if (!node) return acc;
  if (Array.isArray(node)) {
    for (const item of node) flattenDocumentTree(item, acc);
    return acc;
  }
  if (typeof node === 'object') {
    const id = node.id ?? node.document_id;
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    if (id && (node.type === 'document' || node.content || node.body || node.markdown || !hasChildren)) {
      acc.push(node);
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) flattenDocumentTree(child, acc);
    }
    if (Array.isArray(node.data)) {
      for (const child of node.data) flattenDocumentTree(child, acc);
    }
    if (Array.isArray(node.documents)) {
      for (const child of node.documents) flattenDocumentTree(child, acc);
    }
  }
  return acc;
}

async function downloadVersions(request, productId, productName, manifest) {
  const versions = await fetchProductVersions(request, productId);
  console.log(`  ${versions.length} version(s) API`);

  for (const version of versions) {
    const versionId = version.id ?? version.version_id;
    if (!versionId) continue;

    const versionLabel = version.name ?? version.version ?? versionId;
    const entry = {
      productId,
      productName,
      versionId,
      versionLabel,
      files: [],
    };

    try {
      const spec = await apiGet(
        request,
        `/api/v2/products/${productId}/versions/${versionId}/spec`,
      );
      const specPath = join(OUTPUT_DIR, 'openapi', productId, `${versionId}.json`);
      await saveJson(specPath, spec);
      entry.files.push(relOutput(specPath));
      console.log(`    spec → openapi/${productId}/${versionId}.json`);
    } catch (err) {
      console.warn(`    spec échec: ${err.message}`);
      await saveRaw(`spec-error-${productId}-${versionId}.json`, err.body ?? { message: err.message });
    }

    try {
      const operations = await apiGet(
        request,
        `/api/v2/products/${productId}/versions/${versionId}/spec/operations`,
      );
      const opsPath = join(OUTPUT_DIR, 'openapi', productId, `${versionId}-operations.json`);
      await saveJson(opsPath, operations);
      entry.files.push(relOutput(opsPath));
      console.log(`    operations → openapi/${productId}/${versionId}-operations.json`);
    } catch (err) {
      console.warn(`    operations échec: ${err.message}`);
      await saveRaw(`operations-error-${productId}-${versionId}.json`, err.body ?? { message: err.message });
    }

    manifest.versions.push(entry);
  }
}

async function downloadDocuments(request, productId, productName, manifest) {
  const documents = await fetchProductDocuments(request, productId);
  console.log(`  ${documents.length} document(s) guide`);

  const usedSlugs = new Set();

  for (const doc of documents) {
    const docId = doc.id ?? doc.document_id;
    if (!docId) continue;

    let docDetail = doc;
    try {
      docDetail = await apiGet(request, `/api/v2/products/${productId}/documents/${docId}`, {
        headers: { Accept: 'application/json' },
      });
    } catch (err) {
      console.warn(`    document ${docId} détail échec: ${err.message}`);
      await saveRaw(`document-error-${productId}-${docId}.json`, err.body ?? { message: err.message });
    }

    let slug = extractDocumentSlug(doc, docDetail);
    if (usedSlugs.has(slug)) {
      slug = `${slug}_${docId.slice(0, 8)}`;
    }
    usedSlugs.add(slug);

    const content = extractDocumentContent(docDetail);
    const mdPath = join(OUTPUT_DIR, 'guides', productId, `${slug}.md`);

    if (content) {
      const title = docDetail?.title ?? doc?.title ?? doc?.name ?? slug;
      const header = `# ${title}\n\n> Source: ${PORTAL_BASE}/docs/${productId}/${slug}\n> Document ID: ${docId}\n\n`;
      await saveText(mdPath, header + content);
      console.log(`    guide → guides/${productId}/${slug}.md`);
    } else {
      const fallbackPath = join(OUTPUT_DIR, 'guides', productId, `${slug}.json`);
      await saveJson(fallbackPath, docDetail);
      console.log(`    guide (JSON fallback) → guides/${productId}/${slug}.json`);
      manifest.guides.push({
        productId,
        productName,
        docId,
        slug,
        file: relOutput(fallbackPath),
        format: 'json',
      });
      continue;
    }

    manifest.guides.push({
      productId,
      productName,
      docId,
      slug,
      file: relOutput(mdPath),
      format: 'markdown',
    });
  }
}

async function writeReadme(manifest) {
  const readme = `# Daikin Onecta API — documentation locale

Documentation extraite automatiquement du [Daikin Developer Portal](${PORTAL_BASE}/).

**Usage local uniquement** — ne pas committer (voir Daikin Developer Terms of Service).

## Rafraîchir

\`\`\`bash
yarn fetch-daikin-docs
\`\`\`

## Structure

- \`manifest.json\` — inventaire de l'extraction
- \`openapi/{productId}/\` — specs OpenAPI et opérations
- \`guides/{productId}/\` — guides markdown
- \`_raw/\` — réponses brutes en cas d'erreur de parsing

## Dernière extraction

- Date : ${manifest.extractedAt}
- Produits : ${manifest.products.length}
- Versions : ${manifest.versions.length}
- Guides : ${manifest.guides.length}
`;
  await saveText(join(OUTPUT_DIR, 'README.md'), readme);
}

async function main() {
  console.log('Extraction documentation Daikin Onecta API\n');

  await ensureDir(OUTPUT_DIR);
  await ensureDir(RAW_DIR);

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    const request = context.request;

    if (!(await isAuthenticated(request))) {
      await waitForAuthentication(page, request);
    } else {
      console.log('Session existante réutilisée.');
    }

    const products = await fetchProducts(request);
    console.log(`\n${products.length} produit(s) trouvé(s)\n`);

    const manifest = {
      extractedAt: new Date().toISOString(),
      portalBase: PORTAL_BASE,
      products: [],
      versions: [],
      guides: [],
    };

    for (const product of products) {
      const productId = product.id ?? product.product_id;
      if (!productId) continue;

      const productName = product.name ?? product.title ?? productId;
      console.log(`Produit: ${productName} (${productId})`);

      manifest.products.push({
        id: productId,
        name: productName,
        sourceUrl: `${PORTAL_BASE}/docs/${productId}/introduction`,
      });

      await downloadVersions(request, productId, productName, manifest);
      await downloadDocuments(request, productId, productName, manifest);
    }

    await saveJson(join(OUTPUT_DIR, 'manifest.json'), manifest);
    await writeReadme(manifest);

    console.log('\nExtraction terminée.');
    console.log(`Sortie: ${OUTPUT_DIR}`);
    console.log(`  - ${manifest.versions.length} version(s) API`);
    console.log(`  - ${manifest.guides.length} guide(s)`);
  } finally {
    await context.close();
  }
}

main().catch((err) => {
  console.error('\nErreur:', err.message);
  if (err.body) {
    console.error(JSON.stringify(err.body, null, 2));
  }
  process.exit(1);
});
