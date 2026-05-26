import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useAuthStore } from '@/src/stores/auth.store';
import { COLORS } from '@/src/constants/colors';
import { View, ActivityIndicator } from 'react-native';
import { NotificationService } from '@/src/services/notification.service';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const { userRole, isLoading, loadUserRole } = useAuthStore();

  // Load the persisted user role on startup
  useEffect(() => {
    loadUserRole();
  }, []);

  // Initialize notifications on app start (asynchronously in the background after startup)
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const granted = await NotificationService.requestPermissions();
        if (granted) {
          // Schedule notifications in parallel to optimize execution speed
          await Promise.all([
            NotificationService.scheduleWaterReminders(),
            NotificationService.scheduleMealReminders(),
            NotificationService.scheduleEndOfDayReminder()
          ]);
        }
      } catch (e) {
        console.warn('Lỗi khi thiết lập thông báo khởi chạy:', e);
      }
    };

    // Delay initialization by 2 seconds to keep initial boot extremely fast
    const timer = setTimeout(() => {
      initNotifications();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Handle font loading errors
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Hide splash screen once fonts are loaded and auth store is ready
  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  // Redirect based on authentication status
  useEffect(() => {
    if (!fontsLoaded || isLoading) return;

    if (!userRole) {
      // Force redirect to login screen if role is not set
      router.replace('/login');
    } else {
      // Go to tabs if role is set
      router.replace('/(tabs)');
    }
  }, [fontsLoaded, isLoading, userRole]);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Thông tin' }} />
      </Stack>
    </ThemeProvider>
  );
}
