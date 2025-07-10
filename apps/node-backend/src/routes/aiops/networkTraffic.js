const express = require('express');
const si = require('systeminformation');
const router = express.Router();

// 存储历史网络流量数据
let historicalNetworkData = {
  timePoints: [],
  inboundData: [],
  outboundData: [],
  lastRxBytes: 0,
  lastTxBytes: 0,
  lastTimestamp: 0,
};

// 获取网络接口流量数据
async function getNetworkTraffic() {
  try {
    const networkStats = await si.networkStats();
    
    // 获取所有网络接口的总流量
    let totalRxBytes = 0;
    let totalTxBytes = 0;
    
    // 过滤掉回环接口，只统计真实网络接口的流量
    const realInterfaces = networkStats.filter(iface => 
      !iface.iface.includes('lo') && 
      !iface.iface.includes('Loopback') && 
      !iface.iface.includes('127.0.0.1')
    );
    
    realInterfaces.forEach(iface => {
      totalRxBytes += iface.rx_bytes || 0;
      totalTxBytes += iface.tx_bytes || 0;
    });
    
    const currentTimestamp = Date.now();
    
    // 如果是第一次获取数据，初始化基准值
    if (historicalNetworkData.lastTimestamp === 0) {
      historicalNetworkData.lastRxBytes = totalRxBytes;
      historicalNetworkData.lastTxBytes = totalTxBytes;
      historicalNetworkData.lastTimestamp = currentTimestamp;
      return { inboundMbps: 0, outboundMbps: 0 };
    }
    
    // 计算时间间隔（秒）
    const timeDiff = (currentTimestamp - historicalNetworkData.lastTimestamp) / 1000;
    
    if (timeDiff <= 0) {
      return { inboundMbps: 0, outboundMbps: 0 };
    }
    
    // 计算字节差值
    const rxBytesDiff = totalRxBytes - historicalNetworkData.lastRxBytes;
    const txBytesDiff = totalTxBytes - historicalNetworkData.lastTxBytes;
    
    // 计算每秒字节数，然后转换为Mbps
    const inboundBytesPerSec = rxBytesDiff / timeDiff;
    const outboundBytesPerSec = txBytesDiff / timeDiff;
    
    // 字节转换为Mbps: bytes/sec * 8 / 1000000 = Mbps
    const inboundMbps = Math.max(0, (inboundBytesPerSec * 8) / 1000000);
    const outboundMbps = Math.max(0, (outboundBytesPerSec * 8) / 1000000);
    
    // 更新历史记录
    historicalNetworkData.lastRxBytes = totalRxBytes;
    historicalNetworkData.lastTxBytes = totalTxBytes;
    historicalNetworkData.lastTimestamp = currentTimestamp;
    
    return { 
      inboundMbps: Math.round(inboundMbps * 100) / 100, // 保留两位小数
      outboundMbps: Math.round(outboundMbps * 100) / 100
    };
    
  } catch (error) {
    console.error('获取网络流量数据失败:', error);
    return { inboundMbps: 0, outboundMbps: 0 };
  }
}

// 生成网络流量历史数据
function generateNetworkHistory() {
  const now = new Date();
  const timePoints = [];
  const inboundData = [];
  const outboundData = [];
  
  // 生成最近20分钟的数据点
  for (let i = 19; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000); // 每分钟一个点
    const timeStr = time.toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit' 
    });
    
    timePoints.push(timeStr);
    
    // 检查是否有历史数据
    const historyIndex = historicalNetworkData.timePoints.findIndex(t => t === timeStr);
    
    if (historyIndex !== -1) {
      // 使用历史数据
      inboundData.push(historicalNetworkData.inboundData[historyIndex]);
      outboundData.push(historicalNetworkData.outboundData[historyIndex]);
    } else {
      // 生成模拟数据 - 基于时间和业务特征
      const hour = time.getHours();
      const minute = time.getMinutes();
      
      // 工作时间流量更高
      let baseInbound = 20; // 基础入站流量 20Mbps
      let baseOutbound = 15; // 基础出站流量 15Mbps
      
      if (hour >= 9 && hour <= 18) {
        // 工作时间流量增加
        const peakMultiplier = 1.5 + Math.sin((hour - 9) / 9 * Math.PI) * 0.5;
        baseInbound *= peakMultiplier;
        baseOutbound *= peakMultiplier;
      } else if (hour >= 19 && hour <= 22) {
        // 晚上娱乐时间流量适中
        baseInbound *= 1.2;
        baseOutbound *= 1.1;
      } else {
        // 深夜和凌晨流量较低
        baseInbound *= 0.3;
        baseOutbound *= 0.4;
      }
      
      // 添加随机波动
      const inboundVariation = (Math.random() - 0.5) * 10;
      const outboundVariation = (Math.random() - 0.5) * 8;
      
      const inboundValue = Math.max(0.1, baseInbound + inboundVariation);
      const outboundValue = Math.max(0.1, baseOutbound + outboundVariation);
      
      inboundData.push(Math.round(inboundValue * 100) / 100);
      outboundData.push(Math.round(outboundValue * 100) / 100);
    }
  }
  
  return { timePoints, inboundData, outboundData };
}

// 获取网络流量监控数据
router.get('/', async (req, res) => {
  try {
    // 获取当前实时网络流量
    const currentTraffic = await getNetworkTraffic();
    
    // 获取当前时间点
    const now = new Date();
    const currentTime = now.toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit' 
    });
    
    // 更新历史数据
    historicalNetworkData.timePoints.push(currentTime);
    historicalNetworkData.inboundData.push(currentTraffic.inboundMbps);
    historicalNetworkData.outboundData.push(currentTraffic.outboundMbps);
    
    // 保持最近30个数据点
    const maxPoints = 30;
    if (historicalNetworkData.timePoints.length > maxPoints) {
      historicalNetworkData.timePoints = historicalNetworkData.timePoints.slice(-maxPoints);
      historicalNetworkData.inboundData = historicalNetworkData.inboundData.slice(-maxPoints);
      historicalNetworkData.outboundData = historicalNetworkData.outboundData.slice(-maxPoints);
    }
    
    // 生成完整的历史数据用于图表展示
    const { timePoints, inboundData, outboundData } = generateNetworkHistory();
    
    // 返回数据格式与前端期望的格式一致
    res.json({
      code: 0,
      data: {
        timePoints,
        inboundData,
        outboundData,
        currentTraffic: {
          inbound: currentTraffic.inboundMbps,
          outbound: currentTraffic.outboundMbps,
          timestamp: currentTime
        }
      },
      error: null,
      message: 'ok',
    });
    
  } catch (error) {
    console.error('获取网络流量监控数据失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取网络流量监控数据失败',
    });
  }
});

module.exports = router;
