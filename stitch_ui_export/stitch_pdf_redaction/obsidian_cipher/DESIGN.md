# Design System Documentation

## 1. Overview & Creative North Star
### The North Star: "The Vault Editorial"
This design system is built to transform a high-security utility into a premium, authoritative experience. We are moving away from the "generic SaaS" aesthetic. Our goal is to blend the impenetrable feel of a **digital vault** with the sophisticated spacing and typographic hierarchy of a **high-end editorial journal**.

We achieve this through:
*   **Intentional Asymmetry:** Breaking the rigid grid to draw focus toward critical redaction actions.
*   **Tonal Depth:** Replacing clinical borders with a sophisticated hierarchy of dark surfaces.
*   **Authoritative Typography:** Using high-contrast scales to differentiate between "The Work" (the PDF) and "The Tool" (the interface).

---

## 2. Colors & Surface Logic
The palette is rooted in deep, light-absorbing tones to reduce eye strain during precision work while maintaining a sense of absolute security.

### The "No-Line" Rule
**Explicit Instruction:** Do not use `1px solid` borders for structural sectioning. Standard UI relies on lines; high-end UI relies on volume. 
*   Define boundaries through background shifts. For example, a file-list sidebar using `surface_container_low` (#1B1B1F) should sit directly against the main workspace `surface` (#121316).
*   If a visual break is required, use a `24px` (Spacing Token 5) gap rather than a divider line.

### Surface Hierarchy
Layering is our primary tool for navigation. Use the following tokens to "stack" importance:
1.  **Base Layer:** `surface_container_lowest` (#0D0E11) - Use for the outer-most application shell.
2.  **Working Surface:** `surface` (#121316) - The main canvas for the PDF previewer.
3.  **Floating Panels:** `surface_container_high` (#292A2D) - For toolbars and inspection panels that need to feel "closer" to the user.

### Signature Textures (The Glass & Gradient Rule)
To prevent the dark mode from feeling "flat," primary CTAs and active states should use a subtle linear gradient:
*   **Primary Action Gradient:** From `primary` (#C0C1FF) to `primary_container` (#8083FF) at a 135-degree angle.
*   **Glassmorphism:** For floating modals or context menus, use `surface_container_highest` (#343538) at **80% opacity** with a **12px backdrop-blur**. This allows the PDF content to subtly "ghost" through the UI, creating a sense of integrated depth.

---

## 3. Typography
We use a three-font system to separate intent: **Bricolage Grotesque** (Headlines/Character), **DM Sans** (Body/Utility), and **JetBrains Mono** (Technical/Data).

| Level | Token | Font | Size | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Bricolage Grotesque | 3.5rem | High-impact marketing/Hero |
| **Headline** | `headline-sm` | Bricolage Grotesque | 1.5rem | Section titles, "Redaction Summary" |
| **Title** | `title-md` | DM Sans | 1.125rem | Modal headers, Document names |
| **Body** | `body-md` | DM Sans | 0.875rem | Instruction text, standard labels |
| **Data** | `label-sm` | JetBrains Mono | 0.6875rem | Metadata, Coordinates, PII types |

---

## 4. Elevation & Depth
Depth is not a decoration; it is a functional indicator of security and focus.

### The Layering Principle
Avoid shadows on flat elements. Instead, use the **Spacing Scale** to create "breathing room" around containers. 
*   Place a `surface_container_low` card on a `surface` background. The subtle shift from `#1B1B1F` to `#121316` provides enough contrast for the eye without the clutter of a shadow.

### Ambient Shadows
Shadows are reserved strictly for elements that physically "hover" (Modals, Popovers).
*   **Shadow Specs:** `0px 20px 40px rgba(0, 0, 0, 0.4)`. 
*   **The Ghost Border:** For high-security alerts or primary focus areas, apply an `outline_variant` (#464554) at **15% opacity**. This creates a "barely-there" edge that defines the shape without breaking the editorial flow.

---

## 5. Components

### Primary Redaction Buttons
*   **Style:** Gradient fill (`primary` to `primary_container`).
*   **Rounding:** `md` (0.375rem) for a precise, "tooled" look.
*   **Interaction:** On hover, increase `surface_bright` (#38393C) glow.

### Redaction Chips (PII Tags)
*   **Style:** Use `surface_container_highest`. 
*   **Semantic Accents:** Do not color the whole chip. Use a 2px vertical "status bar" on the left edge of the chip using semantic tokens: `Success` (#22C55E) for redacted, `Danger` (#EF4444) for flagged.

### The Redaction Cursor
*   Instead of a standard pointer, use a custom crosshair with a `primary` (#C0C1FF) 10% opacity "capture box" that follows the mouse. This reinforces the "high-precision tool" identity.

### Input Fields
*   **Background:** `surface_container_lowest`.
*   **Border:** None. Use a bottom-only `outline_variant` at 20% opacity.
*   **Focus:** Transition the bottom border to 100% `primary` opacity with a subtle 2px glow.

---

## 6. Do's and Don'ts

### Do
*   **DO** use JetBrains Mono for all file sizes, page numbers, and timestamps to emphasize the technical accuracy of the tool.
*   **DO** use the `24` (5.5rem) spacing token for top-level margins to create an editorial "gallery" feel for the PDF document.
*   **DO** use "staggered" entry animations (e.g., 0.2s slide-up) for sidebar elements to make the interface feel intentional.

### Don't
*   **DON'T** use 100% white text. Always use `on_surface` (#E3E2E6) or `on_surface_variant` (#C7C4D7) to maintain the premium dark-mode balance.
*   **DON'T** use heavy drop shadows on cards. Let the background color shifts do the work.
*   **DON'T** use standard "Success/Error" banners that span the full width. Use floating "Toast" notifications with glassmorphism to avoid disrupting the editorial layout.

---

## 7. Spacing & Roundedness
*   **System Rhythm:** Use Spacing Token `4` (0.9rem) for internal component padding and Token `8` (1.75rem) for gap between related components.
*   **Corner Logic:** 
    *   Large containers (PDF Preview): `xl` (0.75rem).
    *   Interactive elements (Buttons/Inputs): `md` (0.375rem).
    *   Status indicators: `full` (9999px).