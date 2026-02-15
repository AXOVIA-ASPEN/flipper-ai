import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/messages/:id - Get a single message
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json({ error: 'Failed to fetch message' }, { status: 500 });
  }
}

// PATCH /api/messages/:id - Approve, edit, or reject a message
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.message.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, body: newBody, subject: newSubject } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action (approve, edit, reject)' },
        { status: 400 }
      );
    }

    const validActions = ['approve', 'edit', 'reject'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Only DRAFT or PENDING messages can be approved/edited/rejected
    const modifiableStatuses = ['DRAFT', 'PENDING', 'PENDING_APPROVAL'];
    if (!modifiableStatuses.includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot ${action} a message with status: ${existing.status}. Must be DRAFT, PENDING, or PENDING_APPROVAL.` },
        { status: 409 }
      );
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'approve':
        updateData = {
          status: 'SENT',
          sentAt: new Date(),
        };
        break;

      case 'edit':
        if (!newBody && !newSubject) {
          return NextResponse.json(
            { error: 'Edit action requires at least one of: body, subject' },
            { status: 400 }
          );
        }
        updateData = {
          ...(newBody && { body: newBody }),
          ...(newSubject && { subject: newSubject }),
          status: 'DRAFT', // Reset to draft after edit
        };
        break;

      case 'reject':
        updateData = {
          status: 'REJECTED',
        };
        break;
    }

    const updated = await prisma.message.update({
      where: { id },
      data: updateData,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            platform: true,
            askingPrice: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      action,
    });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

// DELETE /api/messages/:id - Delete a message
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.message.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    await prisma.message.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
