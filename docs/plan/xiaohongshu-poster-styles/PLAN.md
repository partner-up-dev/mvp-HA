# Xiaohongshu Poster Styles - Implementation Plan

## Overview

Redesign the poster generation system to better align with Xiaohongshu (RedBook) aesthetic using HTML-to-image approach with configurable styles.

## Current State Analysis

### Existing Implementation

- **Location**: `apps/frontend/src/composables/useGeneratePoster.ts`
- **Technology**: Canvas API with hardcoded design
- **Usage**: Single component `ShareToXiaohongshu.vue`
- **Output**: 540x720 PNG with gradient background, branding, and call-to-action

### Problems with Current Approach

1. **Canvas Limitations**: Hard to create complex layouts, typography is limited
2. **Hardcoded Design**: No style variations, single fixed aesthetic
3. **Branding-Heavy**: Too much PartnerUp branding, doesn't fit Xiaohongshu culture
4. **Poor Typography**: Canvas text rendering lacks finesse
5. **No Responsiveness**: Fixed dimensions don't adapt to content

## Design Strategy

### Style System Alignment

- **Integration**: Leverage existing 5-style caption system (活泼友好, 简洁干练, 温暖治愈, 潮流酷炫, 专业正式)
- **Poster Styles**: Create matching poster styles that complement each caption style
- **Design Tokens**: Use existing SCSS design system for consistent colors and typography

### Xiaohongshu Aesthetic Research

Based on platform analysis, Xiaohongshu posters typically feature:

- **Minimalist layouts**: Clean, spacious design with focus on content
- **Large typography**: Prominent text with good contrast
- **Soft color palettes**: Warm, gentle colors avoiding harsh contrasts
- **No heavy branding**: Platform-native feel without external branding
- **Square/vertical format**: 1:1 or 3:4 ratio for mobile viewing
- **Content-focused**: Text content is the hero, not decorative elements

## Technical Architecture

### HTML-to-Image Approach

- **Library**: `html2canvas` (23.7k stars, actively maintained)
- **Benefits**: CSS styling, complex layouts, responsive design, better typography
- **Implementation**: Generate HTML template → Convert to canvas → Export as blob

### Style Configuration System

```typescript
interface PosterStyle {
  id: string
  name: string
  background: BackgroundConfig
  typography: TypographyConfig
  layout: LayoutConfig
}

interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'texture'
  colors: string[]
  opacity?: number
}

interface TypographyConfig {
  primaryFont: string
  primarySize: string
  primaryWeight: string
  primaryColor: string
  lineHeight: number
}
```

## Proposed Poster Styles

### 1. Minimal (极简风格)

- **Background**: Clean white (#FFFFFF)
- **Typography**: Black text (#1A1A1A), clean sans-serif
- **Layout**: Centered, generous whitespace
- **Use Case**: Professional, serious topics

### 2. Elegant (优雅风格)

- **Background**: Soft off-white (#FEF9F6)
- **Typography**: Dark gray (#2D2D2D), serif or elegant sans-serif
- **Layout**: Refined spacing, subtle hierarchy
- **Use Case**: Lifestyle, cultural content

### 3. Warm (温暖风格)

- **Background**: Warm gradient (#FFF5F0 → #FFE4D6)
- **Typography**: Warm brown tones (#8B4513)
- **Layout**: Gentle curves, organic spacing
- **Use Case**: Personal, emotional content

### 4. Fresh (清新风格)

- **Background**: Light green gradient (#F0F9E9 → #E6F3D3)
- **Typography**: Deep green (#2D5016)
- **Layout**: Natural, airy feeling
- **Use Case**: Health, nature, outdoor activities

### 5. Modern (现代风格)

- **Background**: Soft gray gradient (#F8F9FA → #E9ECEF)
- **Typography**: Sharp black (#000000)
- **Layout**: Bold, contemporary spacing
- **Use Case**: Tech, urban, trendy content

## Implementation Plan

### Phase 1: Core Infrastructure (2-3 days)

1. **Install Dependencies**
   - Add `html2canvas` to package.json
   - Set up TypeScript types

2. **Create Style System**
   - Define poster style interfaces
   - Create style configuration objects
   - Integrate with existing design tokens

3. **Build HTML Template Engine**
   - Create Vue component for poster template
   - Implement dynamic styling system
   - Handle content overflow and text wrapping

### Phase 2: HTML-to-Image Engine (1-2 days)

1. **Replace Canvas Implementation**
   - Update `useGeneratePoster.ts` to use HTML-to-image
   - Implement poster template rendering
   - Add error handling and loading states

2. **Template System**
   - Create responsive poster template component
   - Implement style switching logic
   - Add content sanitization and formatting

### Phase 3: Style Implementation (2-3 days)

1. **Implement 5 Poster Styles**
   - Create SCSS for each style variant
   - Test typography and layout for different content lengths
   - Ensure mobile optimization

2. **Style Coordination**
   - Map poster styles to caption styles
   - Implement automatic style switching
   - Add manual override option

### Phase 4: Integration & Polish (1-2 days)

1. **Component Integration**
   - Update `ShareToXiaohongshu.vue` to use new system
   - Maintain existing caching behavior

2. **Testing & Optimization**
   - Test across different content types and lengths
   - Optimize performance and image quality
   - Handle edge cases (very long text, special characters)

## File Structure

```
apps/frontend/src/
├── composables/
│   ├── useGeneratePoster.ts (UPDATED)
│   └── usePosterStyles.ts (NEW)
├── components/
│   ├── ShareToXiaohongshu/
│   │   ├── ShareToXiaohongshu.vue (UPDATED)
│   │   └── PosterTemplate.vue (NEW)
│   └── PosterTemplate/
│       ├── PosterTemplate.vue (NEW)
│       ├── styles/
│       │   ├── minimal.scss (NEW)
│       │   ├── elegant.scss (NEW)
│       │   ├── warm.scss (NEW)
│       │   ├── fresh.scss (NEW)
│       │   └── modern.scss (NEW)
│       └── PosterTemplate.types.ts (NEW)
└── lib/
    └── poster-utils.ts (NEW)
```

## Key Design Decisions

### HTML-to-Image vs Canvas

- **Chosen**: HTML-to-Image with `html2canvas`
- **Reason**: Better typography, CSS styling, easier maintenance, responsive design

### Style System Integration

- **Chosen**: Extend existing 5-style caption system
- **Reason**: Consistent user experience, leverages existing patterns

### Template Approach

- **Chosen**: Vue component-based templates
- **Reason**: Reusable, testable, integrates with design system

### Dependency Choice

- **Chosen**: `html2canvas` over `dom-to-image`
- **Reason**: Better maintained, more features, better performance

## Success Metrics

1. **Visual Quality**: Posters look native to Xiaohongshu aesthetic
2. **Performance**: Generate poster in <2 seconds
3. **Compatibility**: Works across all supported browsers
4. **Consistency**: Styles align with caption styles
5. **Maintainability**: Easy to add new styles or modify existing ones

## Risk Mitigation

1. **Library Compatibility**: Test `html2canvas` thoroughly with existing setup
2. **Performance**: Implement proper loading states and caching
3. **Browser Support**: Fallback to canvas if HTML-to-image fails
4. **Content Overflow**: Robust text wrapping and layout adjustment
5. **Memory Management**: Proper cleanup of generated images and DOM elements

## Post-Implementation Improvements

1. **Style Customization**: Allow user-defined colors or fonts
2. **Advanced Layouts**: Multiple layout options per style
3. **Content Enhancement**: Add icons, shapes, or decorative elements
4. **Export Options**: Multiple sizes or formats
5. **A/B Testing**: Analytics for style preference and engagement
