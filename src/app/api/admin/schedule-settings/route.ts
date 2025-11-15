import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ScheduleSettings } from "@/types";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const settings = await db.collection("settings").findOne({});

    
    if (!settings) {
      return NextResponse.json({
        leadTimeDays: 3,
        ordersPerDayLimit: 5,
        blockedDates: [],
        defaultAvailableHours: [],
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}


export async function PUT(request: NextRequest) {
  try {
    const body: Partial<ScheduleSettings> = await request.json();
    const {
      leadTimeDays,
      defaultWorkMinutes,
      dateOverrides,
      defaultAvailableHours,
    } = body;

    // Basic validation
    if (typeof leadTimeDays !== 'number' || typeof defaultWorkMinutes !== 'number') {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);


    const updateData = {
      leadTimeDays,
      defaultWorkMinutes,
      defaultAvailableHours: defaultAvailableHours || [],
      dateOverrides:
        dateOverrides?.map((override) => ({
          ...override,
          date: new Date(override.date),
          availableHours: override.availableHours || [],
        })) || [],
    };


    await db.collection('settings').updateOne(
      {},
      { $set: updateData },
      { upsert: true }
    );
    
    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
