import { Redirect } from 'expo-router';
import { useApp } from '../src/context/AppContext';

export default function Index() {
  const { currentUser } = useApp();
  if (!currentUser) return <Redirect href="/identity" />;
  return <Redirect href="/(tabs)/dashboard" />;
}
