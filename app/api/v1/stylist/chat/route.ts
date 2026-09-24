import { body, endpoint } from "../../../../../lib/server/http";
import { recommendOutfit, stylistInput } from "../../../../../lib/server/fashion";
export const dynamic = "force-dynamic";
export const POST = endpoint(async req => recommendOutfit(await body(req, stylistInput)));