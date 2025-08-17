const monitoringService = require('../services/monitoringService');
const logger = require('../config/logger');

const getHealthStatus = async (req, res) => {
  try {
    const healthStatus = monitoringService.getHealthStatus();
    
    // Set HTTP status based on overall health
    const statusCode = healthStatus.overall === 'healthy' ? 200 : 
                      healthStatus.overall === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Error getting health status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve health status'
    });
  }
};

const getMetrics = async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve metrics'
    });
  }
};

const getDashboard = async (req, res) => {
  try {
    const dashboardData = monitoringService.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    logger.error('Error getting dashboard data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve dashboard data'
    });
  }
};

const getDetailedHealth = async (req, res) => {
  try {
    const { service } = req.params;
    const healthStatus = monitoringService.getHealthStatus();
    
    if (service && healthStatus.services[service]) {
      res.json({
        service: service,
        status: healthStatus.services[service],
        lastUpdated: healthStatus.lastUpdated
      });
    } else if (service) {
      res.status(404).json({
        error: 'Service Not Found',
        message: `Service '${service}' not found`
      });
    } else {
      res.json(healthStatus);
    }
  } catch (error) {
    logger.error('Error getting detailed health:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve detailed health information'
    });
  }
};

const getServiceStatus = async (req, res) => {
  try {
    const healthStatus = monitoringService.getHealthStatus();
    const servicesSummary = {
      total: 0,
      healthy: 0,
      unhealthy: 0,
      unknown: 0,
      services: {}
    };
    
    // Count main services
    Object.entries(healthStatus.services).forEach(([serviceName, status]) => {
      if (serviceName !== 'docker') {
        servicesSummary.total++;
        servicesSummary.services[serviceName] = {
          status: status.status,
          lastCheck: status.lastCheck
        };
        
        if (status.status === 'healthy') servicesSummary.healthy++;
        else if (status.status === 'unhealthy') servicesSummary.unhealthy++;
        else servicesSummary.unknown++;
      }
    });
    
    // Add Docker services
    if (healthStatus.services.docker) {
      Object.entries(healthStatus.services.docker).forEach(([serviceName, status]) => {
        servicesSummary.total++;
        servicesSummary.services[`docker_${serviceName}`] = {
          status: status.status,
          lastCheck: status.lastCheck,
          type: 'container'
        };
        
        if (status.status === 'healthy') servicesSummary.healthy++;
        else if (status.status === 'unhealthy') servicesSummary.unhealthy++;
        else servicesSummary.unknown++;
      });
    }
    
    servicesSummary.healthPercentage = servicesSummary.total > 0 ? 
      Math.round((servicesSummary.healthy / servicesSummary.total) * 100) : 0;
    
    res.json(servicesSummary);
  } catch (error) {
    logger.error('Error getting service status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve service status'
    });
  }
};

module.exports = {
  getHealthStatus,
  getMetrics,
  getDashboard,
  getDetailedHealth,
  getServiceStatus
};