import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { Role } from '../../../../shared/payment.types';
const COOKIE = 'payment_session';
const lifetime = 8 * 60 * 60 * 1000;
@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, { username: string; role: Role; expires: number }>();
  private token(req: Request) { return (req.headers.cookie ?? '').split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1); }
  login(username: string, password: string, req: Request, res: Response) {
    const users: Record<string, Role> = { employee: 'Employee', manager: 'Manager', md: 'MD' };
    const name = username.trim().toLowerCase();
    const digest = (value: string) => createHash('sha256').update(value).digest();
    if (!Object.hasOwn(users, name) || !timingSafeEqual(digest(password), digest(`${name}@123`))) throw new UnauthorizedException('Invalid username or password.');
    this.logout(req, res);
    for (const [token, session] of this.sessions) if (session.expires <= Date.now()) this.sessions.delete(token);
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, { username: name, role: users[name], expires: Date.now() + lifetime });
    res.cookie(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: lifetime });
    return { username: name, role: users[name] };
  }
  user(req: Request) {
    const token = this.token(req);
    const session = token ? this.sessions.get(token) : undefined;
    if (!session || session.expires <= Date.now()) {
      if (token) this.sessions.delete(token);
      throw new UnauthorizedException('Please log in to continue.');
    }
    return { username: session.username, role: session.role };
  }
  logout(req: Request, res: Response) {
    const token = this.token(req); if (token) this.sessions.delete(token);
    res.clearCookie(COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  }
}
