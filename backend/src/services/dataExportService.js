const fs = require('fs').promises;
const path = require('path');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const influxClient = require('../config/influxdb');
const logger = require('../config/logger');
const cacheService = require('./cacheService');

/**
 * Data Export Service
 * Provides comprehensive data export functionality with multiple formats and options
 */

class DataExportService {
  constructor() {
    this.exportPath = process.env.EXPORT_PATH || './exports';
    this.maxExportRows = parseInt(process.env.MAX_EXPORT_ROWS) || 100000;
    this.supportedFormats = ['csv', 'json', 'xlsx', 'xml'];
    this.compressionFormats = ['zip', 'gzip'];
    
    this.initializeExportDirectory();
  }

  async initializeExportDirectory() {
    try {
      await fs.mkdir(this.exportPath, { recursive: true });
      logger.info(`Export directory initialized: ${this.exportPath}`);
    } catch (error) {
      logger.error('Failed to initialize export directory:', error);
    }
  }

  /**
   * Main export method - handles multiple stations and formats
   */
  async exportData(options) {
    try {
      const {
        stations = [],
        startDate,
        endDate,
        parameters = [],
        format = 'csv',
        includeAlerts = false,
        includeMetadata = false,
        aggregation = null, // 'minute', 'hour', 'day'
        compression = null,
        customFilters = {},
        maxRows = this.maxExportRows,
        timezone = 'UTC'
      } = options;

      // Validate options
      this.validateExportOptions(options);

      // Generate unique export ID
      const exportId = this.generateExportId(options);
      
      // Create export metadata
      const exportMetadata = {
        id: exportId,
        timestamp: new Date().toISOString(),
        options: options,
        status: 'processing',
        progress: 0
      };

      // Cache export status
      await cacheService.set(`export:${exportId}`, exportMetadata, 3600); // 1 hour

      try {
        // Fetch data from InfluxDB
        const weatherData = await this.fetchWeatherData({
          stations,
          startDate,
          endDate,
          parameters,
          aggregation,
          customFilters,
          maxRows,
          timezone
        });

        exportMetadata.progress = 50;
        exportMetadata.rowCount = weatherData.length;
        await cacheService.set(`export:${exportId}`, exportMetadata, 3600);

        // Fetch alerts if requested
        let alertsData = [];
        if (includeAlerts) {
          alertsData = await this.fetchAlertsData({
            stations,
            startDate,
            endDate,
            maxRows
          });
        }

        exportMetadata.progress = 70;
        await cacheService.set(`export:${exportId}`, exportMetadata, 3600);

        // Fetch metadata if requested
        let metadataInfo = {};
        if (includeMetadata) {
          metadataInfo = await this.fetchStationMetadata(stations);
        }

        // Format and export data
        const exportResult = await this.formatAndExportData({
          exportId,
          format,
          weatherData,
          alertsData,
          metadataInfo,
          compression,
          options
        });

        exportMetadata.status = 'completed';
        exportMetadata.progress = 100;
        exportMetadata.filePath = exportResult.filePath;
        exportMetadata.fileSize = exportResult.fileSize;
        exportMetadata.downloadUrl = exportResult.downloadUrl;
        
        await cacheService.set(`export:${exportId}`, exportMetadata, 24 * 3600); // 24 hours

        return exportMetadata;

      } catch (error) {
        exportMetadata.status = 'failed';
        exportMetadata.error = error.message;
        await cacheService.set(`export:${exportId}`, exportMetadata, 3600);
        throw error;
      }

    } catch (error) {
      logger.error('Data export failed:', error);
      throw error;
    }
  }

  /**
   * Fetch weather data from InfluxDB with filters and aggregation
   */
  async fetchWeatherData(options) {
    const {
      stations,
      startDate,
      endDate,
      parameters,
      aggregation,
      customFilters,
      maxRows,
      timezone
    } = options;

    try {
      let query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: ${startDate}, stop: ${endDate})
          |> filter(fn: (r) => r["_measurement"] == "weather")
      `;

      // Filter by stations
      if (stations.length > 0) {
        const stationFilter = stations.map(s => `r["station_id"] == "${s}"`).join(' or ');
        query += `\n  |> filter(fn: (r) => ${stationFilter})`;
      }

      // Filter by parameters
      if (parameters.length > 0) {
        const paramFilter = parameters.map(p => `r["_field"] == "${p}"`).join(' or ');
        query += `\n  |> filter(fn: (r) => ${paramFilter})`;
      }

      // Apply custom filters
      Object.entries(customFilters).forEach(([field, condition]) => {
        if (condition.min !== undefined) {
          query += `\n  |> filter(fn: (r) => r["${field}"] >= ${condition.min})`;
        }
        if (condition.max !== undefined) {
          query += `\n  |> filter(fn: (r) => r["${field}"] <= ${condition.max})`;
        }
      });

      // Apply aggregation if specified
      if (aggregation) {
        const aggregationMap = {
          'minute': '1m',
          'hour': '1h',
          'day': '1d'
        };
        const window = aggregationMap[aggregation];
        
        query += `
          |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
          |> yield(name: "mean")
        `;
      }

      // Pivot and limit
      query += `
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> limit(n: ${maxRows})
      `;

      const data = [];
      
      return new Promise((resolve, reject) => {
        influxClient.queryApi.queryRows(query, {
          next: (row, tableMeta) => {
            const record = tableMeta.toObject(row);
            
            // Convert timezone if needed
            if (timezone !== 'UTC') {
              record._time = this.convertTimezone(record._time, timezone);
            }
            
            data.push(record);
          },
          error: (error) => {
            logger.error('InfluxDB query failed:', error);
            reject(error);
          },
          complete: () => {
            logger.info(`Fetched ${data.length} weather data records`);
            resolve(data);
          },
        });
      });

    } catch (error) {
      logger.error('Failed to fetch weather data:', error);
      throw error;
    }
  }

  /**
   * Fetch alerts data
   */
  async fetchAlertsData(options) {
    const { stations, startDate, endDate, maxRows } = options;

    try {
      let query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: ${startDate}, stop: ${endDate})
          |> filter(fn: (r) => r["_measurement"] == "alerts")
      `;

      if (stations.length > 0) {
        const stationFilter = stations.map(s => `r["station_id"] == "${s}"`).join(' or ');
        query += `\n  |> filter(fn: (r) => ${stationFilter})`;
      }

      query += `\n  |> limit(n: ${maxRows})`;

      const data = [];
      
      return new Promise((resolve, reject) => {
        influxClient.queryApi.queryRows(query, {
          next: (row, tableMeta) => {
            data.push(tableMeta.toObject(row));
          },
          error: (error) => {
            logger.error('Failed to fetch alerts data:', error);
            reject(error);
          },
          complete: () => {
            logger.info(`Fetched ${data.length} alert records`);
            resolve(data);
          },
        });
      });

    } catch (error) {
      logger.error('Failed to fetch alerts data:', error);
      return [];
    }
  }

  /**
   * Fetch station metadata
   */
  async fetchStationMetadata(stations) {
    try {
      const stationService = require('./stationService');
      const metadata = {};
      
      for (const stationId of stations) {
        try {
          const stationData = await stationService.getStationById(stationId);
          if (stationData) {
            metadata[stationId] = stationData;
          }
        } catch (error) {
          logger.warn(`Failed to fetch metadata for station ${stationId}:`, error);
          metadata[stationId] = { error: 'Metadata not available' };
        }
      }
      
      return metadata;
    } catch (error) {
      logger.error('Failed to fetch station metadata:', error);
      return {};
    }
  }

  /**
   * Format and export data based on specified format
   */
  async formatAndExportData(options) {
    const {
      exportId,
      format,
      weatherData,
      alertsData,
      metadataInfo,
      compression,
      options: exportOptions
    } = options;

    const fileName = `weather_export_${exportId}`;
    const exportData = {
      export_info: {
        id: exportId,
        timestamp: new Date().toISOString(),
        options: exportOptions,
        record_counts: {
          weather: weatherData.length,
          alerts: alertsData.length,
          stations: Object.keys(metadataInfo).length
        }
      },
      weather_data: weatherData,
      alerts: alertsData,
      station_metadata: metadataInfo
    };

    let filePath;
    
    switch (format) {
      case 'csv':
        filePath = await this.exportToCSV(fileName, exportData);
        break;
      case 'json':
        filePath = await this.exportToJSON(fileName, exportData);
        break;
      case 'xlsx':
        filePath = await this.exportToExcel(fileName, exportData);
        break;
      case 'xml':
        filePath = await this.exportToXML(fileName, exportData);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    // Apply compression if requested
    if (compression) {
      filePath = await this.compressFile(filePath, compression);
    }

    const fileStats = await fs.stat(filePath);
    
    return {
      filePath,
      fileSize: fileStats.size,
      downloadUrl: `/api/export/download/${path.basename(filePath)}`
    };
  }

  /**
   * Export to CSV format
   */
  async exportToCSV(fileName, data) {
    try {
      const filePath = path.join(this.exportPath, `${fileName}.csv`);
      
      // Create separate CSV files for different data types
      const files = [];
      
      // Weather data CSV
      if (data.weather_data.length > 0) {
        const weatherParser = new Parser();
        const weatherCsv = weatherParser.parse(data.weather_data);
        const weatherPath = path.join(this.exportPath, `${fileName}_weather.csv`);
        await fs.writeFile(weatherPath, weatherCsv);
        files.push(weatherPath);
      }
      
      // Alerts CSV
      if (data.alerts.length > 0) {
        const alertsParser = new Parser();
        const alertsCsv = alertsParser.parse(data.alerts);
        const alertsPath = path.join(this.exportPath, `${fileName}_alerts.csv`);
        await fs.writeFile(alertsPath, alertsCsv);
        files.push(alertsPath);
      }
      
      // If multiple files, create a zip
      if (files.length > 1) {
        return await this.createZipArchive(files, `${fileName}.zip`);
      } else if (files.length === 1) {
        return files[0];
      } else {
        throw new Error('No data to export');
      }
      
    } catch (error) {
      logger.error('CSV export failed:', error);
      throw error;
    }
  }

  /**
   * Export to JSON format
   */
  async exportToJSON(fileName, data) {
    try {
      const filePath = path.join(this.exportPath, `${fileName}.json`);
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonData);
      return filePath;
    } catch (error) {
      logger.error('JSON export failed:', error);
      throw error;
    }
  }

  /**
   * Export to Excel format
   */
  async exportToExcel(fileName, data) {
    try {
      const filePath = path.join(this.exportPath, `${fileName}.xlsx`);
      const workbook = new ExcelJS.Workbook();
      
      // Metadata sheet
      const infoSheet = workbook.addWorksheet('Export Info');
      infoSheet.addRow(['Export ID', data.export_info.id]);
      infoSheet.addRow(['Timestamp', data.export_info.timestamp]);
      infoSheet.addRow(['Weather Records', data.export_info.record_counts.weather]);
      infoSheet.addRow(['Alert Records', data.export_info.record_counts.alerts]);
      infoSheet.addRow(['Stations', data.export_info.record_counts.stations]);
      
      // Weather data sheet
      if (data.weather_data.length > 0) {
        const weatherSheet = workbook.addWorksheet('Weather Data');
        const headers = Object.keys(data.weather_data[0]);
        weatherSheet.addRow(headers);
        
        data.weather_data.forEach(record => {
          const row = headers.map(header => record[header]);
          weatherSheet.addRow(row);
        });
        
        // Auto-fit columns
        weatherSheet.columns.forEach(column => {
          column.width = 15;
        });
      }
      
      // Alerts sheet
      if (data.alerts.length > 0) {
        const alertsSheet = workbook.addWorksheet('Alerts');
        const alertHeaders = Object.keys(data.alerts[0]);
        alertsSheet.addRow(alertHeaders);
        
        data.alerts.forEach(alert => {
          const row = alertHeaders.map(header => alert[header]);
          alertsSheet.addRow(row);
        });
      }
      
      // Station metadata sheet
      if (Object.keys(data.station_metadata).length > 0) {
        const metaSheet = workbook.addWorksheet('Station Metadata');
        metaSheet.addRow(['Station ID', 'Name', 'Location', 'Status', 'Sensors']);
        
        Object.entries(data.station_metadata).forEach(([stationId, meta]) => {
          if (!meta.error) {
            metaSheet.addRow([
              stationId,
              meta.name || 'N/A',
              `${meta.location?.lat || 'N/A'}, ${meta.location?.lng || 'N/A'}`,
              meta.status || 'N/A',
              (meta.sensors || []).join(', ')
            ]);
          }
        });
      }
      
      await workbook.xlsx.writeFile(filePath);
      return filePath;
      
    } catch (error) {
      logger.error('Excel export failed:', error);
      throw error;
    }
  }

  /**
   * Export to XML format
   */
  async exportToXML(fileName, data) {
    try {
      const filePath = path.join(this.exportPath, `${fileName}.xml`);
      
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<weather_export>\n';
      
      // Export info
      xml += '  <export_info>\n';
      xml += `    <id>${data.export_info.id}</id>\n`;
      xml += `    <timestamp>${data.export_info.timestamp}</timestamp>\n`;
      xml += '  </export_info>\n';
      
      // Weather data
      xml += '  <weather_data>\n';
      data.weather_data.forEach(record => {
        xml += '    <record>\n';
        Object.entries(record).forEach(([key, value]) => {
          xml += `      <${key}>${this.escapeXml(value)}</${key}>\n`;
        });
        xml += '    </record>\n';
      });
      xml += '  </weather_data>\n';
      
      // Alerts
      xml += '  <alerts>\n';
      data.alerts.forEach(alert => {
        xml += '    <alert>\n';
        Object.entries(alert).forEach(([key, value]) => {
          xml += `      <${key}>${this.escapeXml(value)}</${key}>\n`;
        });
        xml += '    </alert>\n';
      });
      xml += '  </alerts>\n';
      
      xml += '</weather_export>';
      
      await fs.writeFile(filePath, xml);
      return filePath;
      
    } catch (error) {
      logger.error('XML export failed:', error);
      throw error;
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId) {
    try {
      const status = await cacheService.get(`export:${exportId}`);
      return status || { error: 'Export not found' };
    } catch (error) {
      logger.error('Failed to get export status:', error);
      throw error;
    }
  }

  /**
   * List available exports
   */
  async listExports(userId = null) {
    try {
      const files = await fs.readdir(this.exportPath);
      const exports = [];
      
      for (const file of files) {
        const filePath = path.join(this.exportPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          exports.push({
            filename: file,
            size: stats.size,
            created: stats.mtime,
            downloadUrl: `/api/export/download/${file}`
          });
        }
      }
      
      return exports.sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('Failed to list exports:', error);
      throw error;
    }
  }

  /**
   * Delete export file
   */
  async deleteExport(filename) {
    try {
      const filePath = path.join(this.exportPath, filename);
      await fs.unlink(filePath);
      logger.info(`Deleted export file: ${filename}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete export:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  validateExportOptions(options) {
    const { format, stations, startDate, endDate } = options;
    
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    if (!stations || !Array.isArray(stations) || stations.length === 0) {
      throw new Error('At least one station must be specified');
    }
    
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    
    if (new Date(startDate) >= new Date(endDate)) {
      throw new Error('Start date must be before end date');
    }
  }

  generateExportId(options) {
    const timestamp = Date.now();
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(options))
      .digest('hex')
      .substring(0, 8);
    
    return `${timestamp}_${hash}`;
  }

  convertTimezone(utcTime, timezone) {
    // Simplified timezone conversion
    // Real implementation would use a proper timezone library
    return utcTime;
  }

  escapeXml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async compressFile(filePath, compressionType) {
    // Placeholder for compression implementation
    // Would implement gzip, zip compression here
    return filePath;
  }

  async createZipArchive(files, zipName) {
    // Placeholder for zip archive creation
    // Would create zip file containing all specified files
    return files[0]; // Return first file for now
  }
}

// Create singleton instance
const dataExportService = new DataExportService();

module.exports = dataExportService;