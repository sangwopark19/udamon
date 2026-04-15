import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '../../styles/theme';

export interface VideoPlayerProps {
  uri: string;
  mode: 'feed' | 'detail' | 'studio';
  width: number;
  height: number;
  isVisible?: boolean;       // feed 모드 viewport-aware play/pause
  onError?: (e: Error) => void;
}

/**
 * expo-video 기반 영상 재생 래퍼.
 *
 * mode 별 정책:
 * - feed:    muted + loop + viewport-aware autoplay (isVisible prop 기반). nativeControls 없음.
 * - detail:  nativeControls 노출, PiP 허용.
 * - studio:  thumbnail 미리보기 용 (autoplay 없음, nativeControls 없음).
 *
 * RESEARCH §Pattern 1 Anti-pattern 경고 준수: 각 VideoPlayer 인스턴스당 독립 player
 * 생성 (FlatList 내 item 별로 별도 VideoPlayer → Android 공유 player 충돌 방지).
 */
export default function VideoPlayer({ uri, mode, width, height, isVisible = true, onError }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const player = useVideoPlayer(uri, (p) => {
    if (mode === 'feed') {
      p.muted = true;
      p.loop = true;
    } else {
      p.muted = false;
      p.loop = false;
    }
  });

  // feed 모드 viewport-aware: isVisible 변경 시 play/pause
  useEffect(() => {
    if (mode !== 'feed') return;
    try {
      if (isVisible) {
        player.play();
      } else {
        player.pause();
      }
    } catch (e) {
      console.warn('[VideoPlayer] play/pause failed', e);
    }
  }, [isVisible, mode, player]);

  // 로딩/에러 이벤트 리스너
  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setIsLoading(false);
      if (status === 'error') {
        const err = new Error('Video playback failed');
        setError(err);
        setIsLoading(false);
        onError?.(err);
      }
    });
    return () => {
      statusSub.remove();
    };
  }, [player, onError]);

  if (error) {
    return (
      <View style={[styles.placeholder, { width, height }]}>
        <Ionicons name="alert-circle-outline" size={24} color={colors.textTertiary} />
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      <VideoView
        player={player}
        style={{ width, height }}
        nativeControls={mode === 'detail'}
        allowsPictureInPicture={mode === 'detail'}
        contentFit="cover"
      />
      {isLoading && (
        <View style={[StyleSheet.absoluteFillObject, styles.loadingOverlay]}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
