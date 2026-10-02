import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider, useTheme } from "./theme/ThemeProvider";
import { useAppFonts } from "./theme/useAppFonts";
import { fontFor } from "./theme/typography";
import { SettingsProvider, useSettings } from "./store/settings";
import { AuthProvider, useAuth } from "./store/auth";
import { DataProvider } from "./store/data";
import { NotificationsProvider } from "./store/notifications";
import { I18nProvider, useI18n } from "./i18n";
import { ToastProvider } from "./components/motion/Toast";
import { ConfettiProvider } from "./components/motion/Confetti";

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
  const { t, lang } = useI18n();
  // React Navigation renders tab labels with its own Text, so the family has to
  // be supplied here rather than inherited from our Text wrapper.
  const labelFont = fontFor("600", lang === "ar");

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
          tabBarLabelStyle: { fontSize: 11.5, fontFamily: labelFont },
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
  const fontsLoaded = useAppFonts();

  // Hold the splash until both the session and the fonts resolve, so the first
  // screen never flashes the system font and then reflows into IBM Plex.
  if (!ready || !fontsLoaded) {
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
            <ToastProvider>
              <ConfettiProvider>
                <AuthProvider>
                  <NotificationsProvider>
                    <DataProvider>
                      <Navigation />
                    </DataProvider>
                  </NotificationsProvider>
                </AuthProvider>
              </ConfettiProvider>
            </ToastProvider>
          </ThemeProvider>
        </Localized>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
