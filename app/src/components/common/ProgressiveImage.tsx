import React, { useState, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  type ImageStyle,
  type StyleProp,
  type ImageSourcePropType,
} from 'react-native';
import { colors } from '../../styles/theme';

interface Props {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

export default function ProgressiveImage({
  source,
  style,
  resizeMode = 'cover',
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!loaded) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [loaded]);

  const handleLoad = () => {
    setLoaded(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <>
      {!loaded && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.placeholder,
            { opacity: shimmerOpacity },
          ]}
        />
      )}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity }]}>
        <Image
          source={source}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
