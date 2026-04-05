import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function usePushDeepLinkHandler() {
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data) return;

      if (data.postId) {
        navigation.navigate('PostDetail', { postId: data.postId });
      } else if (data.photographerId) {
        navigation.navigate('PhotographerProfile', { photographerId: data.photographerId });
      }
    });

    return () => subscription.remove();
  }, [navigation]);
}
