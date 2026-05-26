import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/src/constants/colors';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: '#0E0B1A',
          borderTopColor: '#2B2548',
          borderTopWidth: 1.5,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
        },
        headerStyle: {
          backgroundColor: '#0E0B1A',
          borderBottomColor: '#2B2548',
          borderBottomWidth: 1.5,
        },
        headerTitleStyle: {
          color: COLORS.text,
          fontWeight: '800',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Nhật ký',
          tabBarLabel: 'Nhật ký',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="action"
        options={{
          title: '',
          tabBarLabel: '',
          tabBarButton: (props) => (
            <View style={styles.fabWrapper}>
              <TouchableOpacity
                style={styles.fabContainer}
                activeOpacity={0.8}
                onPress={() => router.push('/food-search')}
              >
                <Ionicons name="add" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Thực đơn',
          tabBarLabel: 'Thực đơn',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="exercise"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  fabContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF4681', // App Primary Color for FAB
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4681',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 5,
    borderColor: '#0E0B1A', // Base Background to create cut-out effect
  }
});
