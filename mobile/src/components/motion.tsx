import React, { useEffect } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

const spring = { damping: 18, stiffness: 220 };

export function FadeInView({
  children,
  delay = 0,
  style,
  from = 'down',
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  from?: 'up' | 'down' | 'fade';
}) {
  const entering =
    from === 'up'
      ? FadeInUp.delay(delay).springify().damping(18)
      : from === 'fade'
        ? FadeIn.delay(delay).duration(400)
        : FadeInDown.delay(delay).springify().damping(18);
  return (
    <Animated.View entering={entering} layout={Layout.springify()} style={style}>
      {children}
    </Animated.View>
  );
}

export function StaggerIn({
  children,
  index,
  style,
}: {
  children: React.ReactNode;
  index: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 55).springify().damping(16).stiffness(200)}
      layout={Layout.springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export function PopIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={ZoomIn.delay(delay).springify().damping(14)} style={style}>
      {children}
    </Animated.View>
  );
}

export function ScalePressable({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: PressableProps['onPress'];
  onPressIn?: PressableProps['onPressIn'];
  onPressOut?: PressableProps['onPressOut'];
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withSpring(0.97, spring);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, spring);
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export function ExpandHeight({
  open,
  children,
  maxHeight = 420,
}: {
  open: boolean;
  children: React.ReactNode;
  maxHeight?: number;
}) {
  const progress = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration: 280 });
  }, [open, progress]);

  const animStyle = useAnimatedStyle(() => ({
    maxHeight: progress.value * maxHeight,
    opacity: progress.value,
  }));

  if (!open) return null;

  return (
    <Animated.View style={[{ overflow: 'hidden' }, animStyle]} layout={Layout.springify()}>
      {children}
    </Animated.View>
  );
}
