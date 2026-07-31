import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { formatMoney } from "@zentralab/shared";
import { Card, Loader, Muted, Screen, Stat, Title } from "../../src/components/ui";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";

type Summary = {
  today: {
    orderCount: number;
    salesCents: number;
    posCount: number;
    onlineCount: number;
  };
  lowStock: Array<{
    sku: string;
    name: string;
    available: number;
    reorderPoint: number;
  }>;
  openConflicts: number;
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await api<Summary>("/api/reports/summary");
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!data && !error) return <Loader />;

  return (
    <Screen style={{ paddingTop: 8 }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <Title>Hello, {user?.name?.split(" ")[0] ?? "Admin"}</Title>
        <Muted>Store control · live cloud inventory</Muted>
        {error ? <Muted>{error}</Muted> : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          <Stat label="Sales today" value={formatMoney(data?.today.salesCents ?? 0)} />
          <Stat label="Orders" value={data?.today.orderCount ?? 0} />
          <Stat label="POS" value={data?.today.posCount ?? 0} />
          <Stat label="Online" value={data?.today.onlineCount ?? 0} />
        </View>

        <Card>
          <Title>Low stock</Title>
          {(data?.lowStock.length ?? 0) === 0 ? (
            <Muted>All products above reorder point.</Muted>
          ) : (
            data?.lowStock.map((item) => (
              <View key={item.sku} style={{ marginBottom: 10 }}>
                <Muted>
                  {item.sku} · {item.name}
                </Muted>
                <Muted>
                  Available {item.available} / reorder {item.reorderPoint}
                </Muted>
              </View>
            ))
          )}
        </Card>

        <Card>
          <Muted>Open sync conflicts: {data?.openConflicts ?? 0}</Muted>
        </Card>
      </ScrollView>
    </Screen>
  );
}
