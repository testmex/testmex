#!/usr/bin/env node

import { Vitestify } from './pipeline/vitestify';

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main(): Promise<void> {
  await new Vitestify().run();
}
