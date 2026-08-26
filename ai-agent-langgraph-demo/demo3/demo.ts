import express from 'express';
import {
  mapStoredMessagesToChatMessages,
  mapChatMessagesToStoredMessages,
} from '@langchain/core/messages';
// import { getUserHistory, writeUserHistory } from './utils/chat';
import { getGraph } from './utils/getGraph';

const expressApp = express();
const app = getGraph();
expressApp.get('/llm', async (req, res) => {
  try {
    const { q, userId, sessionId } = req.query;
    // const history = getUserHistory(userId, sessionId);
    const result = await app.invoke(
      {
        // ts-ignore
        messages: [
          // ...mapStoredMessagesToChatMessages(history),
          { role: 'user', content: q },
        ],
      },
      {
        configurable: {
          userId,
          sessionId,
        },
      },
    );
    const lassMessage = result.messages[result.messages.length - 1];
    res.json(lassMessage.content);
    // writeUserHistory(
    //   userId,
    //   sessionId,
    //   mapChatMessagesToStoredMessages(result.messages),
    // );
  } catch (error: any) {
    console.error('Error', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.listen(3003, () => {
  console.log('http://localhost:3003');
});
