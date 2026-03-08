#!/usr/bin/env node
/**
 * generate-metadata.mjs
 *
 * Uses Claude's vision API to generate titles and descriptions for photos,
 * then merges the results into gallery.yaml.
 *
 * Usage:
 *   node generate-metadata.mjs <local-folder> <album-name>
 *
 * Example:
 *   node generate-metadata.mjs ~/Pictures/France france
 *
 * Requires:
 *   ANTHROPIC_API_KEY environment variable to be set.
 *
 * Options:
 *   --featured   Mark all images in this batch as featured
 *   --dry-run    Print generated entries without writing to gallery.yaml
 */

import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import * as yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const GALLERY_PATH = 'src/gallery/gallery.yaml';
const MAX_IMAGE_PX = 1024; // longest edge sent to Claude — keeps cost low

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));

if (args.length < 2) {
	console.error(
		'Usage: node generate-metadata.mjs <local-folder> <album-name> [--featured] [--dry-run]',
	);
	process.exit(1);
}

const [localFolder, albumName] = args;
const isFeatured = flags.has('--featured');
const isDryRun = flags.has('--dry-run');

if (!process.env.ANTHROPIC_API_KEY) {
	console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
	process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const client = new Anthropic();

async function resizeToBase64(imagePath) {
	const buffer = await sharp(imagePath)
		.resize(MAX_IMAGE_PX, MAX_IMAGE_PX, { fit: 'inside', withoutEnlargement: true })
		.jpeg({ quality: 85 })
		.toBuffer();
	return buffer.toString('base64');
}

async function generateMetadata(imagePath) {
	const base64 = await resizeToBase64(imagePath);
	const filename = path.basename(imagePath);

	const message = await client.messages.create({
		model: 'claude-haiku-4-5',
		max_tokens: 150,
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'image',
						source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
					},
					{
						type: 'text',
						text: `You are captioning photographs for a photography portfolio.
Look at this photo and respond with ONLY a JSON object in this exact format:
{"title": "...", "description": "..."}

Rules:
- title: short, evocative, 2–5 words, no punctuation at end
- description: one sentence, specific to what you see, suitable as a gallery caption
- Do not include the filename or album name in your response`,
					},
				],
			},
		],
	});

	try {
		const raw = message.content[0].text.trim();
		// Strip markdown code fences if present (```json ... ``` or ``` ... ```)
		const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
		return JSON.parse(cleaned);
	} catch {
		console.warn(`  ⚠ Could not parse response for ${filename}, using fallback.`);
		return { title: path.parse(filename).name, description: '' };
	}
}

function loadGallery() {
	if (!fs.existsSync(GALLERY_PATH)) return { collections: [], images: [] };
	return yaml.load(fs.readFileSync(GALLERY_PATH, 'utf8'));
}

function saveGallery(gallery) {
	fs.writeFileSync(GALLERY_PATH, yaml.dump(gallery, { lineWidth: 120, quotingType: '"' }), 'utf8');
}

function existingFiles(gallery) {
	return new Set((gallery.images || []).map((img) => img.file).filter(Boolean));
}

function ensureCollection(gallery, id, name) {
	if (!gallery.collections) gallery.collections = [];
	if (!gallery.collections.find((c) => c.id === id)) {
		gallery.collections.push({ id, name: name.charAt(0).toUpperCase() + name.slice(1) });
	}
}

// ── Main ──────────────────────────────────────────────────────────────────────

const resolvedFolder = localFolder.startsWith('~')
	? localFolder.replace('~', process.env.HOME)
	: path.resolve(localFolder);

if (!fs.existsSync(resolvedFolder)) {
	console.error(`Error: folder not found: ${resolvedFolder}`);
	process.exit(1);
}

const imageFiles = fs
	.readdirSync(resolvedFolder)
	.filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
	.sort();

if (imageFiles.length === 0) {
	console.error(`No images found in ${resolvedFolder}`);
	process.exit(1);
}

const gallery = loadGallery();
const already = existingFiles(gallery);
const toProcess = imageFiles.filter((f) => !already.has(`${albumName}/${f}`));

console.log(`\nFound ${imageFiles.length} image(s), ${toProcess.length} new to process.\n`);

if (toProcess.length === 0) {
	console.log('Nothing to do — all images are already in gallery.yaml.');
	process.exit(0);
}

ensureCollection(gallery, albumName, albumName);

const newEntries = [];

for (const [i, filename] of toProcess.entries()) {
	const imagePath = path.join(resolvedFolder, filename);
	const fileKey = `${albumName}/${filename}`;
	process.stdout.write(`  [${i + 1}/${toProcess.length}] ${filename} … `);

	const { title, description } = await generateMetadata(imagePath);
	console.log(`"${title}"`);

	const collections = isFeatured ? ['featured', albumName] : [albumName];
	newEntries.push({ file: fileKey, meta: { title, description, collections }, exif: {} });
}

console.log(`\nGenerated ${newEntries.length} entries.\n`);

if (isDryRun) {
	console.log('--- DRY RUN: gallery.yaml entries ---\n');
	console.log(yaml.dump({ images: newEntries }, { lineWidth: 120, quotingType: '"' }));
	console.log('--- End dry run (gallery.yaml not modified) ---');
} else {
	if (!gallery.images) gallery.images = [];
	gallery.images.push(...newEntries);
	saveGallery(gallery);
	console.log(`✓ gallery.yaml updated with ${newEntries.length} new entry/entries.`);
	console.log('  Review titles/descriptions, then: git add src/gallery/gallery.yaml && git push');
}
