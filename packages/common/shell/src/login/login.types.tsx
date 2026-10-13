import type { LoginValues } from '@common/validators';

export type { LoginValues } from '@common/validators';

export interface LoginFormProps {
  /** Called with validated values. The form stays disabled until the promise settles. */
  onSubmit: (values: LoginValues) => Promise<void>;
  /** Translated error from the last sign-in attempt, or null when there is none. */
  errorMessage: string | null;
}
