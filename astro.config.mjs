// @ts-check
import { defineConfig } from 'astro/config';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const owner = process.env.GITHUB_REPOSITORY?.split('/')[0];

// https://astro.build/config
export default defineConfig({ output: 'static', site: owner && repository ? `https://${owner}.github.io` : undefined, base: repository ? `/${repository}` : undefined });
