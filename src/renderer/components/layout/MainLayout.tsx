/**
 * Main Layout Component
 */

import React from 'react';
import { Layout, Menu, Typography, Switch, Space } from 'antd';
import {
  ApiOutlined,
  SettingOutlined,
  GlobalOutlined,
  FireOutlined,
  SwapOutlined,
  LockOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '../../store/uiStore';
import { useDeviceStore } from '../../store/deviceStore';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export const MainLayout: React.FC = () => {
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar, activeView, setActiveView } = useThemeStore();
  const { selectedDeviceId } = useDeviceStore();

  const menuItems = [
    {
      key: 'devices',
      icon: <ApiOutlined />,
      label: 'Devices',
    },
    {
      key: 'interfaces',
      icon: <GlobalOutlined />,
      label: 'Interfaces',
      disabled: !selectedDeviceId,
    },
    {
      key: 'routes',
      icon: <SwapOutlined />,
      label: 'Static Routes',
      disabled: !selectedDeviceId,
    },
    {
      key: 'firewall',
      icon: <FireOutlined />,
      label: 'Firewall',
      disabled: !selectedDeviceId,
    },
    {
      key: 'nat',
      icon: <SwapOutlined />,
      label: 'NAT',
      disabled: !selectedDeviceId,
    },
    {
      key: 'vpn',
      icon: <LockOutlined />,
      label: 'VPN',
      disabled: !selectedDeviceId,
    },
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: 'System',
      disabled: !selectedDeviceId,
    },
    {
      key: 'divider1',
      type: 'divider' as const,
    },
    {
      key: 'backups',
      icon: <DatabaseOutlined />,
      label: 'Backups',
      disabled: !selectedDeviceId,
    },
    {
      key: 'logs',
      icon: <FileTextOutlined />,
      label: 'Logs',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={toggleSidebar}
        theme={theme === 'dark' ? 'dark' : 'light'}
        width={220}
      >
        <div style={{ padding: '16px', textAlign: 'center' }}>
          {!sidebarCollapsed && (
            <Title level={4} style={{ margin: 0, color: theme === 'dark' ? '#fff' : '#000' }}>
              VyOS Manager
            </Title>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeView]}
          items={menuItems}
          onClick={({ key }) => setActiveView(key)}
          theme={theme === 'dark' ? 'dark' : 'light'}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: theme === 'dark' ? '#141414' : '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
        }}>
          <Title level={3} style={{ margin: 0 }}>
            {menuItems.find((item) => item.key === activeView)?.label || 'VyOS Manager'}
          </Title>

          <Space>
            <Switch
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              checked={theme === 'dark'}
              onChange={toggleTheme}
            />
          </Space>
        </Header>

        <Content style={{
          margin: '24px',
          padding: '24px',
          background: theme === 'dark' ? '#1f1f1f' : '#fff',
          borderRadius: '8px',
        }}>
          <div>
            {activeView === 'devices' && <div>Device Management Component</div>}
            {activeView === 'interfaces' && <div>Interface Configuration Component</div>}
            {activeView === 'routes' && <div>Static Routes Component</div>}
            {activeView === 'firewall' && <div>Firewall Configuration Component</div>}
            {activeView === 'nat' && <div>NAT Configuration Component</div>}
            {activeView === 'vpn' && <div>VPN Configuration Component</div>}
            {activeView === 'system' && <div>System Configuration Component</div>}
            {activeView === 'backups' && <div>Backup Management Component</div>}
            {activeView === 'logs' && <div>Audit Logs Component</div>}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};
