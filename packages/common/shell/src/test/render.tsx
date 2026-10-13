import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { createFakeServer, type FakeServer } from '@common/auth/testing';
import { PortalProviders } from '../providers';

export const API_URL = 'https://api.example.test/graphql';

export interface ShellRenderOptions {
  /** Initial router entries; the last one is the current location. */
  entries?: (string | { pathname: string; state?: unknown })[];
  /** Translations the fake server returns. Defaults to none, so the bundled fallback text is shown. */
  translations?: { key: string; value: string }[];
}

/** Fake API installed as the global `fetch`, with translations already answered. */
export function installFakeServer(
  translations: ShellRenderOptions['translations'] = [],
): FakeServer {
  const server = createFakeServer();
  server.reply('Translations', { data: { translations } });
  vi.stubGlobal('fetch', server.fetchFn);
  return server;
}

/** Renders routes inside the real portal providers and an in-memory router. */
export function renderInShell(
  routes: ReactNode,
  { entries = ['/'] }: ShellRenderOptions = {},
): RenderResult {
  return render(
    <MemoryRouter initialEntries={entries}>
      <PortalProviders apiUrl={API_URL} locale="en">
        {routes}
      </PortalProviders>
    </MemoryRouter>,
  );
}
