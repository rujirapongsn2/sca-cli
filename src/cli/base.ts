import { Command } from '@oclif/core';
import { ConfigLoader } from './config.js';
import { AuditLogger } from './audit.js';

export abstract class BaseCommand extends Command {
  protected configLoader = ConfigLoader.getInstance();
  protected auditLogger = AuditLogger.getInstance();

  async init(): Promise<void> {
    await super.init();
  }

  protected getConfig() {
    return this.configLoader.get();
  }

  protected logEvent(type: string, details: Record<string, unknown>, approved = true): void {
    this.auditLogger.logEvent(type, details, approved);
  }
}

export abstract class BaseArgsCommand extends BaseCommand {
  async run(): Promise<void> {
    try {
      await this.execute();
    } catch (error) {
      this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  protected abstract execute(): Promise<void>;
}
