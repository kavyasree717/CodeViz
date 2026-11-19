import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 5000;
const execFileAsync = promisify(execFile);

const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function getJavaClass(code) {
  const packageMatch = code.match(/^\s*package\s+([\w.]+)\s*;/m);

  const classMatch =
    code.match(/public\s+(?:final\s+|abstract\s+)?class\s+(\w+)/) ||
    code.match(/class\s+(\w+)/);

  if (!classMatch) {
    throw new Error('Could not find a Java class in your code.');
  }

  const packageName = packageMatch?.[1] || '';

  return {
    fileName: `${classMatch[1]}.java`,
    className: packageName
      ? `${packageName}.${classMatch[1]}`
      : classMatch[1],
  };
}

app.post('/execute', async (req, res) => {
  const { code } = req.body || {};

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      output: '',
      error: 'Java code is required.',
      events: [],
    });
  }

  const folder = path.join(os.tmpdir(), `codeviz-${randomUUID()}`);

  try {
    const { fileName, className } = getJavaClass(code);

    await fs.mkdir(folder, { recursive: true });

    const sourcePath = path.join(folder, fileName);
    await fs.writeFile(sourcePath, code, 'utf8');

    // TraceRunner instruments if-conditions, compiles the instrumented source,
    // and then starts the program under JDI.
    const result = await execFileAsync(
      'java',
      [
        '--add-modules',
        'jdk.jdi,jdk.compiler',
        '-cp',
        BACKEND_DIR,
        'TraceRunner',
        folder,
        className,
        sourcePath,
      ],
      {
        timeout: 30000,
        windowsHide: true,
        maxBuffer: 5 * 1024 * 1024,
        encoding: 'utf8',
      }
    );

    let trace;

    try {
      trace = JSON.parse(result.stdout.trim());
    } catch {
      throw new Error(
        result.stderr?.trim() ||
        'The Java tracer returned an invalid response. Check the backend terminal.'
      );
    }

    return res.json({
      output: trace.output || '',
      error: trace.error || '',
      events: trace.events || [],
    });
  } catch (error) {
    return res.json({
      output: error.stdout || '',
      error: error.stderr?.trim() || error.message || 'Java execution failed.',
      events: [],
    });
  } finally {
    await fs.rm(folder, {
      recursive: true,
      force: true,
    });
  }
});

app.listen(PORT, () => {
  console.log(`CodeViz Java server running at http://localhost:${PORT}`);
});