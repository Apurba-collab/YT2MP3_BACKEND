import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../lib/auth";
import { C } from "../lib/theme";

function Gate() {
  const { signedIn, ready } = useAuth();
  if (!ready) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: "fade" }}>
      <Stack.Protected guard={signedIn}><Stack.Screen name="index" /></Stack.Protected>
      <Stack.Protected guard={!signedIn}><Stack.Screen name="login" /></Stack.Protected>
    </Stack>
  );
}
export default function Root() {
  return (<AuthProvider><StatusBar style="light" /><Gate /></AuthProvider>);
}
