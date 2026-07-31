import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { Loader } from "../../src/components/ui";
import { useAuth } from "../../src/lib/auth";
import { colors } from "../../src/theme";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: focused ? "800" : "600", color: focused ? colors.accent : colors.muted }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.ink,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ focused }) => <TabIcon label="Stock" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Adjust",
          tabBarIcon: ({ focused }) => <TabIcon label="Adjust" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ focused }) => <TabIcon label="Orders" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => <TabIcon label="More" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
