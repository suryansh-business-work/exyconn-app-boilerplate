import { render, screen, userEvent } from '@testing-library/react-native';
import { TamaguiProvider, Text } from 'tamagui';
import { ErrorReportingProvider, type ErrorReport } from '@common/error-boundary';
import { ScreenErrorBoundary } from '@common/error-boundary/native';
import { tamaguiConfig } from './tamagui.config';

let shouldThrow = true;

function Screen() {
  if (shouldThrow) {
    throw new TypeError('Cannot load orders of asha@example.com');
  }
  return <Text>Screen content</Text>;
}

async function renderScreen(
  send: (report: ErrorReport) => Promise<void> = () => Promise.resolve(),
) {
  const log = jest.fn() as jest.MockedFunction<(report: ErrorReport) => void>;
  const sendMock = jest.fn(send);
  await render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <ErrorReportingProvider send={sendMock} log={log}>
        <Text>Tab bar</Text>
        <ScreenErrorBoundary>
          <Screen />
        </ScreenErrorBoundary>
      </ErrorReportingProvider>
    </TamaguiProvider>,
  );
  return { log, send: sendMock };
}

beforeEach(() => {
  shouldThrow = true;
  // React prints every caught render error; keep the test output readable.
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ScreenErrorBoundary', () => {
  it('renders the screen when nothing fails', async () => {
    shouldThrow = false;
    await renderScreen();
    expect(screen.getByText('Screen content')).toBeOnTheScreen();
    expect(screen.queryByText('This page ran into a problem')).not.toBeOnTheScreen();
  });

  it('replaces only the failed screen and never shows the raw error', async () => {
    await renderScreen();
    expect(screen.getByRole('heading', { name: 'This page ran into a problem' })).toBeOnTheScreen();
    expect(screen.getByText('Tab bar')).toBeOnTheScreen();
    expect(screen.queryByText(/Cannot load orders/)).not.toBeOnTheScreen();
  });

  it('logs a redacted report', async () => {
    const { log } = await renderScreen();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toMatchObject({
      name: 'TypeError',
      message: 'Cannot load orders of [redacted]',
    });
  });

  it('retries: stays on the error while it still fails, shows the screen once it works', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByText('Try again'));
    expect(screen.getByText('This page ran into a problem')).toBeOnTheScreen();

    shouldThrow = false;
    await user.press(screen.getByText('Try again'));
    expect(screen.getByText('Screen content')).toBeOnTheScreen();
  });

  it('sends the redacted report once and confirms it', async () => {
    const user = userEvent.setup();
    const { send } = await renderScreen();

    await user.press(screen.getByText('Report an issue'));
    expect(await screen.findByText('Thanks. The issue has been reported.')).toBeOnTheScreen();

    await user.press(screen.getByText('Report an issue'));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toMatchObject({ message: 'Cannot load orders of [redacted]' });
  });

  it('tells the user when the report could not be sent and lets them try again', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const { send } = await renderScreen(() => {
      attempts += 1;
      return attempts === 1 ? Promise.reject(new Error('offline')) : Promise.resolve();
    });

    await user.press(screen.getByText('Report an issue'));
    expect(await screen.findByText('The report could not be sent. Try again.')).toBeOnTheScreen();

    await user.press(screen.getByText('Report an issue'));
    expect(await screen.findByText('Thanks. The issue has been reported.')).toBeOnTheScreen();
    expect(send).toHaveBeenCalledTimes(2);
  });
});
