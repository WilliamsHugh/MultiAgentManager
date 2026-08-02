#!/usr/bin/env node
// Stub CLI thay opencode trong unit test: nhận `run <prompt>`, in 1 dòng rồi exit 0.
const prompt = process.argv[3] || '';
process.stderr.write('> stub-cli\n');
process.stdout.write(`STUB_OK ${prompt.length} chars\n`);
process.exit(0);
