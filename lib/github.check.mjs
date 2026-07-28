import assert from "node:assert/strict";

// COPY of the pure appendItem logic from lib/github.ts. Kept identical in
// behavior. Tested here without TS so it can run with plain `node`.
function appendItem(arr, item) {
  const filled = {
    ...item,
    id: item.id ?? crypto.randomUUID(),
    addedAt: item.addedAt ?? new Date().toISOString(),
  };
  return [...arr, filled];
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// 1. Assigns a uuid-ish id and ISO addedAt when absent.
{
  const out = appendItem([], { title: "hi" });
  assert.equal(out.length, 1);
  assert.match(out[0].id, UUID_RE, "id should look like a uuid");
  assert.match(out[0].addedAt, ISO_RE, "addedAt should be ISO");
  assert.equal(out[0].title, "hi", "payload fields preserved");
}

// 2. Preserves existing id/addedAt when provided.
{
  const out = appendItem([], {
    title: "x",
    id: "fixed-id",
    addedAt: "2020-01-01T00:00:00.000Z",
  });
  assert.equal(out[0].id, "fixed-id");
  assert.equal(out[0].addedAt, "2020-01-01T00:00:00.000Z");
}

// 3. Returns a NEW array and does not mutate the input.
{
  const input = [{ id: "a", addedAt: "2020-01-01T00:00:00.000Z" }];
  const out = appendItem(input, { title: "y" });
  assert.notEqual(out, input, "must return a new array reference");
  assert.equal(input.length, 1, "input array must not be mutated");
  assert.equal(out.length, 2);
  assert.equal(out[0], input[0], "existing items kept by reference");
}

console.log("github logic ok");
