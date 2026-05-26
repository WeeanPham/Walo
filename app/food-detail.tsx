import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { FirestoreService, Meal } from '@/src/services/firestore.service';

const { width } = Dimensions.get('window');

const MEAL_TYPES = [
  { key: 'breakfast', name: 'Bữa sáng', icon: 'sunny-outline', color: '#10B981' },
  { key: 'lunch', name: 'Bữa trưa', icon: 'restaurant-outline', color: '#3B82F6' },
  { key: 'dinner', name: 'Bữa tối', icon: 'moon-outline', color: '#8B5CF6' },
  { key: 'snack', name: 'Bữa phụ', icon: 'cafe-outline', color: '#F59E0B' }
];

export default function FoodDetailScreen() {
  const params = useLocalSearchParams<{
    name: string;
    name: string;
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    fiber?: string;
    nutrientsStr?: string;
    servingSize: string;
    unit: string;
    mealType: string;
    date: string;
    isScanned?: string;
    barcode?: string;
  }>();

  // Parse nutrients
  let parsedNutrients: any = {};
  if (params.nutrientsStr) {
    try {
      parsedNutrients = JSON.parse(params.nutrientsStr);
    } catch(e) {}
  }

  // Parse input params (default to 100g serving standard)
  const basePortion = parseFloat(params.servingSize || '100');
  const baseCalories = parseFloat(params.calories || parsedNutrients.calories || '0');
  const baseProtein = parseFloat(params.protein || parsedNutrients.protein || '0');
  const baseCarbs = parseFloat(params.carbs || parsedNutrients.carbs || '0');
  const baseFat = parseFloat(params.fat || parsedNutrients.fat || '0');
  const baseFiber = parseFloat(params.fiber || parsedNutrients.fiber || '0');

  const baseUnit = params.unit || 'g';

  const [portion, setPortion] = useState('100');
  const [selectedMealType, setSelectedMealType] = useState(params.mealType || 'breakfast');
  const [logging, setLogging] = useState(false);
  const [showMicros, setShowMicros] = useState(false);

  const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
  const microKeys = Object.keys(parsedNutrients).filter(k => !MACRO_KEYS.includes(k) && parsedNutrients[k] > 0);
  
  const MICRO_NAMES: Record<string, string> = {
    water: 'Nước (g)', ash: 'Tro (g)', retinol: 'Retinol (mcg)', vitA: 'Vitamin A (mcg)', 
    betaCarotene: 'Beta-carotene (mcg)', vitC: 'Vitamin C (mg)', calcium: 'Canxi (mg)',
    iron: 'Sắt (mg)', sodium: 'Natri (mg)', potassium: 'Kali (mg)', zinc: 'Kẽm (mg)',
    cholesterol: 'Cholesterol (mg)', phosphorus: 'Phospho (mg)', magnesium: 'Magne (mg)',
    copper: 'Đồng (mg)', selenium: 'Selen (mcg)', vitB1: 'Vitamin B1 (mg)', vitB2: 'Vitamin B2 (mg)',
    vitPP: 'Vitamin PP (mg)', vitB5: 'Vitamin B5 (mg)', vitB6: 'Vitamin B6 (mg)', folate: 'Folate (mcg)',
    vitB9: 'Vitamin B9 (mcg)', vitB12: 'Vitamin B12 (mcg)', vitD: 'Vitamin D (mcg)', vitE: 'Vitamin E (mg)',
    vitK: 'Vitamin K (mcg)'
  };

  // Dynamic nutrient calculation based on portion size input
  const factor = (parseFloat(portion) || 0) / basePortion;
  const currentCalories = Math.round(baseCalories * factor);
  const currentProtein = parseFloat((baseProtein * factor).toFixed(1));
  const currentCarbs = parseFloat((baseCarbs * factor).toFixed(1));
  const currentFat = parseFloat((baseFat * factor).toFixed(1));
  const currentFiber = parseFloat((baseFiber * factor).toFixed(1));

  // Percentage distribution of Macros for pie representation/visual
  const totalMacros = currentProtein + currentCarbs + currentFat || 1;
  const proteinPct = Math.round((currentProtein / totalMacros) * 100);
  const carbsPct = Math.round((currentCarbs / totalMacros) * 100);
  const fatPct = Math.round((currentFat / totalMacros) * 100);

  const handleLogMeal = async () => {
    if (!portion || isNaN(parseFloat(portion)) || parseFloat(portion) <= 0) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng điền khối lượng phần ăn hợp lệ.');
      return;
    }

    setLogging(true);
    try {
      const newMeal: Omit<Meal, 'loggedAt'> = {
        logDate: params.date || new Date().toISOString().split('T')[0],
        mealType: selectedMealType as any,
        foodName: params.name || 'Món ăn không tên',
        servingSize_g: parseFloat(portion),
        calories: currentCalories,
        protein: currentProtein,
        carbs: currentCarbs,
        fat: currentFat,
      };

      // Fire and forget, don't wait for offline sync to prevent hanging spinner
      FirestoreService.addMeal(newMeal).catch(console.error);
      
      Alert.alert('Thành công', 'Đã ghi món ăn vào nhật ký dinh dưỡng!', [
        { 
          text: 'OK', 
          onPress: () => {
            // Clear route history back to main dashboard or tabs
            router.dismissAll();
            router.replace('/(tabs)/diary');
          } 
        }
      ]);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể ghi bữa ăn. Vui lòng thử lại.');
    } finally {
      setLogging(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Chi Tiết Thực Phẩm</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Main info card */}
          <View style={styles.foodCard}>
            {params.isScanned === 'true' && (
              <View style={styles.scannedBadge}>
                <Ionicons name="barcode-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.scannedBadgeText}>Đã quét: {params.barcode}</Text>
              </View>
            )}
            
            <Text style={styles.foodName}>{params.name}</Text>
            <Text style={styles.foodCategory}>Khẩu phần chuẩn gốc: {basePortion}{baseUnit}</Text>

            {/* Calorie Large Circle */}
            <View style={styles.calRingContainer}>
              <View style={styles.calRingOuter}>
                <Text style={styles.calRingVal}>{currentCalories}</Text>
                <Text style={styles.calRingLabel}>kcal</Text>
              </View>
            </View>

            {/* Portions customizer input */}
            <View style={styles.portionSection}>
              <Text style={styles.portionLabel}>Khối lượng bạn đã dùng ({baseUnit}):</Text>
              <View style={styles.portionInputContainer}>
                <TextInput 
                  style={styles.portionInput} 
                  keyboardType="numeric"
                  value={portion}
                  onChangeText={setPortion}
                  selectTextOnFocus
                />
                <Text style={styles.portionUnit}>{baseUnit}</Text>
              </View>
            </View>
          </View>

          {/* Macro distribution widgets */}
          <Text style={styles.sectionTitle}>Thông số dinh dưỡng tương ứng</Text>

          <View style={styles.card}>
            {/* Macro Bars */}
            <View style={styles.macroRow}>
              <View style={styles.macroInfo}>
                <View style={styles.macroLabelRow}>
                  <View style={[styles.macroIndicator, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.macroName}>Đạm (Protein)</Text>
                </View>
                <Text style={styles.macroValue}>{currentProtein}g {proteinPct > 0 ? `(${proteinPct}%)` : ''}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(proteinPct || 0, 100)}%`, backgroundColor: '#EF4444' }]} />
              </View>
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroInfo}>
                <View style={styles.macroLabelRow}>
                  <View style={[styles.macroIndicator, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.macroName}>Tinh bột (Carbs)</Text>
                </View>
                <Text style={styles.macroValue}>{currentCarbs}g {carbsPct > 0 ? `(${carbsPct}%)` : ''}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(carbsPct || 0, 100)}%`, backgroundColor: '#F59E0B' }]} />
              </View>
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroInfo}>
                <View style={styles.macroLabelRow}>
                  <View style={[styles.macroIndicator, { backgroundColor: '#3B82F6' }]} />
                  <Text style={styles.macroName}>Chất béo (Fat)</Text>
                </View>
                <Text style={styles.macroValue}>{currentFat}g {fatPct > 0 ? `(${fatPct}%)` : ''}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(fatPct || 0, 100)}%`, backgroundColor: '#3B82F6' }]} />
              </View>
            </View>

            {baseFiber > 0 && (
              <View style={styles.macroRow}>
                <View style={styles.macroInfo}>
                  <View style={styles.macroLabelRow}>
                    <View style={[styles.macroIndicator, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={styles.macroName}>Chất xơ (Fiber)</Text>
                  </View>
                  <Text style={styles.macroValue}>{currentFiber}g</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min((currentFiber / (currentCarbs || 1)) * 100, 100)}%`, backgroundColor: '#8B5CF6' }]} />
                </View>
              </View>
            )}
          </View>

          {/* MICRONUTRIENTS SECTION */}
          {microKeys.length > 0 && (
            <View style={styles.card}>
              <TouchableOpacity style={styles.microHeaderRow} onPress={() => setShowMicros(!showMicros)}>
                <Text style={styles.microHeaderTitle}>Vi chất dinh dưỡng ({microKeys.length})</Text>
                <Ionicons name={showMicros ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
              
              {showMicros && (
                <View style={styles.microList}>
                  {microKeys.map(k => {
                    const microVal = parseFloat((parsedNutrients[k] * factor).toFixed(2));
                    return (
                      <View key={k} style={styles.microRow}>
                        <Text style={styles.microName}>{MICRO_NAMES[k] || k}</Text>
                        <Text style={styles.microValue}>{microVal}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Select Meal Type Box */}
          <Text style={styles.sectionTitle}>Chọn bữa ăn ghi nhận</Text>
          <View style={styles.mealTypesRow}>
            {MEAL_TYPES.map((type) => {
              const isSelected = selectedMealType === type.key;
              return (
                <TouchableOpacity 
                  key={type.key} 
                  style={[
                    styles.mealTypeBtn, 
                    isSelected && { backgroundColor: type.color + '20', borderColor: type.color }
                  ]}
                  onPress={() => setSelectedMealType(type.key)}
                  activeOpacity={0.6}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={20} 
                    color={isSelected ? type.color : COLORS.textMuted} 
                    style={{ marginBottom: 4 }} 
                  />
                  <Text style={[styles.mealTypeText, isSelected && { color: type.color, fontWeight: '700' }]}>
                    {type.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Submit button */}
          <TouchableOpacity 
            style={[styles.submitBtn, logging && { opacity: 0.7 }]} 
            onPress={handleLogMeal}
            disabled={logging}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>
              {logging ? 'Đang lưu bữa ăn...' : 'Ghi Vào Nhật Ký Dinh Dưỡng'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    maxWidth: width * 0.6,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Fixed overlap with bottom tab or screen edge
  },
  foodCard: {
    backgroundColor: 'rgba(31, 25, 59, 0.7)', // Glassmorphism base
    borderRadius: 32, // Modern 2026 UI
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  scannedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  foodName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  foodCategory: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  calRingContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 6,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
  },
  calRingOuter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  calRingVal: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
  },
  calRingLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  portionSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 16,
  },
  portionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 10,
    textAlign: 'center',
  },
  portionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 16,
    width: 140,
    height: 52,
    alignSelf: 'center',
  },
  portionInput: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    width: 80,
    height: '100%',
  },
  portionUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(31, 25, 59, 0.7)', // Glassmorphism base
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  macroRow: {
    marginBottom: 16,
  },
  macroInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  macroName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  macroValue: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  mealTypesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  mealTypeBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  mealTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  microHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  microHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  microList: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
  },
  microRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  microName: {
    fontSize: 13,
    color: COLORS.text,
  },
  microValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
