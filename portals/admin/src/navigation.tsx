import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import { SHELL_ROUTES, type NavItem } from '@common/shell';

export const navItems: readonly NavItem[] = [
  { to: SHELL_ROUTES.home, labelKey: 'nav.dashboard', icon: <DashboardOutlined aria-hidden /> },
];
