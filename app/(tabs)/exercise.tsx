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
import { FirestoreService, Exercise, UserProfile } from '@/src/services/firestore.service';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ExercisePreset {
  name: string;
  met: number;
  icon: string;
}

const PRESET_EXERCISES: ExercisePreset[] = [
  { name: 'Đi bộ chậm (4 km/h)', met: 3.0, icon: 'walk-outline' },
  { name: 'Đi bộ nhanh (6 km/h)', met: 4.5, icon: 'walk-outline' },
  { name: 'Chạy bộ (8 km/h)', met: 8.0, icon: 'bicycle-outline' }, // Custom icon mappings
  { name: 'Gym / Tập tạ', met: 6.0, icon: 'barbell-outline' },
  { name: 'Đạp xe (20 km/h)', met: 7.5, icon: 'bicycle-outline' },
  { name: 'Bơi lội nhẹ', met: 6.0, icon: 'water-outline' },
  { name: 'Yoga', met: 3.0, icon: 'body-outline' },
  { name: 'Nhảy dây', met: 12.0, icon: 'stats-chart-outline' },
];

export default function ExerciseScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Exercise Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ExercisePreset | null>(null);
  const [customName, setCustomName] = useState('');
  const [duration, setDuration] = useState('30');
  const [customCalories, setCustomCalories] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Subscribe to profile & exercises list
  useEffect(() => {
    setLoading(true);
    
    // Subscribe to profile for weight metric
    const unsubProfile = FirestoreService.subscribeProfile((data) => {
      setProfile(data);
    });

    // Subscribe to exercise logs
    const unsubEx = FirestoreService.subscribeExercises(selectedDate, (data) => {
      setExercises(data);
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubEx();
    };
  }, [selectedDate]);

  const userWeight = profile?.weight_kg || 65; // Default to 65 kg if not set

  const handleDeleteExercise = (exId: string) => {
    Alert.alert(
      'Xóa vận động',
      'Bạn có chắc chắn muốn xóa bài tập này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            await FirestoreService.deleteExercise(exId);
          }
        }
      ]
    );
  };

  const handleAddExerciseSubmit = async () => {
    let exName = '';
    let calBurned = 0;
    const durMin = parseFloat(duration) || 0;

    if (durMin <= 0) {
      Alert.alert('Lỗi', 'Thời gian tập luyện phải lớn hơn 0.');
      return;
    }

    if (isCustomMode) {
      if (!customName || !customCalories) {
        Alert.alert('Thiếu thông tin', 'Vui lòng điền tên bài tập và số Calo tiêu thụ.');
        return;
      }
      exName = customName;
      calBurned = parseFloat(customCalories) || 0;
    } else {
      if (!selectedPreset) {
        Alert.alert('Chưa chọn bài tập', 'Vui lòng chọn bài tập từ danh sách hoặc chọn chế độ tự nhập.');
        return;
      }
      exName = selectedPreset.name;
      // Formula: Calories = MET * weight_kg * duration_hours
      calBurned = Math.round(selectedPreset.met * userWeight * (durMin / 60));
    }

    const newEx: Omit<Exercise, 'loggedAt'> = {
      logDate: selectedDate,
      exerciseType: exName,
      duration_min: durMin,
      caloriesBurned: calBurned,
    };

    await FirestoreService.addExercise(newEx);

    // Reset fields & close
    setCustomName('');
    setCustomCalories('');
    setDuration('30');
    setSelectedPreset(null);
    setModalVisible(false);
  };

  const totalBurned = exercises.reduce((sum, ex) => sum + ex.caloriesBurned, 0);

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
        <Text style={styles.summaryText}>Calories đã tiêu hao:</Text>
        <Text style={styles.summaryCal}>{totalBurned} kcal</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Preset Buttons Header */}
          <View style={styles.presetCard}>
            <Text style={styles.presetTitle}>Ghi nhanh vận động</Text>
            <Text style={styles.presetDesc}>
              Tính toán Calo dựa trên chỉ số MET của bài tập và cân nặng hiện tại ({userWeight} kg).
            </Text>
            
            <View style={styles.presetGrid}>
              {PRESET_EXERCISES.map((preset, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.presetBtn}
                  onPress={() => {
                    setSelectedPreset(preset);
                    setIsCustomMode(false);
                    setModalVisible(true);
                  }}
                >
                  <Ionicons name={preset.icon as any} size={22} color={COLORS.primary} />
                  <Text style={styles.presetBtnLabel} numberOfLines={1}>{preset.name.split(' (')[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.customModeBtn} 
              onPress={() => {
                setIsCustomMode(true);
                setSelectedPreset(null);
                setModalVisible(true);
              }}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} />
              <Text style={styles.customModeBtnText}>Tự nhập bài tập khác</Text>
            </TouchableOpacity>
          </View>

          {/* Today's Exercise logs list */}
          <View style={styles.logsCard}>
            <Text style={styles.presetTitle}>Nhật ký vận động hôm nay</Text>
            
            {exercises.length === 0 ? (
              <Text style={styles.noExerciseText}>Chưa có hoạt động luyện tập nào.</Text>
            ) : (
              exercises.map((ex) => (
                <View key={ex.id} style={styles.exItem}>
                  <View style={styles.exIconContainer}>
                    <Ionicons name="flame" size={20} color={COLORS.warning} />
                  </View>
                  <View style={styles.exInfo}>
                    <Text style={styles.exName}>{ex.exerciseType}</Text>
                    <Text style={styles.exDuration}>{ex.duration_min} phút • <Text style={{ color: COLORS.warning, fontWeight: '600' }}>{ex.caloriesBurned} kcal</Text></Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteExercise(ex.id!)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Add Exercise Modal */}
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
                {isCustomMode ? 'Tự nhập bài tập' : `Bài tập: ${selectedPreset?.name}`}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              {isCustomMode ? (
                <>
                  <Text style={styles.inputLabel}>Tên bài tập *</Text>
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="Ví dụ: Chạy bộ địa hình, Cử tạ nặng, HIIT..." 
                    placeholderTextColor={COLORS.textMuted}
                    value={customName}
                    onChangeText={setCustomName}
                  />

                  <View style={styles.rowInputs}>
                    <View style={styles.colInput}>
                      <Text style={styles.inputLabel}>Thời gian (phút) *</Text>
                      <TextInput 
                        style={styles.textInput} 
                        keyboardType="numeric"
                        placeholder="30" 
                        placeholderTextColor={COLORS.textMuted}
                        value={duration}
                        onChangeText={setDuration}
                      />
                    </View>
                    <View style={styles.colInput}>
                      <Text style={styles.inputLabel}>Calories tiêu hao (kcal) *</Text>
                      <TextInput 
                        style={styles.textInput} 
                        keyboardType="numeric"
                        placeholder="250" 
                        placeholderTextColor={COLORS.textMuted}
                        value={customCalories}
                        onChangeText={setCustomCalories}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.metFormulaBox}>
                    <Text style={styles.metFormulaText}>
                      Hệ số tiêu hao (MET): <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{selectedPreset?.met}</Text>
                    </Text>
                    <Text style={styles.metFormulaDesc}>
                      Dựa vào cân nặng của bạn ({userWeight} kg), bài tập này sẽ tiêu hao khoảng{' '}
                      <Text style={{ color: COLORS.warning, fontWeight: '700' }}>
                        {Math.round((selectedPreset?.met || 0) * userWeight * (parseFloat(duration) / 60 || 0))} kcal
                      </Text>{' '}
                      cho {duration || 0} phút tập luyện.
                    </Text>
                  </View>

                  <Text style={styles.inputLabel}>Thời gian luyện tập (phút) *</Text>
                  <TextInput 
                    style={styles.textInput} 
                    keyboardType="numeric"
                    placeholder="30" 
                    placeholderTextColor={COLORS.textMuted}
                    value={duration}
                    onChangeText={setDuration}
                  />
                </>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddExerciseSubmit}>
                <Text style={styles.submitBtnText}>Ghi nhận bài tập</Text>
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
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.15)',
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  summaryCal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.warning,
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
  presetCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  presetDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  presetBtn: {
    width: '48%',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  presetBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
  },
  customModeBtn: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  customModeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  logsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  noExerciseText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  exItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  exIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exInfo: {
    flex: 1,
  },
  exName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  exDuration: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
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
  metFormulaBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  metFormulaText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  metFormulaDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
