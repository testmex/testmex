main(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * @deprecated 🚧 work in progress
 */
async function main(_argv: string[]): Promise<void> {
  throw new Error('🚧 work in progress');
}
