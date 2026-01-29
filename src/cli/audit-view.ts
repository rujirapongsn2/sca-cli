#!/usr/bin/env node

import { ExtendedAuditLogger } from '../security/audit.js';

interface CliArgs {
  _: string[];
  tool?: string;
  result?: string;
  limit?: number;
  json?: boolean;
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = { _: [] };
  const rawArgs = process.argv.slice(2);

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i] ?? '';
    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-/g, '_') as keyof CliArgs;
      const next = rawArgs[i + 1];
      if (next && !next.startsWith('-')) {
        (args as unknown as Record<string, unknown>)[key] = next;
        i++;
      } else {
        (args as unknown as Record<string, unknown>)[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1).replace(/-/g, '_') as keyof CliArgs;
      (args as unknown as Record<string, unknown>)[key] = true;
    } else {
      args._.push(arg);
    }
  }

  return args;
}

async function runAuditView(): Promise<void> {
  const args = parseArgs();

  if (args.help || args._.length === 0) {
    showHelp();
    return;
  }

  const subcommand = args._[0];

  if (subcommand !== 'view' && subcommand !== 'ls' && subcommand !== 'list') {
    showHelp();
    return;
  }

  const logger = ExtendedAuditLogger.getInstance();

  const logs = logger.getPolicyAuditLogs({
    tool: args.tool,
    result: args.result,
  });

  const limitVal = args.limit;
  const limit = typeof limitVal === 'number' ? limitVal : 50;
  const recentLogs = logs.slice(0, limit);

  if (args.json) {
    console.log(JSON.stringify(recentLogs, null, 2));
    return;
  }

  if (recentLogs.length === 0) {
    console.log('No audit logs found.');
    return;
  }

  console.log('='.repeat(80));
  console.log('Audit Log Viewer');
  console.log('='.repeat(80));

  for (const log of recentLogs) {
    console.log('');
    console.log(`[${log.timestamp.toISOString()}] ${log.tool}`);
    console.log(`  Action: ${log.action}`);
    console.log(`  Result: ${log.result.toUpperCase()}`);
    if (log.reason) {
      console.log(`  Reason: ${log.reason}`);
    }
    console.log(`  Parameters: ${JSON.stringify(log.parameters)}`);
    console.log('-'.repeat(40));
  }

  console.log('');
  console.log(`Total: ${logs.length} logs (showing ${recentLogs.length})`);
}

function showHelp(): void {
  console.log(`
Audit Log Viewer

Usage: sca audit view [options]

Options:
  --tool <name>      Filter by tool name
  --result <type>    Filter by result (allowed/denied/approved/rejected)
  --limit <n>        Maximum logs to show (default: 50)
  --json             Output as JSON
  --help, -h         Show this help

Examples:
  sca audit view
  sca audit view --tool read_file
  sca audit view --result denied --limit 20
  sca audit view --json
`);
}

export async function auditView(): Promise<void> {
  await runAuditView();
}

runAuditView().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
