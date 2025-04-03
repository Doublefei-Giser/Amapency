// 先声明 BaiduAgentClient 类和相关接口
interface ConversationRequest {
  threadId?: string;
  message: {
    content: {
      type: 'text' | 'image' | 'file' | 'multimodal';
      value: {
        showText: string;
        [key: string]: any;
      };
      isFirstConversation?: boolean;
    };
  };
  source: string;
  from: 'openapi';
  openId: string;
}

interface ConversationResponse {
  status: number;
  message: string;
  logid: string;
  data: {
    message: {
      content: Array<{
        dataType: 'markdown' | 'uiData' | 'reasoning';  // 添加 'reasoning' 类型
        isFinished: boolean;
        data: {
          text?: string;
          value?: string;   // 添加 value 字段
          [key: string]: any;
        };
      }>;
      threadId: string;
      endTurn: boolean;
      msgId: string;
    };
  };
}

class BaiduAgentClient {
  private readonly isDeepThinking: boolean;
  private readonly baseUrl: string = 'http://localhost:3000';

  constructor(isDeepThinking: boolean = false) {
    this.isDeepThinking = isDeepThinking;
  }

  /**
   * 创建会话流
   * @param request 会话请求参数
   * @returns 异步生成器，用于获取流式响应
   */
  async *conversationStream(request: ConversationRequest): AsyncGenerator<ConversationResponse, void, unknown> {
    const url = `${this.baseUrl}/api/conversation`;
    
    try {
      // 添加 signal 到 fetch 请求中
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ ...request, isDeepThinking: this.isDeepThinking }),
        signal: (request as any).signal  // 通过类型断言传递 AbortSignal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      try {
        while (true) {
          // 在每次读取前检查是否已中断
          if ((request as any).signal && (request as any).signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
          
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // 按照双换行符分割事件
          const events = buffer.split('\n\n');
          // 保留最后一个可能不完整的事件
          buffer = events.pop() || '';

          for (const event of events) {
            const lines = event.split('\n');
            const eventType = lines[0]?.replace('event:', '')?.trim();
            const dataLine = lines[1];

            // 只处理 message 事件
            if (eventType === 'message' && dataLine?.startsWith('data:')) {
              try {
                const data = JSON.parse(dataLine.slice(5)) as ConversationResponse;
                if (data.status === 0 && data.data?.message) {
                  yield data;
                }
              } catch (e) {
                console.error('Failed to parse response data:', e);
              }
            }
          }
        }
      } finally {
        // 确保在结束时释放读取器锁
        reader.releaseLock();
      }
    } catch (error) {
      // 如果是中断错误，则正常处理
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Stream aborted by user');
        return;
      }
      console.error('Error in conversation stream:', error);
      throw error;
    }
  }
}

// 创建实例
export const normalClient = new BaiduAgentClient();
export const deepThinkingClient = new BaiduAgentClient(true);


// 导出类型定义
export type {
  ConversationRequest,
  ConversationResponse
};

