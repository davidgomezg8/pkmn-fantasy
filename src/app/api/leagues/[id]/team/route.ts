import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '../../../auth/[...nextauth]/route'; // Import authOptions

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('[GET /api/leagues/[id]/team] Request received.');
  const session = await getServerSession(authOptions); // Pass authOptions here
  if (!session || !session.user) {
    console.error('[GET /api/leagues/[id]/team] Unauthorized: No session or user.');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const leagueId = parseInt(params.id);
  // @ts-ignore
  const userId = parseInt(session.user.id);
  
  console.log(`[GET /api/leagues/[id]/team] Searching for team with leagueId: ${leagueId}, userId: ${userId}`);

  if (isNaN(leagueId) || isNaN(userId)) {
    console.error(`[GET /api/leagues/[id]/team] Invalid IDs: leagueId=${leagueId}, userId=${userId}`);
    return NextResponse.json({ message: 'Invalid league or user ID' }, { status: 400 });
  }

  try {
    const team = await prisma.team.findFirst({
      where: {
        leagueId: leagueId,
        userId: userId,
      },
      include: {
        pokemons: true, // Include the Pokémon on the team
      },
    });

    if (!team) {
      console.warn(`[GET /api/leagues/[id]/team] No team found for userId: ${userId} in leagueId: ${leagueId}`);
      return NextResponse.json({ message: 'Team not found for this user in this league' }, { status: 404 });
    }

    console.log(`[GET /api/leagues/[id]/team] Team found:`, team);
    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching user team:', error);
    return NextResponse.json({ message: 'Error fetching user team' }, { status: 500 });
  }
}
