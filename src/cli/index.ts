#!/usr/bin/env node

import { Repl } from './repl.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (
    args.length === 0 ||
    args[0] === 'interactive' ||
    args[0] === '--interactive' ||
    args[0] === '-i'
  ) {
    const repl = new Repl();
    await repl.start();
    return;
  }

  const command = args[0] ?? '';

  switch (command) {
    case 'init': {
      const scaDir = `${process.cwd()}/.sca`;
      console.log(`✓ SCA configuration initialized at ${scaDir}`);
      break;
    }
    case '--help':
    case 'help':
      showHelp();
      break;
    case '--version':
    case 'version':
      console.log('Softnix Code Agent v0.1.0');
      break;
    default:
      if (command.startsWith('/') || command.startsWith('-')) {
        console.log(`Unknown option: ${command}`);
      } else {
        console.log(`Unknown command: ${command}`);
      }
      showHelp();
  }
}

function showHelp(): void {
  console.log(`
Softnix Code Agent CLI - Local-first AI Code Assistant

Usage: sca [command]

Commands:
  init                Initialize configuration
  interactive         Start interactive mode (default)
  /scan               Scan repository
  /task <message>     Start a task
  /plan               Show work plan
  /diff               Show proposed changes
  /apply              Apply changes
  /run <preset>       Run test/lint/build
  /memory             Manage memory
  /config             Configure settings

Options:
  --help, -h          Show help
  --version, -v       Show version

Interactive Mode:
  Run 'sca' without arguments to enter interactive mode.
`);
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
