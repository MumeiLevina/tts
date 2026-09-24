import type { CanvasSlot, OutfitLayout, OutfitLayoutName, OutfitSlot } from "../outfit/types";

const slot = (x: number, y: number, maxWidth: number, maxHeight: number, rotation: number, zIndex: number, anchor: CanvasSlot["anchor"] = "top-left"): CanvasSlot => ({ x, y, maxWidth, maxHeight, rotation, zIndex, anchor });

const separates = (variant: 1 | 2 = 1): OutfitLayout => ({
  top: [slot(variant === 1 ? .08 : .42, .08, .43, .36, variant === 1 ? -3 : 3, 20)],
  bottom: [slot(variant === 1 ? .12 : .08, .43, .46, .48, variant === 1 ? 2 : -2, 10)],
  dress: [slot(.08, .08, .53, .72, -2, 15)], jumpsuit: [slot(.08, .08, .53, .72, -2, 15)],
  outerwear: [slot(variant === 1 ? .49 : .08, .08, .4, .43, variant === 1 ? 4 : -4, 30)],
  shoes: [slot(.58, .62, .34, .28, -5, 25)],
  accessory: [slot(.68, .12, .24, .23, 7, 40), slot(.58, .4, .22, .2, -5, 41), slot(.72, .42, .18, .18, 4, 42)]
});

const onePiece = (rotation = -2): OutfitLayout => ({
  top: [slot(.08, .08, .42, .32, -3, 20)], bottom: [slot(.1, .43, .44, .46, 2, 10)],
  dress: [slot(.08, .06, .58, .78, rotation, 15)], jumpsuit: [slot(.08, .06, .58, .78, rotation, 15)],
  outerwear: [slot(.5, .09, .4, .43, 4, 30)], shoes: [slot(.59, .65, .33, .25, -5, 25)],
  accessory: [slot(.69, .39, .22, .2, 6, 40), slot(.66, .13, .24, .2, -4, 41), slot(.48, .47, .18, .18, 3, 42)]
});

export const outfitLayoutConfigs: Record<OutfitLayoutName, OutfitLayout> = {
  minimal_flatlay_01: separates(1), casual_flatlay_01: separates(2), casual_flatlay_02: { ...separates(1), shoes: [slot(.55, .67, .38, .23, 3, 25)] },
  street_flatlay_01: { ...separates(2), outerwear: [slot(.06, .06, .45, .46, -6, 30)], accessory: [slot(.68, .11, .24, .24, 9, 40), slot(.64, .4, .25, .2, -7, 41)] },
  formal_flatlay_01: { ...separates(1), outerwear: [slot(.46, .06, .44, .48, 2, 30)], shoes: [slot(.61, .66, .3, .22, -2, 25)] },
  dress_flatlay_01: onePiece(-2)
};

export function slotsFor(layout: OutfitLayoutName, category: OutfitSlot) {
  return outfitLayoutConfigs[layout][category];
}
