import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

export interface AgentSession {
  key: string;
  sessionId: string;
  label: string;
  status: 'running' | 'completed' | 'failed';
  task: string;
  startTime: number;
  updatedAt: number;
  duration?: number;
  totalTokens?: number;
}

interface SessionMetadata {
  sessionId: string;
  updatedAt: number;
  label?: string;
  spawnedBy?: string;
  totalTokens?: number;
  abortedLastRun?: boolean;
}

interface SessionsJson {
  [key: string]: SessionMetadata;
}

async function getFirstUserMessage(sessionId: string, sessionsDir: string): Promise<string> {
  const transcriptPath = path.join(sessionsDir, `${sessionId}.jsonl`);
  
  if (!fs.existsSync(transcriptPath)) {
    return 'No task description available';
  }

  return new Promise((resolve) => {
    const stream = fs.createReadStream(transcriptPath);
    const rl = readline.createInterface({ input: stream });
    let found = false;
    
    rl.on('line', (line) => {
      if (found) return;
      
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'message' && entry.message?.role === 'user') {
          const content = entry.message.content;
          let text = '';
          
          if (typeof content === 'string') {
            text = content;
          } else if (Array.isArray(content)) {
            const textPart = content.find((c: { type: string }) => c.type === 'text');
            if (textPart && textPart.text) {
              text = textPart.text;
            }
          }
          
          if (text) {
            found = true;
            // Truncate long messages
            const truncated = text.length > 200 ? text.slice(0, 200) + '...' : text;
            resolve(truncated);
            rl.close();
            stream.destroy();
          }
        }
      } catch {
        // Skip malformed lines
      }
    });
    
    rl.on('close', () => {
      if (!found) {
        resolve('No task description available');
      }
    });
    
    rl.on('error', () => {
      resolve('No task description available');
    });
  });
}

function getSessionStartTime(sessionId: string, sessionsDir: string): number {
  const transcriptPath = path.join(sessionsDir, `${sessionId}.jsonl`);
  
  if (!fs.existsSync(transcriptPath)) {
    return Date.now();
  }

  try {
    const stats = fs.statSync(transcriptPath);
    return stats.birthtimeMs;
  } catch {
    return Date.now();
  }
}

export async function GET() {
  try {
    const homeDir = process.env.HOME || '';
    const sessionsDir = path.join(homeDir, '.openclaw', 'agents', 'main', 'sessions');
    const sessionsJsonPath = path.join(sessionsDir, 'sessions.json');

    if (!fs.existsSync(sessionsJsonPath)) {
      return NextResponse.json({ agents: [] });
    }

    const sessionsData = JSON.parse(fs.readFileSync(sessionsJsonPath, 'utf8')) as SessionsJson;
    
    // Filter for subagent sessions only
    const subagentEntries = Object.entries(sessionsData).filter(
      ([key]) => key.includes('subagent')
    );

    const agents: AgentSession[] = await Promise.all(
      subagentEntries.map(async ([key, meta]) => {
        const lockPath = path.join(sessionsDir, `${meta.sessionId}.jsonl.lock`);
        const isRunning = fs.existsSync(lockPath);
        
        let status: 'running' | 'completed' | 'failed' = 'completed';
        if (isRunning) {
          status = 'running';
        } else if (meta.abortedLastRun) {
          status = 'failed';
        }

        const startTime = getSessionStartTime(meta.sessionId, sessionsDir);
        const task = await getFirstUserMessage(meta.sessionId, sessionsDir);
        
        const duration = status !== 'running' ? meta.updatedAt - startTime : undefined;

        return {
          key,
          sessionId: meta.sessionId,
          label: meta.label || key.split(':').pop() || 'Unknown',
          status,
          task,
          startTime,
          updatedAt: meta.updatedAt,
          duration,
          totalTokens: meta.totalTokens,
        };
      })
    );

    // Sort by most recent first
    agents.sort((a, b) => b.updatedAt - a.updatedAt);

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ agents: [], error: 'Failed to fetch agents' }, { status: 500 });
  }
}
