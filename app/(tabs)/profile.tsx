import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/auth.store';
import { FirestoreService, UserProfile } from '@/src/services/firestore.service';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { userRole, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('65');
  const [age, setAge] = useState('25');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState('1.375');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');

  // Weight History Input
  const [newWeightRecord, setNewWeightRecord] = useState('');

  // Subscribe to real-time profile data
  useEffect(() => {
    setLoading(true);
    const unsub = FirestoreService.subscribeProfile((data) => {
      if (data) {
        setProfile(data);
        setHeight(data.height_cm.toString());
        setWeight(data.weight_kg.toString());
        setAge(data.age.toString());
        setGender(data.gender);
        setActivityLevel(data.activityLevel);
        setGoal(data.goal);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const calculateTargets = (
    h: number, 
    w: number, 
    a: number, 
    g: 'male' | 'female', 
    act: string, 
    gl: 'lose' | 'maintain' | 'gain'
  ) => {
    // 1. Calculate BMR (Mifflin-St Jeor Formula)
    let bmr = 0;
    if (g === 'male') {
      bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
    } else {
      bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
    }

    // 2. Calculate TDEE
    const multiplier = parseFloat(act);
    const tdee = Math.round(bmr * multiplier);

    // 3. Target Calories based on Goal
    let targetCalories = tdee;
    let pPct = 0.3; // protein pct
    let cPct = 0.4; // carb pct
    let fPct = 0.3; // fat pct

    if (gl === 'lose') {
      targetCalories = tdee - 500;
      pPct = 0.35;
      cPct = 0.35;
      fPct = 0.30;
    } else if (gl === 'gain') {
      targetCalories = tdee + 300;
      pPct = 0.30;
      cPct = 0.45;
      fPct = 0.25;
    }

    // Protect negative/too low calories
    if (targetCalories < 1200) targetCalories = 1200;

    // 4. Calculate exact macro grams
    // Protein = 4 kcal/g, Carbs = 4 kcal/g, Fat = 9 kcal/g
    const targetProtein = Math.round((targetCalories * pPct) / 4);
    const targetCarbs = Math.round((targetCalories * cPct) / 4);
    const targetFat = Math.round((targetCalories * fPct) / 9);

    return {
      bmr,
      tdee,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat
    };
  };

  const handleSaveProfile = async () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const a = parseInt(age);

    if (isNaN(h) || isNaN(w) || isNaN(a)) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng điền đầy đủ và chính xác các chỉ số sinh lý.');
      return;
    }

    setSaving(true);

    const calculated = calculateTargets(h, w, a, gender, activityLevel, goal);

    const updatedProfile: UserProfile = {
      height_cm: h,
      weight_kg: w,
      age: a,
      gender,
      activityLevel,
      goal,
      targetCalories: calculated.targetCalories,
      targetProtein: calculated.targetProtein,
      targetCarbs: calculated.targetCarbs,
      targetFat: calculated.targetFat,
      updatedAt: null
    };

    await FirestoreService.saveProfile(updatedProfile);
    setSaving(false);
    
    Alert.alert('Thành công', 'Hồ sơ sức khỏe đã được cập nhật thành công!');
  };

  const handleLogWeight = async () => {
    const wVal = parseFloat(newWeightRecord);
    if (isNaN(wVal) || wVal <= 0) {
      Alert.alert('Lỗi', 'Cân nặng ghi nhận không hợp lệ.');
      return;
    }

    const todayDate = new Date().toISOString().split('T')[0];
    await FirestoreService.addWeight(todayDate, wVal);
    
    // Also update current weight in profile
    setWeight(newWeightRecord);
    
    const h = parseFloat(height);
    const a = parseInt(age);
    if (!isNaN(h) && !isNaN(a)) {
      const calculated = calculateTargets(h, wVal, a, gender, activityLevel, goal);
      const updatedProfile: UserProfile = {
        height_cm: h,
        weight_kg: wVal,
        age: a,
        gender,
        activityLevel,
        goal,
        targetCalories: calculated.targetCalories,
        targetProtein: calculated.targetProtein,
        targetCarbs: calculated.targetCarbs,
        targetFat: calculated.targetFat,
        updatedAt: null
      };
      await FirestoreService.saveProfile(updatedProfile);
    }

    setNewWeightRecord('');
    Alert.alert('Đã ghi nhận', `Cân nặng hôm nay đã được cập nhật: ${wVal} kg.`);
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Calculate live estimations for UI display
  const currentHeight = parseFloat(height) || 170;
  const currentWeight = parseFloat(weight) || 65;
  const currentAge = parseInt(age) || 25;
  const liveTarget = calculateTargets(currentHeight, currentWeight, currentAge, gender, activityLevel, goal);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarLarge}>
            <Ionicons name="fitness" size={40} color={COLORS.white} />
          </View>
          <Text style={styles.profileName}>Chỉ số sức khỏe Weean</Text>
          <Text style={styles.profileRole}>Vai trò đang dùng: <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{userRole}</Text></Text>
        </View>

        {/* Live Target Summary Ribbon */}
        <View style={styles.targetLiveCard}>
          <Text style={styles.sectionHeader}>Mục tiêu ước lượng (Mifflin-St Jeor)</Text>
          <View style={styles.tdeeRow}>
            <View style={styles.tdeeCol}>
              <Text style={styles.tdeeVal}>{liveTarget.tdee}</Text>
              <Text style={styles.tdeeLabel}>TDEE (Tiêu hao)</Text>
            </View>
            <View style={[styles.tdeeCol, { borderLeftWidth: 1, borderLeftColor: 'rgba(255, 255, 255, 0.05)' }]}>
              <Text style={[styles.tdeeVal, { color: COLORS.primary }]}>{liveTarget.targetCalories}</Text>
              <Text style={styles.tdeeLabel}>Mục tiêu nạp</Text>
            </View>
          </View>
          
          <View style={styles.macroPillRow}>
            <View style={[styles.macroPill, { borderTopColor: '#F87171' }]}>
              <Text style={styles.macroPillVal}>{liveTarget.targetProtein}g</Text>
              <Text style={styles.macroPillLabel}>Đạm</Text>
            </View>
            <View style={[styles.macroPill, { borderTopColor: '#FBBF24' }]}>
              <Text style={styles.macroPillVal}>{liveTarget.targetCarbs}g</Text>
              <Text style={styles.macroPillLabel}>Tinh bột</Text>
            </View>
            <View style={[styles.macroPill, { borderTopColor: '#60A5FA' }]}>
              <Text style={styles.macroPillVal}>{liveTarget.targetFat}g</Text>
              <Text style={styles.macroPillLabel}>Chất béo</Text>
            </View>
          </View>
        </View>

        {/* Biểu đồ phân tích liên kết nhanh */}
        <TouchableOpacity 
          style={styles.analyticsLauncherCard} 
          onPress={() => router.push('/analytics' as any)}
        >
          <View style={styles.analyticsIconBg}>
            <Ionicons name="stats-chart" size={20} color={COLORS.secondary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.analyticsLauncherTitle}>Biểu Đồ Phân Tích Dinh Dưỡng</Text>
            <Text style={styles.analyticsLauncherDesc}>Theo dõi chỉ số calo, nước uống và cân nặng của bạn theo chu kỳ.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Profile Settings Form */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Thông số cá nhân</Text>

          <View style={styles.rowInputs}>
            <View style={styles.colInput}>
              <Text style={styles.inputLabel}>Chiều cao (cm)</Text>
              <TextInput 
                style={styles.textInput} 
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
              />
            </View>
            <View style={styles.colInput}>
              <Text style={styles.inputLabel}>Cân nặng (kg)</Text>
              <TextInput 
                style={styles.textInput} 
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
            <View style={styles.colInput}>
              <Text style={styles.inputLabel}>Tuổi</Text>
              <TextInput 
                style={styles.textInput} 
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />
            </View>
          </View>

          {/* Gender selection */}
          <Text style={styles.inputLabel}>Giới tính sinh lý</Text>
          <View style={styles.tabButtons}>
            <TouchableOpacity 
              style={[styles.tabBtn, gender === 'male' && styles.tabBtnActive]} 
              onPress={() => setGender('male')}
            >
              <Ionicons name="male" size={16} color={gender === 'male' ? COLORS.white : COLORS.textMuted} />
              <Text style={[styles.tabBtnLabel, gender === 'male' && styles.tabBtnLabelActive]}>Nam giới</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, gender === 'female' && styles.tabBtnActive]} 
              onPress={() => setGender('female')}
            >
              <Ionicons name="female" size={16} color={gender === 'female' ? COLORS.white : COLORS.textMuted} />
              <Text style={[styles.tabBtnLabel, gender === 'female' && styles.tabBtnLabelActive]}>Nữ giới</Text>
            </TouchableOpacity>
          </View>

          {/* Activity level selection */}
          <Text style={styles.inputLabel}>Mức độ hoạt động vận động</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {[
              { label: 'Ít vận động (1.2)', val: '1.2' },
              { label: 'Vừa phải (1.375)', val: '1.375' },
              { label: 'Trung bình (1.55)', val: '1.55' },
              { label: 'Tích cực (1.725)', val: '1.725' },
              { label: 'Vận động viên (1.9)', val: '1.9' },
            ].map((item) => (
              <TouchableOpacity
                key={item.val}
                style={[styles.horizontalPill, activityLevel === item.val && styles.horizontalPillActive]}
                onPress={() => setActivityLevel(item.val)}
              >
                <Text style={[styles.horizontalPillText, activityLevel === item.val && styles.horizontalPillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Target Goal selection */}
          <Text style={styles.inputLabel}>Mục tiêu sức khỏe</Text>
          <View style={styles.tabButtons}>
            <TouchableOpacity 
              style={[styles.tabBtn, goal === 'lose' && [styles.tabBtnActive, { backgroundColor: COLORS.primary }]]} 
              onPress={() => setGoal('lose')}
            >
              <Text style={[styles.tabBtnLabel, goal === 'lose' && styles.tabBtnLabelActive]}>Giảm cân</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, goal === 'maintain' && [styles.tabBtnActive, { backgroundColor: COLORS.secondary }]]} 
              onPress={() => setGoal('maintain')}
            >
              <Text style={[styles.tabBtnLabel, goal === 'maintain' && styles.tabBtnLabelActive]}>Giữ cân</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, goal === 'gain' && [styles.tabBtnActive, { backgroundColor: COLORS.warning }]]} 
              onPress={() => setGoal('gain')}
            >
              <Text style={[styles.tabBtnLabel, goal === 'gain' && styles.tabBtnLabelActive]}>Tăng cân</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.saveBtnText}>Lưu Hồ sơ & Đặt lại Mục tiêu</Text>}
          </TouchableOpacity>
        </View>

        {/* Record Weight Today */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Ghi nhận cân nặng hôm nay</Text>
          <Text style={styles.cardDesc}>Cập nhật cân nặng mỗi ngày để theo dõi biểu đồ tiến trình giảm/tăng cân.</Text>
          
          <View style={styles.weightInputRow}>
            <TextInput 
              style={[styles.textInput, { flex: 1, marginRight: 12 }]} 
              placeholder="Ví dụ: 64.5"
              keyboardType="numeric"
              value={newWeightRecord}
              onChangeText={setNewWeightRecord}
            />
            <TouchableOpacity style={styles.weightBtn} onPress={handleLogWeight}>
              <Text style={styles.weightBtnText}>Ghi nhận</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger zone actions */}
        <View style={styles.logoutBox}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.danger} style={{ marginRight: 6 }} />
            <Text style={styles.logoutBtnText}>Đổi vai trò người dùng</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  profileRole: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  targetLiveCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
  },
  tdeeRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tdeeCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tdeeVal: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  tdeeLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  macroPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  macroPillVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  macroPillLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  colInput: {
    flex: 1,
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  textInput: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 15,
  },
  tabButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: 'transparent',
  },
  tabBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabBtnLabelActive: {
    color: COLORS.white,
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  horizontalPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  horizontalPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: 'transparent',
  },
  horizontalPillText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  horizontalPillTextActive: {
    color: COLORS.white,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightBtn: {
    backgroundColor: COLORS.secondary,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  logoutBox: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 40,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  analyticsLauncherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  analyticsIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsLauncherTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  analyticsLauncherDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
});
