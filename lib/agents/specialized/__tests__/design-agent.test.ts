/// <reference types="jest" />
import { DesignAgent } from '../design-agent';
import { IAgentConfig } from '../../base-agent';

describe('DesignAgent', () => {
  let agent: DesignAgent;
  const config: IAgentConfig = {
    id: 'test-design-agent',
    type: 'design',
    name: 'Test Design Agent',
    description: 'Test agent for design operations',
    capabilities: ['design_analysis', 'style_generation'],
  };

  beforeEach(() => {
    agent = new DesignAgent(config);
  });

  describe('Agent Configuration', () => {
    it('should initialize with correct config', () => {
      expect(agent.getConfig()).toEqual({
        ...config,
        capabilities: [
          'design_analysis',
          'style_generation',
          'layout_planning',
          'color_scheme',
          'typography',
          'component_design'
        ],
      });
    });

    it('should have correct capabilities', () => {
      const capabilities = agent.getCapabilities();
      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities).toContain('design_analysis');
      expect(capabilities).toContain('style_generation');
      expect(capabilities).toContain('layout_planning');
      expect(capabilities).toContain('color_scheme');
      expect(capabilities).toContain('typography');
      expect(capabilities).toContain('component_design');
    });
  });

  describe('Color Tools', () => {
    it('should calculate contrast ratio correctly', () => {
      const contrast = agent['tools'].colorTools.calculateContrast('#000000', '#FFFFFF');
      expect(contrast).toBeGreaterThan(20); // 흑백 대비는 매우 높음
    });

    it('should adjust color brightness', () => {
      const color = '#FF0000';
      const adjusted = agent['tools'].colorTools.adjustColor(color, { brightness: 50 });
      expect(adjusted).not.toBe(color);
      expect(adjusted).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should adjust color saturation', () => {
      const color = '#FF0000';
      const adjusted = agent['tools'].colorTools.adjustColor(color, { saturation: 50 });
      expect(adjusted).not.toBe(color);
      expect(adjusted).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should adjust color hue', () => {
      const color = '#FF0000';
      const adjusted = agent['tools'].colorTools.adjustColor(color, { hue: 120 });
      expect(adjusted).not.toBe(color);
      expect(adjusted).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should handle invalid color input', () => {
      const color = 'invalid-color';
      const adjusted = agent['tools'].colorTools.adjustColor(color, { brightness: 50 });
      expect(adjusted).toBe(color);
    });

    it('should generate color palette', async () => {
      const baseColor = '#3B82F6';
      const palette = await agent['tools'].colorTools.generateColorPalette(baseColor);
      expect(palette).toHaveProperty('primary', baseColor);
      expect(palette).toHaveProperty('secondary');
      expect(palette).toHaveProperty('accent');
      expect(palette).toHaveProperty('background');
      expect(palette).toHaveProperty('text');
    });
  });

  describe('Typography Tools', () => {
    it('should calculate font size correctly', () => {
      const size = agent['tools'].typographyTools.calculateFontSize(16, 1.5);
      expect(size).toBe('24px');
    });

    it('should generate type scale', () => {
      const scale = agent['tools'].typographyTools.generateTypeScale(16, 1.25);
      expect(scale).toHaveProperty('h1');
      expect(scale).toHaveProperty('body');
      expect(scale).toHaveProperty('small');
      expect(scale.h1).toBe('31.25px');
      expect(scale.body).toBe('16px');
      expect(scale.small).toBe('12.8px');
    });

    it('should validate font combination', () => {
      const validFonts = ['system-ui', 'Arial', 'sans-serif'];
      const invalidFonts = ['Invalid@Font', 'Arial'];
      
      expect(agent['tools'].typographyTools.validateFontCombination(validFonts)).toBe(true);
      expect(agent['tools'].typographyTools.validateFontCombination(invalidFonts)).toBe(false);
    });

    it('should handle empty font list', () => {
      expect(agent['tools'].typographyTools.validateFontCombination([])).toBe(false);
    });

    it('should handle undefined font list', () => {
      expect(agent['tools'].typographyTools.validateFontCombination(undefined as any)).toBe(false);
    });
  });

  describe('Layout Tools', () => {
    it('should calculate grid correctly', () => {
      const grid = agent['tools'].layoutTools.calculateGrid(12, '1rem');
      expect(grid).toContain('grid-template-columns: repeat(12, minmax(0, 1fr))');
      expect(grid).toContain('gap: 1rem');
    });

    it('should generate responsive breakpoints', () => {
      const breakpoints = agent['tools'].layoutTools.generateResponsiveBreakpoints(16);
      expect(breakpoints).toHaveProperty('xs');
      expect(breakpoints).toHaveProperty('sm');
      expect(breakpoints).toHaveProperty('md');
      expect(breakpoints).toHaveProperty('lg');
      expect(breakpoints).toHaveProperty('xl');
      expect(breakpoints).toHaveProperty('2xl');
    });

    it('should calculate spacing with scale', () => {
      const spacing = agent['tools'].layoutTools.calculateSpacing(16, 1.5);
      expect(spacing).toHaveProperty('0');
      expect(spacing).toHaveProperty('1');
      expect(spacing).toHaveProperty('2');
      expect(spacing['1']).toBe('6px'); // 16 * 0.25 * 1.5
      expect(spacing['2']).toBe('12px'); // 16 * 0.5 * 1.5
      expect(spacing['3']).toBe('24px'); // 16 * 1 * 1.5
    });

    it('should handle zero base size', () => {
      const spacing = agent['tools'].layoutTools.calculateSpacing(0, 1.5);
      expect(spacing['1']).toBe('0px');
      expect(spacing['2']).toBe('0px');
      expect(spacing['3']).toBe('0px');
    });

    it('should handle negative scale', () => {
      const spacing = agent['tools'].layoutTools.calculateSpacing(16, -1);
      expect(spacing['1']).toBe('-4px');
      expect(spacing['2']).toBe('-8px');
      expect(spacing['3']).toBe('-16px');
    });
  });

  describe('Design Generation', () => {
    it('should create design spec', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'layout',
        requirements: {
          style: 'modern',
          theme: 'light',
          constraints: ['responsive'],
        },
      });
      expect(spec).toHaveProperty('id');
      expect(spec.type).toBe('layout');
      expect(spec.requirements.style).toBe('modern');
    });

    it('should generate design', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'layout',
        requirements: {
          style: 'modern',
          theme: 'light',
          constraints: ['responsive'],
        },
      });

      const design = await agent['generateDesign']({
        specId: spec.id,
        type: 'layout',
      });

      expect(design).toHaveProperty('id');
      expect(design.specId).toBe(spec.id);
      expect(design.type).toBe('layout');
      expect(design.content).toBeDefined();
    });

    it('should generate color scheme design', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'color',
        requirements: {
          style: 'modern',
          theme: '#3B82F6',
        },
      });

      const design = await agent['generateDesign']({
        specId: spec.id,
        type: 'color',
      });

      expect(design.content).toHaveProperty('type', 'color_scheme');
      expect(design.content).toHaveProperty('primary');
      expect(design.content).toHaveProperty('secondary');
      expect(design.content).toHaveProperty('variants');
      expect(design.content).toHaveProperty('semantic');
    });

    it('should generate typography design', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'typography',
        requirements: {
          style: 'modern',
        },
      });

      const design = await agent['generateDesign']({
        specId: spec.id,
        type: 'typography',
      });

      expect(design.content).toHaveProperty('type', 'typography');
      expect(design.content).toHaveProperty('fontFamily');
      expect(design.content).toHaveProperty('sizes');
      expect(design.content).toHaveProperty('weights');
      expect(design.content).toHaveProperty('lineHeights');
    });

    it('should generate component design', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'component',
        requirements: {
          style: 'button',
        },
      });

      const design = await agent['generateDesign']({
        specId: spec.id,
        type: 'component',
      });

      expect(design.content).toHaveProperty('type', 'component');
      expect(design.content).toHaveProperty('variants');
      expect(design.content).toHaveProperty('states');
      expect(design.content).toHaveProperty('styles');
    });
  });

  describe('Design Analysis', () => {
    it('should analyze design', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'layout',
        requirements: {
          style: 'modern',
          theme: 'light',
          constraints: ['responsive'],
        },
      });

      const design = await agent['generateDesign']({
        specId: spec.id,
        type: 'layout',
      });

      const analysis = await agent['analyzeDesign']({
        specId: spec.id,
        designId: design.id,
      });

      expect(analysis).toHaveProperty('specId');
      expect(analysis).toHaveProperty('designId');
      expect(analysis.analysis).toHaveProperty('accessibility');
      expect(analysis.analysis).toHaveProperty('performance');
      expect(analysis.analysis).toHaveProperty('consistency');
      expect(analysis.analysis).toHaveProperty('recommendations');
    });

    it('should analyze color scheme design', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'color',
        requirements: {
          style: 'modern',
          theme: '#3B82F6',
        },
      });

      const design = await agent['generateDesign']({
        specId: spec.id,
        type: 'color',
      });

      const analysis = await agent['analyzeDesign']({
        specId: spec.id,
        designId: design.id,
      });

      expect(analysis.analysis.accessibility).toHaveProperty('score');
      expect(analysis.analysis.accessibility).toHaveProperty('issues');
      expect(analysis.analysis.accessibility).toHaveProperty('recommendations');
    });

    it('should analyze typography design', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'typography',
        requirements: {
          style: 'modern',
        },
      });

      const design = await agent['generateDesign']({
        specId: spec.id,
        type: 'typography',
      });

      const analysis = await agent['analyzeDesign']({
        specId: spec.id,
        designId: design.id,
      });

      expect(analysis.analysis.accessibility).toHaveProperty('score');
      expect(analysis.analysis.accessibility).toHaveProperty('issues');
      expect(analysis.analysis.accessibility).toHaveProperty('recommendations');
    });
  });

  describe('Design Optimization', () => {
    it('should optimize design', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'layout',
        requirements: {
          style: 'modern',
          theme: 'light',
          constraints: ['responsive'],
        },
      });

      const design = await agent['generateDesign']({
        specId: spec.id,
        type: 'layout',
      });

      const optimized = await agent['optimizeDesign']({
        specId: spec.id,
        designId: design.id,
      });

      expect(optimized).toHaveProperty('id');
      expect(optimized.specId).toBe(spec.id);
      expect(optimized.metadata.version).toBe(design.metadata.version + 1);
    });

    it('should optimize color scheme design', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'color',
        requirements: {
          style: 'modern',
          theme: '#3B82F6',
        },
      });

      const design = await agent['generateDesign']({
        specId: spec.id,
        type: 'color',
      });

      const optimized = await agent['optimizeDesign']({
        specId: spec.id,
        designId: design.id,
      });

      expect(optimized.content).toHaveProperty('type', 'color_scheme');
      expect(optimized.metadata.version).toBe(design.metadata.version + 1);
    });

    it('should optimize typography design', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'typography',
        requirements: {
          style: 'modern',
        },
      });

      const design = await agent['generateDesign']({
        specId: spec.id,
        type: 'typography',
      });

      const optimized = await agent['optimizeDesign']({
        specId: spec.id,
        designId: design.id,
      });

      expect(optimized.content).toHaveProperty('type', 'typography');
      expect(optimized.metadata.version).toBe(design.metadata.version + 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid hex color in color tools', () => {
      const invalidColor = '#XYZ';
      const adjusted = agent['tools'].colorTools.adjustColor(invalidColor, { brightness: 50 });
      expect(adjusted).toBe(invalidColor);
    });

    it('should handle out of range values in color adjustments', () => {
      const color = '#FF0000';
      const adjusted = agent['tools'].colorTools.adjustColor(color, { brightness: 200 });
      expect(adjusted).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should handle negative values in typography calculations', () => {
      const size = agent['tools'].typographyTools.calculateFontSize(-16, 1.5);
      expect(size).toBe('-24px');
    });

    it('should handle zero ratio in type scale generation', () => {
      const scale = agent['tools'].typographyTools.generateTypeScale(16, 0);
      expect(scale.h1).toBe('16px');
      expect(scale.body).toBe('16px');
      expect(scale.small).toBe('16px');
    });

    it('should handle negative columns in grid calculation', () => {
      const grid = agent['tools'].layoutTools.calculateGrid(-12, '1rem');
      expect(grid).toContain('grid-template-columns: repeat(1, minmax(0, 1fr))');
    });

    it('should handle invalid gap value in grid calculation', () => {
      const grid = agent['tools'].layoutTools.calculateGrid(12, 'invalid');
      expect(grid).toContain('gap: 0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design spec requirements', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'layout',
        requirements: {},
      });
      expect(spec).toHaveProperty('id');
      expect(spec.type).toBe('layout');
      expect(spec.requirements).toEqual({});
    });

    it('should handle missing design spec context', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'layout',
        requirements: {
          style: 'modern',
        },
      });
      expect(spec).toHaveProperty('id');
      expect(spec.context).toBeDefined();
      expect(spec.context?.accessibility).toBe(true);
    });

    it('should handle non-existent template type', async () => {
      const templates = await agent['getTemplatesByType']('non-existent');
      expect(templates).toEqual([]);
    });

    it('should handle invalid design ID in optimization', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'layout',
        requirements: {
          style: 'modern',
        },
      });

      await expect(agent['optimizeDesign']({
        specId: spec.id,
        designId: 'invalid-id',
      })).rejects.toThrow('Design not found');
    });

    it('should handle invalid spec ID in design generation', async () => {
      await expect(agent['generateDesign']({
        specId: 'invalid-id',
        type: 'layout',
      })).rejects.toThrow('Design spec not found');
    });

    it('should handle concurrent design generations', async () => {
      const spec = await agent['createDesignSpec']({
        type: 'layout',
        requirements: {
          style: 'modern',
        },
      });

      const promises = Array(3).fill(null).map(() => agent['generateDesign']({
        specId: spec.id,
        type: 'layout',
      }));

      const results = await Promise.all(promises);
      const uniqueIds = new Set(results.map(r => r.id));
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('Performance', () => {
    it('should handle large number of design specs', async () => {
      const specs = await Promise.all(
        Array(100).fill(null).map(() => agent['createDesignSpec']({
          type: 'layout',
          requirements: {
            style: 'modern',
          },
        }))
      );
      expect(specs).toHaveLength(100);
      specs.forEach(spec => {
        expect(spec).toHaveProperty('id');
      });
    });

    it('should handle large color palette generation', async () => {
      const baseColor = '#3B82F6';
      const promises = Array(50).fill(null).map(() => 
        agent['tools'].colorTools.generateColorPalette(baseColor)
      );
      const palettes = await Promise.all(promises);
      expect(palettes).toHaveLength(50);
      palettes.forEach(palette => {
        expect(palette).toHaveProperty('primary', baseColor);
      });
    });

    it('should handle large type scale calculations', () => {
      const scales = Array(100).fill(null).map((_, i) => 
        agent['tools'].typographyTools.generateTypeScale(16, 1 + i * 0.1)
      );
      expect(scales).toHaveLength(100);
      scales.forEach(scale => {
        expect(scale).toHaveProperty('h1');
        expect(scale).toHaveProperty('body');
      });
    });
  });

  describe('Design Tools', () => {
    describe('Color Tools', () => {
      it('should handle RGB to HSL conversion', () => {
        const rgb = { r: 255, g: 0, b: 0 };
        const hsl = agent['rgbToHsl'](rgb.r, rgb.g, rgb.b);
        expect(hsl.h).toBe(0);
        expect(hsl.s).toBe(100);
        expect(hsl.l).toBe(50);
      });

      it('should handle HSL to RGB conversion', () => {
        const hsl = { h: 0, s: 100, l: 50 };
        const rgb = agent['hslToRgb'](hsl.h, hsl.s, hsl.l);
        expect(rgb.r).toBe(255);
        expect(rgb.g).toBe(0);
        expect(rgb.b).toBe(0);
      });

      it('should handle RGB to HEX conversion', () => {
        const hex = agent['rgbToHex'](255, 0, 0);
        expect(hex.toUpperCase()).toBe('#FF0000');
      });

      it('should handle HEX to RGB conversion', () => {
        const rgb = agent['hexToRgb']('#FF0000');
        expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
      });

      it('should handle invalid HEX to RGB conversion', () => {
        const rgb = agent['hexToRgb']('invalid');
        expect(rgb).toBeNull();
      });

      it('should handle luminance calculation', () => {
        const luminance = agent['getLuminance']('#FFFFFF');
        expect(luminance).toBe(1);
      });

      it('should handle invalid color in luminance calculation', () => {
        const luminance = agent['getLuminance']('invalid');
        expect(luminance).toBe(0);
      });
    });

    describe('Design History', () => {
      it('should track design history', async () => {
        const spec = await agent['createDesignSpec']({
          type: 'layout',
          requirements: {
            style: 'modern',
          },
        });

        const design1 = await agent['generateDesign']({
          specId: spec.id,
          type: 'layout',
        });

        const design2 = await agent['optimizeDesign']({
          specId: spec.id,
          designId: design1.id,
        });

        const history = await agent['getDesignHistory'](spec.id);
        expect(history).toHaveLength(2);
        expect(history[0].id).toBe(design1.id);
        expect(history[1].id).toBe(design2.id);
        expect(history[1].metadata.version).toBe(design1.metadata.version + 1);
      });

      it('should handle non-existent spec in history retrieval', async () => {
        const history = await agent['getDesignHistory']('non-existent');
        expect(history).toEqual([]);
      });
    });

    describe('Design Analysis', () => {
      it('should analyze design accessibility', async () => {
        const spec = await agent['createDesignSpec']({
          type: 'color',
          requirements: {
            style: 'modern',
            theme: '#000000',
          },
        });

        const design = await agent['generateDesign']({
          specId: spec.id,
          type: 'color',
        });

        const analysis = await agent['analyzeDesign']({
          specId: spec.id,
          designId: design.id,
        });

        expect(analysis.analysis.accessibility).toBeDefined();
        expect(analysis.analysis.accessibility.score).toBeGreaterThanOrEqual(0);
        expect(analysis.analysis.accessibility.score).toBeLessThanOrEqual(100);
      });

      it('should analyze design performance', async () => {
        const spec = await agent['createDesignSpec']({
          type: 'layout',
          requirements: {
            style: 'modern',
          },
        });

        const design = await agent['generateDesign']({
          specId: spec.id,
          type: 'layout',
        });

        const analysis = await agent['analyzeDesign']({
          specId: spec.id,
          designId: design.id,
        });

        expect(analysis.analysis.performance).toBeDefined();
        expect(analysis.analysis.performance.score).toBeLessThanOrEqual(100);
      });

      it('should analyze design consistency', async () => {
        const spec = await agent['createDesignSpec']({
          type: 'typography',
          requirements: {
            style: 'modern',
          },
        });

        const design = await agent['generateDesign']({
          specId: spec.id,
          type: 'typography',
        });

        const analysis = await agent['analyzeDesign']({
          specId: spec.id,
          designId: design.id,
        });

        expect(analysis.analysis.consistency).toBeDefined();
        expect(analysis.analysis.consistency.score).toBeGreaterThanOrEqual(0);
        expect(analysis.analysis.consistency.score).toBeLessThanOrEqual(100);
      });
    });
  });
}); 