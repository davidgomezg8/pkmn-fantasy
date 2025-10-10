import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

// Function to generate a unique 6-character alphanumeric code
const generateUniqueCode = async (): Promise<string> => {
  let code;
  let isUnique = false;
  while (!isUnique) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existingLeague = await prisma.league.findUnique({ where: { joinCode: code } });
    if (!existingLeague) {
      isUnique = true;
    }
  }
  return code;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { name, maxPlayers } = await request.json();
    const creatorId = parseInt((session.user as any).id, 10);

    if (!name || !maxPlayers) {
      return NextResponse.json({ message: 'Nombre de liga y número máximo de jugadores son requeridos.' }, { status: 400 });
    }

    if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 10) { // Example limits
      return NextResponse.json({ message: 'El número máximo de jugadores debe ser entre 2 y 10.' }, { status: 400 });
    }

    const joinCode = await generateUniqueCode();

    const newLeague = await prisma.league.create({
      data: {
        name,
        creatorId,
        maxPlayers,
        joinCode,
      },
    });

    // Automatically add the creator as a member of their own league
    await prisma.team.create({
      data: {
        userId: creatorId,
        leagueId: newLeague.id,
      },
    });

    return NextResponse.json({ message: 'Liga creada exitosamente.', league: newLeague }, { status: 201 });

  } catch (error) {
    console.error('Error al crear la liga:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
