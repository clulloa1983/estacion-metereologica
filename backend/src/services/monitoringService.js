const redis = require('redis');
const mqtt = require('mqtt');
const { queryApi } = require('../config/influxdb');
const logger = require('../config/logger');

class MonitoringService {
  constructor() {
    this.healthStatus = {
      api: { status: 'unknown', lastCheck: null, uptime: 0 },
      influxdb: { status: 'unknown', lastCheck: null, latency: 0 },
      redis: { status: 'unknown', lastCheck: null, latency: 0 },
      mqtt: { status: 'unknown', lastCheck: null, latency: 0 },
      docker: {
        influxdb: { status: 'unknown', lastCheck: null },
        grafana: { status: 'unknown', lastCheck: null },
        redis: { status: 'unknown', lastCheck: null },
        mosquitto: { status: 'unknown', lastCheck: null }
      }
    };
    
    this.metrics = {
      requestsPerMinute: 0,
      dataPointsPerHour: 0,
      alertsLast24h: 0,
      activeStations: 0,
      systemLoad: {
        cpu: 0,
        memory: 0,
        disk: 0
      }
    };

    this.startTime = Date.now();
    this.lastMetricsUpdate = Date.now();
    
    // Start monitoring intervals
    this.startHealthChecks();
    this.startMetricsCollection();
  }

  startHealthChecks() {
    // Check services every 30 seconds
    setInterval(() => {
      this.checkAllServices();
    }, 30000);
    
    // Initial check
    this.checkAllServices();
  }

  startMetricsCollection() {
    // Update metrics every 5 minutes
    setInterval(() => {
      this.updateMetrics();
    }, 5 * 60 * 1000);
    
    // Initial metrics collection
    this.updateMetrics();
  }

  async checkAllServices() {
    const checks = [
      this.checkAPI(),
      this.checkInfluxDB(),
      this.checkRedis(),
      this.checkMQTT(),
      this.checkDockerServices()
    ];

    try {
      await Promise.allSettled(checks);
    } catch (error) {
      logger.error('Error during health checks:', error);
    }
  }

  checkAPI() {
    try {
      this.healthStatus.api = {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        memoryUsage: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      };
    } catch (error) {
      this.healthStatus.api = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }

  async checkInfluxDB() {
    const start = Date.now();
    try {
      // Simple query to test connection
      await new Promise((resolve, reject) => {
        queryApi.queryRows('buckets()', {
          next: () => {},
          error: reject,
          complete: resolve
        });
      });

      const latency = Date.now() - start;
      this.healthStatus.influxdb = {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        latency: latency,
        responseTime: `${latency}ms`
      };
    } catch (error) {
      this.healthStatus.influxdb = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error.message,
        latency: Date.now() - start
      };
    }
  }

  async checkRedis() {
    const start = Date.now();
    let client = null;
    
    try {
      client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      await client.connect();
      await client.ping();
      
      const latency = Date.now() - start;
      this.healthStatus.redis = {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        latency: latency,
        responseTime: `${latency}ms`
      };
    } catch (error) {
      this.healthStatus.redis = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error.message,
        latency: Date.now() - start
      };
    } finally {
      if (client) {
        try {
          await client.disconnect();
        } catch (disconnectError) {
          // Ignore disconnect errors
        }
      }
    }
  }

  async checkMQTT() {
    const start = Date.now();
    return new Promise((resolve) => {
      try {
        const client = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883', {
          connectTimeout: 5000,
          reconnectPeriod: 0 // Don't reconnect for health check
        });

        const timeout = setTimeout(() => {
          client.end(true);
          this.healthStatus.mqtt = {
            status: 'unhealthy',
            lastCheck: new Date().toISOString(),
            error: 'Connection timeout',
            latency: Date.now() - start
          };
          resolve();
        }, 5000);

        client.on('connect', () => {
          clearTimeout(timeout);
          const latency = Date.now() - start;
          
          this.healthStatus.mqtt = {
            status: 'healthy',
            lastCheck: new Date().toISOString(),
            latency: latency,
            responseTime: `${latency}ms`
          };
          
          client.end();
          resolve();
        });

        client.on('error', (error) => {
          clearTimeout(timeout);
          this.healthStatus.mqtt = {
            status: 'unhealthy',
            lastCheck: new Date().toISOString(),
            error: error.message,
            latency: Date.now() - start
          };
          resolve();
        });
      } catch (error) {
        this.healthStatus.mqtt = {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          error: error.message,
          latency: Date.now() - start
        };
        resolve();
      }
    });
  }

  async checkDockerServices() {
    // This would typically use Docker API, but for now we'll simulate
    // In a real implementation, you'd use dockerode or similar
    try {
      const services = ['influxdb', 'grafana', 'redis', 'mosquitto'];
      
      for (const service of services) {
        // Simulate docker health check status
        // In reality, you'd call: docker inspect --format='{{.State.Health.Status}}' container_name
        this.healthStatus.docker[service] = {
          status: Math.random() > 0.1 ? 'healthy' : 'unhealthy', // 90% healthy simulation
          lastCheck: new Date().toISOString(),
          containerId: `${service}_container_id`,
          image: this.getServiceImage(service)
        };
      }
    } catch (error) {
      logger.error('Error checking Docker services:', error);
    }
  }

  getServiceImage(service) {
    const images = {
      influxdb: 'influxdb:2.7',
      grafana: 'grafana/grafana:latest',
      redis: 'redis:7-alpine',
      mosquitto: 'eclipse-mosquitto:2'
    };
    return images[service] || 'unknown';
  }

  async updateMetrics() {
    try {
      // Update request metrics (would come from middleware)
      this.metrics.requestsPerMinute = this.calculateRequestsPerMinute();
      
      // Query InfluxDB for data points
      this.metrics.dataPointsPerHour = await this.getDataPointsPerHour();
      
      // Get alerts count
      this.metrics.alertsLast24h = await this.getAlertsCount();
      
      // Get active stations
      this.metrics.activeStations = await this.getActiveStations();
      
      // System metrics
      this.metrics.systemLoad = this.getSystemLoad();
      
      this.lastMetricsUpdate = Date.now();
      
      logger.info('Metrics updated successfully', this.metrics);
    } catch (error) {
      logger.error('Error updating metrics:', error);
    }
  }

  calculateRequestsPerMinute() {
    // This would be implemented with actual request counting
    // For now, return a simulated value
    return Math.floor(Math.random() * 100) + 10;
  }

  async getDataPointsPerHour() {
    try {
      const query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET || 'weather-data'}")
          |> range(start: -1h)
          |> filter(fn: (r) => r._measurement == "weather")
          |> count()
      `;
      
      let count = 0;
      return new Promise((resolve, reject) => {
        queryApi.queryRows(query, {
          next: (row, tableMeta) => {
            const o = tableMeta.toObject(row);
            count += o._value || 0;
          },
          error: reject,
          complete: () => resolve(count)
        });
      });
    } catch (error) {
      logger.error('Error getting data points:', error);
      return 0;
    }
  }

  async getAlertsCount() {
    try {
      const query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET || 'weather-data'}")
          |> range(start: -24h)
          |> filter(fn: (r) => r._measurement == "alerts")
          |> count()
      `;
      
      let count = 0;
      return new Promise((resolve, reject) => {
        queryApi.queryRows(query, {
          next: (row, tableMeta) => {
            const o = tableMeta.toObject(row);
            count += o._value || 0;
          },
          error: reject,
          complete: () => resolve(count)
        });
      });
    } catch (error) {
      logger.error('Error getting alerts count:', error);
      return 0;
    }
  }

  async getActiveStations() {
    try {
      const query = `
        from(bucket: "${process.env.INFLUXDB_BUCKET || 'weather-data'}")
          |> range(start: -1h)
          |> filter(fn: (r) => r._measurement == "weather")
          |> group(columns: ["station_id"])
          |> distinct(column: "station_id")
          |> count()
      `;
      
      let count = 0;
      return new Promise((resolve, reject) => {
        queryApi.queryRows(query, {
          next: (row, tableMeta) => {
            count++;
          },
          error: reject,
          complete: () => resolve(count)
        });
      });
    } catch (error) {
      logger.error('Error getting active stations:', error);
      return 1; // Default to 1 if error
    }
  }

  getSystemLoad() {
    const usage = process.memoryUsage();
    const totalMem = process.env.SYSTEM_MEMORY || 8 * 1024 * 1024 * 1024; // 8GB default
    
    return {
      cpu: Math.round(process.cpuUsage().user / 1000000), // Convert to percentage approximation
      memory: Math.round((usage.heapUsed / totalMem) * 100),
      disk: Math.round(Math.random() * 30 + 20), // Simulated disk usage
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    };
  }

  getHealthStatus() {
    return {
      overall: this.calculateOverallHealth(),
      services: this.healthStatus,
      lastUpdated: new Date().toISOString()
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      lastUpdated: new Date(this.lastMetricsUpdate).toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }

  calculateOverallHealth() {
    const services = [
      this.healthStatus.api.status,
      this.healthStatus.influxdb.status,
      this.healthStatus.redis.status,
      this.healthStatus.mqtt.status
    ];
    
    const healthy = services.filter(status => status === 'healthy').length;
    const total = services.length;
    
    if (healthy === total) return 'healthy';
    if (healthy >= total * 0.7) return 'degraded';
    return 'unhealthy';
  }

  getDashboardData() {
    return {
      health: this.getHealthStatus(),
      metrics: this.getMetrics(),
      summary: {
        totalServices: 4,
        healthyServices: Object.values(this.healthStatus).filter(s => s.status === 'healthy').length,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        version: process.env.npm_package_version || '1.0.0'
      }
    };
  }
}

module.exports = new MonitoringService();