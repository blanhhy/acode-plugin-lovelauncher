import fs from 'node:fs/promises';
import { createWriteStream, createReadStream } from "node:fs";
import path from 'node:path';
import archiver from 'archiver';
import { pipeline } from 'node:stream/promises';

const ROOT = process.cwd();
const licenseCache = new Map();
const MAX_PRICE = 10000;
const MIN_PRICE = 0;

export default function BuildPlugin(plugin) {
  return {
    name: 'build-plugin',
    setup(build) {
      build.onEnd(async result => {
        if (result.errors.length > 0) return;
        await startBuild(plugin);
      });
    }
  }
}

async function startBuild(plugin) {
  if (!plugin.output) {
    plugin.output = path.join(plugin.outdir || 'dist', plugin.outfile || 'main.js');
  }
  const OUTDIR_PATH = path.dirname(plugin.output);
  const OUTFILE_PATH = path.basename(plugin.output);

  plugin.outdir = OUTDIR_PATH;
  plugin.outfile = OUTFILE_PATH;
  plugin.main = OUTFILE_PATH;
  delete plugin.entry;
  delete plugin.output;

  // Parallel file operations
  const [icon, readme, changelog, license] = await Promise.all([
    plugin.icon ? copyFile(plugin.icon, OUTDIR_PATH) : null,
    plugin.readme ? copyFile(plugin.readme, OUTDIR_PATH) : null,
    plugin.changelog ? copyFile(plugin.changelog, OUTDIR_PATH) : null,
    plugin.license ? handleLicense(plugin.license, OUTDIR_PATH, plugin.author.name) : null
  ]);

  if (icon) plugin.icon = icon;
  if (readme) plugin.readme = readme;
  if (changelog) plugin.changelog = changelog;
  if (license) plugin.license = license;

  // copy assets
  if (plugin.files) plugin.files = await copyDir(plugin.files, OUTDIR_PATH);

  // price validation
  plugin.price = Math.max(MIN_PRICE, Math.min(MAX_PRICE, plugin.price));

  // repository
  if (plugin.repository && plugin.price !== MIN_PRICE) {
    console.error(`Repository is only require when plugin is free, deleting it...`);
    delete plugin.repository;
  } else if (!plugin.repository && plugin.price === MIN_PRICE) {
    console.error(`Repository is required because the plugin is free (open source)`);
  }

  // author
  if (!plugin.author.name) console.error("Author name is required");

  // zip name
  const zipName = (plugin.zip ?? "plugin.zip")
    .replace("{id}", plugin.id)
    .replace("{name}", plugin.name)
    .replace("{version}", plugin.version)
    .replace("{price}", plugin.price)
    .replace("{author}", plugin.author.name)
    .replace("{license}", plugin.license)
    .replace("{github}", plugin.author.github);
  delete plugin.zip;

  const pluginJson = JSON.stringify(plugin);
  const pluginInjection = `(()=>{const PLUGIN = ${pluginJson};`;
  const outfilePath = path.join(ROOT, OUTDIR_PATH, OUTFILE_PATH);

  await Promise.all([
    fs.writeFile(path.join(ROOT, OUTDIR_PATH, "plugin.json"), pluginJson),
    fs.readFile(outfilePath, "utf8").then(buildFile => 
      fs.writeFile(outfilePath, buildFile.replace("(()=>{", pluginInjection))
    )
  ]);

  // zip
  await createZipArchive(OUTDIR_PATH, zipName);
}

async function handleLicense(licensePath, outDir, authorName) {
  const licenseKey = licensePath.toLowerCase();
  try {
    const copiedPath = await copyFile(licensePath, outDir);
    const licenseContent = await fs.readFile(path.join(ROOT, copiedPath), "utf8");
    return extractLicenseType(licenseContent);
  } catch (e) {
    let licenseContent = await getLicense(licenseKey);
    if (licenseContent) {
      const licenseType = extractLicenseType(licenseContent);
      licenseContent = licenseContent
        .replace("[fullname]", authorName)
        .replace("[year]", new Date().getFullYear());
      await fs.writeFile(path.join(ROOT, outDir, "LICENSE"), licenseContent);
      return licenseType;
    }
  }
  return null;
}

function extractLicenseType(content) {
  const firstLine = content.split("\n", 1)[0];
  const parts = firstLine.split(" ");
  parts.pop();
  return parts.join(" ").toUpperCase();
}

async function getLicense(license) {
  if (licenseCache.has(license)) return licenseCache.get(license);
  try {
    const res = await fetch(`https://raw.githubusercontent.com/github/choosealicense.com/gh-pages/_licenses/${license}.txt`);
    if (!res.ok) return null;
    const text = await res.text();
    const content = text.slice(text.lastIndexOf("---")).trim();
    licenseCache.set(license, content);
    return content;
  } catch (err) {
    console.error('Error fetching license:', err.message);
    return null;
  }
}

async function createZipArchive(sourceDir, zipFileName) {
  const tempFileName = zipFileName + '.tmp';
  return new Promise((resolve, reject) => {
    const output = createWriteStream(tempFileName);
    const archive = archiver('zip', {
      zlib: { level: 6 },
      statConcurrency: 10
    });
    output.on('close', () => {
      fs.rename(tempFileName, zipFileName).then(() => {
        console.log(`📦 Created ${zipFileName} (${archive.pointer()} bytes)`);
        resolve();
      }).catch(reject);
    });
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// utils
async function copyFile(src, dist) {
  const absoluteSrc = path.resolve(src);
  await fs.access(absoluteSrc);
  const relativePath = path.relative(ROOT, absoluteSrc);
  const targetPath = path.join(dist, relativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await pipeline(
    createReadStream(absoluteSrc),
    createWriteStream(targetPath)
  );
  return relativePath;
}

async function copyDir(dir, dist) {
  const tasks = dir.map(async (src) => {
    const absoluteSrc = path.resolve(src);
    const stat = await fs.stat(absoluteSrc);
    if (stat.isFile()) {
      return await copyFile(absoluteSrc, dist);
    } else {
      const entries = await fs.readdir(absoluteSrc);
      const childs = entries.map(name => path.join(absoluteSrc, name));
      return await copyDir(childs, dist);
    }
  });
  return (await Promise.all(tasks)).flat();
}
