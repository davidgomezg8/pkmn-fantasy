import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions); // Pass authOptions here
  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  } 
  
    try {
      const currentUserId = parseInt(session.user.id as string, 10);
    if (isNaN(currentUserId)) {
        return NextResponse.json({ message: 'Invalid user ID in session.' }, { status: 400 });
    }

    // Find all teams for the current user
    const userTeams = await prisma.team.findMany({
        where: { userId: currentUserId },
        select: { id: true }
    });
    const userTeamIds = userTeams.map(t => t.id);

    // Find all trades where the user's teams are involved
    const trades = await prisma.trade.findMany({
        where: {
            OR: [
                { proposingTeamId: { in: userTeamIds } },
                { targetTeamId: { in: userTeamIds } },
            ]
        },
        include: {
            proposingTeam: { include: { user: true } },
            targetTeam: { include: { user: true } },
            offeredPokemon: true,
            requestedPokemon: true,
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return NextResponse.json(trades);

  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ message: 'Error fetching trades' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions); // Pass authOptions here
  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      proposingTeamId,
      targetTeamId,
      offeredPokemonId,
      requestedPokemonId
    } = await request.json();

    // --- Validation Start ---

    // 1. Basic validation
    if (!proposingTeamId || !targetTeamId || !offeredPokemonId || !requestedPokemonId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // @ts-expect-error: NextAuth session.user.id type mismatch
    const currentUserId = parseInt(session.user.id as string, 10);

    // 2. Check if proposingTeamId belongs to the current user
    const proposingTeam = await prisma.team.findFirst({
        where: { id: proposingTeamId, userId: currentUserId },
        include: { pokemons: true }
    });
    if (!proposingTeam) {
        return NextResponse.json({ message: 'You do not own the proposing team.' }, { status: 403 });
    }

    // 3. Check if offeredPokemonId belongs to proposingTeamId
    if (!proposingTeam.pokemons.some(p => p.id === offeredPokemonId)) {
        return NextResponse.json({ message: 'Offered Pokémon does not belong to your team.' }, { status: 400 });
    }

    // 4. Check if requestedPokemonId belongs to targetTeamId and get leagueId
    const targetTeam = await prisma.team.findFirst({
        where: { id: targetTeamId },
        include: { pokemons: true }
    });
    if (!targetTeam || !targetTeam.pokemons.some(p => p.id === requestedPokemonId)) {
        return NextResponse.json({ message: 'Requested Pokémon not found on the target team.' }, { status: 400 });
    }

    // 5. Check if both teams are in the same league
    if (proposingTeam.leagueId !== targetTeam.leagueId) {
        return NextResponse.json({ message: 'Teams are not in the same league.' }, { status: 400 });
    }

    // 6. Check if these pokemons are not already in another pending trade
    const existingTrade = await prisma.trade.findFirst({
        where: {
            status: 'PENDING',
            OR: [
                { offeredPokemonId: offeredPokemonId },
                { requestedPokemonId: offeredPokemonId },
                { offeredPokemonId: requestedPokemonId },
                { requestedPokemonId: requestedPokemonId },
            ]
        }
    });

    if (existingTrade) {
        return NextResponse.json({ message: 'One of the Pokémon is already in a pending trade.' }, { status: 409 });
    }

    // --- Validation End ---

    const newTrade = await prisma.trade.create({
      data: {
        proposingTeamId,
        targetTeamId,
        offeredPokemonId,
        requestedPokemonId,
        status: 'PENDING',
      }
    });

    return NextResponse.json(newTrade, { status: 201 });

  } catch (error) {
    console.error('Error creating trade proposal:', error);
    return NextResponse.json({ message: 'Error creating trade proposal' }, { status: 500 });
  }
}