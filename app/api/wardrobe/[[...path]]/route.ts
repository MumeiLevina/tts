import { NextRequest } from "next/server";
import { ApiError, body, endpoint } from "../../../../lib/server/http";
import { listSavedProducts, removeSavedProduct, toggleInput, toggleSavedProduct, wardrobeRecommendations } from "../../../../lib/server/product-wardrobe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function dispatch(req: NextRequest, context: { params: { path?: string[] } }) {
  return endpoint(async (request, { user }) => {
    const path = context.params.path || [];
    // All owner IDs come from the authenticated account, never URL/body input.
    if (req.method === "GET" && !path.length) return listSavedProducts(user!.id, request.nextUrl.searchParams);
    if (req.method === "POST" && path.length === 1 && path[0] === "toggle") return toggleSavedProduct(user!.id, await body(request, toggleInput));
    if (req.method === "GET" && path.length === 1 && path[0] === "recommendations") return wardrobeRecommendations(user!.id, request.nextUrl.searchParams);
    if (req.method === "DELETE" && path.length === 1 && !["toggle", "recommendations"].includes(path[0])) return removeSavedProduct(user!.id, path[0]);
    throw new ApiError(405, "METHOD_NOT_ALLOWED", "Phương thức hoặc đường dẫn không hợp lệ.");
  }, { auth: true })(req);
}
export { dispatch as GET, dispatch as POST, dispatch as DELETE };
