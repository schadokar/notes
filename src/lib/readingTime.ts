import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

const WORDS_PER_MINUTE = 200;

export function readingTimeRemarkPlugin() {
	return (tree: Root, file: any) => {
		let wordCount = 0;

		visit(tree, 'text', (node) => {
			wordCount += node.value.split(/\s+/).length;
		});

		const readingTime = Math.ceil(wordCount / WORDS_PER_MINUTE);
		file.data.astro.frontmatter.readingTime = readingTime;
	};
}
