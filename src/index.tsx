import { NitroModules } from 'react-native-nitro-modules';
import type { SkiaList } from './SkiaList.nitro';

const SkiaListHybridObject =
  NitroModules.createHybridObject<SkiaList>('SkiaList');

export function multiply(a: number, b: number): number {
  return SkiaListHybridObject.multiply(a, b);
}
