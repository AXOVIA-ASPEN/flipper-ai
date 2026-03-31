import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { handleError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { recordUsage } from '@/lib/usage-tracker';

/**
 * Fetches the job and verifies the current user owns it.
 * Allows legacy null-userId jobs for any authenticated user.
 */
async function fetchAndAuthorize(id: string, userId: string) {
  const job = await prisma.scraperJob.findUnique({ where: { id } });
  if (!job) throw new NotFoundError('Scraper job not found');
  // Allow legacy jobs that predate userId tracking
  if (job.userId != null && job.userId !== userId) {
    throw new ForbiddenError('Access denied');
  }
  return job;
}

// GET /api/scraper-jobs/[id] - Get a single scraper job
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthUserId();
    if (!userId) throw new UnauthorizedError('Authentication required');

    const { id } = await params;
    const job = await fetchAndAuthorize(id, userId);
    return NextResponse.json(job);
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/scraper-jobs/[id] - Update a scraper job
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthUserId();
    if (!userId) throw new UnauthorizedError('Authentication required');

    const { id } = await params;
    const existingJob = await fetchAndAuthorize(id, userId);
    const previousStatus = existingJob.status;

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
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

    const updatedJob = await prisma.scraperJob.update({
      where: { id },
      data: updateData,
    });

    // Record scan usage when job completes — non-blocking (once per job, not on repeat COMPLETED)
    if (body.status === 'COMPLETED' && previousStatus !== 'COMPLETED') {
      try {
        await recordUsage(userId, 'SCAN');
      } catch (usageError) {
        console.error('[Usage Tracker] Failed to record scan usage:', usageError);
      }
    }

    return NextResponse.json(updatedJob);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/scraper-jobs/[id] - Delete a scraper job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) throw new UnauthorizedError('Authentication required');

    const { id } = await params;
    await fetchAndAuthorize(id, userId);

    await prisma.scraperJob.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
