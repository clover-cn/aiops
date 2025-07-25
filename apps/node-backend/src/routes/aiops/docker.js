const express = require('express');
const Docker = require('dockerode');
const router = express.Router();

// 初始化Docker客户端
// 这将尝试连接到本地Docker守护进程
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Docker状态监控路由
router.get('/', async (req, res) => {
  try {
    // 获取Docker系统信息
    const info = await docker.info();
    
    // 获取所有容器列表
    const containers = await docker.listContainers({ all: true });
    
    // 获取所有镜像列表
    const images = await docker.listImages();
    
    // 获取Docker版本信息
    const version = await docker.version();
    
    // 统计容器状态
    let running = 0;
    let stopped = 0;
    let paused = 0;
    
    containers.forEach(container => {
      if (container.State === 'running') {
        running++;
      } else if (container.State === 'exited') {
        stopped++;
      } else if (container.State === 'paused') {
        paused++;
      }
    });
    
    // 计算镜像总数
    const imageCount = images.length;
    
    // 获取系统资源使用情况
    const systemInfo = {
      containers: {
        total: containers.length,
        running,
        stopped,
        paused
      },
      images: {
        total: imageCount
      },
      system: {
        name: info.Name,
        serverVersion: info.ServerVersion,
        apiVersion: version.ApiVersion,
        operatingSystem: info.OperatingSystem,
        architecture: info.Architecture,
        cpus: info.NCPU,
        memory: info.MemTotal
      },
      dockerRootDir: info.DockerRootDir,
      loggingDriver: info.LoggingDriver,
      cgroupDriver: info.CgroupDriver
    };
    
    // 获取容器详细信息（前10个）
    const containerDetails = [];
    const limit = Math.min(10, containers.length);
    
    for (let i = 0; i < limit; i++) {
      try {
        const container = docker.getContainer(containers[i].Id);
        const details = await container.inspect();
        
        containerDetails.push({
          id: details.Id.substring(0, 12),
          name: details.Name.replace('/', ''),
          image: details.Config.Image,
          status: details.State.Status,
          startedAt: details.State.StartedAt,
          finishedAt: details.State.FinishedAt,
          ports: details.NetworkSettings.Ports,
          labels: details.Config.Labels,
          created: details.Created
        });
      } catch (error) {
        console.warn(`获取容器详情失败: ${containers[i].Id}`, error.message);
      }
    }
    
    res.json({
      code: 0,
      data: {
        systemInfo,
        containerDetails,
        timestamp: new Date().toISOString()
      },
      error: null,
      message: 'ok'
    });
  } catch (error) {
    console.error('获取Docker状态失败:', error);
    
    // 如果无法连接到Docker守护进程，返回错误信息
    if (error.code === 'EACCES' || error.code === 'ENOENT') {
      res.status(503).json({
        code: -1,
        data: null,
        error: '无法连接到Docker守护进程，请确保Docker正在运行且有足够权限',
        message: 'Docker服务不可用'
      });
    } else {
      res.status(500).json({
        code: -1,
        data: null,
        error: error.message,
        message: '获取Docker状态失败'
      });
    }
  }
});

// 获取特定容器的详细信息
router.get('/container/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const container = docker.getContainer(id);
    const details = await container.inspect();
    
    res.json({
      code: 0,
      data: {
        id: details.Id,
        name: details.Name.replace('/', ''),
        image: details.Config.Image,
        status: details.State.Status,
        startedAt: details.State.StartedAt,
        finishedAt: details.State.FinishedAt,
        ports: details.NetworkSettings.Ports,
        labels: details.Config.Labels,
        env: details.Config.Env,
        cmd: details.Config.Cmd,
        created: details.Created,
        mounts: details.Mounts,
        networkSettings: details.NetworkSettings,
        hostConfig: details.HostConfig
      },
      error: null,
      message: 'ok'
    });
  } catch (error) {
    console.error('获取容器详情失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取容器详情失败'
    });
  }
});

// 获取容器统计信息
router.get('/container/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const container = docker.getContainer(id);
    
    // 获取容器统计信息（单次）
    const stats = await container.stats({ stream: false });
    
    // 处理统计数据
    const processedStats = {
      cpuUsage: 0,
      memoryUsage: 0,
      memoryLimit: 0,
      networkRx: 0,
      networkTx: 0,
      blockRead: 0,
      blockWrite: 0
    };
    
    if (stats) {
      // CPU使用率计算
      if (stats.cpu_stats && stats.precpu_stats) {
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        
        if (cpuDelta > 0 && systemDelta > 0) {
          processedStats.cpuUsage = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
        }
      }
      
      // 内存使用情况
      if (stats.memory_stats) {
        processedStats.memoryUsage = stats.memory_stats.usage || 0;
        processedStats.memoryLimit = stats.memory_stats.limit || 0;
      }
      
      // 网络IO
      if (stats.networks) {
        Object.values(stats.networks).forEach(network => {
          processedStats.networkRx += network.rx_bytes || 0;
          processedStats.networkTx += network.tx_bytes || 0;
        });
      }
      
      // 磁盘IO
      if (stats.blkio_stats && stats.blkio_stats.io_service_bytes_recursive) {
        stats.blkio_stats.io_service_bytes_recursive.forEach(io => {
          if (io.op === 'read') {
            processedStats.blockRead += io.value || 0;
          } else if (io.op === 'write') {
            processedStats.blockWrite += io.value || 0;
          }
        });
      }
    }
    
    res.json({
      code: 0,
      data: {
        stats: processedStats,
        timestamp: new Date().toISOString()
      },
      error: null,
      message: 'ok'
    });
  } catch (error) {
    console.error('获取容器统计信息失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取容器统计信息失败'
    });
  }
});

module.exports = router;