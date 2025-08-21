import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

AppRegistry.registerComponent(appName, () => () => (
  <GestureHandlerRootView>
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  </GestureHandlerRootView>
));
