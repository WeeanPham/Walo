import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { FirestoreService, Meal } from '@/src/services/firestore.service';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { router } from 'expo-router';

export default function DiaryScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Meal Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [foodName, setFoodName] = useState('');
  const [servingSize, setServingSize] = useState('100');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Subscribe to real-time meals list
  useEffect(() => {
    setLoading(true);
    const unsub = FirestoreService.subscribeMeals(selectedDate, (data) => {
      setMeals(data);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedDate]);

  const handleDeleteMeal = (mealId: string) => {
    Alert.alert(
      'Xóa món ăn',
      'Bạn có chắc chắn muốn xóa món ăn này khỏi nhật ký?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            await FirestoreService.deleteMeal(mealId);
          }
        }
      ]
    );
  };

  const handleAddMealSubmit = async () => {
    if (!foodName || !calories) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền tên món ăn và số lượng Calo.');
      return;
    }

    const newMeal: Omit<Meal, 'loggedAt'> = {
      logDate: selectedDate,
      mealType,
      foodName,
      servingSize_g: parseFloat(servingSize) || 100,
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
    };

    await FirestoreService.addMeal(newMeal);

    // Reset Form & Close Modal
    setFoodName('');
    setServingSize('100');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setModalVisible(false);
  };

  const renderMealSection = (type: 'breakfast' | 'lunch' | 'dinner' | 'snack', title: string, icon: string) => {
    const filteredMeals = meals.filter((meal) => meal.mealType === type);
    const sectionCalories = filteredMeals.reduce((sum, meal) => sum + meal.calories, 0);

    return (
      <View style={styles.mealSectionCard}>
        <View style={styles.mealSectionHeader}>
          <View style={styles.mealSectionTitleCol}>
            <Ionicons name={icon as any} size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.mealSectionTitle}>{title}</Text>
          </View>
          <View style={styles.mealSectionCaloriesCol}>
            <Text style={styles.mealSectionCalories}>{sectionCalories} kcal</Text>
            <TouchableOpacity 
              style={styles.addFoodIcon} 
              onPress={() => {
                router.push({
                  pathname: '/food-search' as any,
                  params: { mealType: type, date: selectedDate }
                });
              }}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {filteredMeals.length === 0 ? (
          <Text style={styles.noFoodText}>Chưa ghi món ăn nào.</Text>
        ) : (
          filteredMeals.map((meal) => (
            <View key={meal.id} style={styles.foodItem}>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{meal.foodName}</Text>
                <Text style={styles.foodQty}>{meal.servingSize_g}g • {meal.calories} kcal</Text>
                <View style={styles.macroRow}>
                  <Text style={[styles.macroPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }]}>Đạm: {meal.protein}g</Text>
                  <Text style={[styles.macroPill, { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }]}>Carb: {meal.carbs}g</Text>
                  <Text style={[styles.macroPill, { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }]}>Béo: {meal.fat}g</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDeleteMeal(meal.id!)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  };

  const totalCal = meals.reduce((sum, meal) => sum + meal.calories, 0);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Date Selector Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            setSelectedDate(format(yesterday, 'yyyy-MM-dd'));
          }}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.dateHeaderTitle}>
          {selectedDate === format(new Date(), 'yyyy-MM-dd') 
            ? 'Hôm nay' 
            : format(new Date(selectedDate), 'dd MMMM, yyyy', { locale: vi })}
        </Text>
        <TouchableOpacity 
          onPress={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setSelectedDate(format(tomorrow, 'yyyy-MM-dd'));
          }}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-forward" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRibbon}>
        <Text style={styles.summaryText}>Tổng calo đã nạp:</Text>
        <Text style={styles.summaryCal}>{totalCal} kcal</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderMealSection('breakfast', 'Bữa sáng', 'sunny-outline')}
          {renderMealSection('lunch', 'Bữa trưa', 'restaurant-outline')}
          {renderMealSection('dinner', 'Bữa tối', 'moon-outline')}
          {renderMealSection('snack', 'Bữa phụ', 'cafe-outline')}
        </ScrollView>
      )}

      {/* Slide up Add Meal Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Ghi {mealType === 'breakfast' ? 'Bữa sáng' : mealType === 'lunch' ? 'Bữa trưa' : mealType === 'dinner' ? 'Bữa tối' : 'Bữa phụ'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.inputLabel}>Tên món ăn *</Text>
              <TextInput 
                style={styles.textInput} 
                placeholder="Ví dụ: Phở bò, Cơm tấm, Vinamilk..." 
                placeholderTextColor={COLORS.textMuted}
                value={foodName}
                onChangeText={setFoodName}
              />

              <View style={styles.rowInputs}>
                <View style={styles.colInput}>
                  <Text style={styles.inputLabel}>Khối lượng (g) *</Text>
                  <TextInput 
                    style={styles.textInput} 
                    keyboardType="numeric"
                    placeholder="100" 
                    placeholderTextColor={COLORS.textMuted}
                    value={servingSize}
                    onChangeText={setServingSize}
                  />
                </View>
                <View style={styles.colInput}>
                  <Text style={styles.inputLabel}>Calories (kcal) *</Text>
                  <TextInput 
                    style={styles.textInput} 
                    keyboardType="numeric"
                    placeholder="350" 
                    placeholderTextColor={COLORS.textMuted}
                    value={calories}
                    onChangeText={setCalories}
                  />
                </View>
              </View>

              <Text style={styles.sectionHeader}>Dinh dưỡng phụ (Macros - Không bắt buộc)</Text>

              <View style={styles.rowInputs}>
                <View style={styles.colInput}>
                  <Text style={styles.inputLabel}>Đạm (g)</Text>
                  <TextInput 
                    style={styles.textInput} 
                    keyboardType="numeric"
                    placeholder="15" 
                    placeholderTextColor={COLORS.textMuted}
                    value={protein}
                    onChangeText={setProtein}
                  />
                </View>
                <View style={styles.colInput}>
                  <Text style={styles.inputLabel}>Carbs (g)</Text>
                  <TextInput 
                    style={styles.textInput} 
                    keyboardType="numeric"
                    placeholder="40" 
                    placeholderTextColor={COLORS.textMuted}
                    value={carbs}
                    onChangeText={setCarbs}
                  />
                </View>
                <View style={styles.colInput}>
                  <Text style={styles.inputLabel}>Béo (g)</Text>
                  <TextInput 
                    style={styles.textInput} 
                    keyboardType="numeric"
                    placeholder="8" 
                    placeholderTextColor={COLORS.textMuted}
                    value={fat}
                    onChangeText={setFat}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddMealSubmit}>
                <Text style={styles.submitBtnText}>Ghi món ăn</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  navBtn: {
    padding: 8,
  },
  dateHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  summaryRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.15)',
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  summaryCal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mealSectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  mealSectionTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  mealSectionCaloriesCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealSectionCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginRight: 8,
  },
  addFoodIcon: {
    padding: 2,
  },
  noFoodText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  foodQty: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  macroRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  macroPill: {
    fontSize: 10,
    fontWeight: '600',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    overflow: 'hidden',
  },
  deleteBtn: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '85%',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 15,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colInput: {
    flex: 1,
    marginRight: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
