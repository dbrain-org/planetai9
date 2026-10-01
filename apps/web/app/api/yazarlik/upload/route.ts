import { saveImageUpload } from "@/lib/imageUpload";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return saveImageUpload(req, "authors", "avatar");
}
