import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  Button,
  Card,
  Field,
  Loader,
  Muted,
  Screen,
  Title,
} from "../../src/components/ui";
import { api } from "../../src/lib/api";
import { colors } from "../../src/theme";

type Product = {
  id: string;
  sku: string;
  name: string;
  inventory: { onHand: number; reserved: number } | null;
};

export default function StockScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [delta, setDelta] = useState("1");
  const [reason, setReason] = useState("Mobile stock receive");
  const [type, setType] = useState<"receive" | "adjust">("receive");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ products: Product[] }>("/api/products");
      setProducts(res.products);
      setProductId((current) => current || res.products[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const selected = products.find((p) => p.id === productId);

  async function submit() {
    const qty = Number(delta);
    if (!productId || !Number.isFinite(qty) || qty === 0) {
      Alert.alert("Invalid quantity", "Enter a non-zero number.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          productId,
          delta: qty,
          type,
          reason: reason.trim() || "Mobile adjust",
        }),
      });
      Alert.alert("Stock updated", `${selected?.sku ?? "Product"} adjusted by ${qty}.`);
      await load();
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Adjust failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <Screen style={{ paddingTop: 8 }}>
      <ScrollView>
        <Title>Stock handling</Title>
        <Muted>Receive deliveries or correct on-hand counts.</Muted>

        <Card>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.ink }}>
            Product
          </Text>
          {products.map((p) => {
            const active = p.id === productId;
            const available =
              (p.inventory?.onHand ?? 0) - (p.inventory?.reserved ?? 0);
            return (
              <Pressable
                key={p.id}
                onPress={() => setProductId(p.id)}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.line,
                  backgroundColor: active ? "rgba(15,107,76,0.08)" : "transparent",
                  paddingHorizontal: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontWeight: "700", color: colors.ink }}>
                  {p.sku} — {p.name}
                </Text>
                <Muted>Available {available}</Muted>
              </Pressable>
            );
          })}
        </Card>

        <Card>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Receive"
                variant={type === "receive" ? "primary" : "secondary"}
                onPress={() => {
                  setType("receive");
                  setReason("Mobile stock receive");
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Adjust"
                variant={type === "adjust" ? "primary" : "secondary"}
                onPress={() => {
                  setType("adjust");
                  setReason("Mobile stock adjust");
                }}
              />
            </View>
          </View>
          <Field
            label="Quantity (+/-)"
            keyboardType="numbers-and-punctuation"
            value={delta}
            onChangeText={setDelta}
          />
          <Field label="Reason" value={reason} onChangeText={setReason} />
          {selected && (
            <Muted>
              Current on hand: {selected.inventory?.onHand ?? 0}
            </Muted>
          )}
          <Button
            title={busy ? "Saving…" : "Apply stock change"}
            onPress={submit}
            disabled={busy}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
