import type { ReactNode } from 'react';

export interface NavItem {
  /** Route path the item links to. */
  to: string;
  /** Localization key of the label. */
  labelKey: string;
  icon: ReactNode;
}
