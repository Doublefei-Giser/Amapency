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
        dataType: 'markdown' | 'uiData';
        isFinished: boolean;
        data: {
          text?: string;
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
  private readonly appId: string;
  private readonly secretKey: string;
  private readonly baseUrl: string = 'https://agentapi.baidu.com';

  constructor(appId: string, secretKey: string) {
    if (!appId || !secretKey) {
      throw new Error('AppId and SecretKey are required');
    }
    this.appId = appId;
    this.secretKey = secretKey;
  }

  /**
   * 创建会话流
   * @param request 会话请求参数
   * @returns 异步生成器，用于获取流式响应
   */
  async *conversationStream(request: ConversationRequest): AsyncGenerator<ConversationResponse, void, unknown> {
    const url = `${this.baseUrl}/assistant/conversation?appId=${this.appId}&secretKey=${this.secretKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(request)
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
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error in conversation stream:', error);
      throw error;
    }
  }
}

// 然后再创建实例
export const agentClient = new BaiduAgentClient(
  import.meta.env.VITE_BAIDU_APP_ID,
  import.meta.env.VITE_BAIDU_SECRET_KEY
);

// 导出类型定义
export type {
  ConversationRequest,
  ConversationResponse
};

// 导出客户端类
export default BaiduAgentClient;