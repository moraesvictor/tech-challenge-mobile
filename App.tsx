import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { TransactionsProvider } from './src/contexts/TransactionsContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TransactionsProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </TransactionsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
