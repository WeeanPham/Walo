import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior for when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationService = {
  // 1. Request user permission for notifications
  requestPermissions: async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Quyền thông báo bị từ chối!');
      return false;
    }
    
    return true;
  },

  // 2. Schedule recurring water hydration reminders
  scheduleWaterReminders: async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // We will schedule water reminder notification intervals (e.g. 9:00, 11:00, 14:00, 16:00, 19:00, 21:00)
      const waterTimes = [
        { hour: 9, minute: 0 },
        { hour: 11, minute: 0 },
        { hour: 14, minute: 0 },
        { hour: 16, minute: 0 },
        { hour: 19, minute: 0 },
        { hour: 21, minute: 0 },
      ];

      for (const time of waterTimes) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💧 Đã đến giờ uống nước rồi!',
            body: 'Hãy bổ sung 250ml nước ngay để giữ cho cơ thể luôn tràn đầy năng lượng nhé!',
            sound: true,
            data: { type: 'water' },
          },
          trigger: {
            type: 'calendar',
            hour: time.hour,
            minute: time.minute,
            repeats: true,
          } as any,
        });
      }
      console.log('Đã lên lịch nhắc uống nước thành công!');
    } catch (e) {
      console.error('Lỗi khi đặt nhắc uống nước:', e);
    }
  },

  // 3. Schedule meal tracking reminders (Breakfast, Lunch, Dinner)
  scheduleMealReminders: async (): Promise<void> => {
    try {
      // 07:30 - Bữa sáng
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍳 Đã ghi nhận bữa sáng chưa?',
          body: 'Bắt đầu ngày mới tràn đầy sức khỏe! Đừng quên ghi lại năng lượng bữa sáng của bạn nhé.',
          sound: true,
          data: { type: 'meal', mealType: 'breakfast' },
        },
        trigger: {
          type: 'calendar',
          hour: 7,
          minute: 30,
          repeats: true,
        } as any,
      });

      // 12:30 - Bữa trưa
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍲 Giờ ăn trưa đến rồi Weean ơi!',
          body: 'Bảo Vy nhắc bạn nạp năng lượng buổi trưa nhé! Ghi nhận bữa ăn để kiểm soát mục tiêu tốt hơn.',
          sound: true,
          data: { type: 'meal', mealType: 'lunch' },
        },
        trigger: {
          type: 'calendar',
          hour: 12,
          minute: 30,
          repeats: true,
        } as any,
      });

      // 19:00 - Bữa tối
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🥗 Ghi nhật ký bữa tối của bạn',
          body: 'Một ngày sắp khép lại. Cùng Bảo Vy tổng kết dinh dưỡng bữa tối để đạt mục tiêu hôm nay nhé!',
          sound: true,
          data: { type: 'meal', mealType: 'dinner' },
        },
        trigger: {
          type: 'calendar',
          hour: 19,
          minute: 0,
          repeats: true,
        } as any,
      });

      console.log('Đã lên lịch nhắc bữa ăn thành công!');
    } catch (e) {
      console.error('Lỗi khi đặt nhắc bữa ăn:', e);
    }
  },

  // 4. Schedule daily end-of-day logging reminder
  scheduleEndOfDayReminder: async (): Promise<void> => {
    try {
      // 21:30 - End of day check
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📈 Tổng kết ngày sức khỏe cùng Walo',
          body: 'Hôm nay bạn hoạt động thế nào? Hãy hoàn thành nhật ký calo và nước uống hôm nay nhé!',
          sound: true,
          data: { type: 'eod' },
        },
        trigger: {
          type: 'calendar',
          hour: 21,
          minute: 30,
          repeats: true,
        } as any,
      });
      console.log('Đã lên lịch nhắc tổng kết ngày thành công!');
    } catch (e) {
      console.error('Lỗi khi đặt nhắc tổng kết ngày:', e);
    }
  },

  // 5. Cancel all reminders
  cancelAllReminders: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Đã hủy toàn bộ lịch nhắc thông báo!');
  }
};
