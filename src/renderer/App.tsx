/**
 * Main React Application Component
 */

import React, { useEffect } from 'react';
import { ConfigProvider, theme as antTheme, Layout } from 'antd';
import { MainLayout } from './components/layout/MainLayout';
import { useThemeStore } from './store/uiStore';

const { defaultAlgorithm, darkAlgorithm } = antTheme;

export const App: React.FC = () => {
  const { theme } = useThemeStore();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <MainLayout />
    </ConfigProvider>
  );
};

export default App;
