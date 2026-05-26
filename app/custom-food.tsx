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
  Platform 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FirestoreService } from '@/src/services/firestore.service';

const CATEGORIES = [
  'Món ăn gia đình',
  'Món nước & Súp',
  'Cơm & Tinh bột',
  'Thịt & Thủy sản',
  'Trứng & Sữa',
  'Rau củ & Trái cây',
  'Đồ uống',
  'Ăn vặt & Ăn nhanh',
  'Khác'
];

export default function CustomFoodScreen() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Món ăn gia đình');
  const [servingSize, setServingSize] = useState('100');
  const [unit, setUnit] = useState('g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');

  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên món ăn.');
      return;
    }
    if (!calories.trim() || isNaN(parseFloat(calories))) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lượng Calories hợp lệ.');
      return;
    }

    setSaving(true);
    try {
      await FirestoreService.addCustomFood({
        name: name.trim(),
        category,
        servingSize: parseFloat(servingSize) || 100,
        unit,
        nutrients: {
          calories: parseFloat(calories) || 0,
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fat) || 0,
          fiber: parseFloat(fiber) || 0,
        }
      });

      Alert.alert('Thành công', `Đã tạo món "${name}" thành công!`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tạo thực phẩm. Vui lòng thử lại.');
    } finally {
      setSaving(false);
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tự Tạo Thực Phẩm</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.helperText}>
            Thêm món ăn tự chế biến hoặc sản phẩm không có sẵn. Thực phẩm này sẽ được đồng bộ ngay lập tức và cả bạn & trợ lý đều dùng được.
          </Text>

          {/* Form */}
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Tên món ăn / Thực phẩm *</Text>
            <TextInput 
              style={styles.textInput} 
              placeholder="Ví dụ: Cá chép om dưa nhà nấu..." 
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Nhóm thực phẩm</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.rowInputs}>
              <View style={styles.colInput}>
                <Text style={styles.inputLabel}>Định lượng chuẩn *</Text>
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
                <Text style={styles.inputLabel}>Đơn vị *</Text>
                <View style={styles.unitContainer}>
                  <TouchableOpacity 
                    style={[styles.unitBtn, unit === 'g' && styles.unitBtnSelected]} 
                    onPress={() => setUnit('g')}
                  >
                    <Text style={[styles.unitBtnText, unit === 'g' && styles.unitBtnTextSelected]}>g</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.unitBtn, unit === 'ml' && styles.unitBtnSelected]} 
                    onPress={() => setUnit('ml')}
                  >
                    <Text style={[styles.unitBtnText, unit === 'ml' && styles.unitBtnTextSelected]}>ml</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Nutrition values */}
          <Text style={styles.sectionHeader}>Giá trị dinh dưỡng (Tính trên khẩu phần chuẩn)</Text>
          
          <View style={styles.card}>
            <View style={styles.singleMacroRow}>
              <View style={[styles.macroIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="flame" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.macroFormLabel}>Calories (kcal) *</Text>
                <TextInput 
                  style={styles.macroInput} 
                  keyboardType="numeric"
                  placeholder="0" 
                  placeholderTextColor={COLORS.textMuted}
                  value={calories}
                  onChangeText={setCalories}
                />
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.singleMacroRow}>
              <View style={[styles.macroIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="restaurant" size={18} color="#EF4444" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.macroFormLabel}>Chất đạm / Protein (g)</Text>
                <TextInput 
                  style={styles.macroInput} 
                  keyboardType="numeric"
                  placeholder="0.0" 
                  placeholderTextColor={COLORS.textMuted}
                  value={protein}
                  onChangeText={setProtein}
                />
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.singleMacroRow}>
              <View style={[styles.macroIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="nutrition" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.macroFormLabel}>Tinh bột / Carbs (g)</Text>
                <TextInput 
                  style={styles.macroInput} 
                  keyboardType="numeric"
                  placeholder="0.0" 
                  placeholderTextColor={COLORS.textMuted}
                  value={carbs}
                  onChangeText={setCarbs}
                />
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.singleMacroRow}>
              <View style={[styles.macroIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="egg" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.macroFormLabel}>Chất béo / Fat (g)</Text>
                <TextInput 
                  style={styles.macroInput} 
                  keyboardType="numeric"
                  placeholder="0.0" 
                  placeholderTextColor={COLORS.textMuted}
                  value={fat}
                  onChangeText={setFat}
                />
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.singleMacroRow}>
              <View style={[styles.macroIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="leaf" size={18} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.macroFormLabel}>Chất xơ / Fiber (g)</Text>
                <TextInput 
                  style={styles.macroInput} 
                  keyboardType="numeric"
                  placeholder="0.0" 
                  placeholderTextColor={COLORS.textMuted}
                  value={fiber}
                  onChangeText={setFiber}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, saving && { opacity: 0.7 }]} 
            onPress={handleSubmit}
            disabled={saving}
          >
            <Text style={styles.submitBtnText}>
              {saving ? 'Đang tạo thực phẩm...' : 'Tạo Thực Phẩm & Đồng Bộ'}
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
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
  helperText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
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
  categoryScroll: {
    marginVertical: 10,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryPillSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  categoryTextSelected: {
    color: COLORS.primary,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colInput: {
    flex: 1,
    marginRight: 8,
  },
  unitContainer: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  unitBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitBtnSelected: {
    backgroundColor: COLORS.primary,
  },
  unitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  unitBtnTextSelected: {
    color: COLORS.white,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
    marginLeft: 4,
  },
  singleMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  macroIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroFormLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  macroInput: {
    height: 36,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 12,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
