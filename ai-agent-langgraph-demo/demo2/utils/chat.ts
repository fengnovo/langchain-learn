import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const chatDir = fileURLToPath(new URL('../chat/', import.meta.url));
fs.mkdirSync(chatDir, { recursive: true });

function getUserPath(userId: string) {
  return path.join(chatDir, `${userId}.json`);
}

export function writeUserHistory(userId: any, sessionId: any, history: any[]) {
  const userPath = getUserPath(userId);
  const useHistory = JSON.parse(fs.readFileSync(userPath).toString());
  useHistory[sessionId] = history;
  fs.writeFileSync(userPath, JSON.stringify(useHistory, null, 1));
}

export function getUserHistory(userId: any, sessionId: any) {
  const userPath = getUserPath(userId);
  const isExist = fs.existsSync(userPath);

  if (isExist) {
    const useHistory = JSON.parse(fs.readFileSync(userPath).toString());
    const sessionHistory = useHistory[sessionId] || [];

    return sessionHistory;
  } else {
    fs.writeFileSync(
      userPath,
      JSON.stringify({
        [sessionId]: [],
      }),
    );
    return [];
  }
}
