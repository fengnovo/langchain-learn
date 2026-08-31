import { BaseMessage, BaseMessageLike } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

/**
 * 图的 StateAnnotation 主要定义以下三项内容：
 * 1. 节点之间传递的数据结构（要读取和写入哪些“通道”，以及它们的类型）
 * 2. 每个字段的默认值
 * 3. 状态的归约器。归约器是决定如何将更新应用到状态的函数。
 * 有关更多信息，请参阅 [归约器](https://langchain-ai.github.io/langgraphjs/concepts/low_level/#reducers)。
 */

// 这是智能体的主要状态，可以在其中存储任何信息
export const StateAnnotation = Annotation.Root({
  /**
   * 消息用于跟踪智能体的主要执行状态。
   *
   * 通常会按以下模式累积：
   *
   * 1. HumanMessage——用户输入
   * 2. 带有 .tool_calls 的 AIMessage——智能体选择用于收集信息的工具
   * 3. ToolMessage——已执行工具返回的响应（或错误）
   *
   *     （……根据需要重复第 2、3 步……）
   * 4. 不带 .tool_calls 的 AIMessage——智能体以非结构化格式响应用户
   *
   * 5. HumanMessage——用户在下一轮对话中作出响应
   *
   *     （……根据需要重复第 2～5 步……）
   *
   * 合并两个消息列表或具有 role 和 content 的类消息对象列表，
   * 并根据 ID 更新已有消息。
   *
   * `messagesStateReducer` 会自动将类消息对象转换为 LangChain 消息类。
   * 如果消息没有指定 ID，LangGraph 会自动为其分配一个。
   *
   * 默认情况下，这会确保状态“只能追加”；但如果新消息与已有消息的 ID 相同，
   * 则会更新已有消息。
   *
   * 返回：
   *     将 `right` 中的消息合并到 `left` 后得到的新消息列表。
   *     如果 `right` 中的消息与 `left` 中的消息具有相同 ID，
   *     则使用 `right` 中的消息替换 `left` 中的消息。
   */
  messages: Annotation<BaseMessage[], BaseMessageLike[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  /**
   * 可以根据需要向状态添加其他属性。
   * 常见示例包括检索到的文档、提取出的实体、API 连接等。
   *
   * 对于应由节点返回值覆盖的简单字段，无需定义归约器或默认值。
   */
  // additionalField: Annotation<string>,
});
