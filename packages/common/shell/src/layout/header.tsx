import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useAuth } from '@common/auth/react';
import { sizes } from '@common/design-tokens';
import { useTranslate } from '@common/localization/react';

export interface HeaderProps {
  onOpenNavigation: () => void;
}

export function Header({ onOpenNavigation }: Readonly<HeaderProps>) {
  const { user, logout } = useAuth();
  const translate = useTranslate();

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${sizes.sidebarWidth}px)` },
        ml: { md: `${sizes.sidebarWidth}px` },
      }}
    >
      <Toolbar sx={{ minHeight: sizes.headerHeight, gap: 1 }}>
        <IconButton
          color="inherit"
          edge="start"
          aria-label={translate('shell.openNavigation')}
          onClick={onOpenNavigation}
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon aria-hidden />
        </IconButton>
        <Typography component="p" variant="h6" noWrap sx={{ flexGrow: 1 }}>
          {translate('app.name')}
        </Typography>
        {user ? (
          <Typography
            variant="body2"
            noWrap
            aria-label={translate('shell.signedInAs', { name: user.name })}
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            {user.name}
          </Typography>
        ) : null}
        <Button
          color="inherit"
          startIcon={<LogoutOutlined aria-hidden />}
          onClick={() => void logout()}
        >
          {translate('auth.logout')}
        </Button>
      </Toolbar>
    </AppBar>
  );
}
