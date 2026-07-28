# Documents folder

Raw blood tests and imaging PDFs belong here. They are **gitignored by default** (see root `.gitignore`) and are **never served** by the Next.js app.

For the public demo repo, only `demo-lab.extracted.json` is tracked as an example of the ingest pipeline input format.

Workflow:

1. Save your lab PDF or photo locally (not committed).
2. Ask your AI assistant to extract markers into `something.extracted.json` (see `.cursor/commands/upload-blood-test.md`).
3. Run `npm run ingest-markers -- data/documents/something.extracted.json`.
