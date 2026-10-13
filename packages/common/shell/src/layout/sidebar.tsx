import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import { NavLink } from 'react-router';
import { sizes } from '@common/design-tokens';
import { useTranslate } from '@common/localization/react';
import type { NavItem } from './layout.types';

export interface SidebarProps {
  navItems: readonly NavItem[];
  /** Whether the small-screen drawer is open. Wide screens always show the sidebar. */
  mobileOpen: boolean;
  onClose: () => void;
}

const drawerPaper = { width: sizes.sidebarWidth, boxSizing: 'border-box' } as const;

export function Sidebar({ navItems, mobileOpen, onClose }: Readonly<SidebarProps>) {
  const translate = useTranslate();

  const navigation = (
    <Box component="nav" aria-label={translate('shell.navigation')}>
      <Toolbar sx={{ minHeight: sizes.headerHeight }} />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.to} disablePadding>
            <ListItemButton
              component={NavLink}
              to={item.to}
              end
              onClick={onClose}
              sx={{
                minHeight: sizes.touchTarget,
                '&.active': { color: 'primary.main', bgcolor: 'action.selected' },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={translate(item.labelKey)} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ width: { md: sizes.sidebarWidth }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': drawerPaper }}
      >
        {navigation}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': drawerPaper }}
      >
        {navigation}
      </Drawer>
    </Box>
  );
}
