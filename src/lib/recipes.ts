import type { Component } from 'astro/types';
import { collections, readRecipeMetadata, type RecipeMetadata } from './recipe-metadata';
export { collections, recipeTypes } from './recipe-metadata';
export type { CollectionId, RecipeCategory, RecipeType } from './recipe-metadata';

type RecipeModule = { Content: Component; frontmatter?: Record<string, unknown> };
export type RecipeFile = RecipeMetadata & { id: string; filePath: string; module: RecipeModule; title: string };
export type DirectoryItem = { title: string; description?: string; recipe?: RecipeFile };
export type DirectorySection = { title: string; level: number; items: DirectoryItem[] };

const modules = import.meta.glob('../content/recipes/**/*.md', { eager: true }) as Record<string, RecipeModule>;
const files = Object.entries(modules).filter(([key]) => !key.includes('/moc/')).map(([key, module]) => {
	const filePath = key.replace(/^\.\.\/content\/recipes\//, '').replaceAll('\\', '/');
	const title = typeof module.frontmatter?.title === 'string' ? module.frontmatter.title : filePath.split('/').at(-1)!.replace(/\.md$/, '');
	const metadata = readRecipeMetadata(filePath, module.frontmatter);
	return { id: metadata.slug + '.md', filePath, module, title, ...metadata };
});

const slugs = new Set<string>();
for (const file of files) {
	const key = file.slug.normalize('NFC').toLowerCase();
	if (slugs.has(key)) throw new Error('[recipes] 重复的静态页面 slug：' + file.slug);
	slugs.add(key);
}

const normalize = (value: string) => decodeURIComponent(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/^\//, '').replace(/\.md$/i, '');

function resolveTarget(target: string, sourceLine: string): RecipeFile | undefined {
	const cleanTarget = normalize(target.split('#')[0].split('?')[0]);
	const exact = files.filter((file) => normalize(file.filePath) === cleanTarget);
	if (exact.length === 1) return exact[0];
	const shortName = cleanTarget.split('/').at(-1);
	const matches = files.filter((file) => normalize(file.filePath).split('/').at(-1) === shortName);
	if (matches.length > 1) throw new Error(`MOC 中的链接存在歧义：${sourceLine}\n匹配到：${matches.map((file) => file.filePath).join('、')}`);
	if (matches.length === 1) return matches[0];
	console.warn(`[recipes] MOC 链接未找到：${target}`);
}

function parseItem(line: string): DirectoryItem | undefined {
	const markdown = line.match(/^\s*[-*]\s+\[([^\]]+)\]\(([^)]+)\)(?:\s+-\s*(.*))?\s*$/);
	if (markdown) return { title: markdown[1].trim(), description: markdown[3]?.trim(), recipe: resolveTarget(markdown[2], line) };
	const wiki = line.match(/^\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*$/);
	if (wiki) return { title: (wiki[2] || wiki[1].split('/').at(-1)!).trim(), recipe: resolveTarget(wiki[1], line) };
}

const mocModules = import.meta.glob('../content/recipes/moc/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const moc = Object.entries(mocModules).find(([key]) => key.endsWith('/菜谱目录.md'))?.[1];
if (!moc) throw new Error('找不到 src/content/recipes/moc/菜谱目录.md');

export function parseDirectory(source = moc): DirectorySection[] {
	const sections: DirectorySection[] = [];
	let current: DirectorySection = { title: '未分类', level: 0, items: [] };
	sections.push(current);
	for (const line of source.split(/\r?\n/)) {
		const heading = line.match(/^(#{2,6})\s+(.+?)\s*#*\s*$/);
		if (heading) { current = { title: heading[2].trim(), level: heading[1].length, items: [] }; sections.push(current); continue; }
		const item = parseItem(line);
		if (item) current.items.push(item);
	}
	return sections.filter((section) => section.items.length > 0);
}

export const directory = parseDirectory();
export const recipes = files;
export function recipeUrl(recipe: Pick<RecipeFile, 'slug'>) { const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`; return `${base}recipes/${recipe.slug.split('/').map(encodeURIComponent).join('/')}/`; }

// Serializable metadata for future UI; Markdown components remain server-side.
const directoryItems = new Map(directory.flatMap((section) => section.items.filter((item) => item.recipe).map((item) => [item.recipe!.id, item] as const)));
export const recipeCatalog = recipes.map(({ module, ...recipe }) => ({
	...recipe,
	displayTitle: directoryItems.get(recipe.id)?.title ?? recipe.title,
	description: directoryItems.get(recipe.id)?.description,
	url: recipeUrl(recipe),
}));
export const collectionIndex = collections.map((collection) => {
	const entries = recipeCatalog.filter((recipe) => recipe.collectionId === collection.id);
	const categories = [...new Set(entries.map((recipe) => recipe.category?.id ?? null))].map((id) => ({
		category: entries.find((recipe) => (recipe.category?.id ?? null) === id)!.category,
		recipes: entries.filter((recipe) => (recipe.category?.id ?? null) === id),
	})).sort((a, b) => (a.category?.order ?? 0) - (b.category?.order ?? 0));
	return { ...collection, recipes: entries, categories };
});
