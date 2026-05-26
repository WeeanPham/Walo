import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Định nghĩa Types trực tiếp để tránh import vòng quanh
export interface Meal {
  id?: string;
  logDate: string; // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  servingSize_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: any;
}

export interface Exercise {
  id?: string;
  logDate: string; // YYYY-MM-DD
  exerciseType: string;
  duration_min: number;
  caloriesBurned: number;
  loggedAt: any;
}

export interface ChatMessage {
  id?: string;
  senderName: string;
  message: string;
  type: 'text' | 'note' | 'menuSuggestion';
  sentAt: any;
}

export interface UserProfile {
  height_cm: number;
  weight_kg: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: string;
  goal: 'lose' | 'maintain' | 'gain';
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  updatedAt: any;
}

export interface DailyLog {
  logDate: string; // YYYY-MM-DD
  waterMl: number;
  steps: number;
  activeCalories: number;
  updatedAt: any;
}

// Fixed document ID for profile since both share one single profile (Weean's target)
const PROFILE_DOC_ID = 'weean_profile';

export const FirestoreService = {
  // === PROFILE ===
  getProfile: async (): Promise<UserProfile | null> => {
    try {
      const docRef = doc(db, 'profile', PROFILE_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (e) {
      console.error('Lỗi lấy profile:', e);
      return null;
    }
  },

  saveProfile: async (profile: UserProfile): Promise<void> => {
    try {
      const docRef = doc(db, 'profile', PROFILE_DOC_ID);
      await setDoc(docRef, {
        ...profile,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Lỗi lưu profile:', e);
    }
  },

  subscribeProfile: (callback: (profile: UserProfile | null) => void) => {
    const docRef = doc(db, 'profile', PROFILE_DOC_ID);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as UserProfile);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Lỗi subscribe profile:', error);
    });
  },

  // === DAILY LOG (WATER, STEPS, ETC) ===
  getDailyLog: async (date: string): Promise<DailyLog | null> => {
    try {
      const docRef = doc(db, 'daily_logs', date);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as DailyLog;
      }
      return null;
    } catch (e) {
      console.error('Lỗi lấy daily log:', e);
      return null;
    }
  },

  subscribeDailyLog: (date: string, callback: (log: DailyLog | null) => void) => {
    const docRef = doc(db, 'daily_logs', date);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as DailyLog);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Lỗi subscribe daily log:', error);
    });
  },

  updateWater: async (date: string, ml: number): Promise<void> => {
    try {
      const docRef = doc(db, 'daily_logs', date);
      await setDoc(docRef, {
        logDate: date,
        waterMl: increment(ml),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Lỗi cập nhật nước:', e);
    }
  },

  updateSteps: async (date: string, steps: number, calories: number): Promise<void> => {
    try {
      const docRef = doc(db, 'daily_logs', date);
      await setDoc(docRef, {
        logDate: date,
        steps: steps,
        activeCalories: calories,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Lỗi cập nhật bước chân:', e);
    }
  },

  // === MEALS ===
  addMeal: async (meal: Omit<Meal, 'loggedAt'>): Promise<void> => {
    try {
      const colRef = collection(db, 'meals');
      await addDoc(colRef, {
        ...meal,
        loggedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Lỗi thêm bữa ăn:', e);
    }
  },

  deleteMeal: async (mealId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'meals', mealId);
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Lỗi xóa bữa ăn:', e);
    }
  },

  subscribeMeals: (date: string, callback: (meals: Meal[]) => void) => {
    const colRef = collection(db, 'meals');
    const q = query(colRef, where('logDate', '==', date), orderBy('loggedAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const meals: Meal[] = [];
      snapshot.forEach((doc) => {
        meals.push({ id: doc.id, ...doc.data() } as Meal);
      });
      callback(meals);
    }, (error) => {
      console.error('Lỗi subscribe meals:', error);
    });
  },

  // === EXERCISES ===
  addExercise: async (exercise: Omit<Exercise, 'loggedAt'>): Promise<void> => {
    try {
      const colRef = collection(db, 'exercises');
      await addDoc(colRef, {
        ...exercise,
        loggedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Lỗi thêm vận động:', e);
    }
  },

  deleteExercise: async (exerciseId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'exercises', exerciseId);
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Lỗi xóa vận động:', e);
    }
  },

  subscribeExercises: (date: string, callback: (exercises: Exercise[]) => void) => {
    const colRef = collection(db, 'exercises');
    const q = query(colRef, where('logDate', '==', date), orderBy('loggedAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const exercises: Exercise[] = [];
      snapshot.forEach((doc) => {
        exercises.push({ id: doc.id, ...doc.data() } as Exercise);
      });
      callback(exercises);
    }, (error) => {
      console.error('Lỗi subscribe exercises:', error);
    });
  },

  // === CHAT MESSAGES ===
  sendMessage: async (msg: Omit<ChatMessage, 'sentAt'>): Promise<void> => {
    try {
      const colRef = collection(db, 'chat_messages');
      await addDoc(colRef, {
        ...msg,
        sentAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Lỗi gửi tin nhắn:', e);
    }
  },

  subscribeChat: (callback: (messages: ChatMessage[]) => void) => {
    const colRef = collection(db, 'chat_messages');
    const q = query(colRef, orderBy('sentAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      callback(messages);
    }, (error) => {
      console.error('Lỗi subscribe chat:', error);
    });
  },

  // === WEIGHT HISTORY ===
  addWeight: async (date: string, weight: number): Promise<void> => {
    try {
      const docRef = doc(db, 'weight_history', date);
      await setDoc(docRef, {
        logDate: date,
        weight_kg: weight,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Lỗi cập nhật cân nặng:', e);
    }
  },

  subscribeWeightHistory: (callback: (weights: {logDate: string, weight_kg: number}[]) => void) => {
    const colRef = collection(db, 'weight_history');
    const q = query(colRef, orderBy('logDate', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const weights: {logDate: string, weight_kg: number}[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        weights.push({ logDate: data.logDate, weight_kg: data.weight_kg });
      });
      callback(weights);
    }, (error) => {
      console.error('Lỗi subscribe weight history:', error);
    });
  },

  subscribeAllMeals: (callback: (meals: Meal[]) => void) => {
    const colRef = collection(db, 'meals');
    const q = query(colRef, orderBy('loggedAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const meals: Meal[] = [];
      snapshot.forEach((doc) => {
        meals.push({ id: doc.id, ...doc.data() } as Meal);
      });
      callback(meals);
    }, (error) => {
      console.error('Lỗi subscribe all meals:', error);
    });
  },

  subscribeAllDailyLogs: (callback: (logs: DailyLog[]) => void) => {
    const colRef = collection(db, 'daily_logs');
    const q = query(colRef, orderBy('logDate', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const logs: DailyLog[] = [];
      snapshot.forEach((doc) => {
        logs.push({ logDate: doc.id, ...doc.data() } as DailyLog);
      });
      callback(logs);
    }, (error) => {
      console.error('Lỗi subscribe all daily logs:', error);
    });
  },

  // === CUSTOM FOODS ===
  addCustomFood: async (food: Omit<CustomFood, 'createdAt'>): Promise<void> => {
    try {
      const colRef = collection(db, 'custom_foods');
      await addDoc(colRef, {
        ...food,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Lỗi thêm thực phẩm tự tạo:', e);
    }
  },

  subscribeCustomFoods: (callback: (foods: CustomFood[]) => void) => {
    const colRef = collection(db, 'custom_foods');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const foods: CustomFood[] = [];
      snapshot.forEach((doc) => {
        foods.push({ id: doc.id, ...doc.data() } as CustomFood);
      });
      callback(foods);
    }, (error) => {
      console.error('Lỗi subscribe custom foods:', error);
    });
  }
};

export interface CustomFood {
  id?: string;
  name: string;
  category: string;
  servingSize: number;
  unit: string;
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  createdAt?: any;
}
