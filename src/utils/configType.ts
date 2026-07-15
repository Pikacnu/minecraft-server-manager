import yaml from 'js-yaml';
import { z } from 'zod';

const GATE_CONFIG_URL =
  'https://raw.githubusercontent.com/minekube/gate/refs/heads/master/config.yml';

const yamlTextRes = await fetch(GATE_CONFIG_URL);
if (!yamlTextRes.ok) {
  throw new Error(
    `Failed to fetch Gate config YAML: ${yamlTextRes.status}`,
  );
}

const yamlText = await yamlTextRes.text();

export const rawConfig: Record<string, unknown> = yaml.load(
  yamlText,
) as Record<string, unknown>;

export type InferredValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export interface FieldEntry {
  path: string;
  type: InferredValueType;
  defaultValue: unknown;
  description: string;
  category: string;
}

function inferType(value: unknown): InferredValueType {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'null';
}

function cleanDescriptionLine(line: string): string {
  return line.replace(/^\s*#\s?/, '').trim();
}

function extractDescriptions(yamlText: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = yamlText.split('\n');
  const currentPath: string[] = [];
  const indentStack: number[] = [];
  let pendingComments: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === '' || trimmed.startsWith('---')) continue;

    if (trimmed.startsWith('#')) {
      pendingComments.push(cleanDescriptionLine(trimmed));
      continue;
    }

    const match = trimmed.match(/^(\S[^:]*?):(\s|$)/);
    if (!match) {
      pendingComments = [];
      continue;
    }
    const key = match[1]!;
    const indent = rawLine.length - rawLine.trimStart().length;

    while (indentStack.length > 0) {
      const lastIndent = indentStack[indentStack.length - 1];
      if (lastIndent === undefined || indent > lastIndent) break;
      indentStack.pop();
      currentPath.pop();
    }

    indentStack.push(indent);
    currentPath.push(key);
    const fullPath = currentPath.join('.');

    const rest = trimmed.slice(match[0].length).trim();
    const hasListIndicator = key.startsWith('- ');
    if (!hasListIndicator && rest !== '' && !rest.startsWith('#')) {
      if (pendingComments.length > 0) {
        map.set(fullPath, pendingComments.join(' '));
      }
    }

    pendingComments = [];

    if (trimmed.startsWith('- ')) {
      currentPath.pop();
    }
  }

  return map;
}

const descriptions = extractDescriptions(yamlText);

function extractFields(
  obj: Record<string, unknown>,
  prefix = '',
): FieldEntry[] {
  const entries: FieldEntry[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      entries.push({
        path,
        type: 'array',
        defaultValue: value,
        description: descriptions.get(path) || '',
        category: prefix || '(root)',
      });
      if (
        value.length > 0 &&
        typeof value[0] === 'object' &&
        value[0] !== null
      ) {
        entries.push(
          ...extractFields(value[0] as Record<string, unknown>, `${path}[0]`),
        );
      }
    } else if (typeof value === 'object' && value !== null) {
      entries.push({
        path,
        type: 'object',
        defaultValue: value,
        description: descriptions.get(path) || '',
        category: prefix || '(root)',
      });
      entries.push(...extractFields(value as Record<string, unknown>, path));
    } else {
      entries.push({
        path,
        type: inferType(value),
        defaultValue: value,
        description: descriptions.get(path) || '',
        category: prefix || '(root)',
      });
    }
  }

  return entries;
}

export const GATE_FIELD_DEFINITIONS: FieldEntry[] = extractFields(rawConfig);

function buildZodSchema(obj: Record<string, unknown>): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      if (
        value.length > 0 &&
        typeof value[0] === 'object' &&
        value[0] !== null
      ) {
        shape[key] = z
          .array(buildZodSchema(value[0] as Record<string, unknown>))
          .optional();
      } else {
        shape[key] = z.array(z.any()).optional();
      }
    } else if (typeof value === 'object' && value !== null) {
      shape[key] = buildZodSchema(value as Record<string, unknown>).optional();
    } else if (typeof value === 'string') {
      shape[key] = z.string().optional();
    } else if (typeof value === 'number') {
      shape[key] = z.number().optional();
    } else if (typeof value === 'boolean') {
      shape[key] = z.boolean().optional();
    } else {
      shape[key] = z.any().optional();
    }
  }

  return z.object(shape);
}

export const gateConfigZodSchema = buildZodSchema(rawConfig);

export const GATE_DEFAULT_CONFIG: Record<string, unknown> = JSON.parse(
  JSON.stringify(rawConfig),
);

export function getDefaultByPath(path: string): unknown {
  const parts = path.split('.');
  let current: unknown = GATE_DEFAULT_CONFIG;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
