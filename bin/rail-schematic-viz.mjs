#!/usr/bin/env node

import { runCLI } from '../dist/index.js';

const code = await runCLI(process.argv.slice(2));

process.exit(code);
