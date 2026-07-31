import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Text } from "react-native";
import { Button, Card, Field, Loader, Muted, Screen, Title } from "../src/components/ui";
import { useAuth } from "../src/lib/auth";
import { colors } from "../src/theme";
import { getApiUrl } from "../src/lib/api";

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("owner@demo.store");
  const [password, setPassword] = useState("demo1234");
  const [busy, setBusy] = useState(false);

  if (loading) return <Loader />;
  if (user) return <Redirect href="/(tabs)/dashboard" />;

  async function onLogin() {
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/dashboard");
    } catch (e) {
      Alert.alert(
        "Login failed",
        `${e instanceof Error ? e.message : "Unable to sign in"}\n\nAPI: ${getApiUrl()}`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen style={{ justifyContent: "center" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 18 }}>
          ZentraLab
        </Text>
        <Title>Admin Mobile</Title>
        <Muted>Inventory, stock, and store control on the go.</Muted>
        <Card>
          <Field
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title={busy ? "Signing in…" : "Sign in"} onPress={onLogin} disabled={busy} />
        </Card>
        <Muted>Demo: owner@demo.store / demo1234</Muted>
      </KeyboardAvoidingView>
    </Screen>
  );
}
