const express = require('express');
const { 
  useResponseSuccess, 
  useResponseError, 
  forbiddenResponse,
  jwtAuthMiddleware,
} = require('../utils/response');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt-utils');
const { 
  setRefreshTokenCookie, 
  getRefreshTokenFromCookie, 
  clearRefreshTokenCookie 
} = require('../utils/cookie-utils');
const { MOCK_USERS, MOCK_CODES } = require('../utils/mock-data');

const router = express.Router();

/**
 * 登录接口
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { password, username } = req.body;
    
    if (!password || !username) {
      return res.status(400).json(useResponseError(
        'BadRequestException',
        'Username and password are required'
      ));
    }

    const findUser = MOCK_USERS.find(
      (item) => item.username === username && item.password === password
    );

    if (!findUser) {
      clearRefreshTokenCookie(res);
      return res.status(403).json(forbiddenResponse(res, 'Username or password is incorrect.'));
    }

    const accessToken = generateAccessToken(findUser);
    const refreshToken = generateRefreshToken(findUser);

    setRefreshTokenCookie(res, refreshToken);

    res.json(useResponseSuccess({
      ...findUser,
      accessToken,
    }));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(useResponseError('Internal Server Error', error.message));
  }
});

/**
 * 刷新令牌接口
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromCookie(req);
    
    if (!refreshToken) {
      return res.status(403).json(forbiddenResponse(res));
    }

    clearRefreshTokenCookie(res);

    const userinfo = verifyRefreshToken(refreshToken);
    if (!userinfo) {
      return res.status(403).json(forbiddenResponse(res));
    }

    const findUser = MOCK_USERS.find(
      (item) => item.username === userinfo.username
    );
    
    if (!findUser) {
      return res.status(403).json(forbiddenResponse(res));
    }
    
    const accessToken = generateAccessToken(findUser);

    setRefreshTokenCookie(res, refreshToken);

    res.json(useResponseSuccess({
      accessToken
    }));
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json(useResponseError('Internal Server Error', error.message));
  }
});

/**
 * 登出接口
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    clearRefreshTokenCookie(res);
    res.json(useResponseSuccess(null));
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(useResponseError('Internal Server Error', error.message));
  }
});

/**
 * 获取用户权限码接口
 * GET /api/auth/codes
 */
router.get('/codes', jwtAuthMiddleware, async (req, res) => {
  try {
    const userinfo = req.user;

    const codes = MOCK_CODES.find((item) => item.username === userinfo.username)?.codes ?? [];

    res.json(useResponseSuccess(codes));
  } catch (error) {
    console.error('Get user codes error:', error);
    res.status(500).json(useResponseError('Internal Server Error', error.message));
  }
});

module.exports = router;
