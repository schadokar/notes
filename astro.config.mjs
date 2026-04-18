// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import expressiveCode from 'astro-expressive-code';
import { readingTimeRemarkPlugin } from './src/lib/readingTime.ts';
import starlightViewModes from 'starlight-view-modes';
import './src/styles/zen-mode.css';

// https://astro.build/config
export default defineConfig({
	markdown: {
		remarkPlugins: [readingTimeRemarkPlugin],
	},
	integrations: [
		expressiveCode({
			themes: ['github-light', 'github-dark'],
			styleOverrides: {
				borderRadius: '0.5rem',
				codeFontSize: '0.875rem',
			},
		}),
		mermaid(), // ⚠️ Must come BEFORE starlight
		starlight({
			title: 'Schadokar Notes',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/schadokar/schadokar-notes' }],
			sidebar: [
				{
					label: 'Design Patterns',
					autogenerate: { directory: 'design-patterns' },
				},
				{
					label: 'Distributed Systems',
					autogenerate: { directory: 'distributed-systems' },
				},
				{
					label: 'Notes',
					autogenerate: { directory: 'notes' },
				},
			],
			lastUpdated: true,
			plugins: [starlightViewModes()],
			components: {
				Header: './src/components/header/ZenModeHeader.astro',
			},
		}),
	],
});
