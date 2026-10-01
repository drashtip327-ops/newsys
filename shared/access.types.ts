import type { Role } from './payment.types';
export const roles: Role[] = ['Employee', 'Manager', 'MD'];
export const pages = ['payments', 'audit', 'config', 'permissions'] as const;
export type PagePermission = typeof pages[number];
export interface WorkflowConfig {
  mdApprovalThreshold: number;
  maxResubmissions: number;
  minRejectionCommentLength: number;
}
export type Permissions = Record<Role, Record<PagePermission, boolean>>;
export interface Settings { config: WorkflowConfig; permissions: Permissions }
export const defaultConfig: WorkflowConfig = { mdApprovalThreshold: 50000, maxResubmissions: 1, minRejectionCommentLength: 5 };
export const defaultSettings: Settings = {
  config: defaultConfig,
  permissions: {
    Employee: { payments: true, audit: true, config: false, permissions: false },
    Manager: { payments: true, audit: true, config: false, permissions: false },
    MD: { payments: true, audit: true, config: true, permissions: true },
  },
};
export interface SessionInfo extends Settings { user: { username: string; role: Role } }
