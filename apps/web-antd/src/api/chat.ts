export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

const CHAT_API_ENDPOINT = import.meta.env.VITE_CHAT_API_ENDPOINT;
const API_KEY = import.meta.env.VITE_CHAT_API_KEY;
const MODEL_NAME = import.meta.env.VITE_CHAT_MODEL_NAME;

/**
 * 发送聊天消息到API
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  options: {
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
  } = {}
): Promise<ChatCompletionResponse> {
  const { stream = false, temperature = 0.7, max_tokens = 2000 } = options;

  const requestData: ChatCompletionRequest = {
    model: MODEL_NAME,
    messages,
    stream,
    temperature,
    max_tokens,
  };

  try {
    const response = await fetch(CHAT_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API请求失败: ${response.status} ${response.statusText}${
          errorData.error?.message ? ` - ${errorData.error.message}` : ''
        }`
      );
    }

    const data: ChatCompletionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Chat API Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('网络请求失败，请检查网络连接');
  }
}

/**
 * 发送流式聊天消息
 */
export async function* sendChatMessageStream(
  messages: ChatMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
  } = {}
): AsyncGenerator<string, void, unknown> {
  const { temperature = 0.7, max_tokens = 2000 } = options;

  const requestData: ChatCompletionRequest = {
    model: MODEL_NAME,
    messages,
    stream: true,
    temperature,
    max_tokens,
  };

  try {
    const response = await fetch(CHAT_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API请求失败: ${response.status} ${response.statusText}${
          errorData.error?.message ? ` - ${errorData.error.message}` : ''
        }`
      );
    }

    if (!response.body) {
      throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ''; // 用于缓存不完整的数据

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // 处理缓冲区中剩余的数据
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              const trimmedLine = line.trim();

              if (trimmedLine === '' || trimmedLine === 'data: [DONE]') {
                continue;
              }

              if (trimmedLine.startsWith('data: ')) {
                try {
                  const jsonData = trimmedLine.slice(6);
                  const parsedData: ChatCompletionStreamChunk = JSON.parse(jsonData);

                  const delta = parsedData.choices[0]?.delta;
                  if (delta && delta.content) {
                    yield delta.content;
                  }
                } catch (parseError) {
                  console.warn('解析缓冲区数据失败:', parseError);
                  continue;
                }
              }
            }
          }
          break;
        }

        // 解码数据并添加到缓冲区
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 按行分割数据
        const lines = buffer.split('\n');

        // 保留最后一行（可能不完整）在缓冲区中
        buffer = lines.pop() || '';

        // 处理完整的行
        for (const line of lines) {
          const trimmedLine = line.trim();

          if (trimmedLine === '' || trimmedLine === 'data: [DONE]') {
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonData = trimmedLine.slice(6);
              const parsedData: ChatCompletionStreamChunk = JSON.parse(jsonData);

              const delta = parsedData.choices[0]?.delta;
              if (delta && delta.content) {
                yield delta.content;
              }
            } catch (parseError) {
              console.warn('解析流数据失败:', parseError, '原始数据:', trimmedLine);
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('Stream Chat API Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('网络请求失败，请检查网络连接');
  }
}
