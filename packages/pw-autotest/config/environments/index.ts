import { dev } from './dev';
import { qa } from './qa';
import { ppr } from './ppr';
import type { Environment, EnvironmentName } from './environment.types';

const environments: Record<EnvironmentName, Environment> = {
  dev,
  qa,
  ppr,
};

export function getEnvironment(name?: string): Environment {
  const envName = (name || process.env.TEST_ENV || 'dev') as EnvironmentName;
  const env = environments[envName];
  if (!env) {
    throw new Error(`Unknown environment: "${envName}". Available: ${Object.keys(environments).join(', ')}`);
  }
  return env;
}

export type { Environment, EnvironmentName };
