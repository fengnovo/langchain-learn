import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { ChatOpenAI } from '@langchain/openai';

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
});

const docsPath = fileURLToPath(new URL('../docs', import.meta.url));

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500, // 每个块的最大字符数
  chunkOverlap: 50, // 块与块之间的重叠字符数，保持上下文连贯
  separators: ['\n\n', '。', '，', '！', '？', ' ', ''], // 自定义分隔符优先级
});

const llm = new ChatOpenAI({
  modelName: process.env.MODEL,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

async function summarizeDocument() {
  const loader = new DocxLoader(docsPath + '/a.docx');
  const docs = await loader.load();
  console.log(`文档读取完成，共:${docs.length}页`);

  const splitResult = await textSplitter.splitDocuments(docs);
  console.log(`文档分段完成，共:${splitResult.length}段`);

  let allSummaries = [];
  let previousSummary = '';
  for (let i = 0; i < splitResult.length; i++) {
    const currentChunk = splitResult[i].pageContent;
    console.log(`\n正在处理第 ${i + 1}/${splitResult.length} 段.`);
    let prompt;
    if (i === 0) {
      // 第一段，没有之前的摘要
      prompt = `请为以下文本内容生成一个简洁的摘要（不超过100字）
            ${currentChunk} `;
    } else {
      // 后续段落，带上之前的摘要
      prompt = `以下是之前内容的摘要：
            ${previousSummary}
            请结合以上摘要为新的文本内容生成一个连贯的摘要不超过150字：
            ${currentChunk}`;
    }
    try {
      const response = await llm.invoke([
        new SystemMessage(
          '你是一个专业的文档摘要助手，请用简洁、准确的语言总结文本内容。',
        ),
        new HumanMessage(prompt),
      ]);

      const currentSummary = response.content;
      allSummaries.push({
        index: i,
        chunk: currentChunk,
        summary: currentSummary,
      });

      previousSummary = currentSummary as string;
      console.log(
        `第${i + 1}段摘要完成：${currentSummary?.substring(0, 50)}...`,
      );
    } catch (e: any) {
      console.error(`处理第${i + 1}段时出错：${e.message}...`);
      allSummaries.push({
        index: i,
        chunk: currentChunk,
        summary: '摘要生成失败',
        error: e.message,
      });
    }

    fs.writeFileSync(
      docsPath + '/summaryResult.json',
      JSON.stringify(allSummaries, null, 1),
    );
    console.log('\n 完成');

    console.log(previousSummary);
  }

  return allSummaries;
}

await summarizeDocument();
