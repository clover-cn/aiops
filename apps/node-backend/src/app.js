const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const menuRoutes = require('./routes/menu');
const uploadRoutes = require('./routes/upload');
const aiopsRoutes = require('./routes/aiops/index');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(helmet());
/**
 * 使用 morgan 记录 HTTP 请求日志
 *
 * 字段                         | 含义          | 说明
 * -----------                  | ------------  | --------------------------------------
 * ::1                          | 客户端 IP     | IPv6 的 localhost 地址
 * -                            | 用户标识      | 通常为空
 * -                            | 认证用户      | 通常为空
 * [06/Jul/2025:07:40:04 +0000] | 时间戳        | 请求时间
 * "OPTIONS /api/auth/login HTTP/1.1" | 请求信息 | 方法、路径、协议版本
 * 204                          | 状态码        | HTTP 响应状态
 * 0                            | 响应大小      | 字节数
 * "http://192.168.0.100:5173/" | Referer      | 请求来源页面
 * "Mozilla/5.0..."             | User-Agent   | 浏览器信息
 */
app.use(morgan('combined'));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 静态文件用于上传
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api', uploadRoutes);
app.use('/api/aiops', aiopsRoutes);

// 健康检查
app.get('/api/status', (req, res) => {
  res.json({
    code: 0,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
    error: null,
    message: 'ok',
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    code: -1,
    data: null,
    error: err.message,
    message: 'Internal Server Error',
  });
});

// 404处理程序
app.use('*', (req, res) => {
  res.status(404).json({
    code: -1,
    data: null,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN}`);
});

module.exports = app;
