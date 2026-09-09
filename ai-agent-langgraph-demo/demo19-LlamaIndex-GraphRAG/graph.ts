// 下面三个导出类型是 LLM 抽取层与图存储层之间的数据契约。
export type ExtractedEntity = {
  name: string;
  type: string;
  description: string;
};

export type ExtractedRelationship = {
  source: string;
  target: string;
  relation: string;
  description: string;
};

export type GraphExtraction = {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
};

// 内部记录比 LLM 输出多了规范化 key 和来源 chunkIds，用于去重与证据回溯。
type EntityRecord = ExtractedEntity & {
  key: string;
  chunkIds: Set<string>;
};

type RelationshipRecord = ExtractedRelationship & {
  id: string;
  sourceKey: string;
  targetKey: string;
  chunkIds: Set<string>;
};

export type TraversedRelationship = ExtractedRelationship & {
  id: string;
  chunkIds: string[];
};

export type GraphTraversal = {
  entityKeys: string[];
  relationships: TraversedRelationship[];
};

/**
 * 生成用于匹配和去重的实体 key。
 * NFKC 会统一全角/兼容字符；去掉空白和标点后，“Atlas 服务”和“Atlas服务”
 * 能映射到同一个实体，同时保留记录中原始、可展示的名称。
 */
function normalizeEntityName(name: string): string {
  return name
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function relationshipId(
  sourceKey: string,
  relation: string,
  targetKey: string,
): string {
  // 用 source + relation + target 形成稳定 ID，让重复抽取的同一关系可以合并。
  return `${sourceKey}\u0000${normalizeEntityName(relation)}\u0000${targetKey}`;
}

/**
 * 一个教学用途的内存属性图。
 *
 * LlamaIndex.TS 负责文档解析、切块、向量召回和答案合成；这个类补上
 * 当前 TypeScript 包尚未提供的实体/关系存储与多跳遍历能力。
 */
export class InMemoryPropertyGraph {
  // entities：实体 key -> 实体；relationships：关系 ID -> 关系。
  private readonly entities = new Map<string, EntityRecord>();
  private readonly relationships = new Map<string, RelationshipRecord>();

  // 反向索引：原文片段 ID -> 该片段提到的实体，用于把向量结果接到图上。
  private readonly chunkEntities = new Map<string, Set<string>>();

  /** 合并一个片段抽取出的局部图，并记录每条事实来自哪个片段。 */
  addExtraction(extraction: GraphExtraction, chunkId: string): void {
    // 先写显式实体，尽量保留模型给出的具体 type 和 description。
    for (const entity of extraction.entities) {
      this.upsertEntity(entity, chunkId);
    }

    for (const relationship of extraction.relationships) {
      // 即使模型漏列了关系端点，也自动补成通用 Entity，保证关系不会悬空。
      const source = this.upsertEntity(
        {
          name: relationship.source,
          type: 'Entity',
          description: '',
        },
        chunkId,
      );
      const target = this.upsertEntity(
        {
          name: relationship.target,
          type: 'Entity',
          description: '',
        },
        chunkId,
      );
      const id = relationshipId(
        source.key,
        relationship.relation,
        target.key,
      );
      const existing = this.relationships.get(id);

      if (existing) {
        // 同一事实出现在多个片段时不重复建边，只累加证据来源。
        existing.chunkIds.add(chunkId);
        if (!existing.description && relationship.description) {
          existing.description = relationship.description;
        }
        continue;
      }

      this.relationships.set(id, {
        ...relationship,
        id,
        sourceKey: source.key,
        targetKey: target.key,
        chunkIds: new Set([chunkId]),
      });
    }
  }

  /** 从问题文本中找出被直接提到的已知实体。 */
  findEntityKeys(text: string): Set<string> {
    const normalizedText = normalizeEntityName(text);
    const matches = new Set<string>();

    for (const [key] of this.entities) {
      if (key.length >= 2 && normalizedText.includes(key)) {
        matches.add(key);
      }
    }

    return matches;
  }

  /** 把向量召回的片段转换成图遍历种子实体。 */
  entityKeysForChunks(chunkIds: Iterable<string>): Set<string> {
    const keys = new Set<string>();

    for (const chunkId of chunkIds) {
      for (const key of this.chunkEntities.get(chunkId) ?? []) {
        keys.add(key);
      }
    }

    return keys;
  }

  /**
   * 使用广度优先搜索逐层扩展关系。
   * 搜索时把边视为可双向连接，以免问题从关系的宾语一侧进入后无法扩展；
   * 返回时仍保留 source -> target 的原始事实方向。
   */
  traverse(seedKeys: Iterable<string>, maxDepth: number): GraphTraversal {
    // visited 防止实体在环中反复访问；frontier 只保存当前这一跳新到达的实体。
    const visited = new Set(seedKeys);
    let frontier = new Set(visited);
    const selectedRelationships = new Map<string, RelationshipRecord>();

    for (let depth = 0; depth < maxDepth && frontier.size > 0; depth += 1) {
      const nextFrontier = new Set<string>();

      for (const relationship of this.relationships.values()) {
        const touchesSource = frontier.has(relationship.sourceKey);
        const touchesTarget = frontier.has(relationship.targetKey);

        if (!touchesSource && !touchesTarget) {
          continue;
        }

        // Map 同时充当集合，保证同一条边最多返回一次。
        selectedRelationships.set(relationship.id, relationship);
        const adjacentKey = touchesSource
          ? relationship.targetKey
          : relationship.sourceKey;

        if (!visited.has(adjacentKey)) {
          visited.add(adjacentKey);
          nextFrontier.add(adjacentKey);
        }
      }

      frontier = nextFrontier;
    }

    return {
      entityKeys: [...visited],
      relationships: [...selectedRelationships.values()].map(
        ({ id, source, target, relation, description, chunkIds }) => ({
          id,
          source,
          target,
          relation,
          description,
          chunkIds: [...chunkIds],
        }),
      ),
    };
  }

  /** 将内部规范化 key 转回适合终端展示的实体名称。 */
  getEntityNames(keys: Iterable<string>): string[] {
    return [...keys]
      .map((key) => this.entities.get(key)?.name)
      .filter((name): name is string => Boolean(name));
  }

  /** 收集遍历结果涉及的原文片段，供最终回答阶段回填证据。 */
  getSourceChunkIds(traversal: GraphTraversal): Set<string> {
    const chunkIds = new Set<string>();

    for (const relationship of traversal.relationships) {
      for (const chunkId of relationship.chunkIds) {
        chunkIds.add(chunkId);
      }
    }

    for (const entityKey of traversal.entityKeys) {
      for (const chunkId of this.entities.get(entityKey)?.chunkIds ?? []) {
        chunkIds.add(chunkId);
      }
    }

    return chunkIds;
  }

  /** 把结构化关系转换成适合放进 LLM 上下文的可读文本。 */
  formatRelationships(traversal: GraphTraversal): string {
    if (traversal.relationships.length === 0) {
      return '没有找到可扩展的图关系。';
    }

    return traversal.relationships
      .map((item) => {
        const detail = item.description ? `；${item.description}` : '';
        return `- ${item.source} --[${item.relation}]--> ${item.target}${detail}`;
      })
      .join('\n');
  }

  stats(): { entities: number; relationships: number } {
    return {
      entities: this.entities.size,
      relationships: this.relationships.size,
    };
  }

  private upsertEntity(
    entity: ExtractedEntity,
    chunkId: string,
  ): EntityRecord {
    const key = normalizeEntityName(entity.name);

    if (!key) {
      throw new Error('实体名称不能为空。');
    }

    let record = this.entities.get(key);

    if (!record) {
      // 第一次遇到实体：保存展示字段并初始化来源集合。
      record = {
        ...entity,
        key,
        chunkIds: new Set<string>(),
      };
      this.entities.set(key, record);
    } else {
      // 后续片段可能提供更具体的类型或描述，只补充缺失信息，不覆盖已有事实。
      if (record.type === 'Entity' && entity.type !== 'Entity') {
        record.type = entity.type;
      }
      if (!record.description && entity.description) {
        record.description = entity.description;
      }
    }

    record.chunkIds.add(chunkId);

    // 同步维护 chunk -> entity 反向索引。
    let chunkEntityKeys = this.chunkEntities.get(chunkId);
    if (!chunkEntityKeys) {
      chunkEntityKeys = new Set<string>();
      this.chunkEntities.set(chunkId, chunkEntityKeys);
    }
    chunkEntityKeys.add(key);

    return record;
  }
}
