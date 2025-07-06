const express = require('express');
const { useResponseSuccess, useResponseError, unAuthorizedResponse } = require('../utils/response');
const { verifyAccessToken } = require('../utils/jwt-utils');
const { MOCK_MENUS } = require('../utils/mock-data');

const router = express.Router();

/**
 * 获取菜单接口
 * GET /api/menu/all
 */
router.get('/all', async (req, res) => {
  try {
    const userinfo = verifyAccessToken(req);
    
    if (!userinfo) {
      return res.status(401).json(unAuthorizedResponse(res));
    }

    const menus = MOCK_MENUS.find((item) => item.username === userinfo.username)?.menus ?? [];
    
    res.json(useResponseSuccess(menus));
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json(useResponseError('Internal Server Error', error.message));
  }
});

module.exports = router;
