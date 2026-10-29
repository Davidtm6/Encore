import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.background}
      tintColor={theme.accentText}
      iconColor={{ default: theme.textSecondary, selected: theme.accentText }}
      indicatorColor={theme.accentSoft}
      labelStyle={{ default: { color: theme.textSecondary }, selected: { color: theme.accentText } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>My List</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.number" md="format_list_numbered" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
