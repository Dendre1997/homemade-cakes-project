import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    // Enforce max 3 images from the backend
    if (files.length > 3) {
      return NextResponse.json({ error: "Maximum 3 images allowed" }, { status: 400 });
    }

    const uploadPromises = files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Convert buffer to Data URI format for Cloudinary
      const base64Data = buffer.toString("base64");
      const fileUri = `data:${file.type || "image/jpeg"};base64,${base64Data}`;

      const res = await cloudinary.uploader.upload(fileUri, {
        folder: "custom_orders",
        resource_type: "auto",
      });
      
      return res.secure_url;
    });

    const urls = await Promise.all(uploadPromises);

    return NextResponse.json({ success: true, urls }, { status: 200 });
  } catch (error: any) {
    console.error("Custom Order Reference Upload Error:", error);
    return NextResponse.json(
      { error: "Failed to upload images", details: error.message },
      { status: 500 }
    );
  }
}
