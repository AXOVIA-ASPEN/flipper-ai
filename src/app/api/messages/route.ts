import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

// GET /api/messages - Get all messages for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/messages - Create a new message
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json(
        { error: 'Missing required fields: messageBody, direction' },
        { status: 400 }
      );
    }

    if (direction !== 'INBOUND' && direction !== 'OUTBOUND') {
      return NextResponse.json({ error: 'direction must be INBOUND or OUTBOUND' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        userId,
        listingId: listingId || null,
        direction,
        status: msgStatus || (direction === 'OUTBOUND' ? 'DRAFT' : 'DELIVERED'),
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
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
