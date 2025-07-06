const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { useResponseSuccess, useResponseError, unAuthorizedResponse } = require('../utils/response');
const { verifyAccessToken } = require('../utils/jwt-utils');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

// 配置multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: fileFilter
});

/**
 * 文件上传接口
 * POST /api/upload
 */
router.post('/upload', (req, res) => {
  // 验证用户身份
  const userinfo = verifyAccessToken(req);
  if (!userinfo) {
    return res.status(401).json(unAuthorizedResponse(res));
  }

  // 使用multer处理文件上传
  upload.single('file')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json(useResponseError('文件大小超过限制'));
      }
      return res.status(400).json(useResponseError('文件上传错误: ' + err.message));
    } else if (err) {
      return res.status(400).json(useResponseError(err.message));
    }

    if (!req.file) {
      return res.status(400).json(useResponseError('没有文件被上传'));
    }

    try {
      // 构建文件访问URL
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      
      res.json(useResponseSuccess({
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }));
    } catch (error) {
      console.error('Upload response error:', error);
      res.status(500).json(useResponseError('Internal Server Error', error.message));
    }
  });
});

/**
 * 获取上传文件列表接口（可选）
 * GET /api/upload/list
 */
router.get('/list', (req, res) => {
  try {
    const userinfo = verifyAccessToken(req);
    if (!userinfo) {
      return res.status(401).json(unAuthorizedResponse(res));
    }

    fs.readdir(uploadDir, (err, files) => {
      if (err) {
        return res.status(500).json(useResponseError('读取文件列表失败'));
      }

      const fileList = files.map(filename => {
        const filePath = path.join(uploadDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          url: `${req.protocol}://${req.get('host')}/uploads/${filename}`,
          size: stats.size,
          uploadTime: stats.birthtime
        };
      });

      res.json(useResponseSuccess(fileList));
    });
  } catch (error) {
    console.error('Get file list error:', error);
    res.status(500).json(useResponseError('Internal Server Error', error.message));
  }
});

module.exports = router;
