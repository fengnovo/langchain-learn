import { BaseCheckpointSaver } from '@langchain/langgraph';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const chatDir = fileURLToPath(new URL('../chat/', import.meta.url));
fs.mkdirSync(chatDir, { recursive: true });

function getUserPath(userId: string) {
  return path.join(chatDir, `${userId}.json`);
}

export class FileCheckpointSaver extends BaseCheckpointSaver {
  constructor() {
    super();
  }

  writeUserHistory(userId: any, sessionId: any, history: any[]) {
    const userPath = getUserPath(userId);
    const useHistory = JSON.parse(fs.readFileSync(userPath).toString());
    useHistory[sessionId] = history;
    fs.writeFileSync(userPath, JSON.stringify(useHistory, null, 1));
  }

  getUserHistory(userId: any, sessionId: any) {
    const userPath = getUserPath(userId);
    const isExist = fs.existsSync(userPath);

    if (isExist) {
      const useHistory = JSON.parse(fs.readFileSync(userPath).toString());
      const sessionHistory = useHistory[sessionId] || {};

      return sessionHistory;
    } else {
      fs.writeFileSync(
        userPath,
        JSON.stringify({
          [sessionId]: {},
        }),
      );
      return undefined;
    }
  }

  async put(config: any, checkpoint: any, metadata: any) {
    const userId = config.configurable.userId;
    const sessionId = config.configurable.sessionId;
    this.writeUserHistory(userId, sessionId, {
      checkpoint,
      metadata,
    });
    return {
      ...config,
      configurable: {
        ...config.configurable,
        thread_id: `${userId}:${sessionId}`,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  async getTuple(config: any) {
    const userId = config.configurable.userId;
    const sessionId = config.configurable.sessionId;
    const history = this.getUserHistory(userId, sessionId);
    const checkpoint = history?.checkpoint;
    if (checkpoint) {
      return {
        config: {
          ...config,
          configurable: {
            ...config.configurable,
            thread_id: `${userId}:${sessionId}`,
            checkpoint_id: history.checkpoint.id,
          },
        },
        checkpoint: history.checkpoint,
        metadata: history.metadata,
      };
    } else {
      // 新对话
      return undefined;
    }
  }

  async putWrites(config: any, write: any, taskId: any) {
    // console.log('putWrites', write, taskId);
  }
}
