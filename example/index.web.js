import './src/utils/polyfill';
import { AppRegistry } from 'react-native';
import name from './app.json';
// import App from './src/App';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb().then(async () => {
  const { default: App } = await import('./src/App');

  AppRegistry.registerComponent(name, () => () => <App />);
  AppRegistry.runApplication(name, {
    initialProps: {},
    rootTag: document.getElementById('app-root'),
  });
});
