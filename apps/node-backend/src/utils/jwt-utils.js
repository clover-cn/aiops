const jwt = require('jsonwebtoken');
const { MOCK_USERS } = require('./mock-data');

// JWT密钥配置
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_token_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_token_secret';

/**
 * 生成访问令牌
 * @param {object} user - 用户信息
 * @returns {string} JWT访问令牌
 */
function generateAccessToken(user) {
  return jwt.sign(user, ACCESS_TOKEN_SECRET, { 
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '7d' 
  });
}

/**
 * 生成刷新令牌
 * @param {object} user - 用户信息
 * @returns {string} JWT刷新令牌
 */
function generateRefreshToken(user) {
  return jwt.sign(user, REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  });
}

/**
 * 验证访问令牌
 * @param {object} req - Express请求对象
 * @returns {object|null} 用户信息或null
 */
function verifyAccessToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    
    const username = decoded.username;
    const user = MOCK_USERS.find((item) => item.username === username);
    if (!user) {
      return null;
    }
    
    const { password, ...userinfo } = user;
    return userinfo;
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
}

/**
 * 验证刷新令牌
 * @param {string} token - 刷新令牌
 * @returns {object|null} 用户信息或null
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
    const username = decoded.username;
    const user = MOCK_USERS.find((item) => item.username === username);
    if (!user) {
      return null;
    }
    
    const { password, ...userinfo } = user;
    return userinfo;
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
