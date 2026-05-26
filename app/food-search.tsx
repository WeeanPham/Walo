import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { FirestoreService, CustomFood } from '@/src/services/firestore.service';
import VN_Foods from '@/assets/data/VN_Foods.json';

const { width } = Dimensions.get('window');

interface FoodItem {
  id: string;
  name: string;
  category: string;
  servingSize: number;
  unit: string;
  nutrients: Record<string, number>;
  isCustom?: boolean;
}

export default function FoodSearchScreen() {
  const { mealType, date } = useLocalSearchParams<{ mealType: string, date: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'custom'>('all');
  const [loading, setLoading] = useState(false);

  // Subscribe to custom foods
  useEffect(() => {
    setLoading(true);
    const unsub = FirestoreService.subscribeCustomFoods((data) => {
      setCustomFoods(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Format local VN_Foods and custom foods into unified structure
  const formattedVNFoods: FoodItem[] = VN_Foods.map((item: any) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    servingSize: item.servingSize,
    unit: item.unit,
    nutrients: item.nutrients
  }));

  const formattedCustomFoods: FoodItem[] = customFoods.map((item) => ({
    id: item.id || '',
    name: item.name,
    category: item.category,
    servingSize: item.servingSize,
    unit: item.unit,
    nutrients: item.nutrients,
    isCustom: true
  }));

  // Filtering based on tab & query
  const getFilteredFoods = () => {
    let foodsList: FoodItem[] = [];
    if (activeTab === 'all') {
      // Show both local and custom foods
      foodsList = [...formattedCustomFoods, ...formattedVNFoods];
    } else {
      foodsList = formattedCustomFoods;
    }

    if (!searchQuery.trim()) return foodsList;

    const query = searchQuery.toLowerCase().trim();
    return foodsList.filter(food => 
      food.name.toLowerCase().includes(query) || 
      food.category.toLowerCase().includes(query)
    );
  };

  const filteredFoods = getFilteredFoods();

  const handleSelectFood = (food: FoodItem) => {
    router.push({
      pathname: '/food-detail' as any,
      params: {
        name: food.name,
        servingSize: food.servingSize.toString(),
        unit: food.unit,
        nutrientsStr: JSON.stringify(food.nutrients),
        mealType,
        date
      }
    });
  };

  const renderFoodItem = ({ item }: { item: FoodItem }) => (
    <TouchableOpacity style={styles.foodCard} onPress={() => handleSelectFood(item)}>
      <View style={styles.foodInfo}>
        <View style={styles.titleRow}>
          {item.isCustom && (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>Tự Tạo</Text>
            </View>
          )}
          <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
        </View>
        <Text style={styles.foodMeta}>{item.category} • {item.servingSize}{item.unit}</Text>
        
        <View style={styles.macroRow}>
          <Text style={styles.macroText}>Protein: {item.nutrients.protein}g</Text>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.macroText}>Carbs: {item.nutrients.carbs}g</Text>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.macroText}>Béo: {item.nutrients.fat}g</Text>
        </View>
      </View>
      <View style={styles.calorieCol}>
        <Text style={styles.calorieVal}>{item.nutrients.calories}</Text>
        <Text style={styles.calorieUnit}>kcal</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header with Search and Barcode icon */}
      <View style={styles.header}>
        <View style={styles.searchBarRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Tìm món ăn, đồ uống..." 
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Barcode scan quick launcher */}
          <TouchableOpacity 
            style={styles.actionIconBtn} 
            onPress={() => router.push({
              pathname: '/barcode-scanner' as any,
              params: { mealType, date }
            })}
          >
            <Ionicons name="barcode-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>Tất cả ({filteredFoods.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'custom' && styles.tabActive]}
          onPress={() => setActiveTab('custom')}
        >
          <Text style={[styles.tabText, activeTab === 'custom' && styles.tabTextActive]}>Đã tự tạo ({formattedCustomFoods.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Quick navigation to custom-food creator */}
      <View style={styles.shortcutRow}>
        <Text style={styles.shortcutLabel}>Không tìm thấy món ăn của bạn?</Text>
        <TouchableOpacity 
          style={styles.shortcutLink} 
          onPress={() => router.push('/custom-food' as any)}
        >
          <Ionicons name="add" size={16} color={COLORS.primary} style={{ marginRight: 2 }} />
          <Text style={styles.shortcutLinkText}>Tự tạo món</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredFoods}
          keyExtractor={(item) => item.id}
          renderItem={renderFoodItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color={COLORS.textMuted} style={{ marginBottom: 12, opacity: 0.6 }} />
              <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
              <Text style={styles.emptySubtitle}>Hãy thử gõ tên khác hoặc dùng chức năng Tự tạo món ăn để thêm mới vào danh sách nhé.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backIcon: {
    padding: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  actionIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  shortcutLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  shortcutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shortcutLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  foodInfo: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  foodMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  bullet: {
    marginHorizontal: 6,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  calorieCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  calorieVal: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },
  calorieUnit: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
