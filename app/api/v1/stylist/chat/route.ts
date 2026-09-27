import { body, endpoint } from "../../../../../lib/server/http";
import { recommendOutfit, stylistInput } from "../../../../../lib/server/fashion";
import { requireAiStylist } from "../../../../../lib/server/features";
export const dynamic = "force-dynamic";
export const POST = endpoint(async req => { await requireAiStylist(); return recommendOutfit(await body(req, stylistInput)); });
