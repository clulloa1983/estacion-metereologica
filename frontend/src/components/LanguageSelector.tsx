import React, { useState } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Tooltip,
  IconButton,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

interface LanguageSelectorProps {
  variant?: 'select' | 'icon';
}

export function LanguageSelector({ variant = 'select' }: LanguageSelectorProps) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [isChanging, setIsChanging] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === router.locale) || languages[0];

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === router.locale) return;
    
    setIsChanging(true);
    
    try {
      await router.push(
        {
          pathname: router.pathname,
          query: router.query,
        },
        router.asPath,
        { locale: languageCode }
      );
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  if (variant === 'icon') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={t('navigation.language', { defaultValue: 'Language' })}>
          <IconButton
            size="small"
            disabled={isChanging}
            onClick={() => {
              const nextLang = languages.find(lang => lang.code !== router.locale) || languages[0];
              handleLanguageChange(nextLang.code);
            }}
          >
            <LanguageIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ fontSize: '1.2em' }}>
          {currentLanguage.flag}
        </Box>
      </Box>
    );
  }

  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <InputLabel id="language-selector-label">
        <LanguageIcon sx={{ mr: 1 }} />
        Language
      </InputLabel>
      <Select
        labelId="language-selector-label"
        value={router.locale || 'es'}
        onChange={(e) => handleLanguageChange(e.target.value)}
        disabled={isChanging}
        startAdornment={
          <Box sx={{ mr: 1, fontSize: '1.2em' }}>
            {currentLanguage.flag}
          </Box>
        }
      >
        {languages.map((language) => (
          <MenuItem key={language.code} value={language.code}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ fontSize: '1.2em' }}>{language.flag}</span>
              {language.name}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}