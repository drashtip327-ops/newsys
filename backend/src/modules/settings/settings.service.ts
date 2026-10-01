import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { defaultSettings, pages, roles, type Settings, type WorkflowConfig, type Permissions } from '../../../../shared/access.types';
import { storageCommand, storageConfigured } from '../../common/storage';
@Injectable()
export class SettingsService {
  private readonly file = process.env.SETTINGS_FILE ?? resolve(process.cwd(), basename(process.cwd()) === 'backend' ? 'data/settings.json' : 'backend/data/settings.json');
  private settings: Settings;
  constructor() {
    this.settings = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) as Settings : structuredClone(defaultSettings);
    this.validateConfig(this.settings.config);
    this.validatePermissions(this.settings.permissions);
  }
  async get(): Promise<Settings> {
    if (storageConfigured()) {
      const [config, permissions] = await storageCommand<[string | null, string | null]>('MGET', 'newsys:config', 'newsys:permissions');
      const settings: Settings = { config: config ? JSON.parse(config) : defaultSettings.config, permissions: permissions ? JSON.parse(permissions) : defaultSettings.permissions };
      this.validateConfig(settings.config);
      this.validatePermissions(settings.permissions);
      return structuredClone(settings);
    }
    if (process.env.VERCEL) throw new Error('Shared settings storage is required on Vercel');
    return structuredClone(this.settings);
  }
  private validateConfig(c: WorkflowConfig) {
    if (!c || !Number.isFinite(c.mdApprovalThreshold) || c.mdApprovalThreshold < 0 || c.mdApprovalThreshold > 1000000000 || !Number.isInteger(c.maxResubmissions) || c.maxResubmissions < 0 || c.maxResubmissions > 10 || !Number.isInteger(c.minRejectionCommentLength) || c.minRejectionCommentLength < 1 || c.minRejectionCommentLength > 2000) throw new BadRequestException('Threshold must be 0â€“1,000,000,000; resubmissions 0â€“10; comment length 1â€“2,000.');
  }
  private validatePermissions(p: Permissions) {
    if (!p || roles.some(role => !p[role] || pages.some(page => typeof p[role][page] !== 'boolean'))) throw new BadRequestException('A boolean permission is required for every role and page.');
    if (roles.some(role => p[role].config !== (role === 'MD') || p[role].permissions !== (role === 'MD'))) throw new BadRequestException('Configuration and permission management are always MD-only.');
  }
  private save(next: Settings) {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file + '.tmp', JSON.stringify(next, null, 2));
    renameSync(this.file + '.tmp', this.file);
    this.settings = next;
    return this.get();
  }
  async updateConfig(config: WorkflowConfig) {
    this.validateConfig(config);
    if (storageConfigured()) { await storageCommand('SET', 'newsys:config', JSON.stringify(config)); return this.get(); }
    if (process.env.VERCEL) throw new Error('Shared settings storage is required on Vercel');
    return this.save({ ...this.settings, config: { ...config } });
  }
  async updatePermissions(permissions: Permissions) {
    this.validatePermissions(permissions);
    if (storageConfigured()) { await storageCommand('SET', 'newsys:permissions', JSON.stringify(permissions)); return this.get(); }
    if (process.env.VERCEL) throw new Error('Shared settings storage is required on Vercel');
    return this.save({ ...this.settings, permissions: structuredClone(permissions) });
  }
}
