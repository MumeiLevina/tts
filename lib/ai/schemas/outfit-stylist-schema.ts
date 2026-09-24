import { z } from "zod";
import { outfitLayouts } from "../../outfit/types";

const id = z.string().trim().min(1).max(100);
export const aiOutfitItemsSchema = z.object({
  top_id: id.nullable(), bottom_id: id.nullable(), dress_id: id.nullable(), jumpsuit_id: id.nullable(),
  outerwear_id: id.nullable(), shoes_id: id, accessory_ids: z.array(id).max(4)
}).strict().superRefine((items, context) => {
  const separates = Boolean(items.top_id && items.bottom_id && !items.dress_id && !items.jumpsuit_id);
  const dress = Boolean(items.dress_id && !items.top_id && !items.bottom_id && !items.jumpsuit_id);
  const jumpsuit = Boolean(items.jumpsuit_id && !items.top_id && !items.bottom_id && !items.dress_id);
  if (!separates && !dress && !jumpsuit) context.addIssue({ code: z.ZodIssueCode.custom, message: "Outfit must be top + bottom or exactly one dress/jumpsuit." });
  const selected = [items.top_id, items.bottom_id, items.dress_id, items.jumpsuit_id, items.outerwear_id, items.shoes_id, ...items.accessory_ids].filter((value): value is string => Boolean(value));
  if (new Set(selected).size !== selected.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "A product can only occupy one outfit slot." });
});

export const aiOutfitSchema = z.object({
  outfit_id: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  outfit_name: z.string().trim().min(2).max(120),
  layout: z.enum(outfitLayouts),
  items: aiOutfitItemsSchema,
  stylist_advice: z.string().trim().min(3).max(1000),
  confidence: z.number().min(0).max(1)
}).strict();

export const aiStylistOutputSchema = z.object({
  status: z.literal("success"),
  outfits: z.array(aiOutfitSchema).min(1).max(3)
}).strict().superRefine((value, context) => {
  if (new Set(value.outfits.map(outfit => outfit.outfit_id)).size !== value.outfits.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Outfit IDs must be unique." });
});

export type RawAIStylistOutput = z.infer<typeof aiStylistOutputSchema>;

const nullableCandidateId = (candidateIds: string[]) => ({ anyOf: [{ type: "string", enum: candidateIds }, { type: "null" }] });

/** JSON Schema for OpenAI Structured Outputs. Candidate enums prevent arbitrary IDs at generation time; Zod still validates after generation. */
export function buildOutfitStylistJsonSchema(candidateIds: string[], numberOfOutfits = 3): Record<string, unknown> {
  const ids = Array.from(new Set(candidateIds));
  if (!ids.length) throw new Error("Cannot build outfit schema without candidate IDs.");
  const maxItems = Math.min(3, Math.max(1, numberOfOutfits));
  return {
    type: "object", additionalProperties: false, required: ["status", "outfits"],
    properties: {
      status: { type: "string", enum: ["success"] },
      outfits: { type: "array", minItems: 1, maxItems, items: {
        type: "object", additionalProperties: false,
        required: ["outfit_id", "outfit_name", "layout", "items", "stylist_advice", "confidence"],
        properties: {
          outfit_id: { type: "string", minLength: 1, maxLength: 100 },
          outfit_name: { type: "string", minLength: 2, maxLength: 120 },
          layout: { type: "string", enum: [...outfitLayouts] },
          items: { type: "object", additionalProperties: false,
            required: ["top_id", "bottom_id", "dress_id", "jumpsuit_id", "outerwear_id", "shoes_id", "accessory_ids"],
            properties: {
              top_id: nullableCandidateId(ids), bottom_id: nullableCandidateId(ids), dress_id: nullableCandidateId(ids), jumpsuit_id: nullableCandidateId(ids), outerwear_id: nullableCandidateId(ids),
              shoes_id: { type: "string", enum: ids }, accessory_ids: { type: "array", maxItems: 4, items: { type: "string", enum: ids } }
            }
          },
          stylist_advice: { type: "string", minLength: 3, maxLength: 1000 },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        }
      } }
    }
  };
}
