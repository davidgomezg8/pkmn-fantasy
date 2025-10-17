import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { battleManager } from '@/lib/battle-manager';

interface Params {
  id: string;
}

export async function POST(request, { params }) {
  try {
    const { id } = context.params;
    const battleId = parseInt(id, 10);

    if (isNaN(battleId)) {
      return NextResponse.json({ error: 'Invalid Battle ID' }, { status: 400 });
    }

    await battleManager.acceptBattle(battleId);

    return NextResponse.json({ message: 'Battle accepted' }, { status: 200 });
  } catch (error) {
    console.error('Error accepting battle:', error);
    return NextResponse.json({ error: 'Failed to accept battle' }, { status: 500 });
  }
}
