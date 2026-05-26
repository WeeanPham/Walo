import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { FirestoreService, Meal, DailyLog, UserProfile } from '@/src/services/firestore.service';
import { format, subDays, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [weightHistory, setWeightHistory] = useState<{ logDate: string, weight_kg: number }[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Real-time multi-data subscriptions
  useEffect(() => {
    setLoading(true);
    
    const unsubProfile = FirestoreService.subscribeProfile((data) => {
      setProfile(data);
    });

    const unsubMeals = FirestoreService.subscribeAllMeals((data) => {
      setMeals(data);
    });

    const unsubLogs = FirestoreService.subscribeAllDailyLogs((data) => {
      setDailyLogs(data);
    });

    const unsubWeight = FirestoreService.subscribeWeightHistory((data) => {
      setWeightHistory(data);
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubMeals();
      unsubLogs();
      unsubWeight();
    };
  }, []);

  const targetCal = profile?.targetCalories || 2000;

  // Process last 7 days data
  const getLast7DaysList = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      dates.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
    }
    return dates;
  };

  const last7Days = getLast7DaysList();

  // Aggregate calorie intake per day
  const calorieChartData = last7Days.map(date => {
    const dayMeals = meals.filter(m => m.logDate === date);
    const dayCal = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const label = format(parseISO(date), 'dd/MM');
    
    return {
      value: dayCal,
      label: label,
      frontColor: dayCal > targetCal ? COLORS.danger : COLORS.primary,
    };
  });

  // Aggregate water intake per day
  const waterChartData = last7Days.map(date => {
    const log = dailyLogs.find(l => l.logDate === date);
    const water = log?.waterMl || 0;
    const label = format(parseISO(date), 'dd/MM');
    
    return {
      value: water,
      label: label,
      frontColor: COLORS.secondary,
    };
  });

  // Weight history graph data
  const getWeightData = () => {
    if (weightHistory.length === 0) {
      // Return placeholder values matching user's default if empty
      const defaultWeight = profile?.weight_kg || 65;
      return last7Days.map((date, idx) => ({
        value: defaultWeight,
        label: format(parseISO(date), 'dd/MM'),
      }));
    }
    
    // Sort and convert history
    return weightHistory.slice(-7).map(w => ({
      value: w.weight_kg,
      label: format(parseISO(w.logDate), 'dd/MM'),
    }));
  };

  const weightChartData = getWeightData();

  // Aggregate macros today for pie chart
  const getMacrosPieData = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayMeals = meals.filter(m => m.logDate === today);
    const protein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const carbs = todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
    const fat = todayMeals.reduce((sum, m) => sum + (m.fat || 0), 0);

    const total = protein + carbs + fat;
    
    if (total === 0) {
      // Default placeholder splits if nothing logged today
      return [
        { value: 30, color: '#EF4444', text: 'Đạm 30%' },
        { value: 40, color: '#F59E0B', text: 'Tinh bột 40%' },
        { value: 30, color: '#3B82F6', text: 'Chất béo 30%' }
      ];
    }

    return [
      { value: Math.round((protein / total) * 100) || 1, color: '#EF4444', text: `Đạm ${Math.round((protein / total) * 100)}%` },
      { value: Math.round((carbs / total) * 100) || 1, color: '#F59E0B', text: `Carb ${Math.round((carbs / total) * 100)}%` },
      { value: Math.round((fat / total) * 100) || 1, color: '#3B82F6', text: `Béo ${Math.round((fat / total) * 100)}%` }
    ];
  };

  const pieData = getMacrosPieData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải biểu đồ phân tích...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phân Tích Sức Khỏe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Calorie analytics chart card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Lượng Calo nạp 7 ngày qua</Text>
          <Text style={styles.chartSubtitle}>Mục tiêu hàng ngày: <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{targetCal} kcal</Text></Text>
          
          <View style={styles.chartContainer}>
            <BarChart
              data={calorieChartData}
              barWidth={24}
              noOfSections={4}
              barBorderRadius={6}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor="rgba(255,255,255,0.08)"
              yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
              width={width - 80}
              height={180}
              isAnimated
            />
          </View>
        </View>

        {/* Macros split pie chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Tỷ lệ dinh dưỡng (Macros) Hôm nay</Text>
          
          <View style={styles.pieContainer}>
            <PieChart
              data={pieData}
              donut
              radius={70}
              innerRadius={50}
              innerCircleColor={COLORS.surface}
            />
            
            <View style={styles.legendContainer}>
              <View style={styles.legendRow}>
                <View style={[styles.legendIndicator, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Đạm (Protein)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendIndicator, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.legendText}>Tinh bột (Carbs)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendIndicator, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendText}>Chất béo (Fat)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Water analytics chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Lượng Nước uống 7 ngày qua</Text>
          <Text style={styles.chartSubtitle}>Mục tiêu: <Text style={{ color: COLORS.secondary, fontWeight: '700' }}>2000 ml</Text></Text>
          
          <View style={styles.chartContainer}>
            <BarChart
              data={waterChartData}
              barWidth={24}
              noOfSections={4}
              barBorderRadius={6}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor="rgba(255,255,255,0.08)"
              yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
              width={width - 80}
              height={160}
              isAnimated
            />
          </View>
        </View>

        {/* Weight history trends chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Tiến trình Cân nặng</Text>
          <Text style={styles.chartSubtitle}>Theo dõi thay đổi cân nặng gần đây nhất</Text>
          
          <View style={styles.chartContainer}>
            <LineChart
              data={weightChartData}
              color={COLORS.primary}
              thickness={3}
              dataPointsColor={COLORS.primary}
              dataPointsRadius={4}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor="rgba(255,255,255,0.08)"
              yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
              width={width - 80}
              height={160}
              isAnimated
            />
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  legendContainer: {
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
});
