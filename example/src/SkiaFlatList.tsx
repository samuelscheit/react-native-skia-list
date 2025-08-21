import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Skia } from '@shopify/react-native-skia/src/';
import SkiaPictureViewNativeComponent from '@shopify/react-native-skia/src/specs/SkiaPictureViewNativeComponent';
import { SkiaViewNativeId } from '@shopify/react-native-skia/src/views/SkiaViewNativeId';
import Animated, {
  makeMutable,
  startMapper,
  stopMapper,
  useAnimatedScrollHandler,
  runOnJS,
  runOnUI,
  useSharedValue,
} from 'react-native-reanimated';
import type { ReactElement } from 'react';
import { drawAsPicture } from './utils';

interface SkiaFlatListProps<T> {
  data: T[];
  itemHeight: number;
  height: number;
  renderItem?: (
    info: { item: T; index: number; y: number },
    r: any,
    paint: any
  ) => void;
  renderElement?: (info: { item: T; index: number }) => ReactElement;
}

export function SkiaFlatList<T>({
  data,
  itemHeight,
  height,
  renderItem,
  renderElement,
}: SkiaFlatListProps<T>) {
  const nativeId = useMemo(() => SkiaViewNativeId.current++, []);
  const scrollY = useSharedValue(0);
  const mapperId = useRef(0);
  // Use a shared value for the picture cache (worklet-safe)
  const pictures = useSharedValue<{ [index: number]: any }>({});
  // Ref for drawList so it can be called from JS
  const drawListRef = useRef<() => void>(null);

  const updatePictureCache = useMemo(() => runOnUI(function updatePictureCache(index: number, picture: any) {
    'worklet';
    pictures.value[index] = picture;
    if (drawListRef.current) {
      drawListRef.current();
    }
  }), []);

  // JS function to render and cache a picture for a given item index
  function renderAndCachePicture(item: T, index: number) {
    if (!renderElement) return;
    const start = performance.now();
    const element = renderElement({ item, index });

    drawAsPicture(element)
      .then((pic) => {
        const end = performance.now();
        console.log('renderAndCachePicture', end - start);
        // Schedule cache update on the worklet via runOnJS
        updatePictureCache(index, pic);
      })
      .catch(() => {
        // Remove the in-progress marker on error so it can be retried
      });
  }

  useEffect(() => {
    // Clear cache if data or renderElement changes
    pictures.value = {};
    console.log('useEffect', data, renderElement);
    drawListRef.current?.();


    Array.from({ length: data.length }).forEach((_, i) => {
      renderAndCachePicture(data[i] as T, i);
    });
  }, [data, itemHeight, renderElement]);

  useEffect(() => {
    const { SkiaViewApi } = globalThis;
    const paint = Skia.Paint();
    paint.setColor(Skia.Color('black'));

    const drawList = () => {
      'worklet';
      const rec = Skia.PictureRecorder();
      const r = rec.beginRecording();
      const startIdx = Math.floor(scrollY.value / itemHeight);
      const endIdx = Math.min(
        data.length,
        Math.ceil((scrollY.value + height) / itemHeight)
      );
      for (let i = startIdx; i < endIdx; i++) {
        const y = i * itemHeight - scrollY.value;
        const item = data[i];
        if (!item) continue;
        if (renderItem) {
          renderItem({ item, index: i, y }, r, paint);
        } else if (renderElement) {
          const picture = pictures.value[i];
          if (picture) {
            // r.save();
            r.translate(0, y);
            // r.drawRect({ x: 0, y: 0, width: 100, height: 50 }, paint);
            r.drawPicture(picture);
            r.translate(0, -y);
            // r.restore();
          } else if (picture === undefined) {
            // Mark as in-progress in the shared value
            pictures.value[i] = null;
            // Only schedule if not already scheduled or completed
            runOnJS(renderAndCachePicture)(item, i);
          }
        }
      }
      SkiaViewApi?.setJsiProperty?.(
        nativeId,
        'picture',
        rec.finishRecordingAsPicture()
      );
    };

    // Save drawList to ref so it can be called from JS
    drawListRef.current = drawList

    mapperId.current = startMapper(drawList, [scrollY]);
    return () => stopMapper(mapperId.current);
  }, [
    data,
    itemHeight,
    height,
    renderItem,
    renderElement,
    nativeId,
    scrollY,
    renderAndCachePicture,
  ]);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  return (
    <View style={{ height, width: '100%' }}>
      <Animated.ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{
          height: data.length * itemHeight,
          borderWidth: 1,
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={1}
      />
      <SkiaPictureViewNativeComponent
        style={StyleSheet.absoluteFill}
        nativeID={`${nativeId}`}
        debug
        collapsable={false}
        opaque
        pointerEvents="none"
      />
    </View>
  );
}
