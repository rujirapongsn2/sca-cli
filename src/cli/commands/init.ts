import * as fs from 'fs';
import * as path from 'path';
import { BaseArgsCommand } from '../base.js';
import { ConfigLoader } from '../config.js';
import { Config } from '../types.js';

export class InitCommand extends BaseArgsCommand {
  static description = 'Initialize Softnix Code Agent configuration';

  async execute(): Promise<void> {
    const workspaceRoot = process.cwd();
    const scaDir = path.join(workspaceRoot, '.sca');
    const configPath = path.join(scaDir, 'config.yml');

    if (fs.existsSync(configPath)) {
      this.warn('Configuration already exists. Overwriting...');
    }

    fs.mkdirSync(scaDir, { recursive: true });

    const config = ConfigLoader.getDefaultConfig();
    config.workspace_root = workspaceRoot;

    const configContent = this.yamlDump(config);
    fs.writeFileSync(configPath, configContent);

    this.log(`✓ Created ${configPath}`);
    this.log(`  Workspace: ${workspaceRoot}`);
    this.log(`  Model Provider: ${config.model.provider}`);
    this.log(`  Privacy Mode: ${config.privacy.strict_mode ? 'strict' : 'normal'}`);

    this.log('\nConfiguration created successfully!');
  }

  private yamlDump(obj: Config): string {
    const yaml = require('js-yaml');
    return yaml.dump(obj, { indent: 2, lineBreak: '\n' });
  }
}

export default InitCommand;
