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

export const updateTournamentKnockouts = (teams: Team[], matches: Match[]): Match[] => {
    const updatedMatches = [...matches];
    
    const hasSemis = updatedMatches.some(m => m.stage === Stage.SEMI_FINAL);
    const hasQuarters = updatedMatches.some(m => m.stage === Stage.QUARTER_FINAL);
    const groupMatches = updatedMatches.filter(m => m.stage === Stage.GROUP);
    const allGroupsFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === MatchStatus.FINISHED);

    const useQuarterFinals = teams.length > 8; // If > 8 teams, we introduce QF

    // --- 1. Generate Quarter Finals (if needed) ---
    if (useQuarterFinals && allGroupsFinished && !hasQuarters) {
        const sortedTeams = calculateStandings(teams, updatedMatches);
        const groupA = sortedTeams.filter(t => t.group === 'A');
        const groupB = sortedTeams.filter(t => t.group === 'B');

        // Need top 4 from each to make 4 QF matches (8 teams total)
        if (groupA.length >= 4 && groupB.length >= 4) {
             // QF1: A1 vs B4
             updatedMatches.push({ id: generateId(), homeTeamId: groupA[0].id, awayTeamId: groupB[3].id, homeScore: null, awayScore: null, status: MatchStatus.SCHEDULED, stage: Stage.QUARTER_FINAL });
             // QF2: B2 vs A3
             updatedMatches.push({ id: generateId(), homeTeamId: groupB[1].id, awayTeamId: groupA[2].id, homeScore: null, awayScore: null, status: MatchStatus.SCHEDULED, stage: Stage.QUARTER_FINAL });
             // QF3: B1 vs A4
             updatedMatches.push({ id: generateId(), homeTeamId: groupB[0].id, awayTeamId: groupA[3].id, homeScore: null, awayScore: null, status: MatchStatus.SCHEDULED, stage: Stage.QUARTER_FINAL });
             // QF4: A2 vs B3
             updatedMatches.push({ id: generateId(), homeTeamId: groupA[1].id, awayTeamId: groupB[2].id, homeScore: null, awayScore: null, status: MatchStatus.SCHEDULED, stage: Stage.QUARTER_FINAL });
        }
    }

    // --- 2. Generate Semi Finals ---
    // Condition A: Small tournament (<=8 teams), Groups done, No Semis yet.
    // Condition B: Large tournament (>8 teams), Quarters done, No Semis yet.

    const quartersMatches = updatedMatches.filter(m => m.stage === Stage.QUARTER_FINAL);
    const allQuartersFinished = quartersMatches.length > 0 && quartersMatches.every(m => m.status === MatchStatus.FINISHED);

    const readyForSemis = (useQuarterFinals && allQuartersFinished) || (!useQuarterFinals && allGroupsFinished);

    if (readyForSemis && !hasSemis) {
        if (useQuarterFinals) {
            // From Quarters to Semis
            // Assume Order: QF1, QF2, QF3, QF4 pushed above.
            // SF1: Winner QF1 vs Winner QF2
            // SF2: Winner QF3 vs Winner QF4
            // (Note: This pairs A1 side with B2 side, keeping A1 and B1 apart until final usually)
            
            const w1 = getMatchWinner(quartersMatches[0]); // A1/B4
            const w2 = getMatchWinner(quartersMatches[1]); // B2/A3
            const w3 = getMatchWinner(quartersMatches[2]); // B1/A4
            const w4 = getMatchWinner(quartersMatches[3]); // A2/B3

            if (w1 && w2 && w3 && w4) {
                updatedMatches.push({ id: generateId(), homeTeamId: w1, awayTeamId: w2, homeScore: null, awayScore: null, status: MatchStatus.SCHEDULED, stage: Stage.SEMI_FINAL });
                updatedMatches.push({ id: generateId(), homeTeamId: w3, awayTeamId: w4, homeScore: null, awayScore: null, status: MatchStatus.SCHEDULED, stage: Stage.SEMI_FINAL });
            }

        } else {
             // Direct Group to Semis (Original Logic)
            const sortedTeams = calculateStandings(teams, updatedMatches);
            const groupA = sortedTeams.filter(t => t.group === 'A');
            const groupB = sortedTeams.filter(t => t.group === 'B');

            if (groupA.length >= 2 && groupB.length >= 2) {
                // A1 vs B2
                updatedMatches.push({ id: generateId(), homeTeamId: groupA[0].id, awayTeamId: groupB[1].id, homeScore: null, awayScore: null, status: MatchStatus.SCHEDULED, stage: Stage.SEMI_FINAL });
                // B1 vs A2
                updatedMatches.push({ id: generateId(), homeTeamId: groupB[0].id, awayTeamId: groupA[1].id, homeScore: null, awayScore: null, status: MatchStatus.SCHEDULED, stage: Stage.SEMI_FINAL });
            }
        }
    }

    // --- 3. Generate Final ---
    const semis = updatedMatches.filter(m => m.stage === Stage.SEMI_FINAL);
    
    // We create/update the Final placeholder if Semis exist
    if (semis.length === 2) {
        let finalMatch = updatedMatches.find(m => m.stage === Stage.FINAL);
        
        if (!finalMatch) {
            finalMatch = {
                id: generateId(),
                homeTeamId: 'TBD',
                awayTeamId: 'TBD',
                homeScore: null, 
                awayScore: null, 
                status: MatchStatus.SCHEDULED, 
                stage: Stage.FINAL
            };
            updatedMatches.push(finalMatch);
        }

        const winner1 = getMatchWinner(semis[0]);
        const winner2 = getMatchWinner(semis[1]);

        if (winner1 && finalMatch.homeTeamId !== winner1) finalMatch.homeTeamId = winner1;
        if (winner2 && finalMatch.awayTeamId !== winner2) finalMatch.awayTeamId = winner2;
    }

    return updatedMatches;
};