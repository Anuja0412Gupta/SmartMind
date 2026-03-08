import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Avatar,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Terminal as QueryIcon,
  History as HistoryIcon,
  BarChart as AnalyticsIcon,
  WorkOutline as JobIcon,
  Warning as EscalationIcon,
  Storage as LogsIcon,
  Menu as MenuIcon,
  SupportAgent as LogoIcon,
  Circle as StatusDot,
} from '@mui/icons-material';

const DRAWER_WIDTH = 280;

const navItems = [
  { label: 'Query Console', path: '/', icon: <QueryIcon /> },
  { label: 'Query History', path: '/history', icon: <HistoryIcon /> },
  { label: 'Analytics', path: '/analytics', icon: <AnalyticsIcon /> },
  { label: 'Job Monitor', path: '/jobs', icon: <JobIcon /> },
  { label: 'Escalation Panel', path: '/escalation', icon: <EscalationIcon /> },
  { label: 'System Logs', path: '/logs', icon: <LogsIcon /> },
];

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box
        sx={{
          px: 3,
          py: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Avatar
          sx={{
            bgcolor: '#E20015',
            width: 42,
            height: 42,
            boxShadow: '0 4px 14px rgba(226,0,21,0.3)',
          }}
        >
          <LogoIcon sx={{ fontSize: 24 }} />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.2, color: '#1B1B1B' }}>
            SupportMind
          </Typography>
          <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
            AI INFRASTRUCTURE
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* Navigation */}
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2.5,
                  px: 2,
                  py: 1.2,
                  transition: 'all 0.2s ease',
                  bgcolor: isActive ? 'rgba(226,0,21,0.08)' : 'transparent',
                  color: isActive ? '#E20015' : '#5F6368',
                  '&:hover': {
                    bgcolor: isActive ? 'rgba(226,0,21,0.12)' : 'rgba(0,0,0,0.04)',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? '#E20015' : '#9AA0A6',
                    transition: 'color 0.2s',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.9rem',
                  }}
                />
                {isActive && (
                  <Box
                    sx={{
                      width: 4,
                      height: 24,
                      borderRadius: 2,
                      bgcolor: '#E20015',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mx: 2 }} />

      {/* System Status */}
      <Box sx={{ px: 3, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <StatusDot sx={{ fontSize: 10, color: '#00884A' }} />
          <Typography variant="caption" sx={{ color: '#5F6368' }}>
            System Online
          </Typography>
        </Box>
        <Chip
          label="v1.0.0"
          size="small"
          sx={{
            bgcolor: 'rgba(0,0,0,0.05)',
            fontSize: '0.7rem',
            height: 22,
          }}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F0F2F5' }}>
      {/* AppBar - Mobile only */}
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #E0E0E0',
          }}
        >
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ color: '#1B1B1B' }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#E20015', ml: 1 }}>
              SupportMind
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            border: 'none',
            bgcolor: '#FFFFFF',
            boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          mt: isMobile ? 8 : 0,
          maxWidth: '100%',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
