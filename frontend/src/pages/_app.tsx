import React from 'react';
import type { AppProps } from 'next/app';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { CustomThemeProvider, useThemeMode } from '../contexts/ThemeContext';
import 'leaflet/dist/leaflet.css';

// Configurar iconos de Leaflet para evitar problemas de SSR
if (typeof window !== 'undefined') {
  const L = require('leaflet');
  
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  });
}

// Componente interno que usa el tema del contexto
const AppContent: React.FC<{ Component: any; pageProps: any }> = ({ Component, pageProps }) => {
  const { theme } = useThemeMode();

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <Component {...pageProps} />
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CustomThemeProvider>
      <AppContent Component={Component} pageProps={pageProps} />
    </CustomThemeProvider>
  );
}