import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore, UserRole } from '@/src/stores/auth.store';
import { COLORS } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const setUserRole = useAuthStore((state) => state.setUserRole);

  const handleSelectRole = async (role: UserRole) => {
    await setUserRole(role);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background decoration */}
      <View style={styles.glowTop} />
      
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Walo</Text>
          <View style={styles.logoDot} />
        </View>
        <Text style={styles.subtitle}>Nhật ký Calo & Đồng hành Sức khỏe</Text>
      </View>

      <View style={styles.cardContainer}>
        <Text style={styles.title}>Bạn là ai?</Text>
        <Text style={styles.description}>
          Chọn vai trò của bạn để bắt đầu theo dõi và đồng bộ dữ liệu sức khỏe thời gian thực.
        </Text>

        <TouchableOpacity 
          style={[styles.roleCard, styles.roleCardMain]} 
          activeOpacity={0.85}
          onPress={() => handleSelectRole('Weean')}
        >
          <View style={styles.roleIconContainerMain}>
            <Ionicons name="fitness-outline" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>Tôi là Weean</Text>
            <Text style={styles.roleDesc}>Người dùng chính, theo dõi calo, dinh dưỡng & luyện tập hàng ngày.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.roleCard, styles.roleCardAssistant]} 
          activeOpacity={0.85}
          onPress={() => handleSelectRole('Bảo Vy')}
        >
          <View style={styles.roleIconContainerAssistant}>
            <Ionicons name="heart-half-outline" size={28} color={COLORS.secondary} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>Tôi là Bảo Vy</Text>
            <Text style={styles.roleDesc}>Trợ lý sức khỏe, hỗ trợ lên thực đơn, nhắc nhở & giám sát tiến trình.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Đồng bộ real-time hoàn toàn qua Firebase</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  glowTop: {
    position: 'absolute',
    top: -150,
    left: width / 2 - 150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -1,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginBottom: 10,
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  roleCardMain: {
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
  },
  roleCardAssistant: {
    borderLeftWidth: 5,
    borderLeftColor: COLORS.secondary,
  },
  roleIconContainerMain: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleIconContainerAssistant: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
    paddingRight: 8,
  },
  roleName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textMuted,
    opacity: 0.7,
  },
});
