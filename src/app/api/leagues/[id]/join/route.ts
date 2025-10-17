import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request, { params }) {
  const awaitedParams = await params;
  const leagueId = parseInt(awaitedParams.id);

  try {
    const { userId: userIdString } = await request.json();
    const userId = parseInt(userIdString, 10);

    console.log('Join League API - leagueId:', leagueId);
    console.log('Join League API - userId:', userId);

    if (isNaN(leagueId)) {
      return NextResponse.json({ message: 'ID de liga inválido.' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ message: 'ID de usuario es requerido.' }, { status: 400 });
    }

    // 1. Verificar que la liga y el usuario existan
    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!league) {
      return NextResponse.json({ message: 'La liga no existe.' }, { status: 404 });
    }
    if (!user) {
      return NextResponse.json({ message: 'El usuario no existe.' }, { status: 404 });
    }

    // 2. Comprobar si el usuario ya tiene un equipo en esta liga
    const existingTeam = await prisma.team.findFirst({
      where: {
        userId: userId,
        leagueId: leagueId,
      },
    });

    console.log('Join League API - existingTeam:', existingTeam);

    if (existingTeam) {
      return NextResponse.json({ message: 'Ya tienes un equipo en esta liga.' }, { status: 400 });
    }

    // 3. Crear un nuevo equipo para el usuario en esta liga
    const newTeam = await prisma.team.create({
      data: {
        userId: userId,
        leagueId: leagueId,
      },
    });

    console.log(`Usuario ${user.email} ha creado un equipo (ID: ${newTeam.id}) en la liga ${league.name}.`);

    return NextResponse.json({ message: `¡Has creado un equipo en ${league.name}!` });

  } catch (error) {
    console.error('Error al unirse a la liga:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}