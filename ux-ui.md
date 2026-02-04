---
name: design-system
description: Generate comprehensive, production-ready design systems with tokens, components, guidelines, and framework integrations. Use this skill when the user needs to establish visual consistency across web and mobile applications, create design documentation, or build a scalable design foundation from brand inputs or creative direction.
license: MIT
---

# Design System Generation

## Overview

This skill generates complete, production-ready design systems from minimal input. It produces design tokens, component specifications, integration files, and comprehensive guidelines that ensure visual consistency across platforms.

## Trigger Conditions

Invoke this skill when:
- Referenced in `.claude/settings.json` or `claude.md`
- User requests: "create a design system", "generate design tokens", "build a component library"
- User provides brand assets and needs systematic design documentation
- Project requires consistent styling across web and mobile

## Input Requirements

| Input | Required | Description |
|-------|----------|-------------|
| Brand assets | Optional | Logo, existing colors, typography |
| Mood/vibe | Optional | Keywords: "minimal", "bold", "playful", "corporate", "organic" |
| Industry | Optional | Context for appropriate defaults |
| Platforms | Optional | Web, mobile, or both (default: both) |
| Framework | Optional | React, Vue, vanilla CSS (default: all) |

If no inputs provided, generate a neutral, professional system with sensible defaults.

## Output Structure

```
/design-system/
├── tokens/
│   ├── colors.json          # Color palette with semantic naming
│   ├── typography.json      # Font families, sizes, weights, line-heights
│   ├── spacing.json         # Spacing scale (4px base recommended)
│   ├── shadows.json         # Elevation system
│   ├── borders.json         # Border radii, widths, styles
│   └── breakpoints.json     # Responsive breakpoints
├── integrations/
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   ├── css-variables.css    # CSS custom properties
│   └── scss-variables.scss  # SCSS variables and mixins
├── components/
│   ├── components.md        # Component specs with usage examples
│   └── states.md            # Interactive states documentation
├── guidelines/
│   ├── color-usage.md       # When and how to use each color
│   ├── typography-usage.md  # Text hierarchy guidelines
│   ├── iconography.md       # Icon style, sizing, usage
│   ├── illustration.md      # Illustration style guidelines
│   ├── motion.md            # Animation principles and timing
│   ├── accessibility.md     # WCAG compliance guidelines
│   └── spacing-layout.md    # Layout principles and grid
├── figma/
│   └── figma-handoff.md     # Token mapping for Figma import
└── DESIGN-SYSTEM.md         # Master reference document
```

## Token Specifications

### Colors (colors.json)

```json
{
  "primitive": {
    "gray": {
      "50": "#FAFAFA",
      "100": "#F5F5F5",
      "900": "#171717"
    },
    "brand": {
      "primary": "#...",
      "secondary": "#..."
    }
  },
  "semantic": {
    "background": {
      "default": "{primitive.gray.50}",
      "subtle": "{primitive.gray.100}",
      "inverse": "{primitive.gray.900}"
    },
    "text": {
      "default": "{primitive.gray.900}",
      "muted": "{primitive.gray.600}",
      "inverse": "{primitive.gray.50}"
    },
    "border": {
      "default": "{primitive.gray.200}",
      "strong": "{primitive.gray.400}"
    },
    "interactive": {
      "default": "{primitive.brand.primary}",
      "hover": "{primitive.brand.primary-dark}",
      "active": "{primitive.brand.primary-darker}"
    },
    "status": {
      "success": "#...",
      "warning": "#...",
      "error": "#...",
      "info": "#..."
    }
  }
}
```

**Rules:**
- Always include primitive AND semantic layers
- Semantic tokens reference primitives (enables theming)
- Minimum contrast ratio: 4.5:1 for text, 3:1 for UI elements
- Include dark mode variants when applicable

### Typography (typography.json)

```json
{
  "fontFamily": {
    "display": "Font Name, fallback, sans-serif",
    "body": "Font Name, fallback, sans-serif",
    "mono": "Font Name, fallback, monospace"
  },
  "fontSize": {
    "xs": "0.75rem",
    "sm": "0.875rem",
    "base": "1rem",
    "lg": "1.125rem",
    "xl": "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem"
  },
  "fontWeight": {
    "normal": 400,
    "medium": 500,
    "semibold": 600,
    "bold": 700
  },
  "lineHeight": {
    "tight": 1.25,
    "normal": 1.5,
    "relaxed": 1.75
  },
  "letterSpacing": {
    "tight": "-0.025em",
    "normal": "0",
    "wide": "0.025em"
  }
}
```

**Rules:**
- Always specify fallback fonts
- Use rem units for scalability
- Include at least display and body font families
- Base size: 16px (1rem)

### Spacing (spacing.json)

```json
{
  "scale": {
    "0": "0",
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "8": "2rem",
    "10": "2.5rem",
    "12": "3rem",
    "16": "4rem",
    "20": "5rem",
    "24": "6rem"
  },
  "semantic": {
    "component-padding-sm": "{scale.2}",
    "component-padding-md": "{scale.4}",
    "component-padding-lg": "{scale.6}",
    "stack-sm": "{scale.2}",
    "stack-md": "{scale.4}",
    "stack-lg": "{scale.8}",
    "inline-sm": "{scale.2}",
    "inline-md": "{scale.4}",
    "inline-lg": "{scale.6}"
  }
}
```

**Rules:**
- Use 4px (0.25rem) base unit
- Exponential scale preferred (4, 8, 12, 16, 24, 32, 48, 64)
- Include semantic spacing for common patterns

### Shadows (shadows.json)

```json
{
  "elevation": {
    "none": "none",
    "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "md": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1)"
  }
}
```

### Borders (borders.json)

```json
{
  "radius": {
    "none": "0",
    "sm": "0.125rem",
    "md": "0.375rem",
    "lg": "0.5rem",
    "xl": "0.75rem",
    "2xl": "1rem",
    "full": "9999px"
  },
  "width": {
    "0": "0",
    "1": "1px",
    "2": "2px",
    "4": "4px"
  },
  "style": {
    "solid": "solid",
    "dashed": "dashed",
    "dotted": "dotted"
  }
}
```

### Breakpoints (breakpoints.json)

```json
{
  "mobile": "320px",
  "mobileLg": "480px",
  "tablet": "768px",
  "desktop": "1024px",
  "desktopLg": "1280px",
  "desktopXl": "1536px"
}
```

## Component Specifications

Document each component with:

1. **Anatomy** — Visual breakdown of parts
2. **Variants** — Size, color, style variations
3. **States** — Default, hover, active, focus, disabled
4. **Props/API** — Configuration options
5. **Usage guidelines** — When to use, when not to use
6. **Accessibility** — ARIA requirements, keyboard navigation
7. **Code examples** — Implementation snippets

### Core Components to Document

- Button (primary, secondary, ghost, destructive)
- Input (text, password, search, textarea)
- Select / Dropdown
- Checkbox / Radio
- Toggle / Switch
- Card
- Modal / Dialog
- Toast / Notification
- Badge / Tag
- Avatar
- Tooltip
- Tabs
- Accordion
- Navigation (header, sidebar, breadcrumb)
- Table
- Pagination
- Loading states (spinner, skeleton)
- Empty states
- Error states

## Integration Files

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    colors: {
      // Map from colors.json
    },
    fontFamily: {
      // Map from typography.json
    },
    fontSize: {
      // Map from typography.json
    },
    spacing: {
      // Map from spacing.json
    },
    boxShadow: {
      // Map from shadows.json
    },
    screens: {
      // Map from breakpoints.json
    },
    extend: {}
  }
}
```

### CSS Variables

```css
/* css-variables.css */
:root {
  /* Colors */
  --color-background-default: #FAFAFA;
  --color-text-default: #171717;
  
  /* Typography */
  --font-family-display: 'Font Name', sans-serif;
  --font-size-base: 1rem;
  
  /* Spacing */
  --spacing-4: 1rem;
  
  /* Shadows */
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

[data-theme="dark"] {
  --color-background-default: #171717;
  --color-text-default: #FAFAFA;
}
```

### SCSS Variables

```scss
// scss-variables.scss

// Colors - Primitives
$color-gray-50: #FAFAFA;
$color-gray-100: #F5F5F5;
$color-gray-900: #171717;
$color-brand-primary: #...;

// Colors - Semantic
$color-background-default: $color-gray-50;
$color-text-default: $color-gray-900;

// Typography
$font-family-display: 'Font Name', sans-serif;
$font-family-body: 'Font Name', sans-serif;
$font-size-base: 1rem;

// Spacing
$spacing-1: 0.25rem;
$spacing-2: 0.5rem;
$spacing-4: 1rem;

// Shadows
$shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);

// Mixins
@mixin text-style($size, $weight: 400, $line-height: 1.5) {
  font-size: $size;
  font-weight: $weight;
  line-height: $line-height;
}

@mixin elevation($level) {
  @if $level == 'sm' { box-shadow: $shadow-sm; }
  @if $level == 'md' { box-shadow: $shadow-md; }
  @if $level == 'lg' { box-shadow: $shadow-lg; }
}
```

## Naming Conventions

Follow these patterns for consistent token naming:

| Category | Pattern | Example |
|----------|---------|---------|
| Primitive colors | `{category}-{hue}-{shade}` | `color-gray-500` |
| Semantic colors | `{category}-{context}-{variant}` | `color-background-subtle` |
| Typography | `{property}-{scale}` | `font-size-lg` |
| Spacing | `spacing-{scale}` | `spacing-4` |
| Shadows | `shadow-{size}` | `shadow-md` |
| Borders | `{property}-{size}` | `radius-lg` |

**Rules:**
- Use kebab-case for all token names
- Avoid abbreviations except: sm, md, lg, xl
- Semantic tokens describe purpose, not appearance
- Never use color names in semantic tokens (not `color-blue`, use `color-primary`)

## Guidelines Documentation

### Motion Principles (motion.md)

Define:
- Timing functions (ease curves)
- Duration scale (instant: 0ms, fast: 150ms, normal: 300ms, slow: 500ms)
- Enter/exit patterns
- Micro-interactions
- Loading animations
- Page transitions

### Accessibility (accessibility.md)

Include:
- Color contrast requirements
- Focus management
- Keyboard navigation patterns
- Screen reader considerations
- Reduced motion support
- Touch target sizes (minimum 44x44px)

## Execution Checklist

When generating a design system:

- [ ] Gather inputs (brand, mood, industry, platforms)
- [ ] Generate color palette with accessibility validation
- [ ] Define typography scale
- [ ] Create spacing system
- [ ] Build shadow/elevation scale
- [ ] Set breakpoints
- [ ] Document core components
- [ ] Generate Tailwind config
- [ ] Generate CSS variables
- [ ] Generate SCSS variables
- [ ] Write usage guidelines
- [ ] Create Figma handoff documentation
- [ ] Compile master DESIGN-SYSTEM.md

## Quality Validation

Before delivering:

1. **Contrast check** — All text meets WCAG AA (4.5:1)
2. **Token consistency** — Semantic tokens properly reference primitives
3. **Cross-reference** — Integration files match token definitions
4. **Completeness** — All core components documented
5. **Practical** — Examples are copy-paste ready

## Versioning

Include version info in DESIGN-SYSTEM.md header:

```markdown
# [Project] Design System
**Version:** 1.0.0
**Last Updated:** YYYY-MM-DD
**Status:** Draft | Review | Stable
```

**Version bumping:**
- **Patch (1.0.x):** Typo fixes, documentation updates
- **Minor (1.x.0):** New components, additional tokens
- **Major (x.0.0):** Breaking changes to existing tokens or components

**Changelog:** Maintain a CHANGELOG.md documenting all changes.

## Decision Logic

### Input Priority

When inputs conflict, follow this hierarchy:
1. Explicit brand colors override mood-derived colors
2. User-specified fonts override mood defaults
3. Platform requirements override aesthetic preferences
4. Accessibility requirements override all visual preferences

### Default Behaviors

| Missing Input | Default Behavior |
|---------------|------------------|
| No brand colors | Generate neutral gray palette + blue primary |
| No mood | Default to "professional, clean, modern" |
| No industry | Generate industry-agnostic system |
| No platform | Generate for both web and mobile |
| No framework | Generate all integration files |

### Edge Case Handling

**Brand colors fail contrast:**
1. Keep original color as "brand" reference
2. Generate accessible variant (darken/lighten)
3. Document both in colors.json with note
4. Use accessible variant in semantic tokens

**Conflicting mood keywords:**
- "Minimal" + "Bold" → Prioritize bold with restrained color palette
- "Playful" + "Corporate" → Lean corporate with subtle playful accents
- Document the interpretation in DESIGN-SYSTEM.md

**Incomplete brand assets:**
- Logo only → Extract dominant colors, suggest complementary palette
- Colors only → Suggest typography that matches color personality
- Nothing → Full generation with neutral, professional defaults

### Generation Sequence

Execute in this order (dependencies flow down):
1. Colors (foundation)
2. Typography (independent)
3. Spacing (independent)
4. Shadows (uses colors for tinted shadows if applicable)
5. Breakpoints (independent)
6. Components (uses all above)
7. Integration files (transforms tokens)
8. Guidelines (references all above)
9. Master document (compiles all)

## Example Usage

**Minimal input:**
```
Create a design system for a fintech startup
```

**Detailed input:**
```
Create a design system with:
- Brand colors: #1E40AF (primary), #F59E0B (accent)
- Mood: Professional but approachable
- Platforms: Web and iOS
- Framework: React with Tailwind
```

**From existing assets:**
```
Here's our logo and brand guidelines PDF. Generate a complete design system that extends these into a full component library.
```
