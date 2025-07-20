const express = require('express');
const { exec, spawn } = require('child_process');
const router = express.Router();
const { useResponseSuccess, useResponseError } = require('../../utils/response');

// 存储正在运行的命令进程
const runningProcesses = new Map();
let processIdCounter = 1;

// 配置常量
const DEFAULT_MAX_RUNTIME = 2 * 60 * 1000; // 默认最大运行时间：2分钟
const CLEANUP_DELAY = 1 * 60 * 1000; // 进程结束后清理延迟：1分钟

// 移除了白名单校验，只使用黑名单来阻止危险命令

// 危险命令黑名单
const DANGEROUS_COMMANDS = [
  'rm', 'del', 'rmdir', 'rd', 'format', 'fdisk', 'mkfs',
  'shutdown', 'reboot', 'halt', 'poweroff', 'init',
  'kill', 'killall', 'taskkill', 'pkill',
  'chmod', 'chown', 'passwd', 'su', 'sudo',
  'dd', 'mv', 'move', 'cp', 'copy', 'xcopy'
];

/**
 * 检查命令是否安全（仅使用黑名单校验）
 * @param {string} command - 要检查的命令
 * @returns {boolean} 是否安全
 */
function isCommandSafe(command) {
  if (!command || typeof command !== 'string') {
    return false;
  }

  const trimmedCommand = command.trim().toLowerCase();

  // 检查是否包含危险字符（可选择性启用）
  const dangerousChars = ['|', '&', ';', '>', '<', '`', '$'];
  if (dangerousChars.some(char => trimmedCommand.includes(char))) {
    return false;
  }

  // 提取命令的第一个词（实际的命令名）
  const commandName = trimmedCommand.split(' ')[0];

  // 只检查是否在危险命令黑名单中
  if (DANGEROUS_COMMANDS.includes(commandName)) {
    return false;
  }

  // 移除白名单校验，允许执行所有非黑名单命令
  return true;
}

/**
 * 检测系统平台并返回相应的编码设置
 * @returns {object} 编码配置
 */
function getEncodingConfig() {
  const platform = process.platform;

  if (platform === 'win32') {
    // Windows系统使用GBK编码
    return {
      encoding: 'buffer', // 使用buffer避免编码问题
      shell: 'cmd.exe'
    };
  } else {
    // Unix/Linux系统使用UTF-8
    return {
      encoding: 'utf8',
      shell: '/bin/bash'
    };
  }
}

/**
 * 格式化时间戳为易读格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的时间字符串
 */
function formatTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 转换Windows命令输出编码
 * @param {Buffer|string} data - 原始数据
 * @returns {string} 转换后的字符串
 */
function convertEncoding(data) {
  if (!data) return '';

  if (Buffer.isBuffer(data)) {
    // Windows系统，尝试多种编码转换
    if (process.platform === 'win32') {
      try {
        // 尝试使用iconv-lite转换GBK编码
        const iconv = require('iconv-lite');
        return iconv.decode(data, 'gbk');
      } catch (error) {
        // 如果iconv-lite不可用，使用默认转换
        console.warn('iconv-lite not available, using default encoding');
        return data.toString('utf8');
      }
    } else {
      return data.toString('utf8');
    }
  }

  return data.toString();
}

/**
 * 执行系统命令
 * @param {string} command - 要执行的命令
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise} 执行结果
 */
function executeCommand(command, timeout = 10000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const encodingConfig = getEncodingConfig();

    // 为Windows系统的某些命令添加编码参数
    let finalCommand = command;
    if (process.platform === 'win32') {
      // 对于tasklist等命令，添加/fo csv参数以获得更好的格式
      if (command.toLowerCase().startsWith('tasklist')) {
        finalCommand = `chcp 65001 && ${command}`;
      }
    }

    exec(finalCommand, {
      timeout,
      maxBuffer: 1024 * 1024, // 1MB buffer
      encoding: encodingConfig.encoding,
      shell: encodingConfig.shell
    }, (error, stdout, stderr) => {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // 转换编码
      const convertedStdout = convertEncoding(stdout);
      const convertedStderr = convertEncoding(stderr);

      const currentTime = new Date();

      if (error) {
        resolve({
          success: false,
          command,
          output: '',
          error: error.message,
          stderr: convertedStderr || '',
          executionTime,
          timestamp: formatTimestamp(currentTime),
          platform: process.platform
        });
      } else {
        resolve({
          success: true,
          command,
          output: convertedStdout || '',
          error: null,
          stderr: convertedStderr || '',
          executionTime,
          timestamp: formatTimestamp(currentTime),
          platform: process.platform
        });
      }
    });
  });
}

/**
 * 执行长时间运行的命令（支持流式输出）
 * @param {string} command - 要执行的命令
 * @param {object} options - 执行选项
 * @returns {object} 包含进程ID和控制方法的对象
 */
function executeStreamCommand(command, options = {}) {
  const processId = `cmd_${processIdCounter++}`;
  const startTime = Date.now();
  const encodingConfig = getEncodingConfig();
  
  // 获取最大运行时间配置（可通过options传入，默认30分钟）
  const maxRuntime = options.maxRuntime || DEFAULT_MAX_RUNTIME;
  
  // 解析命令和参数
  const commandParts = command.trim().split(' ');
  const cmd = commandParts[0];
  const args = commandParts.slice(1);
  
  // 为Windows系统调整命令
  let finalCmd = cmd;
  let finalArgs = args;
  
  if (process.platform === 'win32') {
    // Windows下使用cmd执行命令
    finalCmd = 'cmd';
    finalArgs = ['/c', command];
  }
  
  // 创建子进程
  const childProcess = spawn(finalCmd, finalArgs, {
    shell: process.platform !== 'win32',
    encoding: encodingConfig.encoding
  });
  
  // 存储进程信息
  const processInfo = {
    id: processId,
    command,
    process: childProcess,
    startTime,
    status: 'running',
    output: [],
    error: null,
    options,
    maxRuntime,
    timeoutId: null
  };
  
  runningProcesses.set(processId, processInfo);
  
  // 设置自动超时终止
  processInfo.timeoutId = setTimeout(() => {
    if (processInfo.status === 'running' && !childProcess.killed) {
      console.log(`进程 ${processId} 运行超时 (${maxRuntime}ms)，自动终止`);
      
      // 添加超时日志到输出
      processInfo.output.push({
        type: 'system',
        content: `[系统] 进程运行超时 (${Math.round(maxRuntime / 1000 / 60)} 分钟)，自动终止`,
        timestamp: formatTimestamp()
      });
      
      // 终止进程
      childProcess.kill('SIGTERM');
      
      // 如果SIGTERM无效，5秒后强制终止
      setTimeout(() => {
        if (!childProcess.killed) {
          console.log(`强制终止进程 ${processId}`);
          childProcess.kill('SIGKILL');
        }
      }, 5000);
      
      processInfo.status = 'timeout';
      processInfo.error = `进程运行超时 (${Math.round(maxRuntime / 1000 / 60)} 分钟)`;
    }
  }, maxRuntime);
  
  // 监听标准输出
  childProcess.stdout.on('data', (data) => {
    const output = convertEncoding(data);
    processInfo.output.push({
      type: 'stdout',
      content: output,
      timestamp: formatTimestamp()
    });
    
    // 如果设置了输出回调，调用它
    if (options.onOutput) {
      options.onOutput(processId, 'stdout', output);
    }
  });
  
  // 监听标准错误
  childProcess.stderr.on('data', (data) => {
    const output = convertEncoding(data);
    processInfo.output.push({
      type: 'stderr',
      content: output,
      timestamp: formatTimestamp()
    });
    
    if (options.onOutput) {
      options.onOutput(processId, 'stderr', output);
    }
  });
  
  // 监听进程结束
  childProcess.on('close', (code) => {
    const endTime = Date.now();
    
    // 清理超时定时器
    if (processInfo.timeoutId) {
      clearTimeout(processInfo.timeoutId);
      processInfo.timeoutId = null;
    }
    
    // 如果不是超时状态，设置为完成状态
    if (processInfo.status !== 'timeout') {
      processInfo.status = 'completed';
    }
    
    processInfo.exitCode = code;
    processInfo.executionTime = endTime - startTime;
    
    // 添加进程结束日志
    processInfo.output.push({
      type: 'system',
      content: `[系统] 进程结束，退出码: ${code}，运行时间: ${Math.round(processInfo.executionTime / 1000)} 秒`,
      timestamp: formatTimestamp()
    });
    
    if (options.onComplete) {
      options.onComplete(processId, code);
    }
    
    // 延迟清理进程信息
    setTimeout(() => {
      runningProcesses.delete(processId);
      console.log(`已清理进程信息: ${processId}`);
    }, CLEANUP_DELAY);
  });
  
  // 监听进程错误
  childProcess.on('error', (error) => {
    // 清理超时定时器
    if (processInfo.timeoutId) {
      clearTimeout(processInfo.timeoutId);
      processInfo.timeoutId = null;
    }
    
    processInfo.status = 'error';
    processInfo.error = error.message;
    
    // 添加错误日志
    processInfo.output.push({
      type: 'system',
      content: `[系统] 进程错误: ${error.message}`,
      timestamp: formatTimestamp()
    });
    
    if (options.onError) {
      options.onError(processId, error);
    }
    
    // 延迟清理进程信息
    setTimeout(() => {
      runningProcesses.delete(processId);
      console.log(`已清理错误进程信息: ${processId}`);
    }, CLEANUP_DELAY);
  });
  
  return {
    processId,
    kill: () => {
      if (childProcess && !childProcess.killed) {
        childProcess.kill();
        processInfo.status = 'killed';
        return true;
      }
      return false;
    },
    getStatus: () => processInfo.status,
    getOutput: () => processInfo.output
  };
}

/**
 * 获取进程信息
 * @param {string} processId - 进程ID
 * @returns {object|null} 进程信息
 */
function getProcessInfo(processId) {
  return runningProcesses.get(processId) || null;
}

/**
 * 终止进程
 * @param {string} processId - 进程ID
 * @returns {boolean} 是否成功终止
 */
function killProcess(processId) {
  const processInfo = runningProcesses.get(processId);
  if (processInfo && processInfo.process && !processInfo.process.killed) {
    // 清理超时定时器
    if (processInfo.timeoutId) {
      clearTimeout(processInfo.timeoutId);
      processInfo.timeoutId = null;
    }
    
    // 添加手动终止日志
    processInfo.output.push({
      type: 'system',
      content: '[系统] 进程被手动终止',
      timestamp: formatTimestamp()
    });
    
    processInfo.process.kill();
    processInfo.status = 'killed';
    
    console.log(`手动终止进程: ${processId}`);
    return true;
  }
  return false;
}

// POST 请求处理 - 普通命令执行（短时间运行）
router.post('/', async (req, res) => {
  try {
    const { command, timeout = 10000 } = req.body;

    console.log('接收到的POST执行命令请求:', { command, timeout });

    if (!command) {
      return res.json(
        useResponseError('缺少命令参数', '请提供要执行的命令')
      );
    }

    // 安全检查（仅黑名单校验）
    if (!isCommandSafe(command)) {
      return res.json(
        useResponseError('命令不安全', '该命令包含危险操作或在黑名单中')
      );
    }

    // 执行命令
    const result = await executeCommand(command, timeout);

    res.json(
      useResponseSuccess({
        message: '命令执行完成',
        result
      })
    );

  } catch (error) {
    console.error('命令执行错误:', error);
    res.json(
      useResponseError('命令执行失败', error.message)
    );
  }
});

// POST 请求处理 - 流式命令执行（长时间运行）
router.post('/stream', async (req, res) => {
  try {
    const { command, maxRuntime } = req.body;

    console.log('接收到的流式执行命令请求:', { command, maxRuntime });

    if (!command) {
      return res.json(
        useResponseError('缺少命令参数', '请提供要执行的命令')
      );
    }

    // 安全检查
    if (!isCommandSafe(command)) {
      return res.json(
        useResponseError('命令不安全', '该命令包含危险操作或在黑名单中')
      );
    }

    // 验证maxRuntime参数
    let finalMaxRuntime = DEFAULT_MAX_RUNTIME;
    if (maxRuntime) {
      const parsedMaxRuntime = parseInt(maxRuntime);
      if (parsedMaxRuntime > 0 && parsedMaxRuntime <= 2 * 60 * 60 * 1000) { // 最大2小时
        finalMaxRuntime = parsedMaxRuntime;
      } else {
        return res.json(
          useResponseError('无效的超时时间', '超时时间必须在1毫秒到2小时之间')
        );
      }
    }

    // 执行流式命令
    const commandControl = executeStreamCommand(command, { maxRuntime: finalMaxRuntime });

    res.json(
      useResponseSuccess({
        message: '命令已启动',
        processId: commandControl.processId,
        status: 'running',
        maxRuntime: finalMaxRuntime,
        maxRuntimeMinutes: Math.round(finalMaxRuntime / 1000 / 60),
        timestamp: formatTimestamp()
      })
    );

  } catch (error) {
    console.error('流式命令执行错误:', error);
    res.json(
      useResponseError('流式命令执行失败', error.message)
    );
  }
});

// GET 请求处理 - 获取进程状态和输出
router.get('/process/:processId', (req, res) => {
  try {
    const { processId } = req.params;
    const { from = 0 } = req.query; // 从第几条输出开始获取

    const processInfo = getProcessInfo(processId);
    
    if (!processInfo) {
      return res.json(
        useResponseError('进程不存在', `找不到进程ID: ${processId}`)
      );
    }

    // 获取指定范围的输出
    const fromIndex = parseInt(from) || 0;
    const output = processInfo.output.slice(fromIndex);

    const currentTime = Date.now();
    const runningTime = currentTime - processInfo.startTime;
    const remainingTime = processInfo.maxRuntime ? Math.max(0, processInfo.maxRuntime - runningTime) : null;

    res.json(
      useResponseSuccess({
        message: '获取进程信息成功',
        processId,
        command: processInfo.command,
        status: processInfo.status,
        startTime: formatTimestamp(new Date(processInfo.startTime)),
        executionTime: processInfo.executionTime || runningTime,
        exitCode: processInfo.exitCode,
        error: processInfo.error,
        output,
        totalOutputCount: processInfo.output.length,
        hasMoreOutput: processInfo.status === 'running',
        // timeout: {
        //   maxRuntime: processInfo.maxRuntime,
        //   maxRuntimeMinutes: processInfo.maxRuntime ? Math.round(processInfo.maxRuntime / 1000 / 60) : null,
        //   remainingTime: remainingTime,
        //   remainingMinutes: remainingTime ? Math.round(remainingTime / 1000 / 60) : null,
        //   isNearTimeout: remainingTime && remainingTime < 5 * 60 * 1000 // 剩余时间少于5分钟
        // }
      })
    );

  } catch (error) {
    console.error('获取进程信息错误:', error);
    res.json(
      useResponseError('获取进程信息失败', error.message)
    );
  }
});

// DELETE 请求处理 - 终止进程
router.delete('/process/:processId', (req, res) => {
  try {
    const { processId } = req.params;

    const success = killProcess(processId);
    
    if (success) {
      res.json(
        useResponseSuccess({
          message: '进程已终止',
          processId
        })
      );
    } else {
      res.json(
        useResponseError('终止进程失败', '进程不存在或已经结束')
      );
    }

  } catch (error) {
    console.error('终止进程错误:', error);
    res.json(
      useResponseError('终止进程失败', error.message)
    );
  }
});

// GET 请求处理 - 获取所有运行中的进程
router.get('/processes', (req, res) => {
  try {
    const currentTime = Date.now();
    const processes = Array.from(runningProcesses.values()).map(info => {
      const runningTime = currentTime - info.startTime;
      const remainingTime = info.maxRuntime ? Math.max(0, info.maxRuntime - runningTime) : null;
      
      return {
        processId: info.id,
        command: info.command,
        status: info.status,
        startTime: formatTimestamp(new Date(info.startTime)),
        executionTime: info.executionTime || runningTime,
        outputCount: info.output.length,
        maxRuntimeMinutes: info.maxRuntime ? Math.round(info.maxRuntime / 1000 / 60) : null,
        remainingMinutes: remainingTime ? Math.round(remainingTime / 1000 / 60) : null,
        isNearTimeout: remainingTime && remainingTime < 5 * 60 * 1000
      };
    });

    res.json(
      useResponseSuccess({
        message: '获取进程列表成功',
        processes,
        count: processes.length,
        runningCount: processes.filter(p => p.status === 'running').length
      })
    );

  } catch (error) {
    console.error('获取进程列表错误:', error);
    res.json(
      useResponseError('获取进程列表失败', error.message)
    );
  }
});

// 获取安全策略信息
router.get('/security-policy', (_req, res) => {
  const platform = process.platform;

  res.json(
    useResponseSuccess({
      message: '获取安全策略成功',
      platform: platform,
      policy: {
        type: 'blacklist_only',
        description: '仅使用黑名单阻止危险命令，允许执行所有非危险命令'
      },
      dangerousCommands: DANGEROUS_COMMANDS,
      dangerousChars: ['|', '&', ';', '>', '<', '`', '$'],
      encoding: platform === 'win32' ? 'GBK/UTF-8' : 'UTF-8',
      features: {
        shortRunning: {
          endpoint: 'POST /',
          description: '执行短时间运行的命令，有超时限制',
          timeout: '默认10秒',
          usage: '适用于 ls, dir, ps 等快速执行的命令'
        },
        longRunning: {
          endpoint: 'POST /stream',
          description: '执行长时间运行的命令，支持流式输出',
          timeout: '默认30分钟自动超时',
          maxTimeout: '最大2小时',
          usage: '适用于 netstat -e 60, ping -t, tail -f 等持续运行的命令',
          parameters: {
            command: '要执行的命令',
            maxRuntime: '可选，自定义超时时间（毫秒），最大7200000（2小时）'
          }
        },
        processControl: {
          status: 'GET /process/:processId',
          kill: 'DELETE /process/:processId',
          list: 'GET /processes',
          description: '管理长时间运行的进程，包含超时信息'
        },
        autoTimeout: {
          description: '自动超时机制防止进程长期占用资源',
          defaultTimeout: `${Math.round(DEFAULT_MAX_RUNTIME / 1000 / 60)} 分钟`,
          maxTimeout: '2 小时',
          cleanupDelay: `${Math.round(CLEANUP_DELAY / 1000 / 60)} 分钟`
        }
      }
    })
  );
});

// 获取系统信息
router.get('/system-info', (_req, res) => {
  const platform = process.platform;
  const arch = process.arch;
  const nodeVersion = process.version;

  res.json(
    useResponseSuccess({
      message: '获取系统信息成功',
      system: {
        platform: platform,
        architecture: arch,
        nodeVersion: nodeVersion,
        encoding: platform === 'win32' ? 'GBK/UTF-8' : 'UTF-8',
        shell: platform === 'win32' ? 'cmd.exe' : '/bin/bash',
        supportedFeatures: {
          iconvLite: true,
          crossPlatform: true,
          encodingConversion: platform === 'win32'
        }
      }
    })
  );
});

module.exports = router;
