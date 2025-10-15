import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Import authOptions

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions); // Pass authOptions here
  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const leagueId = parseInt(params.id);
  const { teamId, pokemonToSignId, pokemonToDropId } = await request.json();

  if (!teamId || !pokemonToSignId || !pokemonToDropId) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  try {
    // 1. Verify the team belongs to the current user and league
    const team = await prisma.team.findFirst({
        where: {
            id: teamId,
            leagueId: leagueId,
            // @ts-expect-error: NextAuth session.user.id type mismatch
            userId: parseInt(session.user.id as string),
        }
    });

    if (!team) {
        return NextResponse.json({ message: 'Team not found or not owned by user' }, { status: 403 });
    }

    // 2. Use a transaction to perform the swap
    const [droppedPokemon, signedPokemon] = await prisma.$transaction([
      // First, release the pokemon from the team
      prisma.pokemon.update({
        where: {
          id: pokemonToDropId,
          teamId: teamId, // Ensure we are dropping a pokemon from the correct team
        },
        data: {
          teamId: null,
        },
      }),
      // Second, sign the new pokemon to the team
      prisma.pokemon.update({
        where: {
          id: pokemonToSignId,
          leagueId: leagueId,
          teamId: null, // Ensure we are signing a free agent
        },
        data: {
          teamId: teamId,
        },
      }),
    ]);

    return NextResponse.json({ message: 'Swap successful', signedPokemon, droppedPokemon });

  } catch (error) {
    console.error('Error signing free agent:', error);
    // The transaction will automatically roll back on error
    return NextResponse.json({ message: 'Error signing free agent' }, { status: 500 });
  }
}
