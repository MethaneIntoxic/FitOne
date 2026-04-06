# Design System Strategy: Kinetic Obsidian (V2)

## 1. Creative North Star: "The Neon Monolith"
This design system is built to feel like high-performance machinery operating in a deep-space void. We are moving away from the "standard dark mode" and toward a **Neon Monolithic** aesthetic. This means the UI should feel heavy, permanent, and architectural, but energized by a core of kinetic purple light. 

Instead of traditional grids, we embrace **Intentional Asymmetry**. Use large, dramatic whitespace to push content into unexpected corners, creating a sense of tension and movement. Overlap elements—let a display heading bleed into a container—to break the "boxed-in" feel of web templates.

---

2. Color Strategy & Tonal Depth
We have purged the previous pink accents in favor of a **Vibrant Purple (#8B5CF6)** ecosystem. The color palette isn't just about decoration; it represents energy and "on-state" functionality.

### The "No-Line" Rule
**Lines are a failure of hierarchy.** Within this system, 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through:
- **Tonal Shifts:** Placing a `surface-container-low` section against the `background`.
- **Negative Space:** Using the spacing scale to create mental boundaries.
- **Luminescent Transitions:** Subtle gradients that fade into the void.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, obsidian-like plates. 
- **The Void:** `background` (#060e20) is the absolute base.
- **The Plates:** `surface-container-low` and `surface-container` create the primary layout blocks.
- **The Focus:** `surface-container-highest` is reserved for active, interactive, or urgent modals.

### The "Glass & Gradient" Rule
To achieve the "Kinetic" feel, CTAs and primary focal points must use the **Signature Obsidian Glow**:
- **Primary Gradient:** Linear 135deg, `primary_dim` (#8455ef) to `primary` (#ba9eff).
- **Glassmorphism:** For floating menus or overlays, use `surface_bright` at 60% opacity with a `24px` backdrop-blur. This allows the purple energy of the background to bleed through, creating a "frosted amethyst" effect.

---

3. Typography: Space Grotesque Editorial
We utilize **Space Grotesk** not as a font, but as a geometric branding element.

- **Display Scales (sm/md/lg):** These are your "vibe" setters. Use `-0.04em` letter spacing to make the font feel tight and engineered. Display text should often be `on_surface_variant` to keep the hierarchy sophisticated, reserving pure white for interaction points.
- **Headline & Title:** These convey authority. Use `headline-lg` for section starts, but offset them—perhaps 40px to the left of the main content column—to lean into the asymmetric editorial look.
- **Body & Label:** Use `body-md` for standard reading. The tight geometry of Space Grotesk remains legible at small sizes, but ensure you use `on_surface` (#dee5ff) to maintain a high-contrast ratio against the dark obsidian backgrounds.

---

4. Elevation & Depth: Tonal Layering
Traditional shadows are too "fuzzy" for this high-performance aesthetic. We use **Ambient Luminescence**.

- **The Layering Principle:** Depth is achieved by stacking. A `surface-container-lowest` (#000000) card sitting on a `surface-container-low` (#091328) section creates a "recessed" look. Conversely, `surface-container-high` on `background` creates "lift."
- **Ambient Shadows:** If a floating effect is required (e.g., a dropdown), use a shadow color tinted with `primary` (#8B5CF6) at 8% opacity with a `48px` blur. It should look like the component is glowing, not casting a shadow.
- **The "Ghost Border" Fallback:** If accessibility demands a container edge, use `outline_variant` (#40485d) at **15% opacity**. This provides a hint of an edge without shattering the "No-Line" rule.

---

5. Component Guidelines

### Buttons: The Kinetic Trigger
- **Primary:** No solid fills. Use a gradient of `primary_dim` to `primary`. Border-radius is fixed at `DEFAULT` (1rem). 
- **Secondary:** Use a "Ghost Border" (15% opacity `outline_variant`) with `on_surface` text. On hover, the background should transition to a 10% opacity `primary` tint.
- **Tertiary:** Text-only, using `label-md` in `primary` color.

### Cards & Lists: The Obsidian Slabs
- **Rule:** No dividers. Use `1.5rem` (md) vertical spacing to separate list items.
- **Selection:** Use a subtle `surface_variant` background to indicate selection. Never use a checkbox if a "Selectable Slab" layout can work instead.

### Input Fields: Monolith Inputs
- **Style:** Fields should be `surface_container_low` with a bottom-only "Ghost Border." 
- **Focus State:** The bottom border transforms into a 2px `primary` (#8B5CF6) line with a subtle 4px purple outer glow.

### Additional Component: "The Pulse"
For real-time data or status, use a 8px circle with a `primary` color fill and a CSS animation creating a 20px expanding ring (0% opacity) to signify the "Kinetic" nature of the system.

---

6. Do’s and Don’ts

**DO:**
- Use **asymmetry**. Align a title to the left and the body text to a center-right column.
- Use **purple glows** behind images to make them feel integrated into the "Obsidian" environment.
- Use `ROUND_FOUR` (1rem) for almost everything to maintain a "friendly-tech" balance.

**DON’T:**
- **Don't use pure grey.** All "neutrals" in this system are tinted with the `background` navy/blue (#060e20).
- **Don't use 1px solid borders.** If you feel the need for a line, try using a 4px difference in background color instead.
- **Don't use pink.** All legacy pink assets must be remapped to the `8B5CF6` (Vibrant Purple) spectrum.
- **Don't crowd the UI.** This system requires "Editorial Breath"—if a screen feels full, it's likely over-designed. Remove a container and use whitespace.