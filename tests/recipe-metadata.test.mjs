import assert from 'node:assert/strict';
import test from 'node:test';
import { readRecipeMetadata } from '../src/lib/recipe-metadata.ts';

test('moving a Nico recipe preserves an explicit URL and independent multiple logical types', () => {
	const data = readRecipeMetadata('nico/renamed.md', { slug: '花毛一体', tags: ['夏日下酒菜'], recipe_types: ['正餐', '汤'] });
	assert.equal(data.slug, '花毛一体');
	assert.equal(data.collectionId, 'nico');
	assert.equal(data.category, null);
	assert.deepEqual(data.tags, ['夏日下酒菜']);
	assert.deepEqual(data.recipeTypes, ['正餐', '汤']);
});

test('GLP-1 meal classification is independent of category and logical types', () => {
	const data = readRecipeMetadata('GLP-1高蛋白食谱（美）/soup.md', { meal_type: 'dinner', category: '汤' });
	assert.equal(data.category.id, 'dinner');
	assert.equal(data.sourceCategory, '汤');
	assert.deepEqual(data.recipeTypes, []);
	assert.equal(data.slug, 'GLP-1高蛋白食谱（美）/soup');
	for (const [order, meal] of ['breakfast', 'lunch', 'dinner', 'snack', 'side_dish'].entries()) {
		assert.equal(readRecipeMetadata('GLP-1高蛋白食谱（美）/a.md', { meal_type: meal }).category.order, order);
	}
});

test('Boston retains chapter and section and defaults to its complete historic path', () => {
	const file = 'boston-cooking-school-cookbook/recipes/08-soups/a.md';
	const data = readRecipeMetadata(file, { chapter_number: 8, chapter: 'Soups', section: 'Stock' });
	assert.deepEqual(data.category, { id: '08-soups', title: 'Soups', order: 8 });
	assert.equal(data.sourceSection, 'Stock');
	assert.equal(data.slug, file.slice(0, -3));
	assert.deepEqual(data.recipeTypes, []);
	assert.throws(() => readRecipeMetadata(file, { chapter_number: 9, chapter: 'Soups' }), /章节目录/);
});

test('unregistered source, invalid metadata and unsafe route values fail with file context', () => {
	assert.throws(() => readRecipeMetadata('stray.md'), /stray.md.*内容源/);
	for (const slug of ['', '/absolute', '../escape', 'a//b', 'a?b', 'a#b', 'a%20b', 'a\\b', 42]) {
		assert.throws(() => readRecipeMetadata('nico/a.md', { slug }), /slug/);
	}
	assert.throws(() => readRecipeMetadata('nico/a.md', { recipe_types: ['早餐'] }), /recipe_types/);
	assert.throws(() => readRecipeMetadata('nico/a.md', { tags: '汤' }), /tags/);
	assert.throws(() => readRecipeMetadata('GLP-1高蛋白食谱（美）/a.md', { meal_type: 'unknown' }), /meal_type/);
});
