import { useState, useMemo } from "react";
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, SafeAreaView, Modal, StatusBar, Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";


const CATEGORIES = {
  einnahme: ["Gehalt", "Nebenjob", "Investition", "Erstattung", "Sonstiges"],
  ausgabe: ["Lebensmittel", "Miete", "Transport", "Shopping", "Gesundheit", "Freizeit", "Abonnements", "Restaurant", "Sonstiges"],
};

const CAT_ICONS = {
  Gehalt: "💼", Nebenjob: "🔧", Investition: "📈", Erstattung: "↩️",
  Lebensmittel: "🛒", Miete: "🏠", Transport: "🚌", Shopping: "🛍️",
  Gesundheit: "💊", Freizeit: "🎭", Abonnements: "📱", Restaurant: "🍽️", Sonstiges: "📦",
};

const formatEUR = (n) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const today = () => new Date().toISOString().slice(0, 10);

const currentYearMonth = () => new Date().toISOString().slice(0, 7);

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"];

const formatMonth = (ym) => {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
};

const addMonth = (ym, delta) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const SAMPLE = [
  { id: 1, type: "einnahme", amount: 2800, category: "Gehalt", memo: "März Gehalt", date: "2026-03-01" },
  { id: 2, type: "ausgabe", amount: 850, category: "Miete", memo: "Kaltmiete", date: "2026-03-01" },
  { id: 3, type: "ausgabe", amount: 67.40, category: "Lebensmittel", memo: "Rewe Einkauf", date: "2026-03-05" },
  { id: 4, type: "ausgabe", amount: 49.90, category: "Abonnements", memo: "Spotify, Netflix", date: "2026-03-06" },
  { id: 5, type: "einnahme", amount: 320, category: "Nebenjob", memo: "Freelance", date: "2026-03-07" },
  { id: 6, type: "ausgabe", amount: 18.50, category: "Transport", memo: "Deutschlandticket", date: "2026-03-08" },
  { id: 7, type: "ausgabe", amount: 34.80, category: "Restaurant", memo: "Mittagessen", date: "2026-03-09" },
];

export default function App() {
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState(SAMPLE);
  const [view, setView] = useState("uebersicht");
  const [form, setForm] = useState({ type: "ausgabe", amount: "", category: "Lebensmittel", memo: "", date: today() });
  const [nextId, setNextId] = useState(200);
  const [deleteId, setDeleteId] = useState(null);
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());

  // Load saved data on startup
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("records");
        if (saved) setRecords(JSON.parse(saved));
        const savedId = await AsyncStorage.getItem("nextId");
        if (savedId) setNextId(parseInt(savedId));
      } catch (e) { }
    })();
  }, []);

  // Save whenever records change
  useEffect(() => {
    AsyncStorage.setItem("records", JSON.stringify(records)).catch(() => { });
  }, [records]);

  const currentMonth = selectedMonth;
  const monthly = useMemo(() => records.filter(r => r.date.startsWith(currentMonth)), [records, currentMonth]);

  const totalEin = monthly.filter(r => r.type === "einnahme").reduce((s, r) => s + r.amount, 0);
  const totalAus = monthly.filter(r => r.type === "ausgabe").reduce((s, r) => s + r.amount, 0);
  const saldo = totalEin - totalAus;
  const sparquote = totalEin > 0 ? Math.round((saldo / totalEin) * 100) : 0;

  const byCategory = useMemo(() => {
    const map = {};
    monthly.filter(r => r.type === "ausgabe").forEach(r => {
      map[r.category] = (map[r.category] || 0) + r.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthly]);

  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const maxCat = byCategory[0]?.[1] || 1;

  const handleAdd = () => {
    const amt = parseFloat(form.amount.replace(",", "."));
    if (!amt || isNaN(amt)) return;
    const newRecords = [...records, { ...form, id: nextId, amount: amt }];
    setRecords(newRecords);
    const newId = nextId + 1;
    setNextId(newId);
    AsyncStorage.setItem("nextId", String(newId)).catch(() => { });
    setForm({ type: "ausgabe", amount: "", category: "Lebensmittel", memo: "", date: today() });
    setView("uebersicht");
  };

  const doDelete = () => {
    setRecords(records.filter(r => r.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2e17" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />
        <Text style={styles.headerLabel}>HAUSHALTSBUCH</Text>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setSelectedMonth(addMonth(selectedMonth, -1))} style={styles.monthArrow}>
            <Text style={styles.monthArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{formatMonth(selectedMonth)}</Text>
          <TouchableOpacity
            onPress={() => setSelectedMonth(addMonth(selectedMonth, 1))}
            style={styles.monthArrow}
            disabled={selectedMonth >= currentYearMonth()}
          >
            <Text style={[styles.monthArrowText, selectedMonth >= currentYearMonth() && { color: "#2a4a22" }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          {[
            { label: "Saldo", val: saldo, color: saldo >= 0 ? "#b4dc50" : "#ff7070" },
            { label: "Einnahmen", val: totalEin, color: "#7aab5e" },
            { label: "Ausgaben", val: totalAus, color: "#e8a060" },
          ].map((item, i) => (
            <View key={i} style={[styles.summaryCard, { borderTopColor: item.color + "60" }]}>
              <Text style={styles.summaryCardLabel}>{item.label}</Text>
              <Text style={[styles.summaryCardValue, { color: item.color }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatEUR(item.val)}
              </Text>
            </View>
          ))}
        </View>

        {/* Sparquote */}
        <View style={{ marginTop: 12 }}>
          <View style={styles.sparRow}>
            <Text style={styles.sparLabel}>SPARQUOTE</Text>
            <Text style={[styles.sparValue, { color: sparquote > 20 ? "#b4dc50" : sparquote > 10 ? "#e8c060" : "#ff7070" }]}>
              {sparquote}%
            </Text>
          </View>
          <View style={styles.sparBarBg}>
            <View style={[styles.sparBarFill, {
              width: `${Math.max(0, Math.min(100, sparquote))}%`,
              backgroundColor: sparquote > 20 ? "#b4dc50" : sparquote > 10 ? "#e8c060" : "#ff7070",
            }]} />
          </View>
        </View>
      </View>

      {/* Body */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ÜBERSICHT */}
        {view === "uebersicht" && (
          <>
            <Text style={styles.sectionTitle}>LETZTE BUCHUNGEN</Text>
            <View style={styles.card}>
              {sorted.slice(0, 5).map((r, i) => (
                <View key={r.id} style={[styles.row, i < Math.min(sorted.length, 5) - 1 && styles.rowBorder]}>
                  <View style={[styles.rowIcon, { backgroundColor: r.type === "einnahme" ? "#edf7e8" : "#fdf2e8" }]}>
                    <Text style={{ fontSize: 18 }}>{CAT_ICONS[r.category] || "💰"}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowMemo} numberOfLines={1}>{r.memo || r.category}</Text>
                    <Text style={styles.rowMeta}>{r.category} · {r.date.slice(5)}</Text>
                  </View>
                  <Text style={[styles.rowAmount, { color: r.type === "einnahme" ? "#2d7a27" : "#c86020" }]}>
                    {r.type === "einnahme" ? "+" : "−"}{formatEUR(r.amount)}
                  </Text>
                </View>
              ))}
              {sorted.length === 0 && <Text style={styles.emptyText}>Noch keine Buchungen</Text>}
            </View>

            <Text style={styles.sectionTitle}>AUSGABEN NACH KATEGORIE</Text>
            <View style={[styles.card, { paddingHorizontal: 16, paddingVertical: 14 }]}>
              {byCategory.length === 0 && <Text style={styles.emptyText}>Noch keine Ausgaben</Text>}
              {byCategory.map(([cat, amt]) => (
                <View key={cat} style={{ marginBottom: 12 }}>
                  <View style={styles.catRow}>
                    <Text style={styles.catLabel}>{CAT_ICONS[cat] || "📦"}  {cat}</Text>
                    <Text style={styles.catAmount}>{formatEUR(amt)}</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${(amt / maxCat) * 100}%` }]} />
                  </View>
                </View>
              ))}
            </View>
            <View style={{ height: 20 }} />
          </>
        )}

        {/* BUCHUNGEN */}
        {view === "buchungen" && (
          <>
            <Text style={styles.sectionTitle}>ALLE BUCHUNGEN</Text>
            <View style={styles.card}>
              {sorted.length === 0 && <Text style={styles.emptyText}>Keine Buchungen vorhanden</Text>}
              {sorted.map((r, i) => (
                <View key={r.id} style={[styles.row, i < sorted.length - 1 && styles.rowBorder]}>
                  <View style={[styles.rowIcon, { backgroundColor: r.type === "einnahme" ? "#edf7e8" : "#fdf2e8" }]}>
                    <Text style={{ fontSize: 18 }}>{CAT_ICONS[r.category] || "💰"}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowMemo} numberOfLines={1}>{r.memo || r.category}</Text>
                    <Text style={styles.rowMeta}>{r.category} · {r.date}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.rowAmount, { color: r.type === "einnahme" ? "#2d7a27" : "#c86020" }]}>
                      {r.type === "einnahme" ? "+" : "−"}{formatEUR(r.amount)}
                    </Text>
                    <TouchableOpacity onPress={() => setDeleteId(r.id)}>
                      <Text style={styles.deleteBtn}>löschen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ height: 20 }} />
          </>
        )}

        {/* NEU */}
        {view === "neu" && (
          <>
            <Text style={styles.sectionTitle}>NEUE BUCHUNG</Text>

            {/* Type toggle */}
            <View style={styles.toggleBg}>
              {[["ausgabe", "− Ausgabe"], ["einnahme", "+ Einnahme"]].map(([v, label]) => (
                <TouchableOpacity key={v} style={[styles.toggleBtn, form.type === v && styles.toggleBtnActive]}
                  onPress={() => setForm({ ...form, type: v, category: v === "ausgabe" ? "Lebensmittel" : "Gehalt" })}>
                  <Text style={[styles.toggleText, form.type === v && {
                    color: v === "ausgabe" ? "#c86020" : "#2d7a27", fontWeight: "600"
                  }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>BETRAG (€)</Text>
            <TextInput
              style={[styles.input, { fontSize: 28, fontWeight: "700" }]}
              placeholder="0,00"
              placeholderTextColor="#c0b8a8"
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={v => setForm({ ...form, amount: v })}
            />

            <Text style={styles.fieldLabel}>KATEGORIE</Text>
            <TouchableOpacity style={styles.input} onPress={() => setCatPickerOpen(true)}>
              <Text style={{ fontSize: 16, color: "#1a1814" }}>
                {CAT_ICONS[form.category] || "📦"}  {form.category}
              </Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>NOTIZ</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. Rewe, Gehalt März..."
              placeholderTextColor="#c0b8a8"
              value={form.memo}
              onChangeText={v => setForm({ ...form, memo: v })}
            />

            <Text style={styles.fieldLabel}>DATUM</Text>
            <TouchableOpacity style={styles.input} onPress={() => setDatePickerOpen(true)}>
              <Text style={{ fontSize: 15, color: "#1a1814" }}>📅  {form.date}</Text>
            </TouchableOpacity>

            {datePickerOpen && (
              <DateTimePicker
                value={new Date(form.date)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setDatePickerOpen(Platform.OS === "ios");
                  if (selectedDate) {
                    setForm({ ...form, date: selectedDate.toISOString().slice(0, 10) });
                  }
                  if (Platform.OS === "android") setDatePickerOpen(false);
                }}
              />
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Buchung speichern</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setView("uebersicht")}>
              <Text style={styles.cancelBtnText}>Abbrechen</Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View style={[styles.nav, { paddingBottom: insets.bottom + 8 }]}>
        {[
          { id: "uebersicht", label: "Übersicht", icon: "◈" },
          { id: "neu", label: "Neu", icon: "+", accent: true },
          { id: "buchungen", label: "Buchungen", icon: "≡" },
        ].map(item => (
          <TouchableOpacity key={item.id} style={[styles.navBtn, item.accent && styles.navBtnAccent]}
            onPress={() => setView(item.id)}>
            <Text style={[styles.navIcon, item.accent && { color: "#b4dc50" }, !item.accent && view === item.id && { color: "#1a2e17" }]}>
              {item.icon}
            </Text>
            <Text style={[styles.navLabel, item.accent && { color: "#7aab5e" }, !item.accent && view === item.id && { color: "#1a2e17", fontWeight: "600" }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category picker modal */}
      <Modal visible={catPickerOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Kategorie wählen</Text>
            <ScrollView>
              {CATEGORIES[form.type].map(cat => (
                <TouchableOpacity key={cat} style={styles.modalOption}
                  onPress={() => { setForm({ ...form, category: cat }); setCatPickerOpen(false); }}>
                  <Text style={styles.modalOptionText}>{CAT_ICONS[cat] || "📦"}  {cat}</Text>
                  {form.category === cat && <Text style={{ color: "#2d7a27", fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setCatPickerOpen(false)}>
              <Text style={styles.modalCancelText}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal visible={!!deleteId} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Buchung löschen?</Text>
            <Text style={{ color: "#8a8070", marginBottom: 24, fontSize: 14 }}>
              Diese Buchung wird endgültig entfernt.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#f0ece3", flex: 1 }]}
                onPress={() => setDeleteId(null)}>
                <Text style={{ color: "#3a3228", fontWeight: "500" }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#cc3333", flex: 1 }]}
                onPress={doDelete}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>Löschen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#1a2e17" },
  header: { backgroundColor: "#1a2e17", padding: 24, paddingTop: 16, overflow: "hidden" },
  headerCircle1: { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(180,220,80,0.08)" },
  headerCircle2: { position: "absolute", bottom: -20, left: 60, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(180,220,80,0.05)" },
  headerLabel: { fontSize: 11, letterSpacing: 3, color: "#7aab5e", marginBottom: 10 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  monthArrow: { padding: 8 },
  monthArrowText: { fontSize: 28, color: "#7aab5e", lineHeight: 30 },
  monthTitle: { fontSize: 18, fontWeight: "700", color: "#e8e6e0" },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12, borderTopWidth: 2 },
  summaryCardLabel: { fontSize: 9, letterSpacing: 1.5, color: "#4a6e3a", marginBottom: 6 },
  summaryCardValue: { fontSize: 13, fontWeight: "700" },
  sparRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  sparLabel: { fontSize: 11, color: "#4a6e3a", letterSpacing: 1 },
  sparValue: { fontSize: 11, fontWeight: "600" },
  sparBarBg: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99, height: 5, overflow: "hidden" },
  sparBarFill: { height: "100%", borderRadius: 99 },
  body: { flex: 1, backgroundColor: "#faf8f3", paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 11, letterSpacing: 2, color: "#8a8070", marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#e8e3d8", marginBottom: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#f0ece3" },
  rowIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1 },
  rowMemo: { fontSize: 14, fontWeight: "500", color: "#1a1814", marginBottom: 2 },
  rowMeta: { fontSize: 11, color: "#a09888" },
  rowAmount: { fontSize: 13, fontWeight: "600" },
  deleteBtn: { fontSize: 11, color: "#c0b8a8", marginTop: 2 },
  emptyText: { textAlign: "center", color: "#b0a898", fontSize: 13, padding: 16 },
  catRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  catLabel: { fontSize: 13, color: "#3a3228" },
  catAmount: { fontSize: 13, color: "#c86020", fontWeight: "500" },
  barBg: { backgroundColor: "#f0ece3", borderRadius: 99, height: 4, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#e8a060", borderRadius: 99 },
  nav: { flexDirection: "row", backgroundColor: "rgba(250,248,243,0.98)", borderTopWidth: 1, borderTopColor: "#e8e3d8", paddingTop: 8 },
  navBtn: { flex: 1, alignItems: "center", paddingVertical: 6 },
  navBtnAccent: { backgroundColor: "#1a2e17", borderRadius: 12, marginHorizontal: 12 },
  navIcon: { fontSize: 20, color: "#b0a898" },
  navLabel: { fontSize: 10, color: "#b0a898", marginTop: 2, letterSpacing: 0.5 },
  toggleBg: { flexDirection: "row", backgroundColor: "#f0ece3", borderRadius: 12, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9 },
  toggleBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, color: "#8a8070", fontWeight: "400" },
  fieldLabel: { fontSize: 11, letterSpacing: 1.5, color: "#8a8070", marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: "#f7f5f0", borderWidth: 1.5, borderColor: "#e0dbd0", borderRadius: 10, padding: 14, fontSize: 15, color: "#1a1814", marginBottom: 14, justifyContent: "center" },
  saveBtn: { backgroundColor: "#1a2e17", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 4, marginBottom: 10 },
  saveBtnText: { color: "#b4dc50", fontSize: 15, fontWeight: "600", letterSpacing: 0.5 },
  cancelBtn: { alignItems: "center", padding: 8 },
  cancelBtnText: { color: "#a09888", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 17, fontWeight: "600", color: "#1a1814", marginBottom: 16 },
  modalOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0ece3" },
  modalOptionText: { fontSize: 15, color: "#3a3228" },
  modalCancel: { marginTop: 16, alignItems: "center", padding: 12 },
  modalCancelText: { color: "#8a8070", fontSize: 15 },
  modalBtn: { padding: 14, borderRadius: 10, alignItems: "center" },
});
