# LLM-Generated HTML Posters for XHS Sharing

## 📅 Plan Date: 2026-01-30

## 🎯 Objective

Upgrade the current XHS poster generation system from template-based to **LLM-generated HTML**, inspired by the approach used in [xhs-image-mcp](https://github.com/dthinkr/xhs-image-mcp). This will provide more flexibility, better visual appeal, and dynamic layout generation based on content.

## 🔍 Current System Analysis

### Existing Implementation

- **Template System**: Fixed Vue component with predefined styles ([PosterTemplate.vue](../../../apps/frontend/src/components/PosterTemplate.vue))
- **Style System**: 5 hardcoded styles in [poster-types.ts](../../../apps/frontend/src/lib/poster-types.ts)
- **Rendering**: Vue component + html2canvas conversion
- **Content**: Simple text layout with limited customization

### Limitations

- Fixed template structure
- Limited visual variety
- No dynamic layout adaptation
- Text-only content (no images/graphics)
- Predictable visual output

## 🚀 New Architecture: LLM-Generated HTML

### Inspiration from xhs-image-mcp

Based on the referenced implementation, we'll adopt these key patterns:

1. **Dynamic HTML Generation**: LLM creates complete HTML with inline CSS
2. **Server-Side Rendering**: Use Puppeteer (Chromium) for consistent, high-quality image generation
3. **Flexible Styling**: AI-driven layout and visual design decisions
4. **Content-Aware Design**: Layout adapts to content semantics
5. **Smart Storage**: Conditional poster saving for WeChat browser optimization

### Rendering Strategy: Server-Side with Puppeteer (Chromium)

**Advantages**:

- ✅ Perfect CSS support (gradients, shadows, transforms, etc.)
- ✅ Consistent font rendering across platforms
- ✅ Better quality output with anti-aliasing
- ✅ Handles complex layouts reliably
- ✅ Server-side consistency eliminates browser compatibility issues

**WeChat Browser Optimization**:

- Conditional poster saving on server for WeChat browser
- Direct image return for other browsers to save server storage
- Automatic browser detection and handling

### Architecture Components

```
Backend (New):
├── HtmlPosterService.ts         # LLM HTML generation service
├── BrowserRenderService.ts      # Puppeteer-based PNG rendering
├── PosterStorageService.ts      # Conditional poster file management
└── PosterStylePrompts.ts        # Style prompt definitions

Frontend (Updated):
├── useGenerateHtmlPoster.ts     # Updated composable for new API
├── WeChat browser detection     # Browser-specific handling
└── ShareToXiaohongshu.vue       # Updated to use new poster service
```

## 📝 Implementation Plan

### Phase 1: Backend - Services Implementation (5h)

#### 1.1 Create HtmlPosterService (2h)

**File**: `apps/backend/src/services/HtmlPosterService.ts`

```typescript
export interface PosterGenerationRequest {
  caption: string;
  style: 'minimal' | 'elegant' | 'warm' | 'modern' | 'professional';
  ratio: '3:4' | '1:1' | '4:3';
  saveOnServer?: boolean; // Default false, true for WeChat browser
  includeAiGraphics?: boolean;
}

export interface GeneratedPoster {
  html: string;
  css: string;
  dimensions: { width: number; height: number };
}

export class HtmlPosterService {
  async generatePosterHtml(request: PosterGenerationRequest): Promise<GeneratedPoster>
}
```

**Features**:

- Uses existing LLMService with new prompt system
- Generates complete HTML with inline CSS optimized for Puppeteer rendering
- Adapts layout based on content length and semantic analysis
- Supports dynamic color schemes and typography
- Includes microelements like icons, dividers, decorative elements
- Full CSS support (gradients, shadows, transforms, etc.)

#### 1.2 Create PuppeteerRenderService (2h)

**File**: `apps/backend/src/services/PuppeteerRenderService.ts`

```typescript
import puppeteer, { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export class PuppeteerRenderService {
  private browser: Browser | null = null;
  
  async renderHtmlToPng(
    html: string, 
    dimensions: { width: number; height: number }
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    try {
      // Set viewport and content
      await page.setViewport(dimensions);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');
      
      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        clip: {
          x: 0,
          y: 0,
          width: dimensions.width,
          height: dimensions.height
        },
        optimizeForSpeed: false // Prioritize quality
      });
      
      return screenshot as Buffer;
    } finally {
      await page.close();
    }
  }
  
  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    }
    return this.browser;
  }
  
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
```

**Features**:

- Puppeteer + @sparticuz/chromium for serverless compatibility
- High-quality PNG rendering optimized for serverless
- Font loading optimization with document.fonts.ready
- Memory-efficient browser reuse
- Proper cleanup and error handling
- Optimized for cloud function environments

#### 1.3 Create PosterStorageService (30min)

**File**: `apps/backend/src/services/PosterStorageService.ts`

```typescript
export class PosterStorageService {
  async savePoster(imageBuffer: Buffer, filename: string): Promise<string>
  async getPosterUrl(filename: string): Promise<string>
  async cleanupOldPosters(): Promise<void> // Cleanup task
}
```

#### 1.4 Create Poster Style Prompts (30min)

**File**: `apps/backend/src/services/PosterStylePrompts.ts`

Define detailed prompts for each style that leverage full Puppeteer CSS support:

```typescript
export const POSTER_STYLE_PROMPTS = {
  minimal: `Generate clean, minimalist HTML poster with full CSS support...`,
  elegant: `Create sophisticated HTML poster with advanced CSS features...`,
  warm: `Design cozy HTML poster using complex gradients and CSS effects...`,
  // ...etc
}
```

### Phase 2: Backend - API Integration (2h)

#### 2.1 Create Poster Generation Controller (1.5h)

**File**: `apps/backend/src/controllers/poster.controller.ts`

```typescript
import { PuppeteerRenderService } from '../services/PuppeteerRenderService';

function isWeChatBrowser(userAgent: string): boolean {
  return /MicroMessenger/i.test(userAgent);
}

const puppeteerRenderService = new PuppeteerRenderService();

export const posterRoute = app.post(
  "/html",
  zValidator("json", generatePosterSchema),
  async (c) => {
    const { caption, style, ratio, saveOnServer } = c.req.valid("json");
    const userAgent = c.req.header("user-agent") || "";
    
    // Auto-detect WeChat browser if saveOnServer not specified
    const shouldSave = saveOnServer ?? isWeChatBrowser(userAgent);
    
    try {
      // Generate HTML using HtmlPosterService
      const generatedPoster = await htmlPosterService.generatePosterHtml({
        caption, style, ratio, saveOnServer: shouldSave
      });
      
      // Render to PNG using PuppeteerRenderService
      const imageBuffer = await puppeteerRenderService.renderHtmlToPng(
        generatedPoster.html,
        generatedPoster.dimensions
      );
      
      if (shouldSave) {
        // Save to server and return URL (for WeChat browser)
        const filename = `poster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
        const posterUrl = await posterStorageService.savePoster(imageBuffer, filename);
        return c.json({ posterUrl, saved: true });
      } else {
        // Return base64 image directly (for other browsers)
        const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        return c.json({ posterUrl: base64Image, saved: false });
      }
    } catch (error) {
      console.error('Poster generation failed:', error);
      return c.json({ error: 'Poster generation failed' }, 500);
    }
  }
);
```

#### 2.2 Update Backend Index (30min)

**File**: `apps/backend/src/index.ts`

Add poster routes and cleanup job:

```typescript
import { posterRoute } from "./controllers/poster.controller";
import { posterStorageService } from "./services/PosterStorageService";
import { puppeteerRenderService } from "./services/PuppeteerRenderService";

app.route("/api/poster", posterRoute);

// Cleanup old posters every 24 hours
setInterval(() => {
  posterStorageService.cleanupOldPosters().catch(console.error);
}, 24 * 60 * 60 * 1000);

// Graceful shutdown for puppeteer
process.on('SIGTERM', async () => {
  await puppeteerRenderService.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await puppeteerRenderService.cleanup();
  process.exit(0);
});
```

### Phase 3: Frontend - Server-Side Poster Integration (2h)

#### 3.1 Update Poster Generation Composable (1h)

**File**: `apps/frontend/src/composables/useGenerateHtmlPoster.ts`

```typescript
function isWeChatBrowser(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent);
}

export const useGenerateHtmlPoster = () => {
  const generatePoster = async (
    caption: string, 
    style: PosterStyle, 
    ratio: PosterRatio = '3:4',
    saveOnServer?: boolean
  ): Promise<string> => {
    // Auto-detect WeChat browser if saveOnServer not specified
    const shouldSave = saveOnServer ?? isWeChatBrowser();
    
    // Call backend API for server-side rendering
    const response = await rpc.generateHtmlPoster({ 
      caption, 
      style, 
      ratio, 
      saveOnServer: shouldSave 
    });
    
    // Return poster URL (either server URL or base64 data URL)
    return response.posterUrl;
  };
  
  const downloadPoster = async (posterUrl: string, filename: string = 'poster.png') => {
    if (posterUrl.startsWith('data:')) {
      // Handle base64 download
      const link = document.createElement('a');
      link.href = posterUrl;
      link.download = filename;
      link.click();
    } else {
      // Handle server URL download
      const response = await fetch(posterUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  };
  
  return { generatePoster, downloadPoster, isGenerating, posterUrl };
};
```

#### 3.2 Update ShareToXiaohongshu Component (1h)

**File**: `apps/frontend/src/components/ShareToXiaohongshu/ShareToXiaohongshu.vue`

```typescript
// Replace useGeneratePoster with useGenerateHtmlPoster
import { useGenerateHtmlPoster } from '@/composables/useGenerateHtmlPoster';

const { generatePoster, downloadPoster } = useGenerateHtmlPoster();

// Handle both base64 and server URLs seamlessly
const handleGeneratePoster = async () => {
  const posterUrl = await generatePoster(caption, selectedStyle, selectedRatio);
  // posterUrl can be either base64 data URL or server URL
  setPosterForSharing(posterUrl);
};
```

### Phase 4: LLM Prompt Engineering for Puppeteer (3h)

#### 4.1 Design Advanced CSS Style Prompts (2h)

Create detailed prompts that leverage full Puppeteer CSS support:

**Minimal Style**:

```
You are a minimalist poster designer for Chinese social media (Xiaohongshu). 
Create a clean, modern HTML poster with advanced CSS features for Puppeteer rendering.

ADVANCED CSS CAPABILITIES AVAILABLE:
- Full CSS3 support: transforms, filters, box-shadow, clip-path
- Complex gradients: radial, conic, multiple color stops
- Modern layout: CSS Grid, Flexbox, CSS Variables
- Typography: custom font weights, text-shadow, letter-spacing
- Effects: backdrop-filter, mix-blend-mode, CSS animations

LAYOUT:
- Single page layout, 3:4 aspect ratio (810x1080px)
- Clean typography with advanced font rendering
- Modern CSS Grid or Flexbox layout
- High contrast with subtle shadows and depth

CONTENT: "${caption}"

DESIGN PRINCIPLES:
- Minimal color palette with sophisticated gradients
- Typography-focused with custom font weights
- Subtle geometric elements with CSS transforms
- Professional depth with box-shadow and gradients
- Clean margins with CSS Grid precision

ADVANCED CSS TECHNIQUES TO USE:
- Linear/radial gradients for backgrounds
- Box-shadow for depth and elevation
- CSS transforms for subtle rotations/scaling
- CSS variables for consistent spacing
- Modern typography with font-feature-settings

Generate complete HTML with advanced inline CSS in <style> tag.
Leverage full browser capabilities for stunning visual quality.
Optimize for crisp Puppeteer rendering at high DPI.

OUTPUT: Complete HTML document with advanced CSS ready for Puppeteer.
```

**Warm Style** (Puppeteer-optimized):

```
Create a cozy, warm poster design leveraging advanced CSS capabilities.
Use complex gradients, filters, and modern CSS features.

WARM STYLE REQUIREMENTS:
- Complex gradient backgrounds: radial, conic, multi-stop
- Warm color palette with CSS filter effects
- Soft typography with text-shadow and custom spacing
- Decorative elements using CSS clip-path and transforms
- Comfortable layout with CSS Grid/Flexbox precision

ADVANCED EFFECTS TO INCLUDE:
- backdrop-filter for glass morphism effects
- CSS custom properties for dynamic theming
- Complex box-shadow for realistic depth
- Subtle CSS animations (if appropriate)
- Modern typography with font-variant features

[Include same technical capabilities as minimal style]
```

#### 4.2 Content-Aware Layout with Advanced CSS (1h)

Enhance prompts to analyze caption content and use advanced CSS:

- **Short captions**: Large text with CSS transform scaling and sophisticated gradients
- **Long captions**: CSS Grid multi-column with dynamic spacing using CSS variables
- **Event captions**: Timeline layout with CSS clip-path and transform animations
- **Emotional captions**: Advanced filter effects, backdrop-blur, and warm gradients

### Phase 5: Testing & Optimization (2h)

#### 5.1 Performance Testing (1h)

- Benchmark rendering times vs current system
- Memory usage optimization
- Error handling and fallbacks

#### 5.2 Visual Quality Testing (1h)

- Test all style combinations
- Mobile display optimization
- Font rendering consistency

## 🔧 Technical Implementation Details

### LLM Prompt Structure

```typescript
const generatePosterPrompt = (
  caption: string, 
  style: PosterStyle, 
  ratio: PosterRatio,
  contentAnalysis: ContentMetadata
) => {
  return `
${POSTER_STYLE_PROMPTS[style]}

CONTENT TO DESIGN:
"${caption}"

CONTENT ANALYSIS:
- Type: ${contentAnalysis.type} (event/lifestyle/knowledge/etc)
- Length: ${contentAnalysis.length} characters
- Sentiment: ${contentAnalysis.sentiment}
- Key Elements: ${contentAnalysis.keywords.join(', ')}

DIMENSIONS: ${getDimensions(ratio).width}x${getDimensions(ratio).height}px

REQUIREMENTS:
1. Generate complete HTML document
2. Include all CSS inline in <style> tag
3. Use system fonts only (no external resources)
4. Ensure text is readable and visually appealing
5. Optimize for Chinese characters
6. Include subtle decorative elements that match the style
7. Make design suitable for Xiaohongshu social sharing

OUTPUT: Valid HTML document ready for browser rendering.
  `;
};
```

### Browser Rendering Configuration (Puppeteer + Serverless Chromium)

```typescript
const puppeteerConfig = {
  // Chromium launch args optimized for serverless
  args: [
    ...chromium.args,
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process', // Important for serverless
    '--no-zygote',
    '--font-render-hinting=none', // Better font rendering
  ],
  defaultViewport: {
    width: 1080,
    height: 1440,
    deviceScaleFactor: 2, // High DPI
  },
  executablePath: await chromium.executablePath(),
  headless: true,
  ignoreHTTPSErrors: true,
};

// Page configuration for optimal rendering
const pageConfig = {
  viewport: getDimensions(ratio),
  waitUntil: 'networkidle0' as const,
  timeout: 30000,
};

// Screenshot configuration
const screenshotConfig = {
  type: 'png' as const,
  quality: 95,
  optimizeForSpeed: false, // Prioritize quality
  fullPage: false,
  clip: {
    x: 0,
    y: 0,
    width: dimensions.width,
    height: dimensions.height
  }
};

// Font optimization
const fontConfig = {
  families: [
    'system-ui', 
    '-apple-system', 
    'PingFang SC', 
    'Microsoft YaHei', 
    'Helvetica Neue', 
    'sans-serif'
  ],
  loadTimeout: 3000
};
```

### Content Analysis Service

```typescript
interface ContentMetadata {
  type: 'event' | 'lifestyle' | 'knowledge' | 'emotional' | 'business';
  length: number;
  sentiment: 'positive' | 'neutral' | 'excited' | 'calm';
  keywords: string[];
  hasTime: boolean;
  hasLocation: boolean;
  hasEmoji: boolean;
}

const analyzeContent = (caption: string): ContentMetadata => {
  // Basic content analysis for layout decisions
  // Could be enhanced with additional LLM call
};
```

## 📊 Expected Benefits

### Visual Quality

- **Dynamic Layouts**: Each poster can have unique layout adapted to content
- **Rich Graphics**: Full CSS3 support for gradients, shadows, filters, transforms
- **Typography Variety**: Advanced font rendering with custom weights and effects
- **Color Intelligence**: Content-aware color scheme with complex gradients
- **Professional Effects**: Depth, shadows, and modern visual treatments

### Technical Advantages

- **Serverless Ready**: Optimized for Vercel, AWS Lambda, Railway deployment
- **Perfect Rendering**: Puppeteer + serverless chromium ensures consistent, high-quality output
- **Cross-Platform**: Identical results across all devices and browsers
- **Advanced CSS**: Full support for modern CSS features and effects
- **High Quality**: Superior font rendering and anti-aliasing
- **WeChat Optimization**: Smart storage management for WeChat browser limitations
- **Memory Efficient**: @sparticuz/chromium optimized for serverless memory constraints
- **Fast Startup**: Optimized chromium binary for quick cold starts

### Content Adaptation

- **Smart Layouts**: Long text gets different treatment than short captions
- **Semantic Design**: Event posts look different from lifestyle posts
- **Cultural Sensitivity**: AI can incorporate Chinese design principles
- **Trend Awareness**: Can evolve designs based on current trends

### WeChat Browser Benefits

- **Storage Efficiency**: Conditional saving reduces server storage costs
- **Performance**: Direct base64 return for non-WeChat browsers
- **Compatibility**: Handles WeChat browser image sharing limitations
- **Auto-Detection**: Seamless browser detection and handling

## 🚧 Implementation Risks & Mitigations

### Risk 1: LLM Generation Inconsistency

**Mitigation**:

- Detailed prompts with strict formatting requirements
- Fallback to template system if HTML parsing fails
- Validation of generated HTML before rendering

### Risk 2: Rendering Performance

**Mitigation**:

- Browser instance reuse (singleton pattern)
- Implement caching for identical captions
- Background rendering queue for non-blocking UX

### Risk 3: HTML Quality Issues

**Mitigation**:

- HTML sanitization and validation
- CSS injection protection
- Fallback templates for malformed generation

## 📈 Success Metrics

### Performance Targets

- **Generation Time**: < 5 seconds end-to-end
- **Visual Quality**: Higher resolution than current system
- **Success Rate**: > 95% successful poster generations
- **User Satisfaction**: More engaging visual outputs

### Quality Benchmarks

- **Font Rendering**: Crisp, readable Chinese characters
- **Layout Consistency**: Proper spacing and alignment
- **Mobile Display**: Optimal viewing on mobile devices
- **Brand Consistency**: Maintains visual connection to Xiaohongshu aesthetic

## 🔄 Migration Strategy

### Phase Rollout

1. **Parallel Development**: Build new system alongside existing
2. **A/B Testing**: Test new system with subset of users
3. **Gradual Migration**: Switch style-by-style if needed
4. **Fallback Support**: Keep old system as backup during transition

### Rollback Plan

- Keep existing template system as fallback
- Feature flag to switch between systems
- Monitoring and alert system for generation failures

## 📚 Dependencies

### New Backend Dependencies

```json
{
  "puppeteer-core": "^21.6.0",
  "@sparticuz/chromium": "^119.0.0",
  "html-validator": "^6.0.1",
  "@types/html-validator": "^5.0.6",
  "@types/node": "^20.0.0"
}
```

### Environment Variables

```bash
# Puppeteer configuration
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Serverless optimization
CHROMIUM_EXECUTABLE_PATH=auto  # Let @sparticuz/chromium handle it

# Poster service configuration
POSTER_CACHE_TTL=3600
POSTER_GENERATION_TIMEOUT=30000
POSTER_STORAGE_PATH=./uploads/posters
POSTER_CLEANUP_INTERVAL=86400000

# WeChat browser detection
WECHAT_FORCE_SERVER_SAVE=true

# Serverless deployment
NODE_ENV=production
FUNCTION_TIMEOUT=30000
```

### Serverless Deployment Configuration

```bash
# For Vercel deployment
# vercel.json
{
  "functions": {
    "apps/backend/src/index.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}

# For AWS Lambda
# Add layer for chromium or use @sparticuz/chromium
# Memory: 1024MB+
# Timeout: 30s

# For Railway/other platforms
# Ensure sufficient memory allocation (1GB+)
```

## 📋 Task Breakdown

### Backend Tasks (9h total)

1. **HtmlPosterService Implementation** - 2h
2. **PuppeteerRenderService Implementation** - 2h
3. **PosterStorageService Implementation** - 30min
4. **Poster Controller & Routes** - 1.5h
5. **WeChat Browser Detection** - 30min
6. **Style Prompts Definition** - 30min
7. **Content Analysis Service** - 1h
8. **Error Handling & Validation** - 1h

### Frontend Tasks (2h total)

1. **Update Poster Generation Composable** - 1h
2. **Update ShareToXiaohongshu Component** - 1h

### Testing & Optimization (4h total)

1. **Performance Benchmarking** - 1.5h
2. **Visual Quality Testing** - 1h
3. **WeChat Browser Testing** - 1h
4. **Error Handling Testing** - 30min

### Documentation (1h total)

1. **Update Technical Documentation** - 0.5h
2. **Create Migration Guide** - 0.5h

## 🎯 Total Estimated Time: 16 hours

This plan transforms the poster generation from a static template system to an intelligent, AI-driven HTML generation system that can create visually stunning and content-appropriate posters for Xiaohongshu sharing.
