import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Config } from './types.js';

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: Config | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), '.sca', 'config.yml');
  }

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  load(configPath?: string): Config {
    if (configPath) {
      this.configPath = configPath;
    }

    if (this.config) {
      return this.config;
    }

    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Config file not found: ${this.configPath}`);
    }

    const fileContent = fs.readFileSync(this.configPath, 'utf-8');
    this.config = yaml.load(fileContent) as Config;
    this.validate(this.config);
    return this.config;
  }

  private validate(config: Config): void {
    if (!['local', 'external'].includes(config.model.provider)) {
      throw new Error("Invalid model provider. Must be 'local' or 'external'");
    }

    if (!config.workspace_root) {
      throw new Error('workspace_root is required');
    }
  }

  get(): Config {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  getPath(): string {
    return this.configPath;
  }

  static getDefaultConfig(): Config {
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
}
