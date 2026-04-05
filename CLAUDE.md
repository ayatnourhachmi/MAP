# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**MAP (MyAtlasPass)** is a premium travel concierge app built with Expo SDK 54, React Native 0.81.5, and React 19.1.0. The app offers curated destination guides, place browsing, AI-powered travel planning, and mobile connectivity passes.

**Stack:**
- Monorepo: Turbo v2
- Mobile: Expo (SDK 54), React Native, Expo Router v6
- State: Zustand
- Data: Local JSON assets (places, cities, categories)
- UI: React Native, expo-linear-gradient, react-native-svg, react-native-maps

---

## Monorepo Structure

```
map/
  apps/mobile/          ← React Native Expo app (primary)
    app/                  Expo Router file-based routing
      (main)/             5-tab navigation group
      onboarding/         Splash→Welcome→CountrySelect stack
    components/shared/    Shared screens (ExploreScreen, PlacesScreen)
    components/concierge/ Concierge AI chat UI
    assets/data/          JSON: places.json, cities.json, categories.json
    lib/theme.ts          Design tokens (colors, typography, spacing, shadows)
    store/appStore.ts     Zustand global state
    metro.config.js       Monorepo resolver config (CRITICAL for hoisted deps)
    
  apps/api/             ← Backend (not actively developed in this session)
  apps/web/             ← Web version (not actively developed in this session)
  
  turbo.json            Turbo pipeline: dev, build, lint, test
  package.json          Root workspace config
```

---

## Routing & Navigation (Expo Router v6)

**Root Stack** (`app/_layout.tsx`):
- Renders main navigator (when `onboardingComplete === true`) or onboarding stack (when `false`)
- Uses `animation: 'fade'` at root level

**Onboarding Stack** (`app/onboarding/_layout.tsx`):
- `splash.tsx` → staggered entrance, 2.5s auto-advance to welcome
- `welcome.tsx` → spring-in hero section with CTA
- `country-select.tsx` → selects country, calls `setOnboardingComplete(true)`, navigates to `/(main)/explore`

**Main Tab Group** (`app/(main)/_layout.tsx`):
- 5 tabs: Explore, Places, My Pass, Concierge, More
- Tab height: 64px, font size: 10px
- Custom icons: compass, pin, QR code, chat bubble, grid

**Tab Routes:**
- `explore.tsx` → exports `ExploreScreen.tsx` (featured/partner places carousel, city picker, city location)
- `places.tsx` → exports `PlacesScreen.tsx` (list/map view toggle, filtering, sorting)
- `pass.tsx` → MAP Pass carousel (3 tiers: Starter, Explorer, Premium)
- `concierge.tsx` → AI chat interface
- `more.tsx` → Account, Settings, Support (built inline)

---

## Design System

**Single source of truth:** `lib/theme.ts`

Use these when styling components:

```ts
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../../lib/theme';

// Colors: COLORS.gold, COLORS.nearBlack, COLORS.grayLight, etc.
// Typography: TYPOGRAPHY.h1, TYPOGRAPHY.body, TYPOGRAPHY.label
// Spacing: SPACING.screenPadding (24), SPACING.cardGap (16), SPACING.sectionGap (32)
// Shadows: SHADOWS.card, SHADOWS.button, SHADOWS.searchBar
```

**Color Palette:**
- Gold theme: `#D4AF37` (gold), `#F0D060` (light), `#B8962E` (dark)
- Grays: `#1A1A1A` (nearBlack), `#888888` (grayText), `#F2F2F2` (grayLight), `#E0E0E0` (grayBorder)
- Base: `#FFFFFF` (white), `#FAF9F6` (offWhite)

**Font:** Plus Jakarta Sans (already loaded via expo-font plugin)

**Animation Notes:**
- Use `Animated` API (React Native), NOT Reanimated, for all animations
- `useNativeDriver: true` for transforms (scale, translate, rotate)
- `useNativeDriver: false` for layout/color changes
- Prefer `spring()` for interactive animations, `timing()` for auto-triggered ones
- Always include `Haptics.impactAsync()` or `Haptics.selectionAsync()` on user interactions

---

## Data & State

### Global State (Zustand)

```ts
const { onboardingComplete, selectedCountry, activeLanguage } = useAppStore();
const { setCountry, setOnboardingComplete, setLanguage, reset } = useAppStore();
```

**Fields:**
- `onboardingComplete` (bool) — hides onboarding if true
- `selectedCountry` (string|null) — currently selected country for place browsing
- `activeLanguage` (string) — 'en', 'fr', 'ar', 'es' — TODO: use for translations
- `sessionId` (string) — unique session identifier

### JSON Assets

**`assets/data/places.json`** (233 records, Casablanca only)
- Fields: `id`, `name_en`, `name_ar`, `description_en`, `category_id`, `city_id`, `neighborhood`, `lat` (string, must parseFloat), `lng` (string, must parseFloat), `images` (JSON string), `rating`, `price_level` ('low', 'medium', 'high'), `is_partner`, `deleted_at`, `status`
- Filter: `deleted_at == null && status !== 'deleted'`
- Parse `opening_hours` JSON string with try/catch

**`assets/data/cities.json`** (23 cities)
- Fields: `id`, `slug`, `name_en`, `name_ar`, `name_fr`, `is_active`
- Filtered to `is_active === true`, sorted alphabetically

**`assets/data/categories.json`** (8 categories)
- Fields: `id`, `slug`, `name_en`, `display_order`, `is_active`, `show_in_home`
- Filtered to `is_active === true && show_in_home === true`, sorted by `display_order`

### Critical Filtering Rule

**Place Badges & Filters:**
- `is_partner === true` → gold "Featured" badge on cards
- `is_partner === false` → no badge
- **NEVER use `is_featured`** — it is redundant and always equals `is_partner`. Delete all references to it.
- Filter chip label: "Partners" (filters by `is_partner`)
- Sort option label: "Featured first" (sorts `is_partner` places to top)

---

## Key Architectural Patterns

### Metro Bundler Monorepo Fix

The `metro.config.js` is CRITICAL for the monorepo to work:

```js
config.watchFolders = [monorepoRoot];  // Watch root for changes
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];  // Resolve hoisted packages from root first
```

**If bundler fails with "Unable to resolve":**
1. Run `npx expo start --clear` to wipe Metro cache
2. Verify all imports use relative paths (not `@/` aliases — those aren't configured)
3. Check that hoisted `node_modules` at root contains the missing package

### Location Behavior (ExploreScreen & PlacesScreen)

- **No auto-request on mount** — location permission is only requested when user taps the location icon
- **Automatic city selection on location grant** — uses Haversine distance to find nearest city from GPS coords
- **GPS city remembered** — if user manually selects a different city, location grant resets and "Find places nearby" banner reappears
- `CITY_COORDS` lookup object (lat/lng for all 23 cities) used to calculate nearest city

### MapView (PlacesScreen)

- Default zoom centered on selected city (latitudeDelta: 0.08)
- User tap on location pill ("Use my location") → street-level zoom (0.015 delta)
- **MapMarker component** handles `tracksViewChanges` flip pattern:
  - Starts `true` so initial paint is captured by Android
  - Flips to `false` after 500ms for performance
  - Re-enables briefly on selection change so scale animation is reflected
- Marker types: Partner (gold "M" circle 36×36) vs. regular (white dot 28×28)

### Place Card Normalization

All place data is normalized at module load (not per-render):

```ts
function normalisePlaces(raw: any[]): Place[] {
  return raw.filter(...).map(p => ({
    // Parse strings to correct types
    lat:     p.lat  != null ? parseFloat(p.lat)  : null,
    lng:     p.lng  != null ? parseFloat(p.lng)  : null,
    images:  tryParseJSON(p.images),  // 'images' is JSON string
    rating:  p.rating ?? '0.00',
    // etc.
  }));
}
const ALL_PLACES = normalisePlaces(RAW_PLACES);  // Module-level constant
```

---

## Common Commands

**From root (`apps/mobile` directory parent):**

```bash
# Develop
npm run dev                          # All apps in watch mode (Turbo)
cd apps/mobile && npx expo start     # Mobile only, with Metro debugging
npx expo start --clear               # Wipe Metro cache (fixes bundler issues)
npx expo start --android             # Android only
npx expo start --ios                 # iOS only

# Build
npm run build                        # Turbo build all apps

# Lint & Test
npm run lint                         # Turbo lint all apps
npm run test                         # Turbo test all apps

# Mobile-specific (from apps/mobile)
npx expo install                     # Install/fix peer deps (use after package.json changes)
npx expo install --fix               # Auto-fix version conflicts
npx expo publish                     # Publish to Expo (not common in this workflow)
```

**Install new dependencies:**

```bash
# At root workspace level (affects all apps)
npm install <pkg>

# At mobile app level only
cd apps/mobile && npm install <pkg>
```

---

## Critical Files & When to Edit Them

| File | Purpose | When to Edit |
|---|---|---|
| `metro.config.js` | Monorepo resolver for hoisted packages | If Metro can't find modules from root `node_modules` |
| `lib/theme.ts` | Design tokens (colors, typography, spacing) | Adding new design scales or brand changes |
| `store/appStore.ts` | Global state (onboarding, country, language) | New global state needed across screens |
| `assets/data/*.json` | Place, city, category data | Backend sync or data model changes |
| `app/(main)/_layout.tsx` | Tab bar navigation | Adding/removing tab or changing icons/labels |
| `app/index.tsx` | Deep linking & route resolution | Changing onboarding logic or default routes |
| `components/shared/ExploreScreen.tsx` | Home/featured places | Category pills, place cards, city picker, location banner |
| `components/shared/PlacesScreen.tsx` | Full place browsing (list/map) | Filters, sorting, map markers, view toggle |

---

## Important Gotchas & Notes

1. **`is_featured` is deprecated** — All logic uses `is_partner` only. Delete any reference to `is_featured`.

2. **String lat/lng in JSON** — Always `parseFloat()` coordinates from JSON:
   ```ts
   lat:  p.lat  != null ? parseFloat(p.lat)  : null,
   lng:  p.lng  != null ? parseFloat(p.lng)  : null,
   ```

3. **Images are JSON strings** — Parse with `tryParseJSON()`:
   ```ts
   try { 
     images = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images ?? []); 
   } catch { 
     images = []; 
   }
   ```

4. **Animated.View inside Marker breaks on Android** — Use plain `View` for marker content, not `Animated.View`.

5. **useRef inside .map() is a hook violation** — Extract reusable components (e.g., `CategoryPillItem`, `MapMarker`) so `useRef` is at component root.

6. **No `@/` path aliases** — All imports must use relative paths: `'../../assets/data/places.json'`, not `'@/assets/data/places.json'`.

7. **Expo Router v6 typed routes** — Enabled in `app.json`:
   ```json
   "experiments": { "typedRoutes": true }
   ```
   Use `router.push('/(main)/explore')` with type safety.

8. **Location permission on-demand only** — Never auto-request `expo-location` on app start. Request only when user taps location UI.

9. **Safe area insets** — Always use `useSafeAreaInsets()` for paddingTop on headers and paddingBottom on bottom sheets/buttons.

10. **Haptics feedback** — Add haptic on every interactive gesture:
    - `Haptics.selectionAsync()` for filter/category toggles
    - `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` for card presses
    - `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` for major actions
    - `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` for successful location fix

---

## Testing & Debugging

- **Metro cache issues:** Run `npx expo start --clear` and check `metro.config.js` is watching monorepo root.
- **Missing packages:** Verify `npm install` was run at workspace root and hoisted `node_modules` contains the package.
- **Bundler fails on Android:** Check SDK version matches `app.json` expo version (~54.0.0). Reinstall with `npx expo install --fix`.
- **Map markers not visible:** Ensure `Marker` children are plain `View` (not `Animated.View`), and `tracksViewChanges` starts `true`.
- **Location not updating city:** Verify `gpsCitySlug` ref is set and city slug matches `CITY_COORDS` keys exactly.

---

## Future Work

- Replace hardcoded JSON assets with API hooks: `usePlaces(cityId, filters)`, `useCategories()`
- Add i18n translations using `activeLanguage` from store
- Implement backend sync for places, cities, categories
- Add custom Google Maps styling via `customMapStyle` prop on MapView
- Implement Concierge AI integration (skeleton exists, needs LLM endpoint)
- Add Places detail screen (`/place/:id`) with full information, reviews, booking
- Implement MAP Pass purchase flow with payment integration
- Dark mode support (design system ready, toggle not yet implemented)

