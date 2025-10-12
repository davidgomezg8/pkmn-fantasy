-- CreateTable
CREATE TABLE "Battle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leagueId" INTEGER NOT NULL,
    "trainerAId" INTEGER NOT NULL,
    "trainerBId" INTEGER NOT NULL,
    "winnerId" INTEGER,
    "powerA" INTEGER NOT NULL,
    "powerB" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Battle_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Battle_trainerAId_fkey" FOREIGN KEY ("trainerAId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Battle_trainerBId_fkey" FOREIGN KEY ("trainerBId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Battle_leagueId_idx" ON "Battle"("leagueId");

-- CreateIndex
CREATE INDEX "Battle_trainerAId_idx" ON "Battle"("trainerAId");

-- CreateIndex
CREATE INDEX "Battle_trainerBId_idx" ON "Battle"("trainerBId");
