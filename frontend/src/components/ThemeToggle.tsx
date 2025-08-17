import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'inherit' | 'default' | 'primary' | 'secondary';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'medium', 
  color = 'inherit' 
}) => {
  const { mode, toggleTheme } = useThemeMode();

  return (
    <Tooltip title={`Cambiar a modo ${mode === 'light' ? 'oscuro' : 'claro'}`}>
      <IconButton
        size={size}
        color={color}
        onClick={toggleTheme}
        aria-label={`Cambiar a modo ${mode === 'light' ? 'oscuro' : 'claro'}`}
      >
        {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;