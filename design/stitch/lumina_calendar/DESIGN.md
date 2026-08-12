---
name: Lumina Calendar
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464554'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#b90538'
  on-secondary: '#ffffff'
  secondary-container: '#dc2c4f'
  on-secondary-container: '#fffbff'
  tertiary: '#904900'
  on-tertiary: '#ffffff'
  tertiary-container: '#b55d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#ffdadb'
  secondary-fixed-dim: '#ffb2b7'
  on-secondary-fixed: '#40000d'
  on-secondary-fixed-variant: '#92002a'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  grid-margin: 24px
  grid-gutter: 16px
  cell-padding: 12px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style

The design system prioritizes cognitive clarity and emotional calm, transforming scheduling from a chore into a reflective practice. The brand personality is organized, gentle, and intentional, targeting professionals and creatives who seek a high-utility tool without the aggressive "hustle" aesthetic of traditional productivity apps.

The visual style is **Minimalist with a Tactile twist**, utilizing significant whitespace, soft-depth shadows, and a sophisticated pastel palette. It avoids heavy borders in favor of tonal shifts and subtle blurs, ensuring the user's content (their time) remains the focal point. The interface should feel "airy" and responsive, evoking the sensation of a high-quality paper planner translated into a digital medium.

## Colors

The color strategy uses a "Low-Vibrance Base, High-Vibrance Event" logic. The interface itself resides in the neutral and primary spectrum to reduce eye strain, while event categories use distinct, slightly desaturated "modern pastels" to provide instant categorization without visual clutter.

- **Primary:** An indigo-violet used for active states, primary actions, and the "current time" indicator.
- **Secondary:** A warm rose used for urgent notifications or high-priority markers.
- **Event Tokens:** These should be applied as a light background tint (15% opacity) with a solid left-border or text treatment for maximum legibility.
- **Dark Mode:** In dark mode, surfaces shift to deep navy (not pure black) to maintain the "soft" feel, with event colors increasing in saturation to maintain accessibility.

## Typography

This design system uses **Hanken Grotesk** across all roles to ensure a modern, sharp, and highly legible experience. The typeface's geometric roots provide the "clean" feel, while its contemporary details prevent it from feeling too corporate.

- **Headlines:** Use a tighter letter-spacing and heavier weights to create clear visual anchors in the calendar grid.
- **Labels:** Used for time markers (e.g., "10:00 AM") and metadata. These should often be in uppercase with slight tracking for better scanning.
- **Numbers:** Ensure tabular lining is used for dates and times within the calendar view to maintain vertical alignment in columns.

## Layout & Spacing

The layout utilizes a **fluid-to-fixed hybrid grid**. The main calendar view (Day/Week/Month) is fluid, expanding to occupy all available horizontal space to maximize the entry area for events. 

- **Sidebar:** Fixed at 280px for navigation, mini-month picker, and category toggles.
- **Rhythm:** An 8px base unit governs all padding and margins. 
- **The "Breathable" Grid:** The grid lines in the calendar should be extremely subtle (1px width, 5-10% opacity neutral color). 
- **Mobile Adaptivity:** On mobile, the sidebar collapses into a bottom sheet or a drawer, and the multi-column week view transitions to a single-column scroll or a 3-day view to preserve tap targets.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows** rather than stark lines.

- **Level 0 (Background):** The base canvas, slightly off-white or deep navy.
- **Level 1 (Main Surfaces):** Calendar cells and sidebars. No shadows, distinguished by 1px subtle borders or slight color shifts.
- **Level 2 (Active Events/Cards):** Floating elements use a "Soft Glow" shadow—large blur radius (16px+), low opacity (8%), tinted with the primary color.
- **Level 3 (Modals/Popovers):** Used for event creation or details. These feature a background blur (12px) on the overlay to maintain context while focusing the user.

## Shapes

The shape language is **Rounded**, leaning towards a friendly but professional appearance. 

- **Default (0.5rem):** Standard buttons, input fields, and event blocks within the calendar.
- **Large (1rem):** Used for cards, date pickers, and container surfaces.
- **Pill:** Reserved exclusively for status indicators (e.g., "Busy", "Free") and current-day highlights in the header.

## Components

- **Buttons:** Primary buttons use a solid fill with white text. Secondary buttons use a ghost style with a subtle background fill on hover. Use 16px horizontal padding.
- **Event Chips:** These are the core atoms. They should have a 4px left-hand border of the solid category color, with the remainder of the chip filled with a 10% opacity version of the same color. 
- **Input Fields:** Minimalist design with a bottom-only border that transforms into a full-focus ring (2px) only when active.
- **Lists:** Used in the sidebar for category toggling. Include a "color dot" prefix for each category.
- **Empty States:** Use custom illustrations with the secondary/pastel palette and plenty of whitespace to reduce the "guilt" of an empty schedule.
- **Time Indicator:** A horizontal line with a circular head, colored in the `primary_color_hex`, that moves in real-time across the calendar view.