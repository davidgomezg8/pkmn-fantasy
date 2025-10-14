/*
  Warnings:

  - Added the required column `log` to the `Battle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pokemonAState` to the `Battle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pokemonBState` to the `Battle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `turnOrder` to the `Battle` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Battle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leagueId" INTEGER NOT NULL,
    "trainerAId" INTEGER NOT NULL,
    "trainerBId" INTEGER NOT NULL,
    "winnerId" INTEGER,
    "powerA" INTEGER NOT NULL,
    "powerB" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currentTurn" INTEGER NOT NULL DEFAULT 0,
    "log" JSONB NOT NULL,
    "pokemonAState" JSONB NOT NULL,
    "pokemonBState" JSONB NOT NULL,
    "activePokemonAId" INTEGER,
    "activePokemonBId" INTEGER,
    "turnOrder" JSONB NOT NULL,
    CONSTRAINT "Battle_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Battle_trainerAId_fkey" FOREIGN KEY ("trainerAId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Battle_trainerBId_fkey" FOREIGN KEY ("trainerBId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Battle" ("createdAt", "id", "leagueId", "powerA", "powerB", "trainerAId", "trainerBId", "winnerId") SELECT "createdAt", "id", "leagueId", "powerA", "powerB", "trainerAId", "trainerBId", "winnerId" FROM "Battle";
DROP TABLE "Battle";
ALTER TABLE "new_Battle" RENAME TO "Battle";
CREATE INDEX "Battle_leagueId_idx" ON "Battle"("leagueId");
CREATE INDEX "Battle_trainerAId_idx" ON "Battle"("trainerAId");
CREATE INDEX "Battle_trainerBId_idx" ON "Battle"("trainerBId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
