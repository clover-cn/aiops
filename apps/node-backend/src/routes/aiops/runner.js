const express = require('express');
const { exec } = require('child_process');
const router = express.Router();
const { useResponseSuccess, useResponseError } = require('../../utils/response');

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

// POST 请求处理
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
      encoding: platform === 'win32' ? 'GBK/UTF-8' : 'UTF-8'
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
