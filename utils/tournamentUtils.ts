import { Match, MatchStatus, Stage, Team, TournamentType } from "../types";

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const calculateStandings = (teams: Team[], matches: Match[]): Team[] => {
  // Reset stats
  const newTeams = teams.map(t => ({
    ...t,
    stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
  }));

  // Only GROUP matches count for league table
  const finishedMatches = matches.filter(m => m.status === MatchStatus.FINISHED && m.stage === Stage.GROUP);

  finishedMatches.forEach(match => {
    const home = newTeams.find(t => t.id === match.homeTeamId);
    const away = newTeams.find(t => t.id === match.awayTeamId);

    if (home && away && match.homeScore !== null && match.awayScore !== null) {
      home.stats.played++;
      away.stats.played++;

      home.stats.gf += match.homeScore;
      home.stats.ga += match.awayScore;
      away.stats.gf += match.awayScore;
      away.stats.ga += match.homeScore;

      if (match.homeScore > match.awayScore) {
        home.stats.won++;
        home.stats.points += 3;
        away.stats.lost++;
      } else if (match.homeScore < match.awayScore) {
        away.stats.won++;
        away.stats.points += 3;
        home.stats.lost++;
      } else {
        home.stats.drawn++;
        home.stats.points += 1;
        away.stats.drawn++;
        away.stats.points += 1;
      }
      
      home.stats.gd = home.stats.gf - home.stats.ga;
      away.stats.gd = away.stats.gf - away.stats.ga;
    }
  });

  // Sort: Points > GD > GF
  return newTeams.sort((a, b) => {
    if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
    if (b.stats.gd !== a.stats.gd) return b.stats.gd - a.stats.gd;
    return b.stats.gf - a.stats.gf;
  });
};

export const generateFixtures = (teams: Team[], type: TournamentType): Match[] => {
  const matches: Match[] = [];

  if (type === TournamentType.LEAGUE) {
    // Round Robin
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: generateId(),
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
          homeScore: null,
          awayScore: null,
          status: MatchStatus.SCHEDULED,
          stage: Stage.GROUP,
          group: 'LEAGUE'
        });
      }
    }
  } else if (type === TournamentType.GROUPS_KNOCKOUT) {
    // Group Stage Logic
    const groups = Array.from(new Set(teams.map(t => t.group).filter(Boolean))) as string[];
    
    groups.forEach(groupName => {
      const groupTeams = teams.filter(t => t.group === groupName);
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
           matches.push({
            id: generateId(),
            homeTeamId: groupTeams[i].id,
            awayTeamId: groupTeams[j].id,
            homeScore: null,
            awayScore: null,
            status: MatchStatus.SCHEDULED,
            stage: Stage.GROUP,
            group: groupName
          });
        }
      }
    });
  }
  
  return matches;
};

/**
 * Checks if a number is a power of 2
 */
const isPowerOfTwo = (n: number): boolean => {
  return n > 0 && (n & (n - 1)) === 0;
};

/**
 * Determines the first knockout round name based on the number of advancing teams.
 * @param numGroups - The number of groups in the tournament
 * @param advancingPerGroup - The number of teams advancing from each group
 * @returns The name of the first knockout round
 */
export const getFirstKnockoutRoundName = (numGroups: number, advancingPerGroup: number): string => {
  const totalAdvancing = numGroups * advancingPerGroup;

  // Safety check: if not a power of 2, it's a play-off round
  if (!isPowerOfTwo(totalAdvancing)) {
    return 'Play-off';
  }

  switch (totalAdvancing) {
    case 16:
      return 'Round of 16';
    case 8:
      return 'Quarter-finals';
    case 4:
      return 'Semi-finals';
    case 2:
      return 'Final';
    default:
      // For larger powers of 2 (32, 64, etc.)
      return `Round of ${totalAdvancing}`;
  }
};

// Helper to determine winner including penalties
export const getMatchWinner = (match: Match): string | null => {
    if (match.homeScore === null || match.awayScore === null) return null;
    if (match.homeScore > match.awayScore) return match.homeTeamId;
    if (match.awayScore > match.homeScore) return match.awayTeamId;
    
    // Draw - Check Penalties
    if (match.homePenalty !== undefined && match.awayPenalty !== undefined) {
         if (match.homePenalty > match.awayPenalty) return match.homeTeamId;
         if (match.awayPenalty > match.homePenalty) return match.awayTeamId;
    }
    return null;
};

export const updateTournamentKnockouts = (teams: Team[], matches: Match[], numGroups: number = 2, advancingPerGroup: number = 2): Match[] => {
    const updatedMatches = [...matches];
    
    const groupMatches = updatedMatches.filter(m => m.stage === Stage.GROUP);
    const allGroupsFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === MatchStatus.FINISHED);

    if (!allGroupsFinished) {
        return updatedMatches; // Still in group stage
    }

    // Get all qualified teams from groups
    const sortedTeams = calculateStandings(teams, updatedMatches);
    const qualifiedTeams: Team[] = [];
    
    // Get unique group names
    const groupNames = Array.from(new Set(teams.map(t => t.group).filter(Boolean))) as string[];
    
    // Get top N teams from each group
    groupNames.forEach(groupName => {
        const groupTeams = sortedTeams.filter(t => t.group === groupName);
        qualifiedTeams.push(...groupTeams.slice(0, advancingPerGroup));
    });

    const totalQualified = qualifiedTeams.length;

    const needsRoundOf16 = totalQualified === 16;
    const needsQuarterFinals = totalQualified >= 8;
    const needsSemiFinals = totalQualified >= 4;
    const needsFinal = totalQualified >= 2;

    const hasRoundOf16 = updatedMatches.some(m => m.stage === Stage.ROUND_OF_16);
    const hasQuarters = updatedMatches.some(m => m.stage === Stage.QUARTER_FINAL);
    const hasSemis = updatedMatches.some(m => m.stage === Stage.SEMI_FINAL);
    const hasFinal = updatedMatches.some(m => m.stage === Stage.FINAL);

    const getFinishedWinners = (stage: Stage, expectedMatches: number): Team[] | null => {
        const stageMatches = updatedMatches.filter(m => m.stage === stage);
        if (stageMatches.length !== expectedMatches) return null;
        if (!stageMatches.every(m => m.status === MatchStatus.FINISHED)) return null;

        const winners = stageMatches.map(match => {
            const winnerId = getMatchWinner(match);
            return winnerId ? teams.find(t => t.id === winnerId) ?? null : null;
        });

        if (winners.some(winner => winner === null)) {
            return null;
        }

        return winners as Team[];
    };

    // --- Generate Round of 16 ---
    if (needsRoundOf16 && !hasRoundOf16) {
        for (let i = 0; i < 8; i++) {
            updatedMatches.push({
                id: generateId(),
                homeTeamId: qualifiedTeams[i].id,
                awayTeamId: qualifiedTeams[15 - i].id,
                homeScore: null,
                awayScore: null,
                status: MatchStatus.SCHEDULED,
                stage: Stage.ROUND_OF_16
            });
        }
        return updatedMatches;
    }

    // --- Generate Quarter Finals ---
    if (needsQuarterFinals && !hasQuarters) {
        const quarterTeams = needsRoundOf16
            ? getFinishedWinners(Stage.ROUND_OF_16, 8)
            : totalQualified === 8
                ? qualifiedTeams
                : null;

        if (!quarterTeams || quarterTeams.length !== 8) {
            return updatedMatches;
        }

        for (let i = 0; i < 4; i++) {
            updatedMatches.push({
                id: generateId(),
                homeTeamId: quarterTeams[i].id,
                awayTeamId: quarterTeams[7 - i].id,
                homeScore: null,
                awayScore: null,
                status: MatchStatus.SCHEDULED,
                stage: Stage.QUARTER_FINAL
            });
        }
        return updatedMatches;
    }

    // --- Generate Semi Finals ---
    if (needsSemiFinals && !hasSemis) {
        const semiTeams = totalQualified === 4
            ? qualifiedTeams
            : getFinishedWinners(Stage.QUARTER_FINAL, 4);

        if (!semiTeams || semiTeams.length !== 4) {
            return updatedMatches;
        }

        updatedMatches.push({
            id: generateId(),
            homeTeamId: semiTeams[0].id,
            awayTeamId: semiTeams[3].id,
            homeScore: null,
            awayScore: null,
            status: MatchStatus.SCHEDULED,
            stage: Stage.SEMI_FINAL
        });
        updatedMatches.push({
            id: generateId(),
            homeTeamId: semiTeams[1].id,
            awayTeamId: semiTeams[2].id,
            homeScore: null,
            awayScore: null,
            status: MatchStatus.SCHEDULED,
            stage: Stage.SEMI_FINAL
        });
        return updatedMatches;
    }

    // --- Generate Final ---
    if (needsFinal && !hasFinal) {
        const finalists = totalQualified === 2
            ? qualifiedTeams
            : getFinishedWinners(Stage.SEMI_FINAL, 2);

        if (!finalists || finalists.length !== 2) {
            return updatedMatches;
        }

        updatedMatches.push({
            id: generateId(),
            homeTeamId: finalists[0].id,
            awayTeamId: finalists[1].id,
            homeScore: null,
            awayScore: null,
            status: MatchStatus.SCHEDULED,
            stage: Stage.FINAL
        });
    }

    return updatedMatches;
};
