import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const battleId = parseInt(id, 10);

    if (isNaN(battleId)) {
      return NextResponse.json({ message: 'ID de batalla inválido' }, { status: 400 });
    }

    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        trainerA: { include: { user: true, pokemons: true } },
        trainerB: { include: { user: true, pokemons: true } },
      },
    });

    if (!battle) {
      return NextResponse.json({ message: 'Batalla no encontrada' }, { status: 404 });
    }

    const result = {
        id: battle.id,
        leagueId: battle.leagueId,
        trainerAId: battle.trainerAId,
        trainerBId: battle.trainerBId,
        winnerId: battle.winnerId,
        trainerA: {
            id: battle.trainerA.id,
            name: battle.trainerA.user.email,
            team: battle.trainerA.pokemons
        },
        trainerB: {
            id: battle.trainerB.id,
            name: battle.trainerB.user.email,
            team: battle.trainerB.pokemons
        },
        powerA: battle.powerA,
        powerB: battle.powerB,
        createdAt: battle.createdAt,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching battle result:', error);
    return NextResponse.json({ message: 'Error al obtener el resultado de la batalla' }, { status: 500 });
  }
}