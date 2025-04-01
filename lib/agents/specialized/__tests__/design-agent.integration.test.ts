/// <reference types="jest" />
import { DesignAgent } from '../design-agent';
import { IAgentConfig } from '../../base-agent';
import { EventEmitter } from 'events';

describe('DesignAgent Integration', () => {
  let agent: DesignAgent;
  let eventEmitter: EventEmitter;
  const config: IAgentConfig = {
    id: 'test-design-agent',
    type: 'design',
    name: 'Test Design Agent',
    description: 'Test agent for design operations',
    capabilities: ['design_analysis', 'style_generation'],
  };

  beforeEach(async () => {
    eventEmitter = new EventEmitter();
    agent = new DesignAgent(config);
    await agent.initialize();
  });

  afterEach(async () => {
    await agent.shutdown();
  });

  describe('Agent Lifecycle', () => {
    it('should initialize and shutdown properly', async () => {
      expect(agent.getConfig().id).toBe(config.id);
    });
  });

  describe('Message Processing', () => {
    it('should process CREATE_DESIGN_SPEC message', async () => {
      const response = await agent.processMessage({
        type: 'CREATE_DESIGN_SPEC',
        content: {
          type: 'layout',
          requirements: {
            style: 'modern',
            theme: 'light',
            constraints: ['responsive'],
          },
        },
      });

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
      expect(response.data.type).toBe('layout');
    });

    it('should process GENERATE_DESIGN message', async () => {
      // 먼저 디자인 스펙 생성
      const specResponse = await agent.processMessage({
        type: 'CREATE_DESIGN_SPEC',
        content: {
          type: 'layout',
          requirements: {
            style: 'modern',
            theme: 'light',
            constraints: ['responsive'],
          },
        },
      });

      const specId = specResponse.data.id;

      // 디자인 생성
      const response = await agent.processMessage({
        type: 'GENERATE_DESIGN',
        content: {
          specId,
          type: 'layout',
        },
      });

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
      expect(response.data.specId).toBe(specId);
    });

    it('should process ANALYZE_DESIGN message', async () => {
      // 디자인 스펙 생성
      const specResponse = await agent.processMessage({
        type: 'CREATE_DESIGN_SPEC',
        content: {
          type: 'layout',
          requirements: {
            style: 'modern',
            theme: 'light',
            constraints: ['responsive'],
          },
        },
      });

      const specId = specResponse.data.id;

      // 디자인 생성
      const designResponse = await agent.processMessage({
        type: 'GENERATE_DESIGN',
        content: {
          specId,
          type: 'layout',
        },
      });

      const designId = designResponse.data.id;

      // 디자인 분석
      const response = await agent.processMessage({
        type: 'ANALYZE_DESIGN',
        content: {
          specId,
          designId,
        },
      });

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('specId');
      expect(response.data).toHaveProperty('designId');
      expect(response.data.analysis).toHaveProperty('accessibility');
      expect(response.data.analysis).toHaveProperty('performance');
      expect(response.data.analysis).toHaveProperty('consistency');
    });

    it('should process OPTIMIZE_DESIGN message', async () => {
      // 디자인 스펙 생성
      const specResponse = await agent.processMessage({
        type: 'CREATE_DESIGN_SPEC',
        content: {
          type: 'layout',
          requirements: {
            style: 'modern',
            theme: 'light',
            constraints: ['responsive'],
          },
        },
      });

      const specId = specResponse.data.id;

      // 디자인 생성
      const designResponse = await agent.processMessage({
        type: 'GENERATE_DESIGN',
        content: {
          specId,
          type: 'layout',
        },
      });

      const designId = designResponse.data.id;

      // 디자인 최적화
      const response = await agent.processMessage({
        type: 'OPTIMIZE_DESIGN',
        content: {
          specId,
          designId,
        },
      });

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
      expect(response.data.specId).toBe(specId);
      expect(response.data.metadata.version).toBe(designResponse.data.metadata.version + 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid message type', async () => {
      const response = await agent.processMessage({
        type: 'INVALID_TYPE',
        content: {},
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should handle invalid spec ID', async () => {
      const response = await agent.processMessage({
        type: 'GENERATE_DESIGN',
        content: {
          specId: 'invalid-spec-id',
          type: 'layout',
        },
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should handle invalid design ID', async () => {
      // 디자인 스펙 생성
      const specResponse = await agent.processMessage({
        type: 'CREATE_DESIGN_SPEC',
        content: {
          type: 'layout',
          requirements: {
            style: 'modern',
            theme: 'light',
            constraints: ['responsive'],
          },
        },
      });

      const specId = specResponse.data.id;

      const response = await agent.processMessage({
        type: 'ANALYZE_DESIGN',
        content: {
          specId,
          designId: 'invalid-design-id',
        },
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });
}); 