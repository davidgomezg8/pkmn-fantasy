-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proposingTeamId" INTEGER NOT NULL,
    "targetTeamId" INTEGER NOT NULL,
    "offeredPokemonId" INTEGER NOT NULL,
    "requestedPokemonId" INTEGER NOT NULL,
    "moves" JSONB NOT NULL DEFAULT [],
    CONSTRAINT "Trade_proposingTeamId_fkey" FOREIGN KEY ("proposingTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_targetTeamId_fkey" FOREIGN KEY ("targetTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_offeredPokemonId_fkey" FOREIGN KEY ("offeredPokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_requestedPokemonId_fkey" FOREIGN KEY ("requestedPokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("createdAt", "id", "offeredPokemonId", "proposingTeamId", "requestedPokemonId", "status", "targetTeamId") SELECT "createdAt", "id", "offeredPokemonId", "proposingTeamId", "requestedPokemonId", "status", "targetTeamId" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
