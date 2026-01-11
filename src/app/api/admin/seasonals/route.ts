import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from "next/cache";
import clientPromise from '@/lib/db'
import { SeasonalEvent } from '@/types'
import { slugify } from '@/lib/utils'


export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME)

        const seasonals = await db.collection("seasonals")
            .find({})
            .sort({ startDate: -1 })
            .toArray();
        return NextResponse.json(seasonals)
    } catch (error) {
        return NextResponse.json({error: "Internal SXerver Error"}, {status: 500})
    }
}


export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const {
        name,
        description,
        heroBannerUrl,
        themeColor,
        startDate,
        endDate,
        isActive,
      }: Partial<SeasonalEvent> = body;
      if (!name || !startDate || !endDate) {
        return NextResponse.json(
          { error: "Name and Dates are required" },
          { status: 400 }
        );
      }

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME);
      const slug = slugify(name);

      const newSeasonalData = {
        name,
        slug,
        description: description || "",
        heroBannerUrl: heroBannerUrl || "",
        themeColor: themeColor || "#f6dcda",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive ?? false,
      };

      const result = await db
        .collection("seasonals")
        .insertOne(newSeasonalData);

      revalidatePath("/", "page");

      return NextResponse.json(
        {
          message: "Seasonal event created",
          _id: result.insertedId,
          ...newSeasonalData,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating seasonal event:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
}