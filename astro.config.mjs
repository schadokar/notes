// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'My Docs',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
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
		}),
	],
});
