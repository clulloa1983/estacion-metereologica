const cacheService = require('../../src/services/cacheService');
const redis = require('redis');

// Mock Redis
jest.mock('redis');
jest.mock('../../src/config/logger');

describe('CacheService', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      on: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      keys: jest.fn()
    };

    redis.createClient.mockReturnValue(mockClient);
    
    // Reset cache service state
    cacheService.client = null;
    cacheService.isConnected = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to Redis successfully', async () => {
      mockClient.connect.mockResolvedValue();

      await cacheService.connect();

      expect(redis.createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379'
      });
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('end', expect.any(Function));
    });

    it('should use custom Redis URL from environment', async () => {
      process.env.REDIS_URL = 'redis://custom:6379';
      mockClient.connect.mockResolvedValue();

      await cacheService.connect();

      expect(redis.createClient).toHaveBeenCalledWith({
        url: 'redis://custom:6379'
      });

      delete process.env.REDIS_URL;
    });

    it('should handle connection errors', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));

      await cacheService.connect();

      expect(cacheService.isConnected).toBe(false);
    });

    it('should handle error events', async () => {
      mockClient.connect.mockResolvedValue();
      let errorHandler;
      mockClient.on.mockImplementation((event, handler) => {
        if (event === 'error') errorHandler = handler;
      });

      await cacheService.connect();
      
      // Simulate error event
      errorHandler(new Error('Redis error'));
      
      expect(cacheService.isConnected).toBe(false);
    });

    it('should handle connect events', async () => {
      mockClient.connect.mockResolvedValue();
      let connectHandler;
      mockClient.on.mockImplementation((event, handler) => {
        if (event === 'connect') connectHandler = handler;
      });

      await cacheService.connect();
      
      // Simulate connect event
      connectHandler();
      
      expect(cacheService.isConnected).toBe(true);
    });

    it('should handle ready events', async () => {
      mockClient.connect.mockResolvedValue();
      let readyHandler;
      mockClient.on.mockImplementation((event, handler) => {
        if (event === 'ready') readyHandler = handler;
      });

      await cacheService.connect();
      
      // Simulate ready event
      readyHandler();
      
      expect(cacheService.isConnected).toBe(true);
    });

    it('should handle end events', async () => {
      mockClient.connect.mockResolvedValue();
      let endHandler;
      mockClient.on.mockImplementation((event, handler) => {
        if (event === 'end') endHandler = handler;
      });

      await cacheService.connect();
      
      // Simulate end event
      endHandler();
      
      expect(cacheService.isConnected).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect when connected', async () => {
      cacheService.client = mockClient;
      cacheService.isConnected = true;
      mockClient.disconnect.mockResolvedValue();

      await cacheService.disconnect();

      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should not disconnect when not connected', async () => {
      cacheService.client = mockClient;
      cacheService.isConnected = false;

      await cacheService.disconnect();

      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should not disconnect when client is null', async () => {
      cacheService.client = null;
      cacheService.isConnected = true;

      await cacheService.disconnect();

      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    beforeEach(() => {
      cacheService.client = mockClient;
      cacheService.isConnected = true;
    });

    it('should return parsed data on cache hit', async () => {
      const testData = { temperature: 25, humidity: 60 };
      mockClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test:key');

      expect(mockClient.get).toHaveBeenCalledWith('test:key');
      expect(result).toEqual(testData);
    });

    it('should return null on cache miss', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await cacheService.get('test:key');

      expect(result).toBeNull();
    });

    it('should return null when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.get('test:key');

      expect(result).toBeNull();
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('should return null when client is null', async () => {
      cacheService.client = null;

      const result = await cacheService.get('test:key');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('test:key');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockClient.get.mockResolvedValue('invalid-json');

      const result = await cacheService.get('test:key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    beforeEach(() => {
      cacheService.client = mockClient;
      cacheService.isConnected = true;
    });

    it('should set data with default TTL', async () => {
      const testData = { temperature: 25 };
      mockClient.setEx.mockResolvedValue('OK');

      const result = await cacheService.set('test:key', testData);

      expect(mockClient.setEx).toHaveBeenCalledWith('test:key', 300, JSON.stringify(testData));
      expect(result).toBe(true);
    });

    it('should set data with custom TTL', async () => {
      const testData = { temperature: 25 };
      mockClient.setEx.mockResolvedValue('OK');

      const result = await cacheService.set('test:key', testData, 600);

      expect(mockClient.setEx).toHaveBeenCalledWith('test:key', 600, JSON.stringify(testData));
      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.set('test:key', {});

      expect(result).toBe(false);
      expect(mockClient.setEx).not.toHaveBeenCalled();
    });

    it('should return false when client is null', async () => {
      cacheService.client = null;

      const result = await cacheService.set('test:key', {});

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockClient.setEx.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.set('test:key', {});

      expect(result).toBe(false);
    });
  });

  describe('del', () => {
    beforeEach(() => {
      cacheService.client = mockClient;
      cacheService.isConnected = true;
    });

    it('should delete key successfully', async () => {
      mockClient.del.mockResolvedValue(1);

      const result = await cacheService.del('test:key');

      expect(mockClient.del).toHaveBeenCalledWith('test:key');
      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.del('test:key');

      expect(result).toBe(false);
      expect(mockClient.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockClient.del.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.del('test:key');

      expect(result).toBe(false);
    });
  });

  describe('invalidatePattern', () => {
    beforeEach(() => {
      cacheService.client = mockClient;
      cacheService.isConnected = true;
    });

    it('should invalidate keys matching pattern', async () => {
      const keys = ['weather:latest:station1', 'weather:latest:station2'];
      mockClient.keys.mockResolvedValue(keys);
      mockClient.del.mockResolvedValue(2);

      const result = await cacheService.invalidatePattern('weather:latest:*');

      expect(mockClient.keys).toHaveBeenCalledWith('weather:latest:*');
      expect(mockClient.del).toHaveBeenCalledWith(keys);
      expect(result).toBe(true);
    });

    it('should handle no matching keys', async () => {
      mockClient.keys.mockResolvedValue([]);

      const result = await cacheService.invalidatePattern('weather:latest:*');

      expect(mockClient.keys).toHaveBeenCalledWith('weather:latest:*');
      expect(mockClient.del).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.invalidatePattern('test:*');

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockClient.keys.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.invalidatePattern('test:*');

      expect(result).toBe(false);
    });
  });

  describe('Key Generators', () => {
    it('should generate correct base key', () => {
      const key = cacheService.generateKey('test', 'param1', 'param2');
      expect(key).toBe('weather:test:param1:param2');
    });

    it('should generate latest data key', () => {
      const key = cacheService.getLatestDataKey('STATION_001');
      expect(key).toBe('weather:latest:STATION_001');
    });

    it('should generate historical data key', () => {
      const key = cacheService.getHistoricalDataKey('STATION_001', '2024-01-01', '2024-01-02', 'hourly', 100);
      expect(key).toBe('weather:historical:STATION_001:2024-01-01:2024-01-02:hourly:100');
    });

    it('should generate historical data key with default aggregation', () => {
      const key = cacheService.getHistoricalDataKey('STATION_001', '2024-01-01', '2024-01-02', null, 100);
      expect(key).toBe('weather:historical:STATION_001:2024-01-01:2024-01-02:none:100');
    });

    it('should generate summary key', () => {
      const key = cacheService.getSummaryKey('STATION_001', '2024-01-01', '2024-01-02');
      expect(key).toBe('weather:summary:STATION_001:2024-01-01:2024-01-02');
    });

    it('should generate stations key', () => {
      const key = cacheService.getStationsKey();
      expect(key).toBe('weather:stations:list');
    });
  });

  describe('TTL Constants', () => {
    it('should have correct TTL values', () => {
      expect(cacheService.constructor.TTL.LATEST_DATA).toBe(30);
      expect(cacheService.constructor.TTL.HISTORICAL_SHORT).toBe(300);
      expect(cacheService.constructor.TTL.HISTORICAL_LONG).toBe(900);
      expect(cacheService.constructor.TTL.SUMMARY).toBe(3600);
      expect(cacheService.constructor.TTL.STATIONS).toBe(1800);
    });
  });
});