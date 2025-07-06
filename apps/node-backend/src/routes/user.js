const express = require('express');
const { useResponseSuccess, useResponseError, unAuthorizedResponse } = require('../utils/response');
const { verifyAccessToken } = require('../utils/jwt-utils');

const router = express.Router();

/**
 * 获取用户信息接口
 * GET /api/user/info
 */
router.get('/info', (req, res) => {
  try {
    const userinfo = verifyAccessToken(req);
    
    if (!userinfo) {
      return res.status(401).json(unAuthorizedResponse(res));
    }
    
    res.json(useResponseSuccess(userinfo));
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json(useResponseError('Internal Server Error', error.message));
  }
});

module.exports = router;
