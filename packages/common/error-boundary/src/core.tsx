import {
  Component,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { redactSensitive, sanitizeError, type SanitizedError } from '@common/error-handling';

const MAX_COMPONENT_STACK_LENGTH = 4000;

/** What is logged and reported for a caught error: redacted, size-capped, no user data. */
export interface ErrorReport extends SanitizedError {
  componentStack?: string;
}

export interface ErrorReporting {
  /** Developer diagnostics, called once for every caught error. */
  log: (report: ErrorReport) => void;
  /** Sends a report to the server when the user chooses "Report an issue". */
  send: (report: ErrorReport) => Promise<void>;
}

const defaultReporting: ErrorReporting = {
  log: (report) => {
    console.error('[error-boundary]', report);
  },
  send: () => Promise.reject(new Error('No ErrorReportingProvider is configured')),
};

const ErrorReportingContext = createContext<ErrorReporting>(defaultReporting);

export interface ErrorReportingProviderProps {
  send: ErrorReporting['send'];
  log?: ErrorReporting['log'];
  children: ReactNode;
}

/** Configures, once per app, where error boundaries log and send their reports. */
export function ErrorReportingProvider({
  send,
  log = defaultReporting.log,
  children,
}: Readonly<ErrorReportingProviderProps>) {
  const value = useMemo(() => ({ send, log }), [send, log]);
  return <ErrorReportingContext.Provider value={value}>{children}</ErrorReportingContext.Provider>;
}

export interface ErrorFallbackProps {
  report: ErrorReport;
  /** Renders the failed content again. */
  retry: () => void;
}

export interface ErrorBoundaryProps {
  fallback: (props: ErrorFallbackProps) => ReactNode;
  /** When this value changes (for example the route), a shown error is cleared. */
  resetKey?: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  report: ErrorReport | null;
}

interface ErrorCatcherProps extends ErrorBoundaryProps {
  log: ErrorReporting['log'];
}

class ErrorCatcher extends Component<ErrorCatcherProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { report: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { report: sanitizeError(error) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    const report: ErrorReport = {
      ...sanitizeError(error),
      ...(info.componentStack
        ? {
            componentStack: redactSensitive(info.componentStack).slice(
              0,
              MAX_COMPONENT_STACK_LENGTH,
            ),
          }
        : {}),
    };
    this.setState({ report });
    this.props.log(report);
  }

  override componentDidUpdate(previous: ErrorCatcherProps): void {
    if (this.state.report && previous.resetKey !== this.props.resetKey) {
      this.setState({ report: null });
    }
  }

  private readonly retry = (): void => {
    this.setState({ report: null });
  };

  override render(): ReactNode {
    const { report } = this.state;
    return report ? this.props.fallback({ report, retry: this.retry }) : this.props.children;
  }
}

/**
 * Catches render errors below it so one failing page or screen cannot take the
 * app down. Headless: the web and native entry points supply the fallback UI.
 */
export function ErrorBoundary(props: Readonly<ErrorBoundaryProps>) {
  const { log } = useContext(ErrorReportingContext);
  return <ErrorCatcher {...props} log={log} />;
}

export type ReportStatus = 'idle' | 'sending' | 'sent' | 'failed';

export interface UseReportIssueResult {
  status: ReportStatus;
  /** Sends the report. Ignored while a send is in progress or after one succeeded. */
  submit: () => void;
}

/** "Report an issue" behavior shared by the web and native fallback screens. */
export function useReportIssue(report: ErrorReport): UseReportIssueResult {
  const { send, log } = useContext(ErrorReportingContext);
  const [status, setStatus] = useState<ReportStatus>('idle');

  const submit = useCallback(() => {
    if (status === 'sending' || status === 'sent') {
      return;
    }
    setStatus('sending');
    send(report)
      .then(() => {
        setStatus('sent');
      })
      .catch((error: unknown) => {
        log({ ...sanitizeError(error), name: 'ReportSendFailed' });
        setStatus('failed');
      });
  }, [status, send, log, report]);

  return { status, submit };
}

const STATUS_MESSAGE_KEYS: Record<ReportStatus, string | null> = {
  idle: null,
  sending: 'errorBoundary.reporting',
  sent: 'errorBoundary.reported',
  failed: 'errorBoundary.reportFailed',
};

/** Localization key describing the report status, or null when there is nothing to say. */
export function reportStatusMessageKey(status: ReportStatus): string | null {
  return STATUS_MESSAGE_KEYS[status];
}
