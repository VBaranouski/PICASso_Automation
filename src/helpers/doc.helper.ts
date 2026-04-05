import * as fs from 'fs';
import * as path from 'path';

/**
 * Path to the persisted DOC state JSON written by doc-state.setup.ts.
 * Lives at the project root so it is accessible from any src/tests file.
 */
const DOC_STATE_FILE = path.resolve(__dirname, '../../.doc-state.json');

export interface DocState {
  /** Full URL of a DOC Detail page in "Controls Scoping" status, set by doc-state.setup.ts */
  docDetailsUrl: string;
}

/**
 * Reads the persisted DOC state from disk.
 * Throws a descriptive error if the file does not exist so that a missing
 * doc-state-setup run produces an actionable message rather than a JSON parse error.
 */
export function readDocState(): DocState {
  if (!fs.existsSync(DOC_STATE_FILE)) {
    throw new Error(
      `Doc state file not found at "${DOC_STATE_FILE}". ` +
      'Run the "doc-state-setup" Playwright project before executing DOC detail specs.',
    );
  }
  const raw = fs.readFileSync(DOC_STATE_FILE, 'utf-8');
  return JSON.parse(raw) as DocState;
}

/**
 * Writes doc state to disk.
 * Called from doc-state.setup.ts after finding a suitable DOC URL.
 */
export function writeDocState(state: DocState): void {
  fs.mkdirSync(path.dirname(DOC_STATE_FILE), { recursive: true });
  fs.writeFileSync(DOC_STATE_FILE, JSON.stringify(state, null, 2));
}
