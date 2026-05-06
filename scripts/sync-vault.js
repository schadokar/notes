#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vaultPath = process.env.VAULT_PATH || path.join(os.homedir(), 'work/obsidian/upskill/raw/research');
const docsDir = path.join(__dirname, '../src/content/docs');

// Files to skip during sync (by filename)
const skipFiles = new Set(['CLAUDE.md']);

// Series slug mapping
const seriesSlugMap = {
	'Design Patterns Deep Dive': 'design-patterns',
	'Distributed Systems Deep Dive': 'distributed-systems',
};

// Utility: slugify string
function slugify(str) {
	return str
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}

// Utility: get all markdown files recursively
function getAllMarkdownFiles(dir) {
	const files = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		// Skip writing-setup and hidden dirs
		if (entry.name.startsWith('.') || entry.name === 'writing-setup') {
			continue;
		}

		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...getAllMarkdownFiles(fullPath));
		} else if (entry.name.endsWith('.md')) {
			files.push(fullPath);
		}
	}

	return files;
}

// Utility: clean a directory (remove all files and subdirs)
function cleanDir(dir) {
	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	fs.mkdirSync(dir, { recursive: true });
}

// Transform frontmatter: keep specific fields, drop others, map order → sidebar.order
function transformFrontmatter(data) {
	const allowed = [
		'title',
		'description',
		'date',
		'lastModified',
		'series',
		'order',
		'category',
		'tags',
		'difficulty',
		'readingTime',
	];

	const transformed = {};
	for (const key of allowed) {
		if (key in data) {
			transformed[key] = data[key];
		}
	}

	// Map order to sidebar.order
	if (transformed.order !== undefined) {
		transformed.sidebar = { order: transformed.order };
	}

	return transformed;
}

// Main sync function
function sync() {
	console.log(`\nSyncing vault from: ${vaultPath}`);

	if (!fs.existsSync(vaultPath)) {
		console.error(`Error: Vault path not found: ${vaultPath}`);
		process.exit(1);
	}

	const files = getAllMarkdownFiles(vaultPath);
	console.log(`Found ${files.length} markdown files\n`);

	// Clean all destination dirs
	cleanDir(path.join(docsDir, 'design-patterns'));
	cleanDir(path.join(docsDir, 'distributed-systems'));
	cleanDir(path.join(docsDir, 'notes'));

	let copied = 0;
	let skipped = 0;
	let fallbackToNotes = 0;

	// Process each file
	for (const filePath of files) {
		const content = fs.readFileSync(filePath, 'utf-8');
		const { data, content: body } = matter(content);

		// Skip listed files
		if (skipFiles.has(path.basename(filePath))) {
			skipped++;
			console.log(`⊘ SKIP (excluded): ${path.basename(filePath)}`);
			continue;
		}

		// Skip draft files
		if (data.draft === true) {
			skipped++;
			console.log(`⊘ SKIP (draft): ${path.basename(filePath)}`);
			continue;
		}

		// Transform frontmatter
		const transformed = transformFrontmatter(data);

		// Determine destination folder based on series
		let seriesSlug = null;
		if (data.series) {
			seriesSlug = seriesSlugMap[data.series];
		}

		if (!seriesSlug) {
			seriesSlug = 'notes';
			fallbackToNotes++;
		}

		// For design-patterns, use category as subfolder; for others, use series root
		let destDir;
		if (seriesSlug === 'design-patterns' && data.category) {
			const categorySlug = slugify(data.category);
			destDir = path.join(docsDir, seriesSlug, categorySlug);
		} else {
			destDir = path.join(docsDir, seriesSlug);
		}

		fs.mkdirSync(destDir, { recursive: true });

		// Reconstruct file with transformed frontmatter
		let frontmatterStr = '---\n';
		for (const [key, value] of Object.entries(transformed)) {
			if (key === 'tags' && Array.isArray(value)) {
				frontmatterStr += `${key}:\n`;
				for (const tag of value) {
					frontmatterStr += `  - ${tag}\n`;
				}
			} else if (key === 'sidebar') {
				frontmatterStr += `${key}:\n`;
				for (const [sidebarKey, sidebarValue] of Object.entries(value)) {
					frontmatterStr += `  ${sidebarKey}: ${sidebarValue}\n`;
				}
			} else if (typeof value === 'string') {
				frontmatterStr += `${key}: "${value}"\n`;
			} else {
				frontmatterStr += `${key}: ${value}\n`;
			}
		}
		frontmatterStr += '---\n';

		// Remove first h1 heading
		let processedBody = body.replace(/^\n*# .+\n+/, '');

		const newContent = frontmatterStr + processedBody;
		const destPath = path.join(destDir, path.basename(filePath));

		fs.writeFileSync(destPath, newContent, 'utf-8');
		copied++;
		console.log(`✓ ${seriesSlug}/${path.basename(destDir) !== seriesSlug ? path.basename(destDir) + '/' : ''}${path.basename(filePath)}`);
	}

	console.log(`\n--- Summary ---`);
	console.log(`Copied: ${copied}`);
	console.log(`Skipped (draft): ${skipped}`);
	if (fallbackToNotes > 0) {
		console.log(`Fallback to /notes: ${fallbackToNotes}`);
	}
	console.log(`Total: ${files.length}\n`);
}

sync();
