import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  Button,
  Card,
  Field,
  Muted,
  Screen,
  Title,
} from "../../src/components/ui";
import { api, getApiUrl } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { colors } from "../../src/theme";

type Conflict = {
  id: string;
  status: string;
  message: string;
  onHand: number | null;
  productId: string | null;
};

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [chatInput, setChatInput] = useState("Show low stock");
  const [chatReply, setChatReply] = useState("");

  const loadConflicts = useCallback(async () => {
    try {
      const res = await api<{ conflicts: Conflict[] }>("/api/conflicts");
      setConflicts(res.conflicts.filter((c) => c.status === "open"));
    } catch {
      setConflicts([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConflicts();
    }, [loadConflicts])
  );

  async function resolve(c: Conflict) {
    try {
      await api("/api/conflicts", {
        method: "POST",
        body: JSON.stringify({
          conflictId: c.id,
          resolution: "Resolved from mobile",
          adjustOnHandTo:
            typeof c.onHand === "number" ? Math.max(0, c.onHand) : undefined,
        }),
      });
      await loadConflicts();
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Resolve failed");
    }
  }

  async function askAi() {
    try {
      const res = await api<{ message: { content: string } }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          role: "staff",
          messages: [{ role: "user", content: chatInput }],
        }),
      });
      setChatReply(res.message.content);
    } catch (e) {
      Alert.alert("AI error", e instanceof Error ? e.message : "Failed");
    }
  }

  async function onLogout() {
    await logout();
    router.replace("/");
  }

  return (
    <Screen style={{ paddingTop: 8 }}>
      <ScrollView>
        <Title>More</Title>
        <Muted>
          {user?.name} · {user?.role}
        </Muted>
        <Muted>API {getApiUrl()}</Muted>

        <Card>
          <Text style={{ fontWeight: "700", color: colors.ink, marginBottom: 8 }}>
            Sync conflicts
          </Text>
          {conflicts.length === 0 ? (
            <Muted>No open conflicts.</Muted>
          ) : (
            conflicts.map((c) => (
              <View key={c.id} style={{ marginBottom: 12 }}>
                <Muted>{c.message}</Muted>
                <Button title="Resolve" onPress={() => resolve(c)} />
              </View>
            ))
          )}
        </Card>

        <Card>
          <Text style={{ fontWeight: "700", color: colors.ink, marginBottom: 8 }}>
            Staff AI
          </Text>
          <Field label="Ask" value={chatInput} onChangeText={setChatInput} />
          <Button title="Ask assistant" onPress={askAi} />
          {chatReply ? (
            <Text style={{ marginTop: 10, color: colors.ink }}>{chatReply}</Text>
          ) : null}
        </Card>

        <Button title="Log out" variant="secondary" onPress={onLogout} />
      </ScrollView>
    </Screen>
  );
}
