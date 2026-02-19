import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
// GET /api/messages - Get all messages for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction'); // INBOUND or OUTBOUND
    const status = searchParams.get('status');
    const listingId = searchParams.get('listingId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = { userId };

    if (direction && (direction === 'INBOUND' || direction === 'OUTBOUND')) {
      where.direction = direction;
    }
    if (status) where.status = status;
    if (listingId) where.listingId = listingId;
    if (search) {
      where.OR = [
        { body: { contains: search } },
        { subject: { contains: search } },
        { sellerName: { contains: search } },
      ];
    }

    const validSortFields = ['createdAt', 'status', 'direction', 'sellerName'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        take: limit,
        skip: offset,
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
      }),
      prisma.message.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch messages');
  }
}

// POST /api/messages - Create a new message
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const body = await request.json();
    const {
      listingId,
      direction,
      subject,
      messageBody,
      sellerName,
      sellerContact,
      platform,
      parentId,
      status: msgStatus,
    } = body;

    if (!messageBody || !direction) {
      throw new ValidationError('Missing required fields: messageBody, direction');
    }

    if (direction !== 'INBOUND' && direction !== 'OUTBOUND') {
      throw new ValidationError('direction must be INBOUND or OUTBOUND');
    }

    const message = await prisma.message.create({
      data: {
        userId,
        listingId: listingId || null,
        direction,
        status: msgStatus || (direction === 'OUTBOUND' ? 'PENDING_APPROVAL' : 'DELIVERED'),
        subject: subject || null,
        body: messageBody,
        sellerName: sellerName || null,
        sellerContact: sellerContact || null,
        platform: platform || null,
        parentId: parentId || null,
        sentAt: direction === 'OUTBOUND' && msgStatus === 'SENT' ? new Date() : null,
      },
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

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create message');
  }
}
