import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/scraper-jobs/[id] - Get a single scraper job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await prisma.scraperJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Scraper job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error fetching scraper job:", error);
    return NextResponse.json(
      { error: "Failed to fetch scraper job" },
      { status: 500 }
    );
  }
}

// PATCH /api/scraper-jobs/[id] - Update a scraper job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses = ["PENDING", "RUNNING", "COMPLETED", "FAILED"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    if (body.listingsFound !== undefined) {
      updateData.listingsFound = parseInt(body.listingsFound);
    }
    if (body.opportunitiesFound !== undefined) {
      updateData.opportunitiesFound = parseInt(body.opportunitiesFound);
    }
    if (body.errorMessage !== undefined) {
      updateData.errorMessage = body.errorMessage;
    }
    if (body.startedAt !== undefined) {
      updateData.startedAt = body.startedAt ? new Date(body.startedAt) : null;
    }
    if (body.completedAt !== undefined) {
      updateData.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    }

    const job = await prisma.scraperJob.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error updating scraper job:", error);
    return NextResponse.json(
      { error: "Failed to update scraper job" },
      { status: 500 }
    );
  }
}

// DELETE /api/scraper-jobs/[id] - Delete a scraper job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.scraperJob.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scraper job:", error);
    return NextResponse.json(
      { error: "Failed to delete scraper job" },
      { status: 500 }
    );
  }
}
