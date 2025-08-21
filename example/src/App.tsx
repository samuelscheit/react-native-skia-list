import { Button, View } from 'react-native';
import { SkiaFlatList } from './SkiaFlatList';
import {
  Canvas,
  drawAsPicture,
  Fill,
  matchFont,
  Picture,
  Rect,
  Skia,
  type SkCanvas,
  type SkPicture,
} from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';

const DATA = Array.from({ length: 1000 }, (_, i) => ({
  title: `Item ${i + 1}`,
  color: `hsl(${(i * 36) % 360}, 70%, 60%)`,
}));

const color = Skia.Color('red');

const promise = drawAsPicture(
  <Rect x={10} y={10} width={100} height={100} color={'red'} />
);

const paint = Skia.Paint();
paint.setColor(color);

export default function App() {
  const [picture, setPicture] = useState<SkPicture | null>(null);

  useEffect(() => {
    promise.then(setPicture);
  }, []);

  if (!picture) return "test";

  return (
    <View style={{ flex: 1 }}> 
    <SkiaFlatList
      data={DATA}
      itemHeight={60}
      height={600}
      // renderItem={({ item, index, y }, r: SkCanvas, paint) => {
      //   'worklet';
      //   paint.setColor(Skia.Color(item.color));
      //   r.drawRect({ x: 10, y, width: 340, height: 50 }, paint);
      //   paint.setColor(Skia.Color('black'));
      //   paint.setTextSize?.(24);
      //   r.drawText(item.title, 20, y + 35, paint, font);
      // }}
      renderElement={({}) => <Rect x={10} y={10} width={100} height={40} paint={paint}/>}
    />
    <Button title='Rereender' onPress={() => {
      setPicture(null);
      setTimeout(() => {
        setPicture(picture);
      }, 10);
    }} />
    </View>
  );
}

