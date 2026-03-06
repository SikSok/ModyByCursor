import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY_FONT_SCALE } from '../constants/storageKeys';

export type FontScaleLevel = 'small' | 'standard' | 'large';
export const FONT_SCALE_VALUES: Record<FontScaleLevel, number> = {
  small: 0.9,
  standard: 1,
  large: 1.2,
};
export const FONT_SCALE_LABELS: Record<FontScaleLevel, string> = {
  small: '小',
  standard: '标准',
  large: '大',
};

const STORAGE_VALUES: Record<FontScaleLevel, string> = {
  small: '0.9',
  standard: '1',
  large: '1.2',
};
const STORAGE_TO_LEVEL: Record<string, FontScaleLevel> = {
  '0.9': 'small',
  '1': 'standard',
  '1.2': 'large',
};

type FontScaleContextValue = {
  fontScale: number;
  fontScaleLevel: FontScaleLevel;
  setFontScaleLevel: (level: FontScaleLevel) => Promise<void>;
};

const FontScaleContext = createContext<FontScaleContextValue | null>(null);

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const [fontScaleLevel, setFontScaleLevelState] = useState<FontScaleLevel>('standard');
  const fontScale = FONT_SCALE_VALUES[fontScaleLevel];

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_FONT_SCALE)
      .then((value) => {
        if (value != null && STORAGE_TO_LEVEL[value]) {
          setFontScaleLevelState(STORAGE_TO_LEVEL[value]);
        }
      })
      .catch(() => {});
  }, []);

  const setFontScaleLevel = useCallback(async (level: FontScaleLevel) => {
    setFontScaleLevelState(level);
    await AsyncStorage.setItem(STORAGE_KEY_FONT_SCALE, STORAGE_VALUES[level]);
  }, []);

  const value: FontScaleContextValue = {
    fontScale,
    fontScaleLevel,
    setFontScaleLevel,
  };

  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
}

export function useFontScale(): FontScaleContextValue {
  const ctx = useContext(FontScaleContext);
  if (!ctx) {
    return {
      fontScale: 1,
      fontScaleLevel: 'standard',
      setFontScaleLevel: async () => {},
    };
  }
  return ctx;
}

/** 基础字号 × fontScale，用于列表标题、卡片、正文、按钮等 */
export function scaledFontSize(baseSize: number, fontScale: number): number {
  return Math.round(baseSize * fontScale);
}
