import { BaseAgent, IAgentConfig, IAgentMessage, IAgentResponse } from '../base-agent';

interface IDesignSpec {
  id: string;
  type: 'layout' | 'color' | 'typography' | 'component';
  requirements: {
    style?: string;
    theme?: string;
    constraints?: string[];
    preferences?: string[];
  };
  context?: {
    targetPlatform?: string;
    userPreferences?: string[];
    accessibility?: boolean;
  };
}

interface IDesignResult {
  id: string;
  specId: string;
  type: string;
  content: any;
  metadata: {
    generatedAt: number;
    version: number;
    confidence: number;
  };
}

interface IDesignTemplate {
  id: string;
  type: 'layout' | 'color' | 'typography' | 'component';
  name: string;
  description: string;
  content: any;
  metadata: {
    created: number;
    lastUsed: number;
    usageCount: number;
    tags: string[];
  };
}

interface IDesignTools {
  colorTools: {
    generateColorPalette: (baseColor: string) => Promise<any>;
    calculateContrast: (color1: string, color2: string) => number;
    adjustColor: (color: string, adjustment: { brightness?: number; saturation?: number; hue?: number }) => string;
  };
  typographyTools: {
    calculateFontSize: (baseSize: number, scale: number) => string;
    generateTypeScale: (baseSize: number, ratio: number) => Record<string, string>;
    validateFontCombination: (fonts: string[]) => boolean;
  };
  layoutTools: {
    calculateGrid: (columns: number, gap: string) => string;
    generateResponsiveBreakpoints: (baseSize: number) => Record<string, number>;
    calculateSpacing: (baseSize: number, scale: number) => Record<string, string>;
  };
}

export class DesignAgent extends BaseAgent {
  private designSpecs: Map<string, IDesignSpec>;
  private designResults: Map<string, IDesignResult[]>;
  private templates: Map<string, IDesignTemplate[]>;
  private tools: IDesignTools;

  constructor(config: IAgentConfig) {
    super({
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
    this.designSpecs = new Map();
    this.designResults = new Map();
    this.templates = new Map();
    this.tools = this.initializeTools();
  }

  protected async onInitialize(): Promise<void> {
    // 디자인 에이전트 초기화 로직
    await this.loadDesignTemplates();
    await this.initializeDesignTools();
  }

  protected async onShutdown(): Promise<void> {
    // 디자인 에이전트 종료 로직
    this.designSpecs.clear();
    this.designResults.clear();
    this.templates.clear();
  }

  public async initialize(): Promise<void> {
    await this.onInitialize();
  }

  public async shutdown(): Promise<void> {
    await this.onShutdown();
  }

  protected async onProcessMessage(message: IAgentMessage): Promise<any> {
    switch (message.type) {
      case 'CREATE_DESIGN_SPEC':
        return this.createDesignSpec(message.content);
      case 'GENERATE_DESIGN':
        return this.generateDesign(message.content);
      case 'ANALYZE_DESIGN':
        return this.analyzeDesign(message.content);
      case 'OPTIMIZE_DESIGN':
        return this.optimizeDesign(message.content);
      case 'GET_DESIGN_HISTORY':
        return this.getDesignHistory(message.content.specId);
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  private initializeTools(): IDesignTools {
    return {
      colorTools: {
        generateColorPalette: async (baseColor: string) => {
          // 색상 팔레트 생성 로직
          return {
            primary: baseColor,
            secondary: this.tools.colorTools.adjustColor(baseColor, { hue: 120 }),
            accent: this.tools.colorTools.adjustColor(baseColor, { hue: 240 }),
            background: this.tools.colorTools.adjustColor(baseColor, { brightness: 95 }),
            text: this.tools.colorTools.adjustColor(baseColor, { brightness: 20 }),
          };
        },
        calculateContrast: (color1: string, color2: string): number => {
          // 대비 계산 로직
          const l1 = this.getLuminance(color1);
          const l2 = this.getLuminance(color2);
          const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          return ratio;
        },
        adjustColor: (color: string, adjustment: { brightness?: number; saturation?: number; hue?: number }): string => {
          const rgb = this.hexToRgb(color);
          if (!rgb) return color;

          let { r, g, b } = rgb;

          // 밝기 조정
          if (adjustment.brightness !== undefined) {
            const factor = 1 + (adjustment.brightness / 100);
            r = Math.min(255, Math.max(0, r * factor));
            g = Math.min(255, Math.max(0, g * factor));
            b = Math.min(255, Math.max(0, b * factor));
          }

          // 채도 조정
          if (adjustment.saturation !== undefined) {
            const factor = 1 + (adjustment.saturation / 100);
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            r = Math.min(255, Math.max(0, gray + (r - gray) * factor));
            g = Math.min(255, Math.max(0, gray + (g - gray) * factor));
            b = Math.min(255, Math.max(0, gray + (b - gray) * factor));
          }

          // 색상 조정
          if (adjustment.hue !== undefined) {
            const hsl = this.rgbToHsl(r, g, b);
            hsl.h = (hsl.h + adjustment.hue) % 360;
            const rgb2 = this.hslToRgb(hsl.h, hsl.s, hsl.l);
            r = rgb2.r;
            g = rgb2.g;
            b = rgb2.b;
          }

          return this.rgbToHex(r, g, b);
        },
      },
      typographyTools: {
        calculateFontSize: (baseSize: number, scale: number): string => {
          const size = baseSize * Math.max(0, scale);
          return `${size}px`;
        },
        generateTypeScale: (baseSize: number, ratio: number): Record<string, string> => {
          if (ratio <= 0) {
            return {
              h1: `${baseSize}px`,
              h2: `${baseSize}px`,
              h3: `${baseSize}px`,
              h4: `${baseSize}px`,
              body: `${baseSize}px`,
              small: `${baseSize}px`,
              tiny: `${baseSize}px`,
            };
          }

          const safeRatio = Math.max(0.1, ratio);
          const scale = {
            h1: Math.pow(safeRatio, 3),
            h2: Math.pow(safeRatio, 2),
            h3: safeRatio,
            h4: Math.pow(safeRatio, 0.5),
            body: 1,
            small: 1 / safeRatio,
            tiny: 1 / Math.pow(safeRatio, 2),
          };

          return Object.entries(scale).reduce((acc, [key, value]) => {
            acc[key] = this.tools.typographyTools.calculateFontSize(baseSize, value);
            return acc;
          }, {} as Record<string, string>);
        },
        validateFontCombination: (fonts: string[]): boolean => {
          if (!fonts || fonts.length === 0) return false;

          // 기본 폰트 스택 검증
          const defaultFonts = ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'];
          const hasSystemFont = fonts.some(font => defaultFonts.includes(font));
          if (!hasSystemFont) return false;

          // 폰트 이름 형식 검증
          const fontNameRegex = /^[a-zA-Z0-9\s\-']+$/;
          return fonts.every(font => fontNameRegex.test(font));
        },
      },
      layoutTools: {
        calculateGrid: (columns: number, gap: string): string => {
          const safeColumns = Math.max(1, columns);
          const safeGap = /^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/.test(gap) ? gap : '0';
          return `grid-template-columns: repeat(${safeColumns}, minmax(0, 1fr)); gap: ${safeGap};`;
        },
        generateResponsiveBreakpoints: (baseSize: number): Record<string, number> => {
          const breakpoints = {
            xs: baseSize * 0.75,  // 480px
            sm: baseSize * 1.5,   // 768px
            md: baseSize * 2,     // 1024px
            lg: baseSize * 3,     // 1536px
            xl: baseSize * 4,     // 2048px
            '2xl': baseSize * 5,  // 2560px
          };

          return breakpoints;
        },
        calculateSpacing: (baseSize: number, scale: number): Record<string, string> => {
          const spacing = {
            '0': '0',
            '1': `${baseSize * 0.25}px`,
            '2': `${baseSize * 0.5}px`,
            '3': `${baseSize}px`,
            '4': `${baseSize * 1.5}px`,
            '5': `${baseSize * 2}px`,
            '6': `${baseSize * 3}px`,
            '8': `${baseSize * 4}px`,
            '10': `${baseSize * 5}px`,
            '12': `${baseSize * 6}px`,
            '16': `${baseSize * 8}px`,
            '20': `${baseSize * 10}px`,
            '24': `${baseSize * 12}px`,
            '32': `${baseSize * 16}px`,
            '40': `${baseSize * 20}px`,
            '48': `${baseSize * 24}px`,
          };

          // 스케일 적용
          return Object.entries(spacing).reduce((acc, [key, value]) => {
            const numericValue = parseFloat(value);
            acc[key] = `${numericValue * scale}px`;
            return acc;
          }, {} as Record<string, string>);
        },
      },
    };
  }

  private async initializeDesignTools(): Promise<void> {
    // 디자인 도구 초기화
    await this.loadDesignTemplates();
    
    // 도구 초기화 상태 확인
    if (!this.tools) {
      throw new Error('Design tools not initialized');
    }
  }

  private async loadDesignTemplates(): Promise<void> {
    // 기본 템플릿 로드
    const defaultTemplates: IDesignTemplate[] = [
      {
        id: 'layout_grid_1',
        type: 'layout',
        name: 'Basic Grid Layout',
        description: 'A simple responsive grid layout',
        content: {
          type: 'layout',
          structure: 'grid',
          columns: 12,
          gap: '1rem',
          breakpoints: {
            sm: 640,
            md: 768,
            lg: 1024,
            xl: 1280,
          },
        },
        metadata: {
          created: Date.now(),
          lastUsed: Date.now(),
          usageCount: 0,
          tags: ['grid', 'responsive', 'basic'],
        },
      },
      {
        id: 'color_modern_1',
        type: 'color',
        name: 'Modern Color Scheme',
        description: 'A modern and clean color palette',
        content: {
          type: 'color_scheme',
          primary: '#3B82F6',
          secondary: '#10B981',
          accent: '#F59E0B',
          background: '#F9FAFB',
          text: '#111827',
          error: '#EF4444',
          success: '#10B981',
          warning: '#F59E0B',
        },
        metadata: {
          created: Date.now(),
          lastUsed: Date.now(),
          usageCount: 0,
          tags: ['modern', 'clean', 'professional'],
        },
      },
      {
        id: 'typography_system_1',
        type: 'typography',
        name: 'System Typography',
        description: 'A system-based typography scale',
        content: {
          type: 'typography',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          sizes: {
            h1: '2.5rem',
            h2: '2rem',
            h3: '1.75rem',
            h4: '1.5rem',
            body: '1rem',
            small: '0.875rem',
          },
          weights: {
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
          },
          lineHeights: {
            tight: 1.25,
            normal: 1.5,
            relaxed: 1.75,
          },
        },
        metadata: {
          created: Date.now(),
          lastUsed: Date.now(),
          usageCount: 0,
          tags: ['system', 'scale', 'readable'],
        },
      },
    ];

    // 템플릿을 타입별로 분류하여 저장
    defaultTemplates.forEach(template => {
      if (!this.templates.has(template.type)) {
        this.templates.set(template.type, []);
      }
      this.templates.get(template.type)!.push(template);
    });
  }

  private getTemplatesByType(type: string): IDesignTemplate[] {
    return this.templates.get(type) || [];
  }

  private getTemplateById(id: string): IDesignTemplate | undefined {
    const templates = Array.from(this.templates.values());
    for (const templateList of templates) {
      const template = templateList.find((t: IDesignTemplate) => t.id === id);
      if (template) return template;
    }
    return undefined;
  }

  private updateTemplateUsage(templateId: string): void {
    const templates = Array.from(this.templates.values());
    for (const templateList of templates) {
      const template = templateList.find((t: IDesignTemplate) => t.id === templateId);
      if (template) {
        template.metadata.lastUsed = Date.now();
        template.metadata.usageCount++;
        return;
      }
    }
  }

  private async createDesignSpec(data: { type: string; requirements: any }): Promise<IDesignSpec> {
    const id = `design_spec_${Date.now()}_${Math.random().toString(36).substr(2, 10)}`;
    const spec: IDesignSpec = {
      id,
      type: data.type as 'layout' | 'color' | 'typography' | 'component',
      requirements: data.requirements || {},
      context: {
        targetPlatform: 'web',
        userPreferences: [],
        accessibility: true,
      },
    };
    this.designSpecs.set(id, spec);
    return spec;
  }

  private async generateDesign(data: { specId: string; type: string }): Promise<IDesignResult> {
    const spec = this.designSpecs.get(data.specId);
    if (!spec) {
      throw new Error(`Design spec not found: ${data.specId}`);
    }

    const result: IDesignResult = {
      id: `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      specId: data.specId,
      type: data.type,
      content: await this.generateDesignContent(spec, data.type),
      metadata: {
        generatedAt: Date.now(),
        version: 1,
        confidence: 0.8, // 실제 구현에서는 더 정교한 신뢰도 계산 필요
      },
    };

    if (!this.designResults.has(data.specId)) {
      this.designResults.set(data.specId, []);
    }
    this.designResults.get(data.specId)!.push(result);

    return result;
  }

  private async generateDesignContent(spec: IDesignSpec, type: string): Promise<any> {
    // 실제 디자인 생성 로직
    switch (type) {
      case 'layout':
        return this.generateLayout(spec);
      case 'color':
        return this.generateColorScheme(spec);
      case 'typography':
        return this.generateTypography(spec);
      case 'component':
        return this.generateComponent(spec);
      default:
        throw new Error(`Unknown design type: ${type}`);
    }
  }

  private async generateLayout(spec: IDesignSpec): Promise<any> {
    const baseSize = 16; // 기본 사이즈
    const columns = 12; // 기본 컬럼 수
    const gap = '1rem'; // 기본 간격

    const layout = {
      type: 'layout',
      structure: 'grid',
      columns: columns,
      gap: gap,
      breakpoints: this.tools.layoutTools.generateResponsiveBreakpoints(baseSize),
      spacing: this.tools.layoutTools.calculateSpacing(baseSize, 1.5),
      gridTemplate: this.tools.layoutTools.calculateGrid(columns, gap),
      areas: this.generateLayoutAreas(spec),
    };

    return layout;
  }

  private generateLayoutAreas(spec: IDesignSpec): string[] {
    // 레이아웃 영역 생성 로직
    return ['header', 'main', 'footer'];
  }

  private async generateColorScheme(spec: IDesignSpec): Promise<any> {
    const baseColor = spec.requirements.theme || '#3B82F6';
    const palette = await this.tools.colorTools.generateColorPalette(baseColor);

    const colorScheme = {
      type: 'color_scheme',
      ...palette,
      variants: {
        primary: {
          light: this.tools.colorTools.adjustColor(palette.primary, { brightness: 20 }),
          main: palette.primary,
          dark: this.tools.colorTools.adjustColor(palette.primary, { brightness: -20 }),
        },
        secondary: {
          light: this.tools.colorTools.adjustColor(palette.secondary, { brightness: 20 }),
          main: palette.secondary,
          dark: this.tools.colorTools.adjustColor(palette.secondary, { brightness: -20 }),
        },
      },
      semantic: {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
      },
    };

    return colorScheme;
  }

  private async generateTypography(spec: IDesignSpec): Promise<any> {
    const baseSize = 16;
    const scale = 1.25; // 타입 스케일 비율

    const typography = {
      type: 'typography',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      sizes: this.tools.typographyTools.generateTypeScale(baseSize, scale),
      weights: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeights: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
      letterSpacing: {
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
      },
    };

    return typography;
  }

  private async generateComponent(spec: IDesignSpec): Promise<any> {
    const component = {
      type: 'component',
      name: spec.requirements.style || 'default',
      variants: ['primary', 'secondary', 'outline'],
      states: ['default', 'hover', 'active', 'disabled', 'focus'],
      styles: {
        base: {
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          transition: 'all 0.2s ease-in-out',
        },
        variants: {
          primary: {
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-white)',
          },
          secondary: {
            backgroundColor: 'var(--color-secondary)',
            color: 'var(--color-white)',
          },
          outline: {
            border: '1px solid var(--color-primary)',
            color: 'var(--color-primary)',
            backgroundColor: 'transparent',
          },
        },
        states: {
          hover: {
            opacity: 0.9,
            transform: 'translateY(-1px)',
          },
          active: {
            transform: 'translateY(0)',
          },
          disabled: {
            opacity: 0.5,
            cursor: 'not-allowed',
          },
          focus: {
            outline: '2px solid var(--color-primary)',
            outlineOffset: '2px',
          },
        },
      },
    };

    return component;
  }

  private async analyzeDesign(data: { specId: string; designId: string }): Promise<any> {
    const results = this.designResults.get(data.specId);
    if (!results) {
      throw new Error(`No design results found for spec: ${data.specId}`);
    }

    const design = results.find(r => r.id === data.designId);
    if (!design) {
      throw new Error(`Design not found: ${data.designId}`);
    }

    // 디자인 분석 로직
    return {
      specId: data.specId,
      designId: data.designId,
      analysis: {
        accessibility: this.analyzeAccessibility(design),
        performance: this.analyzePerformance(design),
        consistency: this.analyzeConsistency(design),
        recommendations: this.generateRecommendations(design),
      },
    };
  }

  private async optimizeDesign(data: { specId: string; designId: string }): Promise<IDesignResult> {
    const spec = this.designSpecs.get(data.specId);
    if (!spec) {
      throw new Error('Design spec not found');
    }

    const results = this.designResults.get(data.specId);
    if (!results) {
      throw new Error('Design not found');
    }

    const design = results.find(r => r.id === data.designId);
    if (!design) {
      throw new Error('Design not found');
    }

    const analysis = await this.analyzeDesign(data);
    const currentDesign = this.designResults.get(data.specId)!.find(r => r.id === data.designId)!;

    // 디자인 최적화 로직
    const optimizedDesign: IDesignResult = {
      ...currentDesign,
      id: `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        ...currentDesign.metadata,
        version: currentDesign.metadata.version + 1,
        generatedAt: Date.now(),
      },
      content: await this.applyOptimizations(currentDesign.content, analysis.analysis),
    };

    this.designResults.get(data.specId)!.push(optimizedDesign);
    return optimizedDesign;
  }

  private async getDesignHistory(specId: string): Promise<IDesignResult[]> {
    return this.designResults.get(specId) || [];
  }

  private analyzeAccessibility(design: IDesignResult): any {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 색상 대비 분석
    if (design.type === 'color') {
      const colorScheme = design.content;
      const textContrast = this.tools.colorTools.calculateContrast(
        colorScheme.text,
        colorScheme.background
      );
      
      if (textContrast < 4.5) {
        issues.push('Text color does not meet WCAG 2.1 contrast requirements');
        recommendations.push('Consider adjusting text or background color for better contrast');
      }
    }

    // 타이포그래피 가독성 분석
    if (design.type === 'typography') {
      const typography = design.content;
      if (parseFloat(typography.sizes.body) < 16) {
        issues.push('Body text size is below recommended minimum size');
        recommendations.push('Increase body text size to at least 16px');
      }
    }

    // 레이아웃 접근성 분석
    if (design.type === 'layout') {
      const layout = design.content;
      if (!layout.areas.includes('main')) {
        issues.push('Layout missing main content area');
        recommendations.push('Add main content area to layout structure');
      }
    }

    return {
      score: issues.length === 0 ? 1 : 1 - (issues.length * 0.1),
      issues,
      recommendations,
    };
  }

  private analyzePerformance(design: IDesignResult): any {
    const metrics: Record<string, number> = {};
    const recommendations: string[] = [];

    // 레이아웃 성능 분석
    if (design.type === 'layout') {
      const layout = design.content;
      const gridComplexity = layout.columns * (layout.areas?.length || 0);
      metrics.gridComplexity = gridComplexity;

      if (gridComplexity > 24) {
        recommendations.push('Consider simplifying grid structure for better performance');
      }
    }

    // 컴포넌트 성능 분석
    if (design.type === 'component') {
      const component = design.content;
      const variantCount = component.variants.length;
      const stateCount = component.states.length;
      metrics.variantCount = variantCount;
      metrics.stateCount = stateCount;

      if (variantCount * stateCount > 12) {
        recommendations.push('Consider reducing component variants or states for better performance');
      }
    }

    return {
      score: 1 - (Object.values(metrics).reduce((a, b) => a + b, 0) * 0.05),
      metrics,
      recommendations,
    };
  }

  private analyzeConsistency(design: IDesignResult): any {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 색상 일관성 분석
    if (design.type === 'color') {
      const colorScheme = design.content;
      const hasSemanticColors = Object.keys(colorScheme.semantic || {}).length > 0;
      
      if (!hasSemanticColors) {
        issues.push('Missing semantic color definitions');
        recommendations.push('Add semantic color definitions for better consistency');
      }
    }

    // 타이포그래피 일관성 분석
    if (design.type === 'typography') {
      const typography = design.content;
      const hasCompleteScale = Object.keys(typography.sizes).length >= 5;
      
      if (!hasCompleteScale) {
        issues.push('Incomplete typography scale');
        recommendations.push('Ensure typography scale includes all necessary sizes');
      }
    }

    // 컴포넌트 일관성 분석
    if (design.type === 'component') {
      const component = design.content;
      const hasCompleteStates = ['hover', 'active', 'disabled', 'focus'].every(
        state => component.states.includes(state)
      );
      
      if (!hasCompleteStates) {
        issues.push('Missing essential component states');
        recommendations.push('Add missing component states for better consistency');
      }
    }

    return {
      score: issues.length === 0 ? 1 : 1 - (issues.length * 0.1),
      issues,
      recommendations,
    };
  }

  private generateRecommendations(design: IDesignResult): string[] {
    const recommendations: string[] = [];

    // 디자인 타입별 추천사항
    switch (design.type) {
      case 'layout':
        recommendations.push('Consider adding more responsive breakpoints');
        recommendations.push('Add grid template areas for better structure');
        break;
      case 'color':
        recommendations.push('Add color variants for different states');
        recommendations.push('Consider adding semantic color definitions');
        break;
      case 'typography':
        recommendations.push('Add more font weights for better hierarchy');
        recommendations.push('Consider adding responsive font sizes');
        break;
      case 'component':
        recommendations.push('Add more interactive states');
        recommendations.push('Consider adding animation properties');
        break;
    }

    return recommendations;
  }

  private async applyOptimizations(content: any, analysis: any): Promise<any> {
    const optimizedContent = { ...content };

    // 접근성 최적화
    if (analysis.accessibility.recommendations.length > 0) {
      if (content.type === 'color') {
        // 색상 대비 최적화
        const contrast = this.tools.colorTools.calculateContrast(
          content.text,
          content.background
        );
        if (contrast < 4.5) {
          optimizedContent.text = this.tools.colorTools.adjustColor(
            content.text,
            { brightness: -20 }
          );
        }
      }
    }

    // 성능 최적화
    if (analysis.performance.recommendations.length > 0) {
      if (content.type === 'layout') {
        // 그리드 복잡도 최적화
        if (content.columns > 12) {
          optimizedContent.columns = 12;
        }
      }
    }

    // 일관성 최적화
    if (analysis.consistency.recommendations.length > 0) {
      if (content.type === 'component') {
        // 상태 추가
        if (!content.states.includes('focus')) {
          optimizedContent.states.push('focus');
        }
      }
    }

    return optimizedContent;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }

      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    s /= 100;
    l /= 100;

    let r = 0;
    let g = 0;
    let b = 0;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  private getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
} 