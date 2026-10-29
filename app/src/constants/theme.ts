/**
 * App colors for light and dark mode. A clean white surface with a deep teal
 * accent and green rank circles. Text colors are chosen for at least 4.5:1
 * contrast on their background.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    /** Search fields and text inputs. */
    backgroundElement: '#EDEDED',
    backgroundSelected: '#E2E4E6',
    /** Hairlines between list rows. */
    separator: '#E5E6E6',
    /** Outlines on secondary buttons. */
    border: '#C9CBCD',
    textSecondary: '#737373',
    /** Filled buttons; white text on it. */
    accent: '#134F5C',
    onAccent: '#FFFFFF',
    /** Teal text: links, plain buttons, the selected tab. */
    accentText: '#065362',
    accentSoft: '#D8E4E6',
    /** Rank circles: outline and number. */
    score: '#2DA473',
    scoreText: '#1A7F56',
    danger: '#B3261E',
    dangerSoft: '#FCEDEB',
  },
  dark: {
    text: '#F2F4F5',
    background: '#0D1112',
    backgroundElement: '#1E2426',
    backgroundSelected: '#2A3134',
    separator: '#272E31',
    border: '#3A4245',
    textSecondary: '#9AA3A7',
    accent: '#1D6676',
    onAccent: '#FFFFFF',
    accentText: '#6FC2CF',
    accentSoft: '#15343A',
    score: '#3CC28A',
    scoreText: '#5BD39E',
    danger: '#FF8A80',
    dangerSoft: '#3A1D1A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
