import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid promotion ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rewardPerShare, status, sharesCount, remainingBudget } = body;

    // Validate that at least one field is provided
    if (!rewardPerShare && !status && sharesCount === undefined && remainingBudget === undefined) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (rewardPerShare !== undefined) updateData.rewardPerShare = rewardPerShare;
    if (status !== undefined) updateData.status = status;
    if (sharesCount !== undefined) updateData.sharesCount = sharesCount;
    if (remainingBudget !== undefined) updateData.remainingBudget = remainingBudget;

    // Update promotion
    const updatedPromotion = await db.updatePromotion(id, updateData);
    
    if (!updatedPromotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ promotion: updatedPromotion });
  } catch (error) {
    console.error('Error updating promotion:', error);
    return NextResponse.json(
      { error: 'Failed to update promotion' },
      { status: 500 }
    );
  }
} 