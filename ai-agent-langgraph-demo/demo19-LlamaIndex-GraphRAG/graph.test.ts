import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryPropertyGraph } from './graph.js';

test('从命中的实体出发完成三跳图遍历', () => {
  const graph = new InMemoryPropertyGraph();

  graph.addExtraction(
    {
      entities: [
        { name: 'Aurora 项目', type: '项目', description: '' },
        { name: 'Atlas 服务', type: '服务', description: '' },
      ],
      relationships: [
        {
          source: 'Aurora 项目',
          target: 'Atlas 服务',
          relation: '依赖',
          description: '',
        },
      ],
    },
    'chunk-1',
  );
  graph.addExtraction(
    {
      entities: [
        { name: 'Atlas 服务', type: '服务', description: '' },
        { name: '韩梅', type: '员工', description: '' },
      ],
      relationships: [
        {
          source: 'Atlas 服务',
          target: '韩梅',
          relation: '负责人',
          description: '',
        },
      ],
    },
    'chunk-2',
  );
  graph.addExtraction(
    {
      entities: [
        { name: '韩梅', type: '员工', description: '' },
        { name: '数据平台部', type: '部门', description: '' },
      ],
      relationships: [
        {
          source: '韩梅',
          target: '数据平台部',
          relation: '属于',
          description: '',
        },
      ],
    },
    'chunk-3',
  );

  const seeds = graph.findEntityKeys('Aurora 项目依赖的服务由谁负责？');
  const traversal = graph.traverse(seeds, 3);

  assert.deepEqual(graph.stats(), { entities: 4, relationships: 3 });
  assert.equal(traversal.relationships.length, 3);
  assert.deepEqual([...graph.getSourceChunkIds(traversal)].sort(), [
    'chunk-1',
    'chunk-2',
    'chunk-3',
  ]);
  assert.match(graph.formatRelationships(traversal), /数据平台部/);
});

test('重复关系会合并来源片段', () => {
  const graph = new InMemoryPropertyGraph();
  const extraction = {
    entities: [
      { name: 'Aurora 项目', type: '项目', description: '' },
      { name: 'Atlas 服务', type: '服务', description: '' },
    ],
    relationships: [
      {
        source: 'Aurora 项目',
        target: 'Atlas 服务',
        relation: '依赖',
        description: '',
      },
    ],
  };

  graph.addExtraction(extraction, 'chunk-1');
  graph.addExtraction(extraction, 'chunk-2');
  const traversal = graph.traverse(
    graph.findEntityKeys('Aurora 项目'),
    1,
  );

  assert.equal(graph.stats().relationships, 1);
  assert.deepEqual(traversal.relationships[0]?.chunkIds.sort(), [
    'chunk-1',
    'chunk-2',
  ]);
});
