import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import * as lancedb from '@lancedb/lancedb';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const databasePath = fileURLToPath(new URL('../lancedb-data', import.meta.url));
const docsPath = fileURLToPath(new URL('../docs', import.meta.url));

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
});
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 100, // 每个块的最大字符数
  chunkOverlap: 20, // 块与块之间的重叠字符数，保持上下文连贯
  separators: ['\n\n', '\n', ''], // 自定义分隔符优先级
});
//读取目标文档
const pdfLoader = new PDFLoader(docsPath + '/pdfFile.pdf');
//pdfContent-pdf文档的json化内容
const pdfContent = await pdfLoader.load();

//交给分割器分割
const pdfSplitResult = await textSplitter.splitDocuments(pdfContent);
fs.writeFileSync(
  docsPath + '/pdfResultSplit.json',
  JSON.stringify(pdfSplitResult),
);

//遍历片段一个个的向量化，并储存到storeArr
const storeArr = [];
//embeddingModel为专门用来请求大模型把文本转为向量的对象
const embeddingsModel = new OpenAIEmbeddings({
  modelName: process.env.EMBEDDING_MODEL,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});
for (let i = 0; i < pdfSplitResult.length; i++) {
  //请求大模型，让大模型把文本转为向量
  const result = await embeddingsModel.embedQuery(
    pdfSplitResult[i].pageContent,
  );
  //result-就是文本转成向量的结果
  storeArr.push({
    i: i,
    text: pdfSplitResult[i].pageContent,
    vector: result,
  });
}
//整个向量结果存到向量数据库-这里用的是lancedb
const db = await lancedb.connect(databasePath);
const table = await db.createTable('table2', storeArr, {
  //mode说明是重写还是新建，建议重写，反正重写如果不存在也会新建，如果存在则顶替
  mode: 'overwrite',
});
//假设query是用户的问题，那么在把问题发给大模型处理前，先找出相关内容
const query = '端午节放假几天';
const queryResult = await embeddingsModel.embedQuery(query);
//查找和query相关的片段，最多两条，并转为数组
const vectorResult = await table.search(queryResult).limit(2).toArray();

for (let i = 0; i < vectorResult.length; i++) {
  console.log({
    text: vectorResult[i].text,
    _distance: vectorResult[i]._distance,
    i: vectorResult[i].i,
  });
}
