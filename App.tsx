import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TournamentWizard } from './components/TournamentWizard';
import { StandingsTable } from './components/StandingsTable';
import { MatchesView } from './components/MatchesView';
import { BracketView } from './components/BracketView';
import { MatchStatus, Stage, Team, Tournament, TournamentType } from './types';
import { generateId, calculateStandings, generateFixtures, updateTournamentKnockouts } from './utils/tournamentUtils';
import { Button } from './components/Button';
import FloatingLines from './components/FloatingLines';
import { ConfirmationModal } from './components/ConfirmationModal';

const App: React.FC = () => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'bracket'>('standings');
  const [hasSavedData, setHasSavedData] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('kickoff_tournament_data');
    setHasSavedData(!!saved);
  }, []);

  const saveToLocalStorage = (data: Tournament) => {
    localStorage.setItem('kickoff_tournament_data', JSON.stringify(data));
    setHasSavedData(true);
  };

  const handleCreateTournament = (name: string, type: TournamentType, teamNames: string[]) => {
    // Shuffle team names using Fisher-Yates algorithm to randomize groups
    const shuffledNames = [...teamNames];
    for (let i = shuffledNames.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledNames[i], shuffledNames[j]] = [shuffledNames[j], shuffledNames[i]];
    }

    const teams: Team[] = shuffledNames.map((n, i) => ({
      id: generateId(),
      name: n,
      stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      // Assign groups: A for first half, B for second half if Group format
      group: type === TournamentType.GROUPS_KNOCKOUT ? (i < shuffledNames.length / 2 ? 'A' : 'B') : undefined
    }));

    const newTournament: Tournament = {
      id: generateId(),
      name,
      type,
      teams,
      matches: generateFixtures(teams, type),
      groups: type === TournamentType.GROUPS_KNOCKOUT ? ['A', 'B'] : [],
      currentStage: Stage.GROUP,
      createdAt: Date.now()
    };

    setTournament(newTournament);
    saveToLocalStorage(newTournament);
    setActiveTab('standings'); // Reset tab
  };

  const handleUpdateMatch = (matchId: string, homeScore: number, awayScore: number, homePenalty?: number, awayPenalty?: number) => {
    if (!tournament) return;

    const updatedMatches = tournament.matches.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          homeScore,
          awayScore,
          homePenalty,
          awayPenalty,
          status: MatchStatus.FINISHED
        };
      }
      return m;
    });

    // Recalculate stats
    const updatedTeams = calculateStandings(tournament.teams, updatedMatches);

    // Check for Knockout Generation / Progression
    let finalMatches = updatedMatches;
    if (tournament.type === TournamentType.GROUPS_KNOCKOUT) {
      finalMatches = updateTournamentKnockouts(updatedTeams, updatedMatches);
    }

    const updatedTournament = {
      ...tournament,
      teams: updatedTeams,
      matches: finalMatches
    };

    setTournament(updatedTournament);
    saveToLocalStorage(updatedTournament);
  };

  const handleSave = () => {
    if (tournament) {
      saveToLocalStorage(tournament);

      // Simple visual feedback
      const btn = document.getElementById('save-btn');
      if (btn) {
        const originalText = btn.innerText;
        btn.innerText = "✅ Saved";
        setTimeout(() => {
          btn.innerText = originalText;
        }, 2000);
      }
    }
  };

  const handleLoad = () => {
    try {
      const data = localStorage.getItem('kickoff_tournament_data');
      if (data) {
        const parsed = JSON.parse(data);
        setTournament(parsed);
        setActiveTab('standings');
      }
    } catch (error) {
      console.error("Failed to load tournament data", error);
      toast.error("Error loading saved tournament.");
    }
  };

  const handleClearSave = () => {
    setShowDeleteModal(true);
  }

  const confirmDelete = () => {
    localStorage.removeItem('kickoff_tournament_data');
    setHasSavedData(false);
    setShowDeleteModal(false);
    toast.success("Tournament deleted successfully");
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
        <div className="absolute inset-0 z-0 opacity-60">
          <FloatingLines />
        </div>
        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
          <div className="mb-8 text-center">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 mb-2">
              KickOff
            </h1>
            <p className="text-slate-400">Tournament Manager</p>
          </div>

          {hasSavedData && (
            <div className="w-full max-w-2xl mb-8 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
              <div className="w-full p-6 bg-slate-800/80 border border-emerald-500/30 rounded-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="text-emerald-400 font-bold">Previous Tournament Found</h3>
                  <p className="text-slate-400 text-sm">Continue where you left off?</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleLoad} variant="primary">
                    🔄 Resume
                  </Button>
                  <Button onClick={handleClearSave} variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                    Delete
                  </Button>
                </div>
              </div>
              <div className="text-slate-500 text-xs uppercase tracking-widest font-bold mt-4">- OR CREATE NEW -</div>
            </div>
          )}

          <TournamentWizard onCreate={handleCreateTournament} />
        </div>
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title="Delete Saved Tournament?"
          message="Are you sure you want to delete the saved tournament? This cannot be undone."
          confirmText="Delete Tournament"
        />
        <ToastContainer position="bottom-right" theme="dark" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 relative">
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <FloatingLines />
      </div>
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
                <span className="text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {tournament.type === TournamentType.LEAGUE ? 'League Format' : 'Group + Knockout'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button id="save-btn" variant="secondary" size="sm" onClick={handleSave} className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-950">
                💾 Save
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setTournament(null)}>
                New Tournament
              </Button>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-4 mb-8 border-b border-slate-800 pb-1">
            {(['standings', 'matches', 'bracket'] as const).map(tab => {
              // Hide bracket tab if it's a league format
              if (tab === 'bracket' && tournament.type === TournamentType.LEAGUE) return null;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 px-2 text-sm font-medium transition-all relative ${activeTab === tab ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'
                    }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="animate-in fade-in duration-500">
            {activeTab === 'standings' && (
              <div className="space-y-8">
                {tournament.type === TournamentType.LEAGUE ? (
                  <StandingsTable teams={tournament.teams} />
                ) : (
                  <>
                    {tournament.groups.map(g => (
                      <StandingsTable
                        key={g}
                        teams={tournament.teams.filter(t => t.group === g)}
                        title={`Group ${g}`}
                      />
                    ))}
                    {/* Show message if knockout matches exist */}
                    {tournament.matches.some(m => m.stage !== Stage.GROUP) && (
                      <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-center text-emerald-400">
                        Knockout stages are in progress! Check the Matches or Bracket tab.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'matches' && (
              <div className="space-y-8">
                <MatchesView
                  matches={tournament.matches}
                  teams={tournament.teams}
                  onUpdateMatch={handleUpdateMatch}
                />
              </div>
            )}

            {activeTab === 'bracket' && (
              <div className="overflow-x-auto pb-8">
                <BracketView matches={tournament.matches} teams={tournament.teams} />
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
};

export default App;