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
    
    // Determine what knockout rounds we need
    const needsRoundOf16 = totalQualified === 16;
    const needsQuarterFinals = totalQualified === 8;
    const needsSemiFinals = totalQualified === 4;
    const needsFinalOnly = totalQualified === 2;

    const hasRoundOf16 = updatedMatches.some(m => m.stage === Stage.QUARTER_FINAL && totalQualified === 16);
    const hasQuarters = updatedMatches.some(m => m.stage === Stage.QUARTER_FINAL);
    const hasSemis = updatedMatches.some(m => m.stage === Stage.SEMI_FINAL);
    const hasFinal = updatedMatches.some(m => m.stage === Stage.FINAL);

    // --- Generate Round of 16 (if needed) ---
    if (needsRoundOf16 && !hasRoundOf16) {
        // Create 8 matches (16 teams)
        for (let i = 0; i < 8; i++) {
            updatedMatches.push({
                id: generateId(),
                homeTeamId: qualifiedTeams[i].id,
                awayTeamId: qualifiedTeams[15 - i].id,
                homeScore: null,
                awayScore: null,
                status: MatchStatus.SCHEDULED,
                stage: Stage.QUARTER_FINAL // Using QUARTER_FINAL stage for Round of 16
            });
        }
        return updatedMatches;
    }

    // --- Generate Quarter Finals ---
    if ((needsRoundOf16 || needsQuarterFinals) && !hasQuarters) {
        let quarterTeams: Team[] = [];
        
        if (needsRoundOf16) {
            // Get winners from Round of 16
            const roundOf16Matches = updatedMatches.filter(m => m.stage === Stage.QUARTER_FINAL && m.status === MatchStatus.FINISHED);
            if (roundOf16Matches.length !== 8) return updatedMatches; // Not all R16 finished
            
            roundOf16Matches.forEach(match => {
                const winnerId = getMatchWinner(match);
                if (winnerId) {
                    const winner = qualifiedTeams.find(t => t.id === winnerId);
                    if (winner) quarterTeams.push(winner);
                }
            });
        } else if (needsQuarterFinals) {
            quarterTeams = qualifiedTeams;
        }

        if (quarterTeams.length === 8) {
            // Create 4 quarter-final matches
            for (let i = 0; i < 4; i++) {
                updatedMatches.push({
                    id: generateId(),
                    homeTeamId: quarterTeams[i].id,
                    awayTeamId: quarterTeams[7 - i].id,
                    homeScore: null,
                    awayScore: null,
                    status: MatchStatus.SCHEDULED,
                    stage: needsRoundOf16 ? Stage.SEMI_FINAL : Stage.QUARTER_FINAL // Adjust stage based on structure
                });
            }
        }
        return updatedMatches;
    }

    // --- Generate Semi Finals ---
    if ((needsRoundOf16 || needsQuarterFinals || needsSemiFinals) && !hasSemis) {
        let semiTeams: Team[] = [];
        
        // Determine which matches to get winners from
        let previousMatches: Match[] = [];
        if (needsRoundOf16) {
            previousMatches = updatedMatches.filter(m => m.stage === Stage.SEMI_FINAL && m.status === MatchStatus.FINISHED);
        } else if (needsQuarterFinals) {
            previousMatches = updatedMatches.filter(m => m.stage === Stage.QUARTER_FINAL && m.status === MatchStatus.FINISHED);
        } else if (needsSemiFinals) {
            semiTeams = qualifiedTeams;
        }

        if (previousMatches.length > 0) {
            if (previousMatches.length !== 4) return updatedMatches; // Not all previous round finished
            
            previousMatches.forEach(match => {
                const winnerId = getMatchWinner(match);
                if (winnerId) {
                    const winner = teams.find(t => t.id === winnerId);
                    if (winner) semiTeams.push(winner);
                }
            });
        }

        if (semiTeams.length === 4) {
            // Create 2 semi-final matches
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
        }
        return updatedMatches;
    }

    // --- Generate Final ---
    if (!hasFinal) {
        let finalists: Team[] = [];
        
        if (needsFinalOnly) {
            finalists = qualifiedTeams;
        } else {
            const semiMatches = updatedMatches.filter(m => m.stage === Stage.SEMI_FINAL && m.status === MatchStatus.FINISHED);
            if (semiMatches.length !== 2) return updatedMatches; // Semis not finished
            
            semiMatches.forEach(match => {
                const winnerId = getMatchWinner(match);
                if (winnerId) {
                    const winner = teams.find(t => t.id === winnerId);
                    if (winner) finalists.push(winner);
                }
            });
        }

        if (finalists.length === 2) {
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
    }

    return updatedMatches;
};