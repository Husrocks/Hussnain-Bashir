# Navbar Redesign Specification

## Overview
Redesign the primary navigation bar (`SiteHeader.astro`) into a premium, balanced layout that improves visual hierarchy and aesthetics by splitting the primary navigation from secondary actions, and utilizing SVG icons for social links.

## Architecture & Layout
The new navbar will follow a "Split Layout" approach across three main sections:

1. **Left: Logo**
   - Renders the existing "HB" logo.
   - Remains aligned to the left side of the viewport wrapper.

2. **Center: Core Navigation Pill**
   - A floating, pill-shaped container (glassmorphism/blur effect matching the theme).
   - Contains text links for core pages:
     - `Home`
     - `Projects`
     - `About`
   - Hover states will feature a sleek background highlight or underline.

3. **Right: Actions & Socials**
   - A secondary container aligned to the right.
   - Contains:
     - **Resume Button**: A styled, prominent button link to `/hussnain-bashir-resume.pdf`.
     - **LinkedIn Icon**: An SVG icon replacing the previous text link.
     - **GitHub Icon**: An SVG icon replacing the previous text link.
   - The "Email" link is removed from the header entirely.

## UI/UX Engineering Details
- **Icons**: Use minimal, clean SVG paths (e.g., Lucide or Feather icons) for GitHub and LinkedIn.
- **Responsiveness**: 
  - On desktop: Full split layout (Logo | Nav | Actions).
  - On mobile: Ensure it gracefully degrades, potentially hiding socials into a hamburger menu or wrapping them below the main nav, depending on existing mobile nav implementation.
- **Aesthetics**: Avoid default AI aesthetics. Use the project's existing CSS variables (`--glass-bg`, `--glass-border`, `--color-accent`) to maintain cohesion. Ensure focus states are accessible for keyboard navigation.
