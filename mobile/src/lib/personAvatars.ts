import type { ImageSourcePropType } from 'react-native';

const BY_ID: Record<string, ImageSourcePropType> = {
  maro: require('../../assets/persons/maro.jpg'),
  kemo: require('../../assets/persons/kemo.jpg'),
  back: require('../../assets/persons/back.png'),
  abdo: require('../../assets/persons/Abdo.png'),
};

const BY_NAME: Record<string, ImageSourcePropType> = {
  'El Maro': BY_ID.maro,
  'El Kemo': BY_ID.kemo,
  'El Back': BY_ID.back,
  Abdo: BY_ID.abdo,
};

export function getPersonAvatar(nameOrId: string): ImageSourcePropType | null {
  return BY_NAME[nameOrId] ?? BY_ID[nameOrId.toLowerCase()] ?? null;
}
