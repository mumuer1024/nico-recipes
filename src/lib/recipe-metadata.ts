export const collections = [
	{ id: 'nico', title: '猫猫餐桌', root: 'nico/' },
	{ id: 'glp1', title: 'GLP-1 高蛋白食谱', root: 'GLP-1高蛋白食谱（美）/' },
	{ id: 'boston', title: 'Boston Cooking-School Cookbook', root: 'boston-cooking-school-cookbook/recipes/' },
] as const;
export type CollectionId = typeof collections[number]['id'];
export const recipeTypes = ['正餐', '零食', '饮料', '甜品', '汤'] as const;
export type RecipeType = typeof recipeTypes[number];
export type RecipeCategory = { id: string; title: string; order: number };

const meals: Record<string, RecipeCategory> = {
	breakfast: { id: 'breakfast', title: '早餐', order: 0 },
	lunch: { id: 'lunch', title: '午餐', order: 1 },
	dinner: { id: 'dinner', title: '晚餐', order: 2 },
	snack: { id: 'snack', title: '零食', order: 3 },
	side_dish: { id: 'side_dish', title: '配菜', order: 4 },
};

// Adapt each source's existing frontmatter; do not infer logical types from chapters or meals.
export function readRecipeMetadata(filePath: string, frontmatter: Record<string, unknown> = {}) {
	const fail = (message: string): never => { throw new Error('[recipes] ' + filePath + ': ' + message); };
	const collection = collections.find((source) => filePath.startsWith(source.root));
	if (!collection) return fail('菜谱不属于任何已登记的内容源');
	const slug = frontmatter.slug ?? filePath.replace(/\.md$/i, '');
	if (typeof slug !== 'string' || /[\\?#%]/.test(slug) || slug.split('/').some((part) => !part.trim() || part === '.' || part === '..')) {
		return fail('slug 必须是未编码的相对 URL 路径，不能包含空段、.、..、反斜线、?、# 或 %');
	}
	const stringList = (key: string): string[] => {
		const value = frontmatter[key] ?? [];
		if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) return fail(key + ' 必须是非空字符串数组');
		return [...new Set(value)];
	};
	const types = stringList('recipe_types');
	if (types.some((type) => !recipeTypes.includes(type as RecipeType))) return fail('recipe_types 仅支持：' + recipeTypes.join('、'));
	let category: RecipeCategory | null = null;
	if (collection.id === 'glp1') {
		const meal = frontmatter.meal_type;
		if (typeof meal !== 'string' || !Object.hasOwn(meals, meal)) return fail('GLP-1 meal_type 必须是 breakfast / lunch / dinner / snack / side_dish');
		category = meals[meal];
	} else if (collection.id === 'boston') {
		const chapter = frontmatter.chapter_number;
		const title = frontmatter.chapter;
		const chapterDirectory = filePath.slice(collection.root.length).split('/')[0];
		if (typeof chapter !== 'number' || !Number.isInteger(chapter) || chapter < 1 || typeof title !== 'string' || !title.trim()) return fail('Boston 菜谱必须有 chapter_number 和 chapter');
		if (!chapterDirectory.startsWith(String(chapter).padStart(2, '0') + '-')) return fail('章节目录与 chapter_number 不一致');
		category = { id: chapterDirectory, title, order: chapter };
	} else if (frontmatter.category !== undefined) {
		if (typeof frontmatter.category !== 'string' || !frontmatter.category.trim()) return fail('category 必须是非空字符串');
		category = { id: frontmatter.category, title: frontmatter.category, order: 0 };
	}
	return {
		slug,
		collectionId: collection.id,
		category,
		tags: stringList('tags'),
		recipeTypes: types as RecipeType[],
		sourceCategory: typeof frontmatter.category === 'string' ? frontmatter.category : null,
		sourceSection: typeof frontmatter.section === 'string' ? frontmatter.section : null,
	};
}

export type RecipeMetadata = ReturnType<typeof readRecipeMetadata>;

