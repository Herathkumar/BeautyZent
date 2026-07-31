import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { formatMoney } from "@zentralab/shared";
import { Card, Field, Loader, Muted, Screen, Title } from "../../src/components/ui";
import { api } from "../../src/lib/api";
import { colors } from "../../src/theme";

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  priceCents: number;
  active: boolean;
  inventory: {
    onHand: number;
    reserved: number;
    reorderPoint: number;
  } | null;
};

export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await api<{ products: Product[] }>("/api/products");
      setProducts(res.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle) ||
        (p.barcode ?? "").toLowerCase().includes(needle)
    );
  }, [products, q]);

  if (loading) return <Loader />;

  return (
    <Screen style={{ paddingTop: 8 }}>
      <Title>Inventory</Title>
      <Muted>Search SKU, barcode, or name</Muted>
      <Field
        label="Search"
        value={q}
        onChangeText={setQ}
        placeholder="USB-C-HUB or barcode"
        autoCapitalize="characters"
      />
      {error ? <Muted>{error}</Muted> : null}
      <FlatList
        data={filtered}
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
          const onHand = item.inventory?.onHand ?? 0;
          const reserved = item.inventory?.reserved ?? 0;
          const available = onHand - reserved;
          const low = available <= (item.inventory?.reorderPoint ?? 0);
          return (
            <Card>
              <Text style={{ fontWeight: "700", fontSize: 17, color: colors.ink }}>
                {item.name}
              </Text>
              <Muted>
                {item.sku}
                {item.barcode ? ` · ${item.barcode}` : ""}
              </Muted>
              <View style={{ marginTop: 8, gap: 2 }}>
                <Text style={{ color: colors.ink }}>{formatMoney(item.priceCents)}</Text>
                <Text style={{ color: low ? colors.warn : colors.ink, fontWeight: "700" }}>
                  Available {available} (on hand {onHand}, reserved {reserved})
                </Text>
                <Muted>Reorder at {item.inventory?.reorderPoint ?? 0}</Muted>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={<Muted>No products found.</Muted>}
      />
    </Screen>
  );
}
