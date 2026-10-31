import {
  DEFAULT_THEME,
  THEMES,
  THEME_CONTENT_LAYOUT_OPTIONS,
  THEME_RADIUS_OPTIONS,
  THEME_SCALE_OPTIONS,
  type ThemeConfig,
  type ThemeContentLayout,
  type ThemePreset,
  type ThemeRadius,
  type ThemeScale,
} from '@/modules/theme';

const THEME_PRESET_OPTIONS = THEMES.map(({ value }) => value);

export type ThemeMode = 'light' | 'dark';
export type SidebarMode = 'default' | 'icon';
export type MemberLanguage = 'en' | 'zh';

export interface MemberPreferences {
  themePreset: ThemePreset;
  themeRadius: ThemeRadius;
  themeScale: ThemeScale;
  themeContentLayout: ThemeContentLayout;
  themeMode: ThemeMode;
  sidebarMode: SidebarMode;
  language: MemberLanguage;
}

export interface MemberPreferencesPayload {
  themePreset?: string | null;
  themeRadius?: string | null;
  themeScale?: string | null;
  themeContentLayout?: string | null;
  themeMode?: string | null;
  sidebarMode?: string | null;
  language?: string | null;
}

export const DEFAULT_MEMBER_PREFERENCES: MemberPreferences = {
  themePreset: DEFAULT_THEME.preset,
  themeRadius: DEFAULT_THEME.radius,
  themeScale: DEFAULT_THEME.scale,
  themeContentLayout: DEFAULT_THEME.contentLayout,
  themeMode: 'light',
  sidebarMode: 'default',
  language: 'en',
};

function resolveThemePreset(value: string | null | undefined): ThemePreset {
  if (value && THEME_PRESET_OPTIONS.includes(value as ThemePreset))
    return value as ThemePreset;
  return DEFAULT_MEMBER_PREFERENCES.themePreset;
}

function resolveThemeRadius(value: string | null | undefined): ThemeRadius {
  if (value && THEME_RADIUS_OPTIONS.includes(value as ThemeRadius))
    return value as ThemeRadius;
  return DEFAULT_MEMBER_PREFERENCES.themeRadius;
}

function resolveThemeScale(value: string | null | undefined): ThemeScale {
  if (value && THEME_SCALE_OPTIONS.includes(value as ThemeScale))
    return value as ThemeScale;
  return DEFAULT_MEMBER_PREFERENCES.themeScale;
}

function resolveThemeContentLayout(
  value: string | null | undefined,
): ThemeContentLayout {
  if (
    value &&
    THEME_CONTENT_LAYOUT_OPTIONS.includes(value as ThemeContentLayout)
  ) {
    return value as ThemeContentLayout;
  }
  return DEFAULT_MEMBER_PREFERENCES.themeContentLayout;
}

function resolveThemeMode(value: string | null | undefined): ThemeMode {
  if (value === 'dark' || value === 'light') return value;
  return DEFAULT_MEMBER_PREFERENCES.themeMode;
}

function resolveSidebarMode(value: string | null | undefined): SidebarMode {
  if (value === 'default' || value === 'icon') return value;
  return DEFAULT_MEMBER_PREFERENCES.sidebarMode;
}

function resolveLanguage(value: string | null | undefined): MemberLanguage {
  if (value === 'zh' || value === 'en') return value;
  return DEFAULT_MEMBER_PREFERENCES.language;
}

export function resolveMemberPreferences(
  payload?: MemberPreferencesPayload | null,
): MemberPreferences {
  return {
    themePreset: resolveThemePreset(payload?.themePreset),
    themeRadius: resolveThemeRadius(payload?.themeRadius),
    themeScale: resolveThemeScale(payload?.themeScale),
    themeContentLayout: resolveThemeContentLayout(payload?.themeContentLayout),
    themeMode: resolveThemeMode(payload?.themeMode),
    sidebarMode: resolveSidebarMode(payload?.sidebarMode),
    language: resolveLanguage(payload?.language),
  };
}

export function mapPreferencesToThemeConfig(
  preferences: MemberPreferences,
): ThemeConfig {
  return {
    preset: preferences.themePreset,
    radius: preferences.themeRadius,
    scale: preferences.themeScale,
    contentLayout: preferences.themeContentLayout,
  };
}

export function areMemberPreferencesEqual(
  left: MemberPreferences,
  right: MemberPreferences,
): boolean {
  return (
    left.themePreset === right.themePreset &&
    left.themeRadius === right.themeRadius &&
    left.themeScale === right.themeScale &&
    left.themeContentLayout === right.themeContentLayout &&
    left.themeMode === right.themeMode &&
    left.sidebarMode === right.sidebarMode &&
    left.language === right.language
  );
}
