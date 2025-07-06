const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

/**
 * 设置刷新令牌Cookie
 * @param {object} res - Express响应对象
 * @param {string} refreshToken - 刷新令牌
 */
function setRefreshTokenCookie(res, refreshToken) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
    path: '/',
  };

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, cookieOptions);
}

/**
 * 从Cookie获取刷新令牌
 * @param {object} req - Express请求对象
 * @returns {string|null} 刷新令牌或null
 */
function getRefreshTokenFromCookie(req) {
  return req.cookies[REFRESH_TOKEN_COOKIE_NAME] || null;
}

/**
 * 清除刷新令牌Cookie
 * @param {object} res - Express响应对象
 */
function clearRefreshTokenCookie(res) {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

module.exports = {
  setRefreshTokenCookie,
  getRefreshTokenFromCookie,
  clearRefreshTokenCookie,
};
