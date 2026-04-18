import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				series: z.string().optional(),
				order: z.number().optional(),
				category: z.string().optional(),
				tags: z.array(z.string()).optional(),
				difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
				readingTime: z.number().optional(),
				date: z.string().optional(),
				lastModified: z.string().optional(),
			}),
		}),
	}),
};
