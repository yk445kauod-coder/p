import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider, useTheme } from "./theme/ThemeProvider";
import { SettingsProvider, useSettings } from "./store/settings";
import { AuthProvider, useAuth } from "./store/auth";
import { DataProvider } from "./store/data";
import { I18nProvider, useI18n } from "./i18n";

import { HomeScreen } from "./screens/HomeScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { TabIcon } from "./components/icons";
import { AppShell } from "./components/AppShell";

const Tab = createBottomTabNavigator();

const TAB_NAMES = ["Home", "Library", "Stats", "Profile"] as const;

/** Lets web deep links like /?tab=Stats open straight into a tab. */
function initialTab(): (typeof TAB_NAMES)[number] {
  if (typeof window === "undefined") return "Home";
  const requested = new URLSearchParams(window.location.search).get("tab");
  return TAB_NAMES.includes(requested as (typeof TAB_NAMES)[number])
    ? (requested as (typeof TAB_NAMES)[number])
    : "Home";
}

function Tabs() {
  const theme = useTheme();
  const c = theme.colors;
  const { t } = useI18n();

  return (
    <AppShell>
      <Tab.Navigator
        initialRouteName={initialTab()}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.textFaint,
          tabBarStyle: {
            backgroundColor: theme.mode === "dark" ? c.bgElevated : c.surface,
            borderTopColor: c.border,
            borderTopWidth: 1,
            height: 74,
            paddingTop: 8,
            paddingBottom: 12,
          },
          tabBarLabelStyle: { fontSize: 11.5, fontWeight: "600" },
          tabBarIcon: ({ color }: { color: string }) => <TabIcon name={route.name.toLowerCase()} color={color} />,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t("tabs.home") }} />
        <Tab.Screen name="Library" component={LibraryScreen} options={{ tabBarLabel: t("tabs.library") }} />
        <Tab.Screen name="Stats" component={StatsScreen} options={{ tabBarLabel: t("tabs.stats") }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t("tabs.profile") }} />
      </Tab.Navigator>
    </AppShell>
  );
}

function Gate() {
  const theme = useTheme();
  const c = theme.colors;
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (!user) return <AuthScreen />;
  return <Tabs />;
}

function Navigation() {
  const theme = useTheme();
  const navTheme = {
    ...(theme.mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === "dark" ? DarkTheme : DefaultTheme).colors,
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      primary: theme.colors.primary,
      border: theme.colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Gate />
    </NavigationContainer>
  );
}

/** Bridges persisted settings into the i18n provider. */
function Localized({ children }: { children: React.ReactNode }) {
  const { lang, setLang } = useSettings();
  return (
    <I18nProvider lang={lang} setLang={setLang}>
      {children}
    </I18nProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <Localized>
          <ThemeProvider>
            <AuthProvider>
              <DataProvider>
                <Navigation />
              </DataProvider>
            </AuthProvider>
          </ThemeProvider>
        </Localized>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
