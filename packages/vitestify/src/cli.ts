import { Vitestify } from './pipeline/vitestify';

main(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main(argv: string[]): Promise<void> {
  await new Vitestify().run();
}
