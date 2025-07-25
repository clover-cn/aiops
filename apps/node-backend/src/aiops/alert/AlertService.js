const si = require('systeminformation');
const EventEmitter = require('events');

/**
 * 告警服务类
 * 负责监控系统指标并生成告警
 */
class AlertService extends EventEmitter {
  constructor() {
    super();
    this.alerts = new Map(); // 存储活跃告警
    this.alertHistory = []; // 告警历史记录
    this.isRunning = false;
    this.checkInterval = null;
    
    // 从环境变量读取配置
    this.config = {
      checkInterval: parseInt(process.env.ALERT_CHECK_INTERVAL) || 30000, // 30秒检查一次
      retentionDays: parseInt(process.env.ALERT_RETENTION_DAYS) || 7, // 保留7天的告警历史
      maxAlerts: parseInt(process.env.ALERT_MAX_ALERTS) || 1000, // 最大活跃告警数
      thresholds: {
        cpu: {
          warning: parseInt(process.env.ALERT_CPU_WARNING_THRESHOLD) || 70, // 默认70%
          critical: parseInt(process.env.ALERT_CPU_CRITICAL_THRESHOLD) || 85 // 默认85%
        },
        memory: {
          warning: parseInt(process.env.ALERT_MEMORY_WARNING_THRESHOLD) || 75, // 默认75%
          critical: parseInt(process.env.ALERT_MEMORY_CRITICAL_THRESHOLD) || 90 // 默认90%
        },
        disk: {
          warning: parseInt(process.env.ALERT_DISK_WARNING_THRESHOLD) || 80, // 默认80%
          critical: parseInt(process.env.ALERT_DISK_CRITICAL_THRESHOLD) || 95 // 默认95%
        }
      }
    };
    
    console.log('告警服务初始化完成，配置:', this.config);
  }

  /**
   * 启动告警监控
   */
  start() {
    if (this.isRunning) {
      console.log('告警服务已在运行中');
      return;
    }

    this.isRunning = true;
    console.log(`告警服务启动，检查间隔: ${this.config.checkInterval}ms`);
    
    // 立即执行一次检查
    this.checkSystemMetrics();
    
    // 设置定时检查
    this.checkInterval = setInterval(() => {
      this.checkSystemMetrics();
    }, this.config.checkInterval);

    // 定期清理过期告警
    setInterval(() => {
      this.cleanupExpiredAlerts();
    }, 60000 * 60); // 每小时清理一次
  }

  /**
   * 停止告警监控
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('告警服务已停止');
  }

  /**
   * 检查系统指标
   */
  async checkSystemMetrics() {
    try {
      // 获取系统性能数据
      const [cpuLoad, memInfo, diskInfo] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
      ]);

      const currentTime = new Date();
      
      // 检查CPU使用率
      const cpuUsage = Math.round(cpuLoad.currentLoad || 0);
      this.checkMetric('cpu', cpuUsage, '系统CPU使用率', '%', currentTime);

      // 检查内存使用率
      const memoryUsage = Math.round((memInfo.used / memInfo.total) * 100 || 0);
      this.checkMetric('memory', memoryUsage, '系统内存使用率', '%', currentTime);

      // 检查磁盘使用率
      if (diskInfo && diskInfo.length > 0) {
        const mainDisk = diskInfo[0];
        const diskUsage = Math.round((mainDisk.used / mainDisk.size) * 100 || 0);
        this.checkMetric('disk', diskUsage, `磁盘使用率 (${mainDisk.mount})`, '%', currentTime);
      }

    } catch (error) {
      console.error('检查系统指标时发生错误:', error);
    }
  }

  /**
   * 检查单个指标并生成告警
   */
  checkMetric(metricType, currentValue, metricName, unit, timestamp) {
    const thresholds = this.config.thresholds[metricType];
    if (!thresholds) {
      return;
    }

    const alertKey = `${metricType}_alert`;
    let alertLevel = null;
    let alertTitle = '';
    let alertDescription = '';

    // 判断告警级别
    if (currentValue >= thresholds.critical) {
      alertLevel = 'critical';
      alertTitle = `${metricName}严重告警`;
      alertDescription = `${metricName}已达到 ${currentValue}${unit}，超过严重阈值 ${thresholds.critical}${unit}`;
    } else if (currentValue >= thresholds.warning) {
      alertLevel = 'warning';
      alertTitle = `${metricName}警告`;
      alertDescription = `${metricName}已达到 ${currentValue}${unit}，超过警告阈值 ${thresholds.warning}${unit}`;
    }

    // 如果有告警
    if (alertLevel) {
      const existingAlert = this.alerts.get(alertKey);
      
      // 如果是新告警或级别升级
      if (!existingAlert || existingAlert.level !== alertLevel) {
        const alert = {
          id: `${alertKey}_${Date.now()}`,
          key: alertKey,
          level: alertLevel,
          title: alertTitle,
          description: alertDescription,
          service: '系统监控',
          metricType,
          currentValue,
          threshold: alertLevel === 'critical' ? thresholds.critical : thresholds.warning,
          unit,
          time: timestamp.toISOString(),
          timeDisplay: timestamp.toLocaleTimeString('zh-CN', { hour12: false }),
          status: 'active',
          count: existingAlert ? existingAlert.count + 1 : 1
        };

        this.alerts.set(alertKey, alert);
        this.addToHistory(alert);
        
        // 发出告警事件
        this.emit('alert', alert);
        
        console.log(`🚨 生成${alertLevel === 'critical' ? '严重' : '警告'}告警: ${alertTitle}`);
      } else if (existingAlert) {
        // 更新现有告警的计数和时间
        existingAlert.count++;
        existingAlert.time = timestamp.toISOString();
        existingAlert.timeDisplay = timestamp.toLocaleTimeString('zh-CN', { hour12: false });
        existingAlert.currentValue = currentValue;
      }
    } else {
      // 如果指标正常，清除对应的告警
      if (this.alerts.has(alertKey)) {
        const clearedAlert = this.alerts.get(alertKey);
        clearedAlert.status = 'resolved';
        clearedAlert.resolvedTime = timestamp.toISOString();
        
        this.addToHistory(clearedAlert);
        this.alerts.delete(alertKey);
        
        this.emit('alertResolved', clearedAlert);
        console.log(`✅ 告警已解除: ${clearedAlert.title}`);
      }
    }
  }

  /**
   * 添加告警到历史记录
   */
  addToHistory(alert) {
    this.alertHistory.unshift({
      ...alert,
      historyTime: new Date().toISOString()
    });

    // 限制历史记录数量
    if (this.alertHistory.length > this.config.maxAlerts) {
      this.alertHistory = this.alertHistory.slice(0, this.config.maxAlerts);
    }
  }

  /**
   * 清理过期告警
   */
  cleanupExpiredAlerts() {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - this.config.retentionDays);

    const initialCount = this.alertHistory.length;
    this.alertHistory = this.alertHistory.filter(alert => 
      new Date(alert.historyTime) > cutoffTime
    );

    const removedCount = initialCount - this.alertHistory.length;
    if (removedCount > 0) {
      console.log(`清理了 ${removedCount} 条过期告警记录`);
    }
  }

  /**
   * 获取活跃告警列表
   */
  getActiveAlerts() {
    return Array.from(this.alerts.values()).sort((a, b) => {
      // 按级别排序：critical > warning > info
      const levelOrder = { critical: 3, warning: 2, info: 1 };
      const levelDiff = levelOrder[b.level] - levelOrder[a.level];
      if (levelDiff !== 0) return levelDiff;
      
      // 同级别按时间排序（最新的在前）
      return new Date(b.time) - new Date(a.time);
    });
  }

  /**
   * 获取告警历史记录
   */
  getAlertHistory(limit = 50) {
    return this.alertHistory.slice(0, limit);
  }

  /**
   * 获取告警统计信息
   */
  getAlertStats() {
    const activeAlerts = this.getActiveAlerts();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAlerts = this.alertHistory.filter(alert => 
      new Date(alert.historyTime) >= today
    );

    return {
      active: {
        total: activeAlerts.length,
        critical: activeAlerts.filter(a => a.level === 'critical').length,
        warning: activeAlerts.filter(a => a.level === 'warning').length,
        info: activeAlerts.filter(a => a.level === 'info').length
      },
      today: {
        total: todayAlerts.length,
        critical: todayAlerts.filter(a => a.level === 'critical').length,
        warning: todayAlerts.filter(a => a.level === 'warning').length,
        info: todayAlerts.filter(a => a.level === 'info').length
      }
    };
  }

  /**
   * 更新告警阈值配置
   */
  updateThresholds(newThresholds) {
    this.config.thresholds = { ...this.config.thresholds, ...newThresholds };
    console.log('告警阈值配置已更新:', this.config.thresholds);
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this.config };
  }
}

module.exports = AlertService;
