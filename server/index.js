const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const fetch = require('node-fetch');

// 加载环境变量
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 环境变量
const BAIDU_APP_ID = process.env.VITE_BAIDU_APP_ID;
const BAIDU_SECRET_KEY = process.env.VITE_BAIDU_SECRET_KEY;
const DEEPSEEKR1 = process.env.VITE_DEEPSEEKR1;
const DEEPSEEKR1_KEY = process.env.VITE_DEEPSEEKR1_KEY;

// 添加环境变量检查
if (!BAIDU_APP_ID || !BAIDU_SECRET_KEY || !DEEPSEEKR1 || !DEEPSEEKR1_KEY) {
  console.error('缺少必要的环境变量配置');
}

// 修改错误处理
app.post('/api/conversation', async (req, res) => {
  console.log('收到新的对话请求:', {
    isDeepThinking: req.body.isDeepThinking,
    threadId: req.body.threadId
  });
  const { isDeepThinking, ...requestBody } = req.body;
  const appId = isDeepThinking ? DEEPSEEKR1 : BAIDU_APP_ID;
  const secretKey = isDeepThinking ? DEEPSEEKR1_KEY : BAIDU_SECRET_KEY;
  
  if (!appId || !secretKey) {
    return res.status(500).json({ 
      error: '缺少必要的认证信息',
      details: '请检查环境变量配置'
    });
  }
  
  try {
    const response = await fetch(
      `https://agentapi.baidu.com/assistant/conversation?appId=${appId}&secretKey=${secretKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    console.log('百度 API 响应状态:', response.status);
    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({
        error: '百度 API 调用失败',
        status: response.status,
        details: errorData
      });
    }

    // 设置响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 添加错误处理
    response.body.on('error', (error) => {
      console.error('Stream error:', error);
      res.end();
    });

    // 添加结束处理
    response.body.on('end', () => {
      res.end();
    });

    // 转发流式响应
    response.body.pipe(res);

    // 添加客户端断开连接的处理
    req.on('close', () => {
      response.body.destroy();
      res.end();
    });

  } catch (error) {
    console.error('详细错误信息:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});