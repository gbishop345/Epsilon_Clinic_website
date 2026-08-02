# Epsilon Health — Design F

## Design intent

Design F presents Epsilon Health as a private medical residence: clinically credible, calm, personal, and quietly premium. It combines hospitality-led interiors with restrained editorial typography and warm, natural color.

The experience should feel considered rather than technical. It may use precise information and numbered wayfinding, but it should not resemble a software dashboard, laboratory interface, or futuristic wellness product.

## Core principles

1. **Quiet confidence**  
   Use generous space, simple language, strong photography, and light-weight typography. Avoid decorative noise and aggressive sales treatments.

2. **Hospitality before technology**  
   Lead with the physical clinic, attentive care, and human outcomes. Technology appears only where it explains a real service, such as connected care.

3. **Editorial, not interface-like**  
   Prefer open compositions, fine rules, and natural text groupings over floating panels, status indicators, boxed labels, or excessive UI chrome.

4. **Warm clinical restraint**  
   Clinical content should be precise without making the site feel cold. Warm neutrals, champagne accents, and desaturated interiors carry the premium tone.

5. **Clear hierarchy and readable detail**  
   Large headlines establish emotion; body copy explains the offer; labels support navigation. Small text must remain legible and should generally stay around 11.5–12px or larger.

## Visual language

### Color palette

The source of truth is the custom properties at the top of `styles.css`.

| Token | Value | Use |
|---|---:|---|
| `--linen` | `#eee8dd` | Primary warm page background |
| `--linen-deep` | `#dfd5c5` | Deeper neutral transitions |
| `--porcelain` | `#f8f5ef` | Light text and elevated light surfaces |
| `--champagne` | `#b79970` | Primary premium accent |
| `--champagne-light` | `#dec8a8` | Accent on dark backgrounds |
| `--clay` | `#a8755e` | Warm interaction and selection accent |
| `--sage` | `#748078` | Calm clinical supporting accent |
| `--charcoal` | `#1b1d1b` | Main dark environment |
| `--charcoal-soft` | `#252724` | Softer dark surface |
| `--ink` | `#262824` | Primary light-background text |
| `--muted` | `#696b64` | Secondary light-background text |

Dark sections should flow as a connected atmosphere rather than a sequence of unrelated black panels. Light sections should use tonal gradients so transitions feel intentional.

### Typography

- Primary family: **DM Sans**
- Fallbacks: `"Helvetica Neue", Arial, sans-serif`
- Available weights: 300–600
- Headlines: weight 300, tight line-height, negative tracking
- Body copy: regular weight with generous line-height
- Labels: medium weight, modest tracking, usually uppercase
- Accent words: champagne color through the `em` element; not italicized

Both `--serif` and `--mono` currently resolve to DM Sans. The variable names are retained for compatibility with the existing CSS, but no monospaced face should be introduced.

Avoid:

- Futuristic, geometric, or visibly monospaced type
- Tiny metadata
- Excessive letter spacing
- Too many all-caps lines in one composition

### Shape and borders

- Large full-width page sections remain square to the viewport.
- Rounded corners belong to smaller cards, images, controls, and forms.
- Primary buttons use a soft pill shape.
- Borders are thin and low contrast.
- Image labels should be open editorial captions, not opaque floating boxes.
- Glass effects are reserved for a small number of contained elements and should not dominate the page.

### Spacing

- Global horizontal gutter: `--gutter`
- Major vertical section spacing: `--space`
- Major layouts use generous negative space, but not at the expense of balance or useful content density.
- Do not leave a persistent empty column beside a long scrolling list. Section 07 solves this with a full-width introduction followed by two accordion columns.

## Page structure

### Hero

Purpose: establish the clinic as premium, human, and place-based.

- Main image: `assets/lobby-1.jpg`
- Desktop focal position: approximately `28% center`
- Mobile focal position: approximately `34% center`
- The crop must clearly show the **EH wall mark**.
- The hero remains full-bleed with square page edges.
- “One place. A lifetime of care.” is an open editorial aside with a fine champagne rule, not a glass card.
- The circular atmosphere and oversized background word are intentionally subtle.

### 01 — Overview

Introduces hospitality as the operating idea behind the medical experience.

- Uses `assets/lounge.jpg`
- Image is a smaller rounded editorial element within the full-width section.
- Keep the headline dominant and the supporting copy calm and concise.

### 02 — Memberships

Compares Epsilon DPC and Premium Concierge.

- Two large rounded membership cards
- DPC uses a light treatment
- Premium Concierge uses a deeper, more atmospheric treatment
- Preserve clear pricing and membership distinctions
- Badges and calls to action use rounded shapes

### 03 — Connected care

Explains direct communication and appointment access.

- Uses `assets/meeting-room.jpg` behind the phone composition
- The phone is the one intentionally technological visual on the page
- Keep the surrounding copy and container warm enough that it still belongs to the clinic experience

### 04 — Flagship programs

Highlights the three primary premium programs.

- Three rounded program cards
- Center card is the visual feature
- Maintain strong type hierarchy and ample space
- Do not turn the cards into dense pricing tables

### 05 — Inside Epsilon

Provides an editorial glimpse of the clinic.

- Primary: `assets/lobby-3.jpg`
- Supporting: `assets/ketamine.jpg`
- Supporting: `assets/bathroom-large.jpg`
- Image captions are restrained and integrated into the photography

### 06 — À la carte

Groups additional services into four categories.

- Large rounded category cards
- Roman numerals provide editorial indexing
- Service lists should remain easy to scan

### 07 — Program details

Provides expandable detail for ten programs.

- Full-width introduction above the list
- Two balanced accordion columns on larger screens
- One column on tablet and mobile
- Prices are hidden at tighter widths to prevent cramped rows
- Expanded content stays within its column
- Do not restore the old sticky left heading; it created excessive empty space during long scrolling

### 08 — The residence

Shows the clinic’s clinical and recovery spaces in a horizontal carousel.

- `assets/vo2.jpg`
- `assets/infusion.jpg`
- `assets/infrared.jpg`
- `assets/oxygen.jpg`
- `assets/procedure.jpg`

The final image is a **Procedure Room**, not an on-site laboratory. Do not describe Epsilon as having an on-site lab.

Facility images use rounded corners because they are cards within the section. Their labels are simple text with a short champagne rule rather than boxed overlays.

### 09 — Inquiry

Closes with membership guidance and an inquiry form.

- Dark, atmospheric full-width section
- Rounded form container
- Form controls use understated bottom borders
- Submission is intentionally disabled until backend integration is added
- Preserve the explanatory form note

## Imagery

Photography should make the clinic feel established, tangible, and premium.

### Treatment

- Use real clinic images from `design-f/assets`
- Favor architectural views, warm lighting, curved forms, and uncluttered rooms
- Apply restrained saturation and contrast through CSS
- Use gradients for text legibility without obscuring the interiors
- Preserve meaningful focal points when changing crops
- Rounded corners are appropriate for contained photographs, not full-width sections

### Currently unused

The assets folder also contains `lobby-2.jpg`. It may be used in a future revision if it improves the composition, but the site does not need to display every available image.

## Responsive behavior

### Up to 1120px

- Primary navigation becomes a full-height menu
- Membership cards stack
- Program cards reduce to two columns
- Program-detail prices are hidden to protect row spacing

### Up to 800px

- Major grids become one column
- Hero callout moves across the lower portion of the hero
- Clinic gallery and inquiry layouts stack
- Program details become one accordion column
- Facility cards become wider relative to the viewport

### Up to 520px

- Headlines scale down while retaining strong impact
- Primary buttons become full width
- Membership feature grids become one column
- Clinic gallery support images stack
- Program rows use a compact three-part layout
- Footer content collapses into a smaller grid

Every responsive change should be checked for horizontal overflow, headline collisions, awkward image crops, and text below approximately 10px.

## Interaction and motion

- Header changes from transparent to a blurred linen surface after scrolling
- Mobile navigation supports click, link close, and Escape close
- Reveal transitions use `IntersectionObserver`
- Facility carousel supports buttons, touch/trackpad scrolling, and arrow keys
- Accordion details use native `<details>` and `<summary>` elements
- `prefers-reduced-motion` disables nonessential motion

Motion should feel slow, smooth, and restrained. Avoid springy, playful, or highly technical animations.

## Accessibility

- Maintain the skip link
- Keep landmark and section labelling through `aria-labelledby`
- Decorative imagery remains hidden from assistive technology
- Informative photography requires specific alt text
- Preserve visible focus styles
- Mobile navigation must maintain accurate `aria-expanded` and labels
- Facility carousel must remain keyboard accessible
- Do not communicate important meaning through color alone

## Content guardrails

- Refer to the location as Brentwood, Tennessee
- Distinguish Direct Primary Care from Premium Concierge
- Use “physician-led” where clinically appropriate
- Do not imply that every therapy is included in membership
- Keep separate-pricing notes for testing, imaging, pharmaceuticals, supplements, and add-ons
- Do not claim an on-site laboratory
- Use “Procedure Room” or “procedure suite” for the corresponding facility space
- Avoid unsupported clinical outcomes or guarantees

## Implementation

- `index.html` contains the complete semantic page structure and the small inline interaction script.
- `styles.css` contains all design tokens, layout, components, animation, and responsive rules.
- `assets/` contains the clinic photography used by Design F.
- The page has no build step or framework dependency.
- Google Fonts loads DM Sans in the document head.

## Editing checklist

Before considering a Design F change complete:

- Confirm it feels calm, premium, and human rather than technical.
- Keep major page sections square and reserve rounding for contained elements.
- Check that dark and light sections transition naturally.
- Preserve the EH mark in the hero crop.
- Verify that supporting text remains readable.
- Check desktop, tablet, and mobile layouts.
- Confirm there is no horizontal overflow.
- Confirm all images load and have appropriate alt behavior.
- Check keyboard navigation and reduced-motion behavior when interactions change.
- Keep medical and facility wording accurate.

