import { defaultConfig } from '@tamagui/config/v6';
import { createTamagui } from 'tamagui';

/**
 * Tamagui's stock configuration supplies the component machinery. Colors,
 * spacing, radius and type sizes are passed to components from
 * `@common/design-tokens`, so the app and the portals share one source of truth.
 */
export const tamaguiConfig = createTamagui(defaultConfig);

export type AppTamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Tamagui's documented way to register the config type
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}
