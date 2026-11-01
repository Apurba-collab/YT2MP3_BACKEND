import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../lib/auth";
import { C } from "../lib/theme";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setU] = useState(""); const [password, setP] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true); setErr("");
    try { await (mode === "in" ? signIn : signUp)(username.trim(), password); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.logo}><Text style={{ fontSize: 34 }}>🎧</Text></View>
      <Text style={s.title}>{mode === "in" ? "Welcome back" : "Create account"}</Text>
      <Text style={s.sub}>Turn any YouTube link into audio.</Text>
      <TextInput style={s.input} placeholder="Username" placeholderTextColor={C.muted}
        autoCapitalize="none" value={username} onChangeText={setU} />
      <TextInput style={s.input} placeholder="Password" placeholderTextColor={C.muted}
        secureTextEntry value={password} onChangeText={setP} />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Pressable style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{mode === "in" ? "Sign in" : "Sign up"}</Text>}
      </Pressable>
      <Pressable onPress={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }}>
        <Text style={s.link}>{mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 28, gap: 14 },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { color: C.text, fontSize: 30, fontWeight: "800" },
  sub: { color: C.muted, fontSize: 15, marginBottom: 12 },
  input: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 16, padding: 16, color: C.text, fontSize: 16 },
  btn: { backgroundColor: C.accent, padding: 16, borderRadius: 16, alignItems: "center", marginTop: 6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { color: C.muted, textAlign: "center", marginTop: 10 },
  err: { color: C.danger },
});
