/// <reference types="jest" />
import { BaseAgent, IAgentConfig, IAgentMessage } from '../base-agent';

class TestAgent extends BaseAgent {
  public testState: Map<string, any>;

  constructor(config: IAgentConfig) {
    super(config);
    this.testState = this.state;
  }

  protected async onInitialize(): Promise<void> {
    this.testState.set('initialized', true);
  }

  protected async onShutdown(): Promise<void> {
    this.testState.set('shutdown', true);
  }

  protected async onProcessMessage(message: IAgentMessage): Promise<any> {
    switch (message.type) {
      case 'TEST':
        return message.content;
      case 'ERROR':
        if (typeof message.content === 'object') {
          throw new Error('Unknown error occurred');
        }
        throw new Error(message.content);
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  const config: IAgentConfig = {
    id: 'test-agent',
    type: 'test',
    name: 'Test Agent',
    description: 'Test agent for unit tests',
    capabilities: ['test'],
    settings: {
      testSetting: true,
    },
    metadata: {
      created: Date.now(),
      lastActive: Date.now(),
      version: '1.0.0',
    },
    maxRetries: 3,
    timeout: 5000,
  };

  beforeEach(() => {
    agent = new TestAgent(config);
  });

  describe('Configuration', () => {
    it('should initialize with correct config', () => {
      expect(agent.getConfig()).toEqual(config);
    });

    it('should initialize with default values when optional fields are missing', () => {
      const minimalConfig: IAgentConfig = {
        id: 'minimal-agent',
        type: 'test',
        name: 'Minimal Agent',
        description: 'Minimal test agent',
      };
      const minimalAgent = new TestAgent(minimalConfig);
      expect(minimalAgent.getConfig()).toEqual({
        ...minimalConfig,
        capabilities: [],
      });
    });

    it('should get correct ID', () => {
      expect(agent.getId()).toBe(config.id);
    });

    it('should get correct name', () => {
      expect(agent.getName()).toBe(config.name);
    });

    it('should get correct capabilities', () => {
      expect(agent.getCapabilities()).toEqual(config.capabilities);
    });

    it('should check capability correctly', () => {
      expect(agent.hasCapability('test')).toBe(true);
      expect(agent.hasCapability('non-existent')).toBe(false);
    });

    it('should handle undefined capabilities', () => {
      const noCapConfig: IAgentConfig = {
        id: 'no-cap-agent',
        type: 'test',
        name: 'No Capabilities Agent',
        description: 'Test agent without capabilities',
      };
      const noCapAgent = new TestAgent(noCapConfig);
      expect(noCapAgent.hasCapability('test')).toBe(false);
      expect(noCapAgent.getCapabilities()).toEqual([]);
    });
  });

  describe('Lifecycle Management', () => {
    it('should initialize correctly', async () => {
      expect(agent['isRunning']).toBe(false);
      await agent.initialize();
      expect(agent['isRunning']).toBe(true);
      expect(agent.testState.get('initialized')).toBe(true);
    });

    it('should not initialize twice', async () => {
      await agent.initialize();
      agent.testState.set('initialized', false);
      await agent.initialize();
      expect(agent.testState.get('initialized')).toBe(false);
    });

    it('should shutdown correctly', async () => {
      await agent.initialize();
      expect(agent['isRunning']).toBe(true);
      await agent.shutdown();
      expect(agent['isRunning']).toBe(false);
      expect(agent.testState.get('shutdown')).toBe(true);
    });

    it('should not shutdown if not running', async () => {
      await agent.shutdown();
      expect(agent.testState.get('shutdown')).toBeUndefined();
    });

    it('should auto-initialize on message if not running', async () => {
      expect(agent['isRunning']).toBe(false);
      await agent.processMessage({ type: 'TEST', content: 'test' });
      expect(agent['isRunning']).toBe(true);
      expect(agent.testState.get('initialized')).toBe(true);
    });
  });

  describe('Message Processing', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should process message successfully', async () => {
      const response = await agent.processMessage({
        type: 'TEST',
        content: 'test data',
      });
      expect(response.success).toBe(true);
      expect(response.data).toBe('test data');
      expect(response.metadata).toBeDefined();
      expect(typeof response.metadata?.processingTime).toBe('number');
      expect(response.metadata?.timestamp).toBeDefined();
    });

    it('should handle error in message processing', async () => {
      const response = await agent.processMessage({
        type: 'ERROR',
        content: 'test error',
      });
      expect(response.success).toBe(false);
      expect(response.error).toBe('test error');
      expect(response.metadata).toBeDefined();
      expect(typeof response.metadata?.processingTime).toBe('number');
      expect(response.metadata?.timestamp).toBeDefined();
    });

    it('should handle unknown message type', async () => {
      const response = await agent.processMessage({
        type: 'UNKNOWN',
        content: 'test',
      });
      expect(response.success).toBe(false);
      expect(response.error).toBe('Unknown message type: UNKNOWN');
    });

    it('should handle message with metadata', async () => {
      const response = await agent.processMessage({
        type: 'TEST',
        content: 'test data',
        metadata: {
          timestamp: Date.now(),
          sender: 'test-sender',
          recipient: 'test-agent',
          priority: 1,
        },
      });
      expect(response.success).toBe(true);
      expect(response.data).toBe('test data');
    });

    it('should handle non-Error objects in catch block', async () => {
      const response = await agent.processMessage({
        type: 'ERROR',
        content: { customError: true },
      });
      expect(response.success).toBe(false);
      expect(response.error).toBe('Unknown error occurred');
    });
  });

  describe('Event Handling', () => {
    it('should emit and handle events', (done) => {
      agent.on('test-event', (data) => {
        expect(data).toBe('test data');
        done();
      });
      agent.emit('test-event', 'test data');
    });

    it('should handle multiple event listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      agent.on('test-event', listener1);
      agent.on('test-event', listener2);
      agent.emit('test-event', 'test data');

      expect(listener1).toHaveBeenCalledWith('test data');
      expect(listener2).toHaveBeenCalledWith('test data');
    });

    it('should remove event listeners', () => {
      const listener = jest.fn();

      agent.on('test-event', listener);
      agent.emit('test-event', 'test data');
      expect(listener).toHaveBeenCalledTimes(1);

      agent.removeListener('test-event', listener);
      agent.emit('test-event', 'test data');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
}); 