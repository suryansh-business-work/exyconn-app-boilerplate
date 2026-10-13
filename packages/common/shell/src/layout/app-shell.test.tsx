import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeServer } from '@common/auth/testing';
import { installFakeServer, renderInShell } from '../test/render';
import { AppShell } from './app-shell';
import type { NavItem } from './layout.types';

const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: <span aria-hidden>D</span> },
  { to: '/broken', labelKey: 'Broken page', icon: <span aria-hidden>B</span> },
];

function BrokenPage(): never {
  throw new Error('Report widget failed');
}

let server: FakeServer;

function renderShell(entry = '/') {
  return renderInShell(
    <Routes>
      <Route path="/login" element={<p>Login page</p>} />
      <Route element={<AppShell navItems={navItems} />}>
        <Route index element={<p>Dashboard content</p>} />
        <Route path="broken" element={<BrokenPage />} />
        <Route path="other" element={<Link to="/broken">Go to broken</Link>} />
      </Route>
    </Routes>,
    { entries: [entry] },
  );
}

beforeEach(() => {
  server = installFakeServer();
  server.replySession('RefreshSession');
  // React prints every caught render error; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AppShell', () => {
  it('lays out a banner, labelled navigation and the page inside the main landmark', async () => {
    renderShell();
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('Exyconn Boilerplate');
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Dashboard content');
  });

  it('marks only the current page in the navigation', async () => {
    renderShell();
    const navigation = await screen.findByRole('navigation', { name: 'Main navigation' });
    expect(within(navigation).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(navigation).getByRole('link', { name: 'Broken page' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('offers a skip link that targets the main content', async () => {
    renderShell();
    const skipLink = await screen.findByRole('link', { name: 'Skip to main content' });
    const main = screen.getByRole('main');
    expect(skipLink).toHaveAttribute('href', `#${main.id}`);
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('reaches the skip link first when tabbing', async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText('Asha Rao');
    await user.tab();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus();
  });

  it('opens the navigation drawer from the menu button and closes it after choosing a page', async () => {
    const user = userEvent.setup();
    renderShell('/other');
    await screen.findByText('Asha Rao');
    expect(screen.getAllByRole('navigation', { name: 'Main navigation' })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('link', { name: 'Dashboard' }));

    expect(await screen.findByText('Dashboard content')).toBeInTheDocument();
  });

  it('signs out from the header', async () => {
    const user = userEvent.setup();
    server.reply('Logout', { data: { logout: true } });
    renderShell();
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(server.callsTo('Logout')).toHaveLength(1);
    expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument();
  });

  it('contains a failing page: header and navigation keep working', async () => {
    renderShell('/broken');
    expect(await screen.findByRole('alert')).toHaveTextContent('This page ran into a problem');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('alert'));
  });

  it('clears the error when the user navigates to another page', async () => {
    const user = userEvent.setup();
    renderShell('/broken');
    await screen.findByRole('alert');
    await user.click(screen.getByRole('link', { name: 'Dashboard' }));
    expect(await screen.findByText('Dashboard content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
