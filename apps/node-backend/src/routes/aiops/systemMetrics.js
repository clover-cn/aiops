const express = require('express');
const si = require('systeminformation');
const router = express.Router();
// 存储历史数据，用于生成连续的时间序列
let historicalData = {
  timePoints: [],
  cpuData: [],
  memoryData: [],
  diskData: [],
};

// 获取系统性能指标
router.get('/', async (req, res) => {
  try {
    // 获取真实的系统性能数据
    const [cpuLoad, memInfo, diskInfo] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
    ]);
    // 计算当前时间点（每分钟整点）
    const now = new Date();
    // 将时间调整到当前分钟的开始（秒数设为0）
    const currentMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
    const currentTime = currentMinute.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    // 获取真实数据
    const currentCpu = Math.round(cpuLoad.currentLoad || 0);
    const currentMemory = Math.round((memInfo.used / memInfo.total) * 100 || 0);

    // 计算磁盘使用率（取主磁盘）
    let currentDisk = 0;
    if (diskInfo && diskInfo.length > 0) {
      const mainDisk = diskInfo[0];
      currentDisk = Math.round((mainDisk.used / mainDisk.size) * 100 || 0);
    }

    // 更新历史数据
    historicalData.timePoints.push(currentTime);
    historicalData.cpuData.push(currentCpu);
    historicalData.memoryData.push(currentMemory);
    historicalData.diskData.push(currentDisk);

    // 保持最近30个数据点
    const maxPoints = 30;
    if (historicalData.timePoints.length > maxPoints) {
      historicalData.timePoints = historicalData.timePoints.slice(-maxPoints);
      historicalData.cpuData = historicalData.cpuData.slice(-maxPoints);
      historicalData.memoryData = historicalData.memoryData.slice(-maxPoints);
      historicalData.diskData = historicalData.diskData.slice(-maxPoints);
    }

    // 生成最近30分钟的性能指标数据（每分钟一个数据点）
    const timePoints = [];
    const cpuData = [];
    const memoryData = [];
    const diskData = [];

    for (let i = 29; i >= 0; i--) {
      // 每分钟一个点，从当前分钟开始往前推
      const time = new Date(currentMinute.getTime() - i * 60000);
      const timeStr = time.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      timePoints.push(timeStr);

      // 如果有历史数据，使用历史数据，否则生成模拟数据
      const historyIndex = historicalData.timePoints.findIndex(
        (t) => t === timeStr,
      );
      if (historyIndex !== -1) {
        cpuData.push(historicalData.cpuData[historyIndex]);
        memoryData.push(historicalData.memoryData[historyIndex]);
        diskData.push(historicalData.diskData[historyIndex]);
      } else {
        // 生成基于当前值的模拟历史数据
        const cpuVariation = (Math.random() - 0.5) * 20;
        const memoryVariation = (Math.random() - 0.5) * 15;
        const diskVariation = (Math.random() - 0.5) * 10;

        cpuData.push(Math.max(10, Math.min(90, currentCpu + cpuVariation)));
        memoryData.push(
          Math.max(20, Math.min(95, currentMemory + memoryVariation)),
        );
        diskData.push(Math.max(10, Math.min(80, currentDisk + diskVariation)));
      }
    }

    // 返回数据格式与前端期望的格式一致
    res.json({
      code: 0,
      data: {
        timePoints,
        cpuData: cpuData.map((v) => Math.round(v)),
        memoryData: memoryData.map((v) => Math.round(v)),
        diskData: diskData.map((v) => Math.round(v)),
      },
      error: null,
      message: 'ok',
    });
  } catch (error) {
    console.error('获取系统性能指标失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取系统性能指标失败',
    });
  }
});

module.exports = router;
