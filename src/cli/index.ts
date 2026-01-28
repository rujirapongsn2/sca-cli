#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Repl } from './repl.js';
import { Config } from './types.js';

function getDefaultConfig(): Config {
  return {
    workspace_root: process.cwd(),
    model: {
      provider: 'local',
      endpoint: 'http://localhost:11434',
      model: 'llama3',
    },
    policies: {
      exec_allowlist: ['pytest', 'npm test', 'go test', 'make test', 'cargo test'],
      path_allowlist: [process.cwd()],
      path_denylist: [],
    },
    commands: {
      presets: {
        test: ['npm test', 'pytest'],
        lint: ['eslint .', 'prettier --check .'],
        build: ['npm run build', 'make build'],
      },
    },
    memory: {
      mode: 'project',
    },
    privacy: {
      strict_mode: true,
    },
  };
}

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
      const scaDir = path.join(process.cwd(), '.sca');
      const configPath = path.join(scaDir, 'config.yml');

      fs.mkdirSync(scaDir, { recursive: true });

      const config = getDefaultConfig();
      config.workspace_root = process.cwd();

      const configContent = yaml.dump(config, { indent: 2 });
      fs.writeFileSync(configPath, configContent);

      console.log(`✓ SCA configuration initialized at ${configPath}`);
      console.log(`  Workspace: ${config.workspace_root}`);
      console.log(`  Model Provider: ${config.model.provider}`);
      console.log(`  Privacy Mode: ${config.privacy.strict_mode ? 'strict' : 'normal'}`);
      console.log('');
      console.log('Configuration created successfully!');
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
