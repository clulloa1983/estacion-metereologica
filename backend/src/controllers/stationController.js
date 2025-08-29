const stationService = require('../services/stationService');
const logger = require('../config/logger');

/**
 * Get all stations with metadata
 */
const getAllStations = async (req, res) => {
  try {
    const stations = await stationService.getAllStations();
    
    res.json({
      success: true,
      stations,
      count: stations.length
    });
  } catch (error) {
    logger.error('Error getting all stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stations'
    });
  }
};

/**
 * Get station metadata by ID
 */
const getStationById = async (req, res) => {
  try {
    const { stationId } = req.params;
    const station = await stationService.getStationById(stationId);
    
    if (!station) {
      return res.status(404).json({
        success: false,
        error: `Station ${stationId} not found`
      });
    }
    
    res.json({
      success: true,
      station
    });
  } catch (error) {
    logger.error('Error getting station by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve station'
    });
  }
};

/**
 * Update station metadata
 */
const updateStationMetadata = async (req, res) => {
  try {
    const { stationId } = req.params;
    const updateData = req.body;
    
    const updatedStation = await stationService.updateStationMetadata(stationId, updateData);
    
    res.json({
      success: true,
      message: `Station ${stationId} updated successfully`,
      station: updatedStation
    });
  } catch (error) {
    logger.error('Error updating station metadata:', error);
    
    if (error.message.includes('Invalid station metadata')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update station metadata'
    });
  }
};

/**
 * Get stations within geographic bounds
 */
const getStationsInRegion = async (req, res) => {
  try {
    const { north, south, east, west } = req.query;
    
    // Validate required parameters
    if (!north || !south || !east || !west) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: north, south, east, west'
      });
    }
    
    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };
    
    const stations = await stationService.getStationsInRegion(bounds);
    
    res.json({
      success: true,
      stations,
      count: stations.length,
      bounds
    });
  } catch (error) {
    logger.error('Error getting stations in region:', error);
    
    if (error.message.includes('Invalid bounds')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stations in region'
    });
  }
};

/**
 * Get station statistics
 */
const getStationStats = async (req, res) => {
  try {
    const { stationId } = req.params;
    const stats = await stationService.getStationStats(stationId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error getting station stats:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve station statistics'
    });
  }
};

/**
 * Update station status
 */
const updateStationStatus = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    const updatedStation = await stationService.updateStationStatus(stationId, status);
    
    res.json({
      success: true,
      message: `Station ${stationId} status updated to ${status}`,
      station: updatedStation
    });
  } catch (error) {
    logger.error('Error updating station status:', error);
    
    if (error.message.includes('Invalid status')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update station status'
    });
  }
};

/**
 * Delete station metadata
 */
const deleteStationMetadata = async (req, res) => {
  try {
    const { stationId } = req.params;
    const deleted = await stationService.deleteStationMetadata(stationId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Station ${stationId} not found`
      });
    }
    
    res.json({
      success: true,
      message: `Station ${stationId} metadata deleted successfully`
    });
  } catch (error) {
    logger.error('Error deleting station metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete station metadata'
    });
  }
};

/**
 * Create new station metadata
 */
const createStationMetadata = async (req, res) => {
  try {
    const stationData = req.body;
    
    if (!stationData.station_id) {
      return res.status(400).json({
        success: false,
        error: 'station_id is required'
      });
    }
    
    // Check if station already exists
    const existingStation = await stationService.getStationById(stationData.station_id);
    if (existingStation) {
      return res.status(409).json({
        success: false,
        error: `Station ${stationData.station_id} already exists`
      });
    }
    
    const newStation = await stationService.updateStationMetadata(stationData.station_id, stationData);
    
    res.status(201).json({
      success: true,
      message: `Station ${stationData.station_id} created successfully`,
      station: newStation
    });
  } catch (error) {
    logger.error('Error creating station metadata:', error);
    
    if (error.message.includes('Invalid station metadata')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create station metadata'
    });
  }
};

module.exports = {
  getAllStations,
  getStationById,
  updateStationMetadata,
  getStationsInRegion,
  getStationStats,
  updateStationStatus,
  deleteStationMetadata,
  createStationMetadata
};