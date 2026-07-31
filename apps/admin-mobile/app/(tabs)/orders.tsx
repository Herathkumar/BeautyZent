import { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { formatMoney } from "@zentralab/shared";
import { Button, Card, Loader, Muted, Screen, Title } from "../../src/components/ui";
import { api } from "../../src/lib/api";
import { colors } from "../../src/theme";

type Order = {
  id: string;
  channel: string;
  status: string;
  customerName: string | null;
  totalCents: number;
  createdAt: string;
  lines: Array<{ id: string; qty: number; name: string }>;
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ orders: Order[] }>("/api/orders");
      setOrders(res.orders);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function setStatus(id: string, status: "fulfilled" | "cancelled") {
    try {
      await api(`/api/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Update failed");
    }
  }

  if (loading) return <Loader />;

  return (
    <Screen style={{ paddingTop: 8 }}>
      <Title>Orders</Title>
      <Muted>Fulfill online orders and review recent sales.</Muted>
      <FlatList
        style={{ marginTop: 8 }}
        data={orders}
        keyExtractor={(item) => item.id}
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
        renderItem={({ item }) => {
          const canAct =
            item.channel === "online" &&
            ["reserved", "paid", "pending_payment"].includes(item.status);
          return (
            <Card>
              <Text style={{ fontWeight: "700", color: colors.ink }}>
                {item.channel.toUpperCase()} · {item.status}
              </Text>
              <Muted>{new Date(item.createdAt).toLocaleString()}</Muted>
              <Muted>{item.customerName ?? "Walk-in / POS"}</Muted>
              <Text style={{ marginVertical: 6, fontWeight: "700", color: colors.ink }}>
                {formatMoney(item.totalCents)}
              </Text>
              {item.lines.map((l) => (
                <Muted key={l.id}>
                  {l.qty}× {l.name}
                </Muted>
              ))}
              {canAct && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button title="Fulfill" onPress={() => setStatus(item.id, "fulfilled")} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Cancel"
                      variant="danger"
                      onPress={() => setStatus(item.id, "cancelled")}
                    />
                  </View>
                </View>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={<Muted>No orders yet.</Muted>}
      />
    </Screen>
  );
}
