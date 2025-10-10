-- CreateTable
CREATE TABLE "Trade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proposingTeamId" INTEGER NOT NULL,
    "targetTeamId" INTEGER NOT NULL,
    "offeredPokemonId" INTEGER NOT NULL,
    "requestedPokemonId" INTEGER NOT NULL,
    CONSTRAINT "Trade_proposingTeamId_fkey" FOREIGN KEY ("proposingTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_targetTeamId_fkey" FOREIGN KEY ("targetTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_offeredPokemonId_fkey" FOREIGN KEY ("offeredPokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_requestedPokemonId_fkey" FOREIGN KEY ("requestedPokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
