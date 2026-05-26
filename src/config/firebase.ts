import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

// Cấu hình Firebase từ User cung cấp
const firebaseConfig = {
  apiKey: "AIzaSyBnGc1hyYWvTWhkTmYFSvd-XUEExl3n0-g",
  authDomain: "walo-app-7ccfb.firebaseapp.com",
  projectId: "walo-app-7ccfb",
  storageBucket: "walo-app-7ccfb.firebasestorage.app",
  messagingSenderId: "1051428886064",
  appId: "1:1051428886064:web:ca4f5f9c6243ea86157ff5"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore với bộ nhớ đệm ngoại tuyến (Persistent Local Cache)
// Giúp load dữ liệu ngay lập tức (0ms) từ thiết bị và đồng bộ ngầm khi có mạng
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export default app;
