const express = require('express');
const router = express.Router();
const path = require('path');
const { body, query, param } = require('express-validator');
const dataExportService = require('../services/dataExportService');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');

// Apply authentication and rate limiting
router.use(authMiddleware.optionalAuth);
router.use(rateLimitMiddleware.generalRateLimit);

/**
 * @swagger
 * tags:
 *   name: Data Export
 *   description: Data export and download functionality
 */

/**
 * @swagger
 * /export/create:
 *   post:
 *     summary: Create a new data export
 *     tags: [Data Export]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Station IDs to export
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Start date for data export
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: End date for data export
 *               parameters:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Weather parameters to include
 *               format:
 *                 type: string
 *                 enum: [csv, json, xlsx, xml]
 *                 default: csv
 *               includeAlerts:
 *                 type: boolean
 *                 default: false
 *               includeMetadata:
 *                 type: boolean
 *                 default: false
 *               aggregation:
 *                 type: string
 *                 enum: [minute, hour, day]
 *                 description: Data aggregation level
 *               compression:
 *                 type: string
 *                 enum: [zip, gzip]
 *                 description: File compression format
 *               maxRows:
 *                 type: integer
 *                 default: 100000
 *                 description: Maximum number of rows to export
 *               timezone:
 *                 type: string
 *                 default: UTC
 *                 description: Timezone for timestamps
 *     responses:
 *       202:
 *         description: Export job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exportId:
 *                   type: string
 *                 message:
 *                   type: string
 *                 statusUrl:
 *                   type: string
 */
router.post('/create', [
  body('stations')
    .isArray({ min: 1, max: 20 })
    .withMessage('Stations must be an array with 1-20 station IDs'),
  body('stations.*')
    .isString()
    .withMessage('Each station ID must be a string'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      
      // Limit export range to 1 year
      const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (new Date(endDate) - new Date(req.body.startDate) > maxRange) {
        throw new Error('Export date range cannot exceed 1 year');
      }
      
      return true;
    }),
  body('parameters')
    .optional()
    .isArray()
    .withMessage('Parameters must be an array'),
  body('format')
    .optional()
    .isIn(['csv', 'json', 'xlsx', 'xml'])
    .withMessage('Format must be csv, json, xlsx, or xml'),
  body('includeAlerts')
    .optional()
    .isBoolean()
    .withMessage('Include alerts must be a boolean'),
  body('includeMetadata')
    .optional()
    .isBoolean()
    .withMessage('Include metadata must be a boolean'),
  body('aggregation')
    .optional()
    .isIn(['minute', 'hour', 'day'])
    .withMessage('Aggregation must be minute, hour, or day'),
  body('compression')
    .optional()
    .isIn(['zip', 'gzip'])
    .withMessage('Compression must be zip or gzip'),
  body('maxRows')
    .optional()
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Max rows must be between 1 and 1,000,000'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string')
], async (req, res) => {
  try {
    const exportResult = await dataExportService.exportData(req.body);
    
    res.status(202).json({
      success: true,
      exportId: exportResult.id,
      message: 'Export job created successfully',
      statusUrl: `/api/export/status/${exportResult.id}`,
      estimatedTime: '5-30 minutes depending on data size'
    });
    
  } catch (error) {
    console.error('Export creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create export',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /export/status/{exportId}:
 *   get:
 *     summary: Get export job status
 *     tags: [Data Export]
 *     parameters:
 *       - in: path
 *         name: exportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Export status information
 */
router.get('/status/:exportId', [
  param('exportId')
    .isString()
    .withMessage('Export ID must be a string')
], async (req, res) => {
  try {
    const { exportId } = req.params;
    const status = await dataExportService.getExportStatus(exportId);
    
    if (status.error) {
      return res.status(404).json({
        success: false,
        error: status.error
      });
    }
    
    res.json({
      success: true,
      export: status
    });
    
  } catch (error) {
    console.error('Failed to get export status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export status',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /export/list:
 *   get:
 *     summary: List available exports
 *     tags: [Data Export]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of available exports
 */
router.get('/list', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative')
], async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const exports = await dataExportService.listExports();
    
    // Apply pagination
    const paginatedExports = exports.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      exports: paginatedExports,
      pagination: {
        total: exports.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + parseInt(limit) < exports.length
      }
    });
    
  } catch (error) {
    console.error('Failed to list exports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list exports',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /export/download/{filename}:
 *   get:
 *     summary: Download exported file
 *     tags: [Data Export]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/download/:filename', [
  param('filename')
    .isString()
    .matches(/^[a-zA-Z0-9_\-\.]+$/)
    .withMessage('Invalid filename format')
], async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.env.EXPORT_PATH || './exports', filename);
    
    // Security check: ensure file is within export directory
    const resolvedPath = path.resolve(filePath);
    const exportDir = path.resolve(process.env.EXPORT_PATH || './exports');
    
    if (!resolvedPath.startsWith(exportDir)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Set appropriate headers
    const stats = fs.statSync(resolvedPath);
    const ext = path.extname(filename).toLowerCase();
    
    let contentType = 'application/octet-stream';
    switch (ext) {
      case '.csv':
        contentType = 'text/csv';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.xml':
        contentType = 'application/xml';
        break;
      case '.zip':
        contentType = 'application/zip';
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);
    
    // Stream the file
    const readStream = fs.createReadStream(resolvedPath);
    readStream.pipe(res);
    
    readStream.on('error', (error) => {
      console.error('File streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to stream file'
        });
      }
    });
    
  } catch (error) {
    console.error('File download failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /export/delete/{filename}:
 *   delete:
 *     summary: Delete exported file
 *     tags: [Data Export]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 */
router.delete('/delete/:filename', [
  param('filename')
    .isString()
    .matches(/^[a-zA-Z0-9_\-\.]+$/)
    .withMessage('Invalid filename format')
], async (req, res) => {
  try {
    const { filename } = req.params;
    await dataExportService.deleteExport(filename);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
    
  } catch (error) {
    console.error('File deletion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /export/quick:
 *   post:
 *     summary: Quick export with predefined options
 *     tags: [Data Export]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stationId:
 *                 type: string
 *               timeRange:
 *                 type: string
 *                 enum: [1h, 6h, 24h, 7d, 30d]
 *               format:
 *                 type: string
 *                 enum: [csv, json, xlsx]
 *                 default: csv
 *     responses:
 *       202:
 *         description: Quick export created
 */
router.post('/quick', [
  body('stationId')
    .isString()
    .withMessage('Station ID is required'),
  body('timeRange')
    .isIn(['1h', '6h', '24h', '7d', '30d'])
    .withMessage('Time range must be 1h, 6h, 24h, 7d, or 30d'),
  body('format')
    .optional()
    .isIn(['csv', 'json', 'xlsx'])
    .withMessage('Format must be csv, json, or xlsx')
], async (req, res) => {
  try {
    const { stationId, timeRange, format = 'csv' } = req.body;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '1h':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case '6h':
        startDate.setHours(startDate.getHours() - 6);
        break;
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }
    
    const exportOptions = {
      stations: [stationId],
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      format,
      parameters: ['temperature', 'humidity', 'pressure', 'wind_speed'],
      includeAlerts: true,
      includeMetadata: true
    };
    
    const exportResult = await dataExportService.exportData(exportOptions);
    
    res.status(202).json({
      success: true,
      exportId: exportResult.id,
      message: `Quick export created for ${stationId} (${timeRange})`,
      statusUrl: `/api/export/status/${exportResult.id}`
    });
    
  } catch (error) {
    console.error('Quick export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create quick export',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /export/template/{templateName}:
 *   post:
 *     summary: Export using predefined template
 *     tags: [Data Export]
 *     parameters:
 *       - in: path
 *         name: templateName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily_report, weekly_summary, monthly_archive, alert_history]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stations:
 *                 type: array
 *                 items:
 *                   type: string
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Reference date for the template
 *     responses:
 *       202:
 *         description: Template export created
 */
router.post('/template/:templateName', [
  param('templateName')
    .isIn(['daily_report', 'weekly_summary', 'monthly_archive', 'alert_history'])
    .withMessage('Invalid template name'),
  body('stations')
    .isArray({ min: 1 })
    .withMessage('At least one station is required'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be valid ISO 8601 format')
], async (req, res) => {
  try {
    const { templateName } = req.params;
    const { stations, date = new Date().toISOString() } = req.body;
    
    // Define template configurations
    const templates = {
      daily_report: {
        timeRange: 1, // 1 day
        format: 'xlsx',
        parameters: ['temperature', 'humidity', 'pressure', 'wind_speed', 'rainfall'],
        includeAlerts: true,
        includeMetadata: true,
        aggregation: 'hour'
      },
      weekly_summary: {
        timeRange: 7, // 7 days
        format: 'xlsx',
        parameters: ['temperature', 'humidity', 'pressure'],
        includeAlerts: true,
        includeMetadata: true,
        aggregation: 'day'
      },
      monthly_archive: {
        timeRange: 30, // 30 days
        format: 'csv',
        parameters: ['temperature', 'humidity', 'pressure', 'wind_speed'],
        includeAlerts: false,
        includeMetadata: false,
        aggregation: 'day',
        compression: 'zip'
      },
      alert_history: {
        timeRange: 7, // 7 days
        format: 'xlsx',
        parameters: [],
        includeAlerts: true,
        includeMetadata: true
      }
    };
    
    const template = templates[templateName];
    const referenceDate = new Date(date);
    const endDate = new Date(referenceDate);
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - template.timeRange);
    
    const exportOptions = {
      stations,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ...template
    };
    
    const exportResult = await dataExportService.exportData(exportOptions);
    
    res.status(202).json({
      success: true,
      exportId: exportResult.id,
      template: templateName,
      message: `Template export created: ${templateName}`,
      statusUrl: `/api/export/status/${exportResult.id}`
    });
    
  } catch (error) {
    console.error('Template export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template export',
      details: error.message
    });
  }
});

module.exports = router;