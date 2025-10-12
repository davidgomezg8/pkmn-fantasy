-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pokemon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pokemonId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "special_attack" INTEGER NOT NULL,
    "special_defense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "nickname" TEXT,
    "leagueId" INTEGER,
    "teamId" INTEGER,
    "moves" JSONB NOT NULL DEFAULT [],
    CONSTRAINT "Pokemon_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pokemon_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pokemon" ("attack", "defense", "hp", "id", "image", "leagueId", "name", "nickname", "order", "pokemonId", "special_attack", "special_defense", "speed", "teamId") SELECT "attack", "defense", "hp", "id", "image", "leagueId", "name", "nickname", "order", "pokemonId", "special_attack", "special_defense", "speed", "teamId" FROM "Pokemon";
DROP TABLE "Pokemon";
ALTER TABLE "new_Pokemon" RENAME TO "Pokemon";
CREATE UNIQUE INDEX "Pokemon_pokemonId_key" ON "Pokemon"("pokemonId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
