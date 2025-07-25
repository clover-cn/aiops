const AlertService = require('./AlertService');

/**
 * 告警管理器 - 单例模式
 * 负责管理告警服务的生命周期
 */
class AlertManager {
  constructor() {
    if (AlertManager.instance) {
      return AlertManager.instance;
    }

    this.alertService = new AlertService();
    this.isInitialized = false;
    
    AlertManager.instance = this;
  }

  /**
   * 初始化告警管理器
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }

    // 监听告警事件
    this.alertService.on('alert', (alert) => {
      console.log(`📢 新告警: [${alert.level.toUpperCase()}] ${alert.title}`);
      // 这里可以添加其他通知逻辑，如发送邮件、短信等
    });

    this.alertService.on('alertResolved', (alert) => {
      console.log(`✅ 告警解除: ${alert.title}`);
    });

    // 启动告警服务
    this.alertService.start();
    this.isInitialized = true;
    
    console.log('告警管理器初始化完成');
  }

  /**
   * 获取告警服务实例
   */
  getAlertService() {
    return this.alertService;
  }

  /**
   * 停止告警服务
   */
  shutdown() {
    if (this.alertService) {
      this.alertService.stop();
    }
    this.isInitialized = false;
    console.log('告警管理器已关闭');
  }
}

// 创建单例实例
const alertManager = new AlertManager();

module.exports = alertManager;
