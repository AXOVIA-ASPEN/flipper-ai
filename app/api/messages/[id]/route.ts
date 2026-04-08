import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from '@/lib/errors';
import { checkFeatureAccess } from '@/lib/tier-enforcement';
import { dispatchMessage } from '@/lib/message-dispatcher';
interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/messages/:id - Get a single message
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;
    const message = await prisma.message.findFirst({
      where: { id, userId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            platform: true,
            askingPrice: true,
            imageUrls: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error('Error fetching message:', error);
    return handleError(error);
  }
}

// PATCH /api/messages/:id - Approve, confirm, edit, or reject a message
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.message.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundError('Message not found');
    }

    const body = await request.json();
    const { action, body: newBody, subject: newSubject } = body;

    if (!action) {
      throw new ValidationError('Missing required field: action (approve, edit, reject, confirm)');
    }

    const validActions = ['approve', 'edit', 'reject', 'confirm'];
    if (!validActions.includes(action)) {
      throw new ValidationError(`Invalid action: ${action}. Must be: ${validActions.join(', ')}`);
    }

    // User + tier lookup for feature gating
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } });
    const userTier = user?.subscriptionTier;

    let updateData: Record<string, unknown> = {};
    const expectedStatus = existing.status;

    switch (action) {
      case 'approve': {
        if (existing.status !== 'DRAFT') throw new ConflictError('Can only approve DRAFT messages');
        const tierCheck = checkFeatureAccess(userTier, 'messaging');
        if (!tierCheck.allowed) throw new ForbiddenError(tierCheck.reason || 'Messaging requires Flipper plan');
        const settings = await prisma.userSettings.findUnique({ where: { userId }, select: { messageApprovalRequired: true } });
        // null settings = new user = no approval gate
        if (settings?.messageApprovalRequired) {
          updateData = { status: 'PENDING_APPROVAL' };
        } else {
          updateData = { status: 'SENT', sentAt: new Date() };
        }
        break;
      }
      case 'confirm': {
        if (existing.status !== 'PENDING_APPROVAL') throw new ConflictError('Only PENDING_APPROVAL messages can be confirmed');
        const tierCheck = checkFeatureAccess(userTier, 'messaging');
        if (!tierCheck.allowed) throw new ForbiddenError(tierCheck.reason || 'Messaging requires Flipper plan');
        updateData = { status: 'SENT', sentAt: new Date() };
        break;
      }
      case 'edit': {
        if (existing.status !== 'DRAFT') throw new ConflictError('Can only edit DRAFT messages');
        if (newBody === undefined && newSubject === undefined) throw new ValidationError('Edit requires body or subject');
        if (newBody !== undefined && newBody.trim() === '') throw new ValidationError('Message body cannot be empty');
        const sanitizedBody = newBody ? newBody.replace(/<[^>]*>/g, '').slice(0, 2000) : undefined;
        if (sanitizedBody !== undefined && sanitizedBody.trim() === '') throw new ValidationError('Message body cannot be empty after removing HTML');
        const sanitizedSubject = newSubject ? newSubject.replace(/<[^>]*>/g, '').slice(0, 200) : undefined;
        updateData = {
          ...(sanitizedBody !== undefined ? { body: sanitizedBody } : {}),
          ...(sanitizedSubject !== undefined ? { subject: sanitizedSubject } : {}),
          status: 'DRAFT',
        };
        break;
      }
      case 'reject': {
        if (existing.status === 'DRAFT') {
          updateData = { status: 'REJECTED' }; // Terminal
        } else if (existing.status === 'PENDING_APPROVAL') {
          updateData = { status: 'DRAFT' }; // Recoverable — can edit and re-approve
        } else {
          throw new ConflictError(`Cannot reject message with status: ${existing.status}`);
        }
        break;
      }
    }

    // Atomic update — updateMany supports non-PK in where; update() does NOT
    const result = await prisma.message.updateMany({ where: { id, userId, status: expectedStatus }, data: updateData });
    if (result.count === 0) throw new ConflictError('Message status changed. Refresh and try again.');

    // Fetch updated record for response
    const updated = await prisma.message.findUnique({
      where: { id },
      include: { listing: { select: { id: true, title: true, platform: true, askingPrice: true, updatedAt: true } } },
    });

    // Fire-and-forget dispatch
    if (updated?.status === 'SENT') {
      dispatchMessage(id).catch(err => console.error('[dispatch]', err));
    }

    return NextResponse.json({
      success: true,
      data: updated,
      action,
      nextAction: updated?.status === 'PENDING_APPROVAL' ? 'confirm' : null,
    });
  } catch (error) {
    console.error('Error updating message:', error);
    return handleError(error);
  }
}

// DELETE /api/messages/:id - Delete a message
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;

    const existing = await prisma.message.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundError('Message not found');
    }

    await prisma.message.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return handleError(error);
  }
}
