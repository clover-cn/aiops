const express = require('express');
const { useResponseSuccess, useResponseError,jwtAuthMiddleware } = require('../utils/response');

const router = express.Router();

/**
 * 获取用户信息接口
 * GET /api/user/info
 */
router.get('/info', jwtAuthMiddleware, (req, res) => {
  try {
    const userinfo = req.user;
    
    res.json(useResponseSuccess(userinfo));
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json(useResponseError('Internal Server Error', error.message));
  }
});

module.exports = router;
