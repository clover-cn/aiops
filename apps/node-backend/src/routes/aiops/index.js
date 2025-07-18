const express = require('express');
const router = express.Router();
const { jwtAuthMiddleware } = require('../../utils/response'); // 引入JWT验证中间件

// 引入子路由
const systemMetricsRoutes = require('./systemMetrics');
const runnerRoutes = require('./runner');
const networkTrafficRoutes = require('./networkTraffic');
const ragRoutes = require('./rag');

// 对所有aiops路由应用JWT验证
router.use(jwtAuthMiddleware);

// 使用子路由
router.use('/system-metrics', systemMetricsRoutes);
router.use('/runner', runnerRoutes);
router.use('/network-traffic', networkTrafficRoutes);
router.use('/rag', ragRoutes);

module.exports = router;
