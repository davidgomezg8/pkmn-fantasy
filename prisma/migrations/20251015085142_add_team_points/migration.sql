-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Team" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Team" ("id", "leagueId", "userId") SELECT "id", "leagueId", "userId" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
