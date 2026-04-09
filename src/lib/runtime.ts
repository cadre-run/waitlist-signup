import { getSql } from './db';
import type { Sql } from 'postgres';

let _cfEnv: Record<string, any> | null = null;
let _cfEnvLoaded = false;

export async function getRuntimeEnv(): Promise<Record<string, any> | undefined> {
  if (_cfEnvLoaded) return _cfEnv ?? undefined;
  _cfEnvLoaded = true;

  try {
    const mod = await import('cloudflare:workers');
    _cfEnv = mod.env as Record<string, any>;
    return _cfEnv;
  } catch {
    return undefined;
  }
}

export async function getDb(): Promise<Sql> {
  const env = await getRuntimeEnv();
  return getSql(env);
}
