import React from 'react';
import { Image, type ImageStyle, type ViewStyle } from 'react-native';
import { radius } from '../theme';

const iconSource = require('../../assets/icon.png');

/** App logo — uses the same PNG as the launcher icon */
export function AppLogo({
  size = 40,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  const imageStyle: ImageStyle = {
    width: size,
    height: size,
    borderRadius: size * 0.22,
  };
  return <Image source={iconSource} style={[imageStyle, style as ImageStyle]} resizeMode="cover" />;
}
