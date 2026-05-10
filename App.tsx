import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GAMES } from './src/data/games';
import { GameProvider, useHub } from './src/state/GameContext';
import { GameId } from './src/types';
import { spacing, theme } from './src/theme';

const chip = (v: number) => v.toLocaleString();

const Home = ({ openGame }: { openGame: (id: GameId) => void }) => {
  const { state, claimQuest } = useHub();
  const totalRounds = useMemo(() => Object.values(state.stats).reduce((a, s) => a + s.rounds, 0), [state.stats]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel>
        <Text style={styles.title}>Blackline Hub</Text>
        <Text style={styles.muted}>Strict black UI · offline-first · unified balance</Text>
        <Row>
          <Kpi label="Balance" value={`${chip(state.balance)}`} />
          <Kpi label="Net worth" value={`${chip(state.lifetimeNetWorth)}`} />
        </Row>
        <Row>
          <Kpi label="Level" value={`${state.level}`} />
          <Kpi label="Tier" value={state.tier} />
          <Kpi label="Rounds" value={`${totalRounds}`} />
        </Row>
      </Panel>

      <Panel>
        <Text style={styles.section}>Daily / Weekly Quests</Text>
        {state.quests.map((q) => (
          <View key={q.id} style={styles.questRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.body}>{q.title}</Text>
              <Text style={styles.muted}>{q.progress}/{q.target} • +{q.rewardCoins} chips • +{q.rewardXp} XP</Text>
            </View>
            <Pressable
              disabled={!q.claimable || q.claimed}
              onPress={() => claimQuest(q.id)}
              style={[styles.btn, (!q.claimable || q.claimed) && styles.btnDisabled]}
            >
              <Text style={styles.btnText}>{q.claimed ? 'Claimed' : 'Claim'}</Text>
            </Pressable>
          </View>
        ))}
      </Panel>

      <Panel>
        <Text style={styles.section}>Games</Text>
        {GAMES.map((g) => (
          <Pressable key={g.id} style={styles.gameTile} onPress={() => openGame(g.id)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.body}>{g.name}</Text>
              <Text style={styles.muted}>{g.description}</Text>
              <Text style={styles.muted}>Stakes {g.minBet} - {g.maxBet}</Text>
            </View>
            <Text style={styles.enter}>Play</Text>
          </Pressable>
        ))}
      </Panel>
    </ScrollView>
  );
};

const GameView = ({ gameId, back }: { gameId: GameId; back: () => void }) => {
  const { state, playRound, leaveSession } = useHub();
  const meta = GAMES.find((g) => g.id === gameId)!;
  const [bet, setBet] = useState(String(meta.minBet));
  const [log, setLog] = useState<string[]>([]);
  const gStats = state.stats[gameId];

  const runRound = () => {
    const wager = Number(bet) || 0;
    const result = playRound(wager);
    if (!result) return;
    const signed = result.net >= 0 ? `+${result.net}` : `${result.net}`;
    setLog((l) => [`${result.detail} ${signed}`, ...l].slice(0, 8));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel>
        <Row>
          <Text style={styles.title}>{meta.name}</Text>
          <Pressable onPress={() => { leaveSession(); back(); }} style={styles.btn}><Text style={styles.btnText}>Exit</Text></Pressable>
        </Row>
        <Text style={styles.muted}>Mobile-first controls • Real-time truthful session updates</Text>
        <Row>
          <Kpi label="Session net" value={chip(state.activeSession?.net ?? 0)} />
          <Kpi label="Hands" value={`${state.activeSession?.hands ?? 0}`} />
          <Kpi label="Streak" value={`${state.activeSession?.streak ?? 0}`} />
        </Row>
      </Panel>

      <Panel>
        <Text style={styles.section}>Bet controls</Text>
        <TextInput style={styles.input} value={bet} onChangeText={setBet} keyboardType="numeric" placeholderTextColor={theme.sub} />
        <Row>
          {[meta.minBet, Math.floor((meta.minBet + meta.maxBet) / 2), meta.maxBet].map((v) => (
            <Pressable key={v} style={styles.smallBtn} onPress={() => setBet(String(v))}><Text style={styles.btnText}>{v}</Text></Pressable>
          ))}
        </Row>
        <Pressable style={styles.primaryBtn} onPress={runRound}><Text style={styles.primaryText}>Play round</Text></Pressable>
      </Panel>

      <Panel>
        <Text style={styles.section}>Live stats</Text>
        <Row>
          <Kpi label="Win rate" value={`${gStats.rounds ? Math.round((gStats.wins / gStats.rounds) * 100) : 0}%`} />
          <Kpi label="Avg bet" value={chip(Math.round(gStats.avgBet || 0))} />
          <Kpi label="Best streak" value={`${gStats.bestStreak}`} />
        </Row>
        {log.map((l, i) => <Text key={i} style={styles.log}>{l}</Text>)}
      </Panel>
    </ScrollView>
  );
};

const Stats = () => {
  const { state } = useHub();
  const rows = GAMES.map((g) => ({ game: g.name, ...state.stats[g.id] }));
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel>
        <Text style={styles.title}>Truthful Stats Center</Text>
        <Text style={styles.muted}>All numbers derive directly from resolved rounds in real time.</Text>
      </Panel>
      {rows.map((r) => (
        <Panel key={r.game}>
          <Text style={styles.section}>{r.game}</Text>
          <Row>
            <Kpi label="Rounds" value={`${r.rounds}`} />
            <Kpi label="W/L" value={`${r.wins}/${r.losses}`} />
            <Kpi label="Net" value={chip(Math.round(r.net))} />
          </Row>
          <Text style={styles.muted}>Last 10: {r.last10.map((v) => (v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`)).join(' | ') || 'No rounds yet'}</Text>
        </Panel>
      ))}
    </ScrollView>
  );
};

const Profile = () => {
  const { state } = useHub();
  const favorite = GAMES.find((g) => g.id === state.profile.favoriteGame)?.name;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel>
        <Text style={styles.title}>{state.profile.avatar} {state.profile.name}</Text>
        <Text style={styles.muted}>Badge: {state.profile.badge} • Border: {state.profile.border}</Text>
        <Row>
          <Kpi label="Tier" value={state.tier} />
          <Kpi label="Favorite" value={favorite || '-'} />
        </Row>
      </Panel>
    </ScrollView>
  );
};

const Main = () => {
  const { enterSession } = useHub();
  const [tab, setTab] = useState<'home' | 'stats' | 'profile'>('home');
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  const openGame = (id: GameId) => {
    enterSession(id);
    setActiveGame(id);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.root}>
        {activeGame ? <GameView gameId={activeGame} back={() => setActiveGame(null)} /> : tab === 'home' ? <Home openGame={openGame} /> : tab === 'stats' ? <Stats /> : <Profile />}
        {!activeGame && (
          <View style={styles.tabBar}>
            {[
              ['home', 'Hub'],
              ['stats', 'Stats'],
              ['profile', 'Profile']
            ].map(([id, label]) => (
              <Pressable key={id} style={[styles.tab, tab === id && styles.tabActive]} onPress={() => setTab(id as 'home' | 'stats' | 'profile')}>
                <Text style={styles.btnText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const Panel = ({ children }: { children: React.ReactNode }) => <View style={styles.panel}>{children}</View>;
const Row = ({ children }: { children: React.ReactNode }) => <View style={styles.row}>{children}</View>;
const Kpi = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.kpi}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
  </View>
);

export default function App() {
  return (
    <GameProvider>
      <Main />
    </GameProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.md, paddingBottom: 110, gap: spacing.md },
  panel: {
    backgroundColor: theme.panel,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    gap: spacing.sm
  },
  title: { color: theme.text, fontSize: 26, fontWeight: '700', letterSpacing: 0.2 },
  section: { color: theme.text, fontSize: 17, fontWeight: '600' },
  body: { color: theme.text, fontSize: 15, fontWeight: '600' },
  muted: { color: theme.sub, fontSize: 12 },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  kpi: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.panel2, minWidth: 88 },
  kpiLabel: { color: theme.sub, fontSize: 11 },
  kpiValue: { color: theme.text, fontSize: 14, fontWeight: '700' },
  questRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: spacing.sm },
  gameTile: { borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: theme.panel2 },
  enter: { color: theme.text, fontWeight: '700' },
  btn: { borderColor: theme.border, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: theme.panel2 },
  smallBtn: { borderColor: theme.border, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: theme.panel2 },
  primaryBtn: { borderRadius: 12, padding: 14, backgroundColor: '#fff' },
  primaryText: { color: '#000', textAlign: 'center', fontWeight: '700' },
  btnText: { color: theme.text, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, color: theme.text, padding: 12, fontSize: 16, backgroundColor: theme.panel2 },
  log: { color: theme.sub, fontSize: 12, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 6 },
  tabBar: { position: 'absolute', left: 12, right: 12, bottom: 14, flexDirection: 'row', gap: 10, backgroundColor: '#080808', borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 10 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#171717' }
});
