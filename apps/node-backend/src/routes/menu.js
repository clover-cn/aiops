const express = require('express');
const { useResponseSuccess, useResponseError, jwtAuthMiddleware } = require('../utils/response');
const { MOCK_MENUS } = require('../utils/mock-data');

const router = express.Router();

/**
 * 获取菜单接口
 * GET /api/menu/all
 */
router.get('/all', jwtAuthMiddleware, async (req, res) => {
  try {
    const userinfo = req.user;

    const menus = MOCK_MENUS.find((item) => item.username === userinfo.username)?.menus ?? [];

    res.json(useResponseSuccess(menus));
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json(useResponseError('Internal Server Error', error.message));
  }
});

module.exports = router;
