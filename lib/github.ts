import { Octokit } from "@octokit/rest";

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

function getConfig(): GitHubConfig {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token) {
    throw new Error("Missing required env var GITHUB_TOKEN");
  }
  if (!repo) {
    throw new Error("Missing required env var GITHUB_REPO (format \"owner/repo\")");
  }

  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid GITHUB_REPO "${repo}" - expected format "owner/repo"`);
  }

  return { token, owner, repo: name, branch };
}

function getOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

/**
 * Pure helper: returns a NEW array with `item` appended, filling in `id`
 * (crypto.randomUUID) and `addedAt` (ISO now) when absent. No I/O so it stays
 * unit-testable. Behavior is mirrored in lib/github.check.mjs.
 */
export function appendItem<T extends { id: string; addedAt: string }>(
  arr: T[],
  item: Omit<T, "id" | "addedAt"> & Partial<Pick<T, "id" | "addedAt">>,
): T[] {
  const filled = {
    ...item,
    id: item.id ?? crypto.randomUUID(),
    addedAt: item.addedAt ?? new Date().toISOString(),
  } as T;
  return [...arr, filled];
}

export async function readJsonFile(
  path: string,
): Promise<{ data: unknown[]; sha: string }> {
  const { token, owner, repo, branch } = getConfig();
  const octokit = getOctokit(token);

  const response = await octokit.repos.getContent({ owner, repo, path, ref: branch });

  const file = response.data;
  if (Array.isArray(file) || file.type !== "file" || typeof file.content !== "string") {
    throw new Error(`Path "${path}" is not a file`);
  }

  const decoded = atobNode(file.content);
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error(`File "${path}" does not contain valid JSON`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`File "${path}" must contain a JSON array`);
  }

  return { data: parsed, sha: file.sha };
}

export async function writeJsonFile(
  path: string,
  data: unknown[],
  sha: string,
  message: string,
): Promise<void> {
  const { token, owner, repo, branch } = getConfig();
  const octokit = getOctokit(token);

  const content = btoaNode(JSON.stringify(data, null, 2) + "\n");

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content,
    sha,
    branch,
  });
}

/**
 * Read -> append -> write a single item, retrying once if GitHub rejects the
 * commit because the file changed between our read and write (HTTP 409). This
 * guards against a lost update from an overlapping write or an external commit.
 * Returns the newly created item (with id + addedAt filled in).
 */
export async function commitAppend<T extends { id: string; addedAt: string }>(
  path: string,
  item: Omit<T, "id" | "addedAt"> & Partial<Pick<T, "id" | "addedAt">>,
  message: string,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, sha } = await readJsonFile(path);
    const updated = appendItem(data as T[], item);
    const created = updated[updated.length - 1];
    try {
      await writeJsonFile(path, updated, sha, message);
      return created;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409 && attempt === 0) continue; // stale sha, re-read and retry
      throw err;
    }
  }
  throw new Error(`Failed to commit to "${path}" after retry`);
}

// Node runtime base64 helpers (this module is only imported from the Node route).
function atobNode(base64: string): string {
  return Buffer.from(base64, "base64").toString("utf-8");
}

function btoaNode(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64");
}
