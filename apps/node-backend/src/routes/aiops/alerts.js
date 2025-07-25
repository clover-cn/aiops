const express = require('express');
const router = express.Router();
const alertManager = require('../../aiops/alert/AlertManager');

/**
 * 获取活跃告警列表
 * GET /api/aiops/alerts
 */
router.get('/', async (req, res) => {
  try {
    const alertService = alertManager.getAlertService();
    const alerts = alertService.getActiveAlerts();
    
    res.json({
      code: 0,
      data: alerts,
      error: null,
      message: 'ok'
    });
  } catch (error) {
    console.error('获取告警列表失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取告警列表失败'
    });
  }
});

/**
 * 获取告警统计信息
 * GET /api/aiops/alerts/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const alertService = alertManager.getAlertService();
    const stats = alertService.getAlertStats();
    
    res.json({
      code: 0,
      data: stats,
      error: null,
      message: 'ok'
    });
  } catch (error) {
    console.error('获取告警统计失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取告警统计失败'
    });
  }
});

/**
 * 获取告警历史记录
 * GET /api/aiops/alerts/history
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const alertService = alertManager.getAlertService();
    const history = alertService.getAlertHistory(parseInt(limit));
    
    res.json({
      code: 0,
      data: history,
      error: null,
      message: 'ok'
    });
  } catch (error) {
    console.error('获取告警历史失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取告警历史失败'
    });
  }
});

/**
 * 获取告警配置
 * GET /api/aiops/alerts/config
 */
router.get('/config', async (req, res) => {
  try {
    const alertService = alertManager.getAlertService();
    const config = alertService.getConfig();
    
    res.json({
      code: 0,
      data: {
        thresholds: config.thresholds,
        checkInterval: config.checkInterval,
        retentionDays: config.retentionDays,
        maxAlerts: config.maxAlerts
      },
      error: null,
      message: 'ok'
    });
  } catch (error) {
    console.error('获取告警配置失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取告警配置失败'
    });
  }
});

/**
 * 更新告警阈值配置
 * PUT /api/aiops/alerts/config/thresholds
 */
router.put('/config/thresholds', async (req, res) => {
  try {
    const { thresholds } = req.body;
    
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({
        code: -1,
        data: null,
        error: '无效的阈值配置',
        message: '请提供有效的阈值配置'
      });
    }

    // 验证阈值配置格式
    const validMetrics = ['cpu', 'memory', 'disk'];
    const validLevels = ['warning', 'critical'];
    
    for (const [metric, levels] of Object.entries(thresholds)) {
      if (!validMetrics.includes(metric)) {
        return res.status(400).json({
          code: -1,
          data: null,
          error: `无效的指标类型: ${metric}`,
          message: '指标类型必须是 cpu, memory, disk 之一'
        });
      }
      
      for (const [level, value] of Object.entries(levels)) {
        if (!validLevels.includes(level)) {
          return res.status(400).json({
            code: -1,
            data: null,
            error: `无效的告警级别: ${level}`,
            message: '告警级别必须是 warning, critical 之一'
          });
        }
        
        if (typeof value !== 'number' || value < 0 || value > 100) {
          return res.status(400).json({
            code: -1,
            data: null,
            error: `无效的阈值: ${value}`,
            message: '阈值必须是 0-100 之间的数字'
          });
        }
      }
      
      // 验证 warning 阈值必须小于 critical 阈值
      if (levels.warning && levels.critical && levels.warning >= levels.critical) {
        return res.status(400).json({
          code: -1,
          data: null,
          error: `${metric} 的警告阈值必须小于严重阈值`,
          message: '警告阈值必须小于严重阈值'
        });
      }
    }

    const alertService = alertManager.getAlertService();
    alertService.updateThresholds(thresholds);
    
    res.json({
      code: 0,
      data: {
        message: '告警阈值配置更新成功',
        thresholds: alertService.getConfig().thresholds
      },
      error: null,
      message: 'ok'
    });
  } catch (error) {
    console.error('更新告警配置失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '更新告警配置失败'
    });
  }
});

/**
 * 手动触发告警检查
 * POST /api/aiops/alerts/check
 */
router.post('/check', async (req, res) => {
  try {
    const alertService = alertManager.getAlertService();
    await alertService.checkSystemMetrics();
    
    res.json({
      code: 0,
      data: {
        message: '告警检查已触发',
        timestamp: new Date().toISOString()
      },
      error: null,
      message: 'ok'
    });
  } catch (error) {
    console.error('手动触发告警检查失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '手动触发告警检查失败'
    });
  }
});

/**
 * 获取系统概览数据（包含告警统计）
 * GET /api/aiops/alerts/overview
 */
router.get('/overview', async (req, res) => {
  try {
    const alertService = alertManager.getAlertService();
    const stats = alertService.getAlertStats();
    
    // 模拟其他概览数据
    const overview = {
      services: {
        online: 8,
        total: 10
      },
      alerts: {
        active: stats.active.total,
        today: stats.today.total
      },
      // 这些数据可以从系统指标服务获取
      cpu: {
        current: 0,
        average: 0
      },
      memory: {
        current: 0,
        average: 0
      }
    };
    
    res.json({
      code: 0,
      data: overview,
      error: null,
      message: 'ok'
    });
  } catch (error) {
    console.error('获取系统概览失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取系统概览失败'
    });
  }
});

module.exports = router;
