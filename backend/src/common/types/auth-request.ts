import type { Request } from 'express';
import type { Role } from '../../../../shared/payment.types';
// AccessGuard supplies this role from the server session, never from a role header.
export type RoleRequest = Request & { role: Role };
