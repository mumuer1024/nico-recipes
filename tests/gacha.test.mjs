import test from 'node:test';
import assert from 'node:assert/strict';
import { getPoolRecipes, pickRecipe, createDrawController } from '../src/lib/gacha.ts';

const recipes = [
  { id: 'a', collectionId: 'nico', recipeTypes: ['正餐', '汤'] },
  { id: 'b', collectionId: 'glp1', recipeTypes: ['零食', '甜品'] },
  { id: 'c', collectionId: 'boston', recipeTypes: ['饮料'] },
  { id: 'd', collectionId: 'boston', recipeTypes: [], title: 'Soup', category: '汤', meal_type: '晚餐', tags: ['甜品'] },
];

test('pools use only explicit collectionId and recipeTypes, retaining multi-type membership', () => {
  assert.deepEqual(getPoolRecipes(recipes, 'all'), recipes);
  for (const collection of ['nico', 'glp1', 'boston']) {
    assert.deepEqual(getPoolRecipes(recipes, collection), recipes.filter(recipe => recipe.collectionId === collection));
  }
  for (const type of ['正餐', '零食', '饮料', '甜品', '汤']) {
    assert.deepEqual(getPoolRecipes(recipes, type), recipes.filter(recipe => recipe.recipeTypes.includes(type)));
  }
  assert.deepEqual(getPoolRecipes([recipes[3]], '汤'), []);
  assert.deepEqual(getPoolRecipes([recipes[3]], '正餐'), []);
  assert.deepEqual(getPoolRecipes([recipes[3]], '甜品'), []);
  assert.deepEqual(getPoolRecipes([], 'all'), []);
});

test('uniform random intervals cover each recipe with equal width', () => {
  const counts = new Map(recipes.map(recipe => [recipe.id, 0]));
  for (let index = 0; index < 400; index++) {
    const chosen = pickRecipe(recipes, () => (index + 0.5) / 400);
    counts.set(chosen.id, counts.get(chosen.id) + 1);
  }
  assert.deepEqual([...counts.values()], [100, 100, 100, 100]);
  assert.equal(pickRecipe(recipes, () => 0), recipes[0]);
  assert.equal(pickRecipe(recipes, () => 1 - Number.EPSILON), recipes[3]);
  assert.equal(pickRecipe([], () => { throw new Error('empty pool must not draw'); }), undefined);
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('all locked phases discard repeated draws; cooldown starts only after dispensing completes', async () => {
  const spin = deferred();
  const dispense = deferred();
  const cooldown = deferred();
  const dispensingStarted = deferred();
  const cooldownStarted = deferred();
  const states = [];
  const displayed = [];
  const waits = [];
  let randomCalls = 0;
  let spinCalls = 0;
  const controller = createDrawController({
    spin: async recipe => { spinCalls++; displayed.push(recipe); await spin.promise; },
    dispense: async recipe => { displayed.push(recipe); dispensingStarted.resolve(); await dispense.promise; },
    wait: async ms => { waits.push(ms); cooldownStarted.resolve(); await cooldown.promise; },
    onState: state => states.push(state),
  });
  const random = () => { randomCalls++; return 0; };
  assert.equal(controller.state, 'READY');
  const first = controller.draw(recipes, random);
  assert.equal(controller.state, 'SPINNING', 'lock must be synchronous');
  async function clickBurst() {
    assert.deepEqual(await Promise.all(Array.from({ length: 50 }, () => controller.draw(recipes, random))), Array(50).fill(false));
    assert.equal(randomCalls, 1, 'rejected clicks must not replace the chosen recipe');
  }
  await clickBurst();
  assert.deepEqual(waits, []);
  spin.resolve();
  await dispensingStarted.promise;
  assert.equal(controller.state, 'DISPENSING');
  await clickBurst();
  assert.deepEqual(waits, [], 'cooldown cannot start while paper is still appearing');
  dispense.resolve();
  await cooldownStarted.promise;
  assert.equal(controller.state, 'COOLDOWN');
  assert.deepEqual(waits, [1000]);
  await clickBurst();
  cooldown.resolve();
  assert.equal(await first, true);
  assert.equal(controller.state, 'READY');
  assert.equal(spinCalls, 1, 'no rejected click may be queued');
  assert.deepEqual(displayed, [recipes[0], recipes[0]]);
  assert.deepEqual(states.filter((state, index) => index > 0 || state !== 'READY'), ['SPINNING', 'DISPENSING', 'COOLDOWN', 'READY']);
  assert.equal(await controller.draw(recipes, random), true);
  assert.equal(randomCalls, 2, 'a fresh click after unlocking can draw');
});

test('empty pools leave READY unchanged without invoking callbacks or randomness', async () => {
  const unexpected = () => { throw new Error('empty pool must be inert'); };
  const controller = createDrawController({ spin: unexpected, dispense: unexpected, wait: unexpected });
  assert.equal(await controller.draw([], unexpected), false);
  assert.equal(controller.state, 'READY');
});

test('instant reduced-motion callbacks preserve ordering and the 1000ms cooldown lock', async () => {
  const cooldown = deferred();
  const cooldownStarted = deferred();
  const events = [];
  const controller = createDrawController({
    spin: async () => { events.push('spin'); },
    dispense: async () => { events.push('paper-complete'); },
    wait: async ms => { events.push(ms); cooldownStarted.resolve(); await cooldown.promise; },
  });
  const draw = controller.draw(recipes, () => 0.5);
  assert.equal(await controller.draw(recipes), false);
  await cooldownStarted.promise;
  assert.deepEqual(events, ['spin', 'paper-complete', 1000]);
  assert.equal(controller.state, 'COOLDOWN');
  assert.equal(await controller.draw(recipes), false);
  cooldown.resolve();
  assert.equal(await draw, true);
  assert.equal(controller.state, 'READY');
});
