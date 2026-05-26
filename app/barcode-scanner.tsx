import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Dimensions
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function BarcodeScannerScreen() {
  const { mealType, date } = useLocalSearchParams<{ mealType: string, date: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    console.log(`Đã quét mã vạch: Loại = ${type}, Dữ liệu = ${data}`);

    try {
      // Query OpenFoodFacts API
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}.json`, {
        headers: {
          'User-Agent': 'WaloApp - iOS - Version 1.0.0'
        }
      });

      const json = await response.json();

      if (json.status === 1 && json.product) {
        const product = json.product;
        const brand = product.brands ? ` (${product.brands})` : '';
        const foodName = (product.product_name_vi || product.product_name || 'Sản phẩm quét mã vạch') + brand;
        
        const nutrients = product.nutriments || {};
        
        // OpenFoodFacts provides nutrients per 100g
        const calories = parseFloat(nutrients['energy-kcal_100g'] || nutrients['energy-kcal'] || 0);
        const protein = parseFloat(nutrients['proteins_100g'] || nutrients['proteins'] || 0);
        const carbs = parseFloat(nutrients['carbohydrates_100g'] || nutrients['carbohydrates'] || 0);
        const fat = parseFloat(nutrients['fat_100g'] || nutrients['fat'] || 0);
        const fiber = parseFloat(nutrients['fiber_100g'] || nutrients['fiber'] || 0);

        // Success! Redirect to detail screen to confirm portion
        router.replace({
          pathname: '/food-detail' as any,
          params: {
            name: foodName,
            calories: calories.toString(),
            protein: protein.toString(),
            carbs: carbs.toString(),
            fat: fat.toString(),
            fiber: fiber.toString(),
            servingSize: '100',
            unit: 'g',
            mealType,
            date,
            isScanned: 'true',
            barcode: data
          }
        });
      } else {
        // Product not found in OpenFoodFacts
        Alert.alert(
          'Không tìm thấy',
          `Không tìm thấy thông tin cho mã vạch: ${data}.\nBạn có muốn tự tạo thực phẩm mới cho mã vạch này không?`,
          [
            { 
              text: 'Quét lại', 
              onPress: () => {
                setScanned(false);
                setLoading(false);
              }
            },
            {
              text: 'Tự tạo món',
              onPress: () => {
                router.replace({
                  pathname: '/custom-food' as any,
                  params: { name: `Sản phẩm ${data}` }
                });
              }
            }
          ]
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Lỗi kết nối',
        'Không thể tra cứu thông tin trực tuyến. Vui lòng kiểm tra mạng hoặc quét lại.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setScanned(false);
              setLoading(false);
            } 
          }
        ]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang yêu cầu quyền truy cập Camera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name={"camera-off" as any} size={64} color={COLORS.danger} style={{ marginBottom: 20 }} />
        <Text style={styles.errorText}>Ứng dụng cần quyền sử dụng Camera để quét mã vạch.</Text>
        <TouchableOpacity 
          style={styles.retryBtn} 
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.retryBtnText}>Cấp quyền Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Modern Fullscreen Camera Scanner */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'upc_a', 'qr'],
        }}
      />

      {/* Overlays */}
      <View style={styles.overlayContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quét Mã Vạch</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Scanner Target Frame */}
        <View style={styles.scanTargetContainer}>
          <View style={styles.scanTargetFrame}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            
            {/* Pulse red laser line */}
            <View style={styles.laserLine} />
          </View>
          <Text style={styles.scanInstruction}>
            Căn khung mã vạch của sản phẩm vào giữa ô vuông
          </Text>
        </View>

        {/* Bottom Loading Indicator */}
        {loading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 10 }} />
            <Text style={styles.loadingBannerText}>Đang kiểm tra cơ sở dữ liệu dinh dưỡng...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textMuted,
    fontSize: 15,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  scanTargetContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTargetFrame: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scanInstruction: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 24,
    textAlign: 'center',
    paddingHorizontal: 30,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingVertical: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  loadingBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
});
