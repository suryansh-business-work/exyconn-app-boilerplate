import { zodResolver } from '@hookform/resolvers/zod';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslate } from '@common/localization/react';
import { loginSchema } from '@common/validators';
import type { LoginFormProps, LoginValues } from './login.types';

// Keeps the layout from jumping when a validation message appears.
const EMPTY_HELPER_TEXT = ' ';

export function LoginForm({ onSubmit, errorMessage }: Readonly<LoginFormProps>) {
  const translate = useTranslate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;

  return (
    <Box
      component="form"
      noValidate
      aria-label={translate('auth.login.title')}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
    >
      <Stack spacing={2}>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <TextField
          {...register('email')}
          label={translate('auth.login.email')}
          type="email"
          autoComplete="username"
          required
          fullWidth
          error={Boolean(emailError)}
          helperText={emailError ? translate(emailError) : EMPTY_HELPER_TEXT}
        />
        <TextField
          {...register('password')}
          label={translate('auth.login.password')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          fullWidth
          error={Boolean(passwordError)}
          helperText={passwordError ? translate(passwordError) : EMPTY_HELPER_TEXT}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    aria-pressed={showPassword}
                    aria-label={translate(
                      showPassword ? 'auth.login.hidePassword' : 'auth.login.showPassword',
                    )}
                    onClick={() => {
                      setShowPassword((shown) => !shown);
                    }}
                  >
                    {showPassword ? <VisibilityOff aria-hidden /> : <Visibility aria-hidden />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Button type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting}>
          {translate(isSubmitting ? 'auth.login.submitting' : 'auth.login.submit')}
        </Button>
      </Stack>
    </Box>
  );
}
