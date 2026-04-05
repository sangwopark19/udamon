import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  PanResponder,
} from 'react-native';
import type { GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { Action } from 'expo-image-manipulator';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type CropPreset = { label: string; labelKey?: string; ratio: number | null };
const FREE_CROP_RATIO = -1;

const CROP_PRESETS: CropPreset[] = [
  { label: 'Original', ratio: null },
  { label: '자유', labelKey: 'editor_free_crop', ratio: FREE_CROP_RATIO },
  { label: '1:1', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '9:16', ratio: 9 / 16 },
];

const SCREEN_W = Dimensions.get('window').width;
const PREVIEW_W = SCREEN_W - 32;
const MIN_CROP = 50;
const HANDLE_SIZE = 44;
const HANDLE_VISUAL = 20;

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ImageEditorModalProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: (uri: string) => void;
}

/** Compute display dimensions for the image inside the preview area */
function getDisplayDims(imgW: number, imgH: number, areaW: number, areaH: number) {
  const imgRatio = imgW / imgH;
  const areaRatio = areaW / areaH;
  let dispW: number;
  let dispH: number;
  if (imgRatio >= areaRatio) {
    dispW = areaW;
    dispH = areaW / imgRatio;
  } else {
    dispH = areaH;
    dispW = areaH * imgRatio;
  }
  return { dispW, dispH };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';

export default function ImageEditorModal({ visible, imageUri, onClose, onSave }: ImageEditorModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  // Dynamic preview area height (measured via onLayout)
  const [previewAreaH, setPreviewAreaH] = useState(PREVIEW_W);
  const handlePreviewLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    setPreviewAreaH(e.nativeEvent.layout.height);
  }, []);

  // Free crop box (display coordinates, origin = top-left of displayed image)
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
  const cropBoxRef = useRef<CropBox>({ x: 0, y: 0, w: 0, h: 0 });

  const isFreeCrop = CROP_PRESETS[selectedPreset]?.ratio === FREE_CROP_RATIO;
  const displayDims = imgSize ? getDisplayDims(imgSize.w, imgSize.h, PREVIEW_W, previewAreaH) : null;

  // Sync ref with state
  useEffect(() => {
    cropBoxRef.current = cropBox;
  }, [cropBox]);

  useEffect(() => {
    if (visible && imageUri) {
      Image.getSize(
        imageUri,
        (w, h) => setImgSize({ w, h }),
        () => setImgSize(null),
      );
    }
    return () => {
      setRotation(0);
      setSelectedPreset(0);
      setImgSize(null);
      setCropBox({ x: 0, y: 0, w: 0, h: 0 });
    };
  }, [visible, imageUri]);

  // Reset crop box when preset changes or image loads
  useEffect(() => {
    if (!displayDims) return;
    const { dispW, dispH } = displayDims;
    const preset = CROP_PRESETS[selectedPreset];

    if (preset.ratio === FREE_CROP_RATIO) {
      // Free: full image
      const box = { x: 0, y: 0, w: dispW, h: dispH };
      setCropBox(box);
      cropBoxRef.current = box;
    } else if (preset.ratio && preset.ratio > 0) {
      // Preset ratio: centered
      let cw: number;
      let ch: number;
      if (dispW / dispH > preset.ratio) {
        ch = dispH;
        cw = dispH * preset.ratio;
      } else {
        cw = dispW;
        ch = dispW / preset.ratio;
      }
      const box = { x: (dispW - cw) / 2, y: (dispH - ch) / 2, w: cw, h: ch };
      setCropBox(box);
      cropBoxRef.current = box;
    }
  }, [selectedPreset, displayDims?.dispW, displayDims?.dispH]);

  const handleRotate = useCallback((deg: number) => {
    setRotation((prev) => (prev + deg + 360) % 360);
  }, []);

  // Create PanResponders for each corner
  const makeCornerPan = useCallback((corner: Corner) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_: GestureResponderEvent, gs: PanResponderGestureState) => {
        if (!displayDims) return;
        const { dispW, dispH } = displayDims;
        const box = cropBoxRef.current;
        let { x, y, w, h } = box;

        switch (corner) {
          case 'tl':
            x = clamp(box.x + gs.dx, 0, box.x + box.w - MIN_CROP);
            y = clamp(box.y + gs.dy, 0, box.y + box.h - MIN_CROP);
            w = box.x + box.w - x;
            h = box.y + box.h - y;
            break;
          case 'tr':
            w = clamp(box.w + gs.dx, MIN_CROP, dispW - box.x);
            y = clamp(box.y + gs.dy, 0, box.y + box.h - MIN_CROP);
            h = box.y + box.h - y;
            break;
          case 'bl':
            x = clamp(box.x + gs.dx, 0, box.x + box.w - MIN_CROP);
            w = box.x + box.w - x;
            h = clamp(box.h + gs.dy, MIN_CROP, dispH - box.y);
            break;
          case 'br':
            w = clamp(box.w + gs.dx, MIN_CROP, dispW - box.x);
            h = clamp(box.h + gs.dy, MIN_CROP, dispH - box.y);
            break;
        }

        const newBox = { x, y, w, h };
        setCropBox(newBox);
      },
      onPanResponderRelease: () => {
        // Snapshot the current state into the ref for next gesture
        cropBoxRef.current = cropBox;
      },
    });
  }, [displayDims]);

  // Memoize PanResponders to avoid re-creation on every render
  // We use refs updated via onPanResponderRelease to track latest box
  const panTL = useMemo(() => makeCornerPan('tl'), [makeCornerPan]);
  const panTR = useMemo(() => makeCornerPan('tr'), [makeCornerPan]);
  const panBL = useMemo(() => makeCornerPan('bl'), [makeCornerPan]);
  const panBR = useMemo(() => makeCornerPan('br'), [makeCornerPan]);

  // Keep ref synced after state update from gesture
  useEffect(() => {
    cropBoxRef.current = cropBox;
  }, [cropBox]);

  // Calculate crop action for save
  const getCropAction = useCallback((): Action | null => {
    if (!imgSize || !displayDims) return null;
    const preset = CROP_PRESETS[selectedPreset];

    if (preset.ratio === FREE_CROP_RATIO) {
      // Free crop: convert display coords to image coords
      const { dispW, dispH } = displayDims;
      const scaleX = imgSize.w / dispW;
      const scaleY = imgSize.h / dispH;
      const box = cropBox;

      // Check if it's basically the full image (no crop needed)
      if (box.x < 1 && box.y < 1 && Math.abs(box.w - dispW) < 1 && Math.abs(box.h - dispH) < 1) {
        return null;
      }

      return {
        crop: {
          originX: Math.round(box.x * scaleX),
          originY: Math.round(box.y * scaleY),
          width: Math.round(box.w * scaleX),
          height: Math.round(box.h * scaleY),
        },
      };
    }

    if (!preset.ratio) return null; // Original

    const { w, h } = imgSize;
    const targetRatio = preset.ratio;
    const currentRatio = w / h;

    let cropW: number;
    let cropH: number;
    if (currentRatio > targetRatio) {
      cropH = h;
      cropW = Math.round(h * targetRatio);
    } else {
      cropW = w;
      cropH = Math.round(w / targetRatio);
    }
    const originX = Math.round((w - cropW) / 2);
    const originY = Math.round((h - cropH) / 2);
    return { crop: { originX, originY, width: cropW, height: cropH } };
  }, [imgSize, selectedPreset, cropBox, displayDims]);

  // Preview overlay for preset ratios (non-free)
  const previewOverlay = (() => {
    const preset = CROP_PRESETS[selectedPreset];
    if (!preset.ratio || preset.ratio === FREE_CROP_RATIO || !imgSize) return null;
    const { dispW, dispH } = getDisplayDims(imgSize.w, imgSize.h, PREVIEW_W, previewAreaH);

    const targetRatio = preset.ratio;
    let cropDispW: number;
    let cropDispH: number;
    if (dispW / dispH > targetRatio) {
      cropDispH = dispH;
      cropDispW = dispH * targetRatio;
    } else {
      cropDispW = dispW;
      cropDispH = dispW / targetRatio;
    }
    return { dispW, dispH, cropDispW, cropDispH };
  })();

  const handleSave = useCallback(async () => {
    setProcessing(true);
    try {
      const actions: Action[] = [];
      const cropAction = getCropAction();
      if (cropAction) actions.push(cropAction);
      if (rotation !== 0) actions.push({ rotate: rotation });
      const result = await manipulateAsync(imageUri, actions, { compress: 0.9, format: SaveFormat.JPEG });
      onSave(result.uri);
    } finally {
      setProcessing(false);
    }
  }, [imageUri, rotation, getCropAction, onSave]);

  // Offset of the displayed image from the top-left of previewContainer
  const imgOffset = displayDims
    ? { x: (PREVIEW_W - displayDims.dispW) / 2, y: (previewAreaH - displayDims.dispH) / 2 }
    : { x: 0, y: 0 };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>{t('btn_cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('editor_title')}</Text>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.7} disabled={processing}>
            {processing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.saveText}>{t('btn_done')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={styles.previewWrap} onLayout={handlePreviewLayout}>
          <View style={[styles.previewContainer, { width: PREVIEW_W, height: previewAreaH }]}>
            <Image
              source={{ uri: imageUri }}
              style={[styles.preview, { transform: [{ rotate: `${rotation}deg` }] }]}
            />

            {/* Preset crop overlay (non-free) */}
            {previewOverlay && (
              <View style={[styles.overlayContainer, { width: previewOverlay.dispW, height: previewOverlay.dispH }]}>
                <View style={styles.dimOverlay} />
                <View style={[styles.cropWindow, { width: previewOverlay.cropDispW, height: previewOverlay.cropDispH }]}>
                  <View style={[styles.cornerMark, styles.cornerTL]} />
                  <View style={[styles.cornerMark, styles.cornerTR]} />
                  <View style={[styles.cornerMark, styles.cornerBL]} />
                  <View style={[styles.cornerMark, styles.cornerBR]} />
                </View>
              </View>
            )}

            {/* Free crop overlay */}
            {isFreeCrop && displayDims && (
              <View
                style={[
                  styles.overlayContainer,
                  {
                    width: displayDims.dispW,
                    height: displayDims.dispH,
                    left: imgOffset.x,
                    top: imgOffset.y,
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                  },
                ]}
              >
                {/* Dim regions (4 rects around the crop box) */}
                {/* Top */}
                <View style={[styles.dimRegion, { top: 0, left: 0, right: 0, height: cropBox.y }]} />
                {/* Bottom */}
                <View style={[styles.dimRegion, { top: cropBox.y + cropBox.h, left: 0, right: 0, bottom: 0 }]} />
                {/* Left */}
                <View style={[styles.dimRegion, { top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.h }]} />
                {/* Right */}
                <View style={[styles.dimRegion, { top: cropBox.y, left: cropBox.x + cropBox.w, right: 0, height: cropBox.h }]} />

                {/* Crop window border */}
                <View
                  style={[
                    styles.freeCropWindow,
                    { left: cropBox.x, top: cropBox.y, width: cropBox.w, height: cropBox.h },
                  ]}
                >
                  {/* Grid lines (rule of thirds) */}
                  <View style={[styles.gridLineH, { top: '33.33%' }]} />
                  <View style={[styles.gridLineH, { top: '66.66%' }]} />
                  <View style={[styles.gridLineV, { left: '33.33%' }]} />
                  <View style={[styles.gridLineV, { left: '66.66%' }]} />
                </View>

                {/* Corner handles */}
                <View
                  {...panTL.panHandlers}
                  style={[styles.handle, { left: cropBox.x - HANDLE_SIZE / 2, top: cropBox.y - HANDLE_SIZE / 2 }]}
                >
                  <View style={[styles.handleVisual, styles.handleTL]} />
                </View>
                <View
                  {...panTR.panHandlers}
                  style={[styles.handle, { left: cropBox.x + cropBox.w - HANDLE_SIZE / 2, top: cropBox.y - HANDLE_SIZE / 2 }]}
                >
                  <View style={[styles.handleVisual, styles.handleTR]} />
                </View>
                <View
                  {...panBL.panHandlers}
                  style={[styles.handle, { left: cropBox.x - HANDLE_SIZE / 2, top: cropBox.y + cropBox.h - HANDLE_SIZE / 2 }]}
                >
                  <View style={[styles.handleVisual, styles.handleBL]} />
                </View>
                <View
                  {...panBR.panHandlers}
                  style={[styles.handle, { left: cropBox.x + cropBox.w - HANDLE_SIZE / 2, top: cropBox.y + cropBox.h - HANDLE_SIZE / 2 }]}
                >
                  <View style={[styles.handleVisual, styles.handleBR]} />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Crop Presets */}
        <View style={styles.presetsRow}>
          {CROP_PRESETS.map((preset, i) => (
            <TouchableOpacity
              key={preset.label}
              style={[styles.presetChip, selectedPreset === i && styles.presetChipActive]}
              onPress={() => setSelectedPreset(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, selectedPreset === i && styles.presetTextActive]}>
                {preset.labelKey ? t(preset.labelKey) : preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Rotation Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlBtn} onPress={() => handleRotate(-90)} activeOpacity={0.7}>
            <Ionicons name="arrow-undo" size={22} color={colors.textPrimary} />
            <Text style={styles.controlLabel}>-90°</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={() => handleRotate(90)} activeOpacity={0.7}>
            <Ionicons name="arrow-redo" size={22} color={colors.textPrimary} />
            <Text style={styles.controlLabel}>+90°</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  cancelText: { fontSize: fontSize.body, fontWeight: fontWeight.body, color: colors.buttonPrimaryText },
  headerTitle: { fontSize: fontSize.cardName, fontWeight: fontWeight.heading, color: colors.buttonPrimaryText },
  saveText: { fontSize: fontSize.body, fontWeight: fontWeight.heading, color: colors.primary },

  previewWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  previewContainer: {
    justifyContent: 'center', alignItems: 'center',
  },
  preview: { width: '100%', height: '100%', resizeMode: 'contain' },

  overlayContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },

  // Preset crop window
  cropWindow: {
    backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#fff',
    zIndex: 1, overflow: 'visible',
  },
  cornerMark: { position: 'absolute', width: 16, height: 16, borderColor: '#fff', borderWidth: 2.5 },
  cornerTL: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0 },

  // Free crop
  dimRegion: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)' },
  freeCropWindow: {
    position: 'absolute', borderWidth: 1.5, borderColor: '#fff', overflow: 'hidden',
  },
  gridLineH: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  gridLineV: {
    position: 'absolute', top: 0, bottom: 0, width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // Drag handles
  handle: {
    position: 'absolute', width: HANDLE_SIZE, height: HANDLE_SIZE,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  handleVisual: {
    width: HANDLE_VISUAL, height: HANDLE_VISUAL,
    borderColor: '#fff', borderWidth: 3,
  },
  handleTL: { borderRightWidth: 0, borderBottomWidth: 0 },
  handleTR: { borderLeftWidth: 0, borderBottomWidth: 0 },
  handleBL: { borderRightWidth: 0, borderTopWidth: 0 },
  handleBR: { borderLeftWidth: 0, borderTopWidth: 0 },

  presetsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 12 },
  presetChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.round, backgroundColor: colors.whiteAlpha10,
  },
  presetChipActive: { backgroundColor: colors.primary },
  presetText: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.whiteAlpha60 },
  presetTextActive: { color: colors.buttonPrimaryText },

  controlsRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingVertical: 16 },
  controlBtn: { alignItems: 'center', gap: 4 },
  controlLabel: { fontSize: fontSize.micro, fontWeight: fontWeight.body, color: colors.buttonPrimaryText },
});
