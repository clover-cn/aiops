/**
 * 成功响应格式化
 * @param {any} data - 响应数据
 * @returns {object} 格式化的响应对象
 */
function useResponseSuccess(data) {
  return {
    code: 0,
    data,
    error: null,
    message: 'ok',
  };
}

/**
 * 分页成功响应格式化
 * @param {number|string} page - 页码
 * @param {number|string} pageSize - 每页大小
 * @param {Array} list - 数据列表
 * @param {object} options - 额外选项
 * @returns {object} 格式化的分页响应对象
 */
function usePageResponseSuccess(page, pageSize, list, { message = 'ok' } = {}) {
  const pageData = pagination(
    parseInt(page),
    parseInt(pageSize),
    list,
  );

  return {
    ...useResponseSuccess({
      items: pageData,
      total: list.length,
    }),
    message,
  };
}

/**
 * 错误响应格式化
 * @param {string} message - 错误消息
 * @param {any} error - 错误详情
 * @returns {object} 格式化的错误响应对象
 */
function useResponseError(message, error = null) {
  return {
    code: -1,
    data: null,
    error,
    message,
  };
}

/**
 * 403 禁止访问响应
 * @param {object} res - Express响应对象
 * @param {string} message - 错误消息
 * @returns {object} 403响应
 */
function forbiddenResponse(res, message = 'Forbidden Exception') {
  res.status(403);
  return useResponseError(message, message);
}

/**
 * 401 未授权响应
 * @param {object} res - Express响应对象
 * @returns {object} 401响应
 */
function unAuthorizedResponse(res) {
  res.status(401);
  return useResponseError('Unauthorized Exception', 'Unauthorized Exception');
}

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} Promise对象
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 分页处理
 * @param {number} pageNo - 页码
 * @param {number} pageSize - 每页大小
 * @param {Array} array - 数据数组
 * @returns {Array} 分页后的数据
 */
function pagination(pageNo, pageSize, array) {
  const offset = (pageNo - 1) * Number(pageSize);
  return offset + Number(pageSize) >= array.length
    ? array.slice(offset)
    : array.slice(offset, offset + Number(pageSize));
}

module.exports = {
  useResponseSuccess,
  usePageResponseSuccess,
  useResponseError,
  forbiddenResponse,
  unAuthorizedResponse,
  sleep,
  pagination,
};
