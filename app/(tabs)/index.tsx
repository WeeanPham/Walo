import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/src/stores/auth.store';
import { COLORS } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FirestoreService, Meal, Exercise, UserProfile, DailyLog } from '@/src/services/firestore.service';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { userRole, logout } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const insets = useSafeAreaInsets();

  // Real-time State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Default Targets if profile not set
  const defaultProfile: UserProfile = {
    height_cm: 170,
    weight_kg: 65,
    age: 25,
    gender: 'male',
    activityLevel: '1.375',
    goal: 'maintain',
    targetCalories: 1917, // Matches the Figma target calorie 1917
    targetProtein: 96,    // Matches Figma Protein target 96g
    targetCarbs: 240,    // Matches Figma Carbs target 240g
    targetFat: 64,       // Matches Figma Fat target 64g
    updatedAt: null
  };

  const activeProfile = profile || defaultProfile;

  // Real-time listener subscriptions
  useEffect(() => {
    setLoading(true);
    
    // 1. Subscribe to profile changes
    const unsubProfile = FirestoreService.subscribeProfile((data) => {
      setProfile(data);
    });

    // 2. Subscribe to daily log changes
    const unsubDailyLog = FirestoreService.subscribeDailyLog(selectedDate, (data) => {
      setDailyLog(data);
    });

    // 3. Subscribe to meals list
    const unsubMeals = FirestoreService.subscribeMeals(selectedDate, (data) => {
      setMeals(data);
    });

    // 4. Subscribe to exercises list
    const unsubExercises = FirestoreService.subscribeExercises(selectedDate, (data) => {
      setExercises(data);
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubDailyLog();
      unsubMeals();
      unsubExercises();
    };
  }, [selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Calculations
  const totalCaloriesIntake = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
  const totalProteinIntake = meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
  const totalCarbsIntake = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
  const totalFatIntake = meals.reduce((sum, meal) => sum + (meal.fat || 0), 0);

  const totalCaloriesBurned = exercises.reduce((sum, ex) => sum + (ex.caloriesBurned || 0), 0);

  const targetCalories = activeProfile.targetCalories || defaultProfile.targetCalories!;
  const remainingCalories = targetCalories - totalCaloriesIntake + totalCaloriesBurned;
  
  // Progress ratios
  const calorieProgress = Math.min(Math.max(totalCaloriesIntake / targetCalories, 0), 1);
  const proteinProgress = Math.min(Math.max(totalProteinIntake / (activeProfile.targetProtein || 96), 0), 1);
  const carbsProgress = Math.min(Math.max(totalCarbsIntake / (activeProfile.targetCarbs || 240), 0), 1);
  const fatProgress = Math.min(Math.max(totalFatIntake / (activeProfile.targetFat || 64), 0), 1);

  const waterMl = dailyLog?.waterMl || 0;
  const targetWater = 2000;
  const waterProgress = Math.min(Math.max(waterMl / targetWater, 0), 1);

  const stepsCount = dailyLog?.steps || 1304; // fallback to 1304 (matches Figma design)
  const targetSteps = 5000;
  const stepsProgress = Math.min(Math.max(stepsCount / targetSteps, 0), 1);

  const handleAddWater = async (amount: number) => {
    await FirestoreService.updateWater(selectedDate, amount);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  // Generate 7 days of the week containing selectedDate
  const currentWeekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }); // Monday is 1
  const weekDays = Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(currentWeekStart, index);
    return {
      date,
      dateStr: format(date, 'yyyy-MM-dd'),
      label: index === 6 ? 'CN' : `T${index + 2}`, // T2, T3... CN
      dayNum: format(date, 'dd'),
    };
  });

  // Reusable mini progress circle for Macros
  const MacroCircle = ({ 
    progress, 
    color, 
    value, 
    target, 
    label 
  }: { 
    progress: number; 
    color: string; 
    value: number; 
    target: number; 
    label: string; 
  }) => {
    const size = 66;
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress * circumference);

    return (
      <View style={styles.macroCircleItem}>
        <View style={styles.macroCircleWrapper}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#2B2548"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View style={styles.macroIconCenter}>
            <Ionicons name="pulse" size={20} color={color} />
          </View>
        </View>
        <Text style={styles.macroCircleValue}>
          {value}<Text style={{ color: '#8B7CCC', fontSize: 10 }}>/{target}g</Text>
        </Text>
        <Text style={styles.macroCircleLabel}>{label}</Text>
      </View>
    );
  };

  // Large Calorie Ring Config
  const ringSize = 210;
  const ringStroke = 18;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = ringRadius * 2 * Math.PI;
  const ringDashoffset = ringCircumference - (calorieProgress * ringCircumference);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header/Calendar container in dark purple background #1F193B */}
        <View style={styles.headerBlock}>
          {/* Status Line */}
          <View style={styles.statusLine}>
            <View style={styles.headerRightControls}>
              <Text style={styles.roleLabel}>{userRole || 'Thành viên'} 👋</Text>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <Ionicons name="log-out-outline" size={16} color="#ABA1DA" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Selector Row */}
          <View style={styles.dateBannerRow}>
            <TouchableOpacity onPress={handlePrevDay} style={styles.arrowDayBtn}>
              <Ionicons name="chevron-back" size={16} color="#ABA1DA" />
            </TouchableOpacity>
            
            <Text style={styles.dateBannerText}>
              {selectedDate === format(new Date(), 'yyyy-MM-dd')
                ? `HÔM NAY, ${format(new Date(selectedDate), "dd 'THG' MM, yyyy", { locale: vi })}`
                : format(new Date(selectedDate), "'NGÀY' dd 'THG' MM, yyyy", { locale: vi })}
            </Text>

            <TouchableOpacity onPress={handleNextDay} style={styles.arrowDayBtn}>
              <Ionicons name="chevron-forward" size={16} color="#ABA1DA" />
            </TouchableOpacity>
          </View>

          {/* Weekday Selector List */}
          <View style={styles.weekdayList}>
            {weekDays.map((day, idx) => {
              const isTodayActive = day.dateStr === selectedDate;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.weekdayCircle,
                    isTodayActive && styles.weekdayCircleActive
                  ]}
                  onPress={() => setSelectedDate(day.dateStr)}
                >
                  <Text style={[
                    styles.weekdayText,
                    isTodayActive && styles.weekdayTextActive
                  ]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Premium Calorie Svg Ring */}
          <View style={styles.calorieRingContainer}>
            <View style={styles.ringOuter}>
              <Svg width={ringSize} height={ringSize}>
                {/* Background Ring */}
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  stroke="#2B2548"
                  strokeWidth={ringStroke}
                  fill="transparent"
                />
                {/* Progress Ring */}
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  stroke={COLORS.primary}
                  strokeWidth={ringStroke}
                  fill="transparent"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                />
              </Svg>
              <View style={styles.ringCenterTextContent}>
                <Text style={styles.ringCenterValue}>
                  {remainingCalories >= 0 ? remainingCalories : Math.abs(remainingCalories)}
                </Text>
                <Text style={styles.ringCenterLabel}>
                  {remainingCalories >= 0 ? 'Kcal còn lại' : 'Kcal vượt mức'}
                </Text>
              </View>
            </View>
          </View>

          {/* Under-ring stats row */}
          <View style={styles.calorieDetailsRow}>
            <View style={styles.calorieStatCol}>
              <Text style={styles.calorieStatValue}>{targetCalories}</Text>
              <Text style={styles.calorieStatLabel}>Mục tiêu</Text>
            </View>
            <View style={styles.calorieStatDivider} />
            <View style={styles.calorieStatCol}>
              <Text style={styles.calorieStatValue}>{totalCaloriesIntake}</Text>
              <Text style={styles.calorieStatLabel}>Đã nạp</Text>
            </View>
            <View style={styles.calorieStatDivider} />
            <View style={styles.calorieStatCol}>
              <Text style={styles.calorieStatValue}>{totalCaloriesBurned}</Text>
              <Text style={styles.calorieStatLabel}>Tập luyện</Text>
            </View>
          </View>
        </View>

        {/* Macros card: #1F193B surface */}
        <View style={styles.macrosCard}>
          <MacroCircle 
            progress={proteinProgress} 
            color="#EE4242" 
            value={totalProteinIntake} 
            target={activeProfile.targetProtein || 96} 
            label="Chất đạm" 
          />
          <MacroCircle 
            progress={carbsProgress} 
            color="#4A98FF" 
            value={totalCarbsIntake} 
            target={activeProfile.targetCarbs || 240} 
            label="Tinh bột" 
          />
          <MacroCircle 
            progress={fatProgress} 
            color="#F3C83A" 
            value={totalFatIntake} 
            target={activeProfile.targetFat || 64} 
            label="Chất béo" 
          />
        </View>

        {/* Recent logs section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Nhật ký gần đây</Text>
          <TouchableOpacity 
            style={styles.sectionActionBtn}
            onPress={() => router.push({
              pathname: '/food-search' as any,
              params: { mealType: 'breakfast', date: selectedDate }
            })}
          >
            <Text style={styles.sectionActionText}>Thêm bữa ăn</Text>
            <Ionicons name="add" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.recentLogsCard}>
          {meals.length === 0 ? (
            <View style={styles.emptyLogsWrapper}>
              <Ionicons name="restaurant-outline" size={28} color="#ABA1DA" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyLogsText}>Chưa có thực phẩm nào được ghi nhận hôm nay.</Text>
            </View>
          ) : (
            meals.slice(0, 3).map((meal, idx) => (
              <View key={idx} style={[styles.mealLogItem, { borderLeftColor: idx % 2 === 0 ? COLORS.primary : COLORS.success }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealLogName} numberOfLines={1}>{meal.foodName}</Text>
                  <Text style={styles.mealLogSub}>
                    {meal.servingSize_g}g • Đạm {meal.protein || 0}g | Carb {meal.carbs || 0}g | Béo {meal.fat || 0}g
                  </Text>
                </View>
                <Text style={styles.mealLogCal}>{meal.calories} kcal</Text>
              </View>
            ))
          )}

          {/* Quick link to Analytics screen */}
          <TouchableOpacity 
            style={styles.analyticsQuickLink} 
            onPress={() => router.push('/analytics' as any)}
          >
            <Ionicons name="stats-chart" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.analyticsQuickLinkText}>Xem phân tích & biểu đồ xu hướng</Text>
            <Ionicons name="chevron-forward" size={14} color="#ABA1DA" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* Training activities section */}
        <Text style={styles.sectionTitle}>Hoạt động tập luyện</Text>
        <View style={styles.exercisesGridCard}>
          <View style={styles.exerciseGridRow}>
            <TouchableOpacity 
              style={styles.exerciseItemBtn}
              onPress={() => router.push('/exercise')}
            >
              <View style={styles.exerciseIconOuter}>
                <Ionicons name="walk" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.exerciseItemLabel}>Chạy bộ</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.exerciseItemBtn}
              onPress={() => router.push('/exercise')}
            >
              <View style={styles.exerciseIconOuter}>
                <Ionicons name="tennisball" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.exerciseItemLabel}>Pickleball</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.exerciseItemBtn}
              onPress={() => router.push('/exercise')}
            >
              <View style={styles.exerciseIconOuter}>
                <Ionicons name="barbell" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.exerciseItemLabel}>Tập gym</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.exerciseGridRow}>
            <TouchableOpacity 
              style={styles.exerciseItemBtn}
              onPress={() => router.push('/exercise')}
            >
              <View style={styles.exerciseIconOuter}>
                <Ionicons name="bicycle" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.exerciseItemLabel}>Đạp xe</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.exerciseItemBtn}
              onPress={() => router.push('/exercise')}
            >
              <View style={styles.exerciseIconOuter}>
                <Ionicons name="water" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.exerciseItemLabel}>Bơi lội</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.exerciseItemBtn}
              onPress={() => router.push('/exercise')}
            >
              <View style={styles.exerciseIconOuter}>
                <Ionicons name="options" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.exerciseItemLabel}>Khác</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic bottom cards row */}
        <View style={styles.bottomRow}>
          {/* Steps Card */}
          <View style={styles.bottomHalfCard}>
            <Text style={styles.bottomCardTitle}>Bước chân</Text>
            <Text style={styles.stepsCountText}>
              {stepsCount.toLocaleString('vi-VN')}
              <Text style={{ fontSize: 11, color: '#ABA1DA', fontWeight: '500' }}>/{targetSteps} bước</Text>
            </Text>
            
            {/* Steps Progress Slider */}
            <View style={styles.stepsBarTrack}>
              <View style={[styles.stepsBarFill, { width: `${stepsProgress * 100}%` }]} />
            </View>
          </View>

          {/* Active Calories Workout Card */}
          <View style={styles.bottomHalfCard}>
            <View style={styles.workoutCardHeader}>
              <Text style={styles.bottomCardTitle}>Tập luyện</Text>
              <Ionicons name="flame" size={16} color="#FF4681" />
            </View>
            <Text style={styles.workoutCalValue}>{totalCaloriesBurned} kcal</Text>
            <Text style={styles.workoutSubtitle}>
              {exercises.length === 0 ? 'Chưa tập luyện' : `${exercises.length} bài tập hôm nay`}
            </Text>
          </View>
        </View>

        {/* Water widget: full width */}
        <View style={styles.waterFullWidthCard}>
          <View style={styles.waterHeaderRow}>
            <View>
              <Text style={styles.bottomCardTitle}>Uống nước</Text>
              <Text style={styles.waterValueText}>{waterMl} ml</Text>
            </View>
            <View style={styles.waterQuickControls}>
              <TouchableOpacity onPress={() => handleAddWater(250)} style={styles.waterActionBtn}>
                <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 2 }} />
                <Text style={styles.waterActionText}>250ml</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAddWater(-250)} style={[styles.waterActionBtn, { backgroundColor: 'rgba(238, 66, 66, 0.15)' }]}>
                <Ionicons name="remove" size={16} color="#EE4242" style={{ marginRight: 2 }} />
                <Text style={[styles.waterActionText, { color: '#EE4242' }]}>Bớt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Chat Bubble */}
      <TouchableOpacity 
        style={styles.floatingChatBtn}
        activeOpacity={0.8}
        onPress={() => router.push('/chat')}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0B1A', // Base Background
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerBlock: {
    backgroundColor: 'rgba(31, 25, 59, 0.85)', // Glassmorphism-ish top
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 25,
    paddingTop: 10, // Reduced top padding to move it up
    paddingBottom: 40, // Increased bottom padding to prevent overlap
  },
  statusLine: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Push everything to the right since clock is removed
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ABA1DA',
    marginRight: 10,
  },
  logoutBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dateBannerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  arrowDayBtn: {
    padding: 6,
  },
  dateBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },
  weekdayList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  weekdayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayCircleActive: {
    backgroundColor: '#3A1024',
    borderWidth: 2,
    borderColor: '#FF4681',
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.6,
  },
  weekdayTextActive: {
    color: '#FFFFFF',
    opacity: 1,
  },
  calorieRingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  ringOuter: {
    width: 210,
    height: 210,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ringCenterTextContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenterValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  ringCenterLabel: {
    fontSize: 11,
    color: '#ABA1DA',
    fontWeight: '600',
    marginTop: 2,
  },
  calorieDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40, // Increased bottom margin to prevent macrosCard overlap
    paddingHorizontal: 10,
  },
  calorieStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  calorieStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calorieStatLabel: {
    fontSize: 12,
    color: '#ABA1DA',
    fontWeight: '600',
    marginTop: 4,
  },
  calorieStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#2B2548',
  },
  macrosCard: {
    backgroundColor: 'rgba(31, 25, 59, 0.7)', // Glassmorphism
    borderRadius: 32,
    marginHorizontal: 20,
    marginTop: -32, // Adjusted to overlap header safely
    paddingVertical: 24,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  macroCircleItem: {
    alignItems: 'center',
    width: (width - 60) / 3,
  },
  macroCircleWrapper: {
    width: 66,
    height: 66,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  macroIconCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroCircleValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
  },
  macroCircleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 25,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 25,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 70, 129, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 70, 129, 0.2)',
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF4681',
    marginRight: 4,
  },
  recentLogsCard: {
    backgroundColor: 'rgba(31, 25, 59, 0.7)',
    borderRadius: 32,
    marginHorizontal: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyLogsWrapper: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLogsText: {
    fontSize: 13,
    color: '#ABA1DA',
    textAlign: 'center',
  },
  mealLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 6,
  },
  mealLogName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mealLogSub: {
    fontSize: 11,
    color: '#ABA1DA',
    marginTop: 2,
  },
  mealLogCal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  analyticsQuickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  analyticsQuickLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF4681',
  },
  exercisesGridCard: {
    backgroundColor: 'rgba(31, 25, 59, 0.7)',
    borderRadius: 32,
    marginHorizontal: 20,
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  exerciseGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  exerciseItemBtn: {
    alignItems: 'center',
    width: (width - 64) / 3,
  },
  exerciseIconOuter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0E0B1A',
    borderWidth: 1.5,
    borderColor: '#2B2548',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 16,
  },
  bottomHalfCard: {
    backgroundColor: 'rgba(31, 25, 59, 0.7)',
    borderRadius: 32,
    width: (width - 50) / 2,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  bottomCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepsCountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 10,
  },
  stepsBarTrack: {
    height: 10,
    backgroundColor: '#0E0B1A',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 4,
  },
  stepsBarFill: {
    height: '100%',
    backgroundColor: '#FF4681',
    borderRadius: 5,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutCalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  workoutSubtitle: {
    fontSize: 11,
    color: '#ABA1DA',
    fontWeight: '600',
  },
  waterFullWidthCard: {
    backgroundColor: 'rgba(31, 25, 59, 0.7)',
    borderRadius: 32,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  waterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterValueText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  waterQuickControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 70, 129, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 70, 129, 0.25)',
  },
  waterActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  floatingChatBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF4681',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4681',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#0E0B1A',
  },
});
