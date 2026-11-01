import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { File, Paths } from "expo-file-system";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { C } from "../lib/theme";

type Job = { id: string; status: "queued" | "processing" | "done" | "failed"; title: string; thumbnail: string; error: string; download_url: string | null };

export default function Home() {
  const { signOut } = useAuth();
  const [url, setUrl] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => { if (timer.current) clearInterval(timer.current); };
  useEffect(() => stop, []);

  const start = async () => {
    stop(); setErr(""); setJob(null); setBusy(true);
    try {
      const j = await api<Job>("/api/jobs/", "POST", { url: url.trim() });
      setJob(j);
      timer.current = setInterval(async () => {
        try {
          const u = await api<Job>(`/api/jobs/${j.id}/`);
          setJob(u);
          if (u.status === "done" || u.status === "failed") {
            stop(); setBusy(false);
            Haptics.notificationAsync(u.status === "done" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
          }
        } catch (e: any) { stop(); setBusy(false); setErr(e.message); }
      }, 2000);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  const save = async () => {
    if (!job?.download_url) return;
    setSaving(true); setErr("");
    try {
      const file = await File.downloadFileAsync(job.download_url, Paths.cache);
      await Sharing.shareAsync(file.uri, { mimeType: "audio/mpeg", dialogTitle: "Save audio" });
    } catch { setErr("Download failed. Try again."); }
    setSaving(false);
  };

  const label = job?.status === "queued" ? "In queue…" : "Extracting audio…";

  return (
    <SafeAreaView style={s.wrap}>
      <View style={s.header}>
        <Text style={s.h1}>YT Audio</Text>
        <Pressable onPress={signOut} hitSlop={12}><Text style={s.out}>Sign out</Text></Pressable>
      </View>

      <View style={s.card}>
        <TextInput style={s.input} placeholder="Paste a YouTube link" placeholderTextColor={C.muted}
          autoCapitalize="none" autoCorrect={false} value={url} onChangeText={setUrl} />
        <View style={s.row}>
          <Pressable style={s.ghost} onPress={async () => setUrl(await Clipboard.getStringAsync())}>
            <Text style={s.ghostText}>Paste</Text>
          </Pressable>
          <Pressable style={[s.btn, (busy || !url) && { opacity: 0.5 }]} disabled={busy || !url} onPress={start}>
            <Text style={s.btnText}>Get audio</Text>
          </Pressable>
        </View>
      </View>

      {!!err && <Text style={s.err}>{err}</Text>}

      {job && (
        <View style={s.card}>
          {job.status === "done" ? (
            <>
              {!!job.thumbnail && <Image source={{ uri: job.thumbnail }} style={s.thumb} />}
              <Text style={s.title} numberOfLines={2}>{job.title}</Text>
              <Pressable style={[s.btn, { backgroundColor: C.ok }, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color="#0B0B12" /> : <Text style={[s.btnText, { color: "#0B0B12" }]}>Download MP3</Text>}
              </Pressable>
            </>
          ) : job.status === "failed" ? (
            <Text style={s.err}>{job.error || "Could not process this video."}</Text>
          ) : (
            <View style={s.row}><ActivityIndicator color={C.accent} /><Text style={s.muted}>{label}</Text></View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 20, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  h1: { color: C.text, fontSize: 28, fontWeight: "800" },
  out: { color: C.muted },
  card: { backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 },
  input: { backgroundColor: C.bg, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 14, color: C.text, fontSize: 15 },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  btn: { flex: 1, backgroundColor: C.accent, padding: 15, borderRadius: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghost: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  ghostText: { color: C.text, fontWeight: "600" },
  thumb: { width: "100%", aspectRatio: 16 / 9, borderRadius: 16, backgroundColor: C.bg },
  title: { color: C.text, fontSize: 17, fontWeight: "700" },
  muted: { color: C.muted, fontSize: 15 },
  err: { color: C.danger },
});
