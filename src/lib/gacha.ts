export function getPoolRecipes<T extends { collectionId: string; recipeTypes: readonly string[] }>(recipes: T[], pool: string): T[] {
	if (pool === 'all') return recipes;
	if (['nico', 'glp1', 'boston'].includes(pool)) return recipes.filter((recipe) => recipe.collectionId === pool);
	return recipes.filter((recipe) => recipe.recipeTypes.includes(pool));
}

export function pickRecipe<T>(pool: T[], random = Math.random): T | undefined {
	return pool.length ? pool[Math.floor(random() * pool.length)] : undefined;
}

export type DrawState = 'READY' | 'SPINNING' | 'DISPENSING' | 'COOLDOWN';

// UI promises resolve only when the corresponding visual phase has finished.
// All triggers must use this controller; rejected clicks are never retained.
export function createDrawController<T>({ spin, dispense, onState = () => {}, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }: {
	spin: (recipe: T) => Promise<void>;
	dispense: (recipe: T) => Promise<void>;
	onState?: (state: DrawState) => void;
	wait?: (ms: number) => Promise<void>;
}) {
	let state: DrawState = 'READY';
	const setState = (next: DrawState) => { state = next; onState(next); };
	return {
		get state() { return state; },
		async draw(pool: T[], random = Math.random): Promise<boolean> {
			if (state !== 'READY' || pool.length === 0) return false;
			setState('SPINNING');
			try {
				const recipe = pickRecipe(pool, random)!;
				await spin(recipe);
				setState('DISPENSING');
				await dispense(recipe);
				setState('COOLDOWN');
				await wait(1000);
				return true;
			} finally {
				setState('READY');
			}
		},
	};
}
