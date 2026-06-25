import { Tabs } from 'expo-router';
import { Home, Receipt, Shield } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/context/ThemeContext';

export default function TabLayout() {
  const { t, isAdmin } = useApp();
  const c = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tabDashboard'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: t('tabExpenses'),
          tabBarIcon: ({ color, size }) => <Receipt size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t('tabAdmin'),
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
