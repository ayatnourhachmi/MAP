import { Redirect } from 'expo-router';
import { useAppStore } from '../store/appStore';

// Redirects to onboarding or main app based on store flag.
export default function Index() {
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  return (
    <Redirect
      href={onboardingComplete ? '/(main)/explore' : '/onboarding/splash'}
    />
  );
}
