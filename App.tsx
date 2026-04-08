import React, { useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Routes, Route, Navigate, useParams, Link, useNavigate } from 'react-router-dom';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from './convex/_generated/api';
import { TournamentWizard } from './components/TournamentWizard';
import { StandingsTable } from './components/StandingsTable';
import { MatchesView } from './components/MatchesView';
import { BracketView } from './components/BracketView';
import { MatchStatus, Stage, Team, Tournament, TournamentType } from './types';
import { generateId, calculateStandings, generateFixtures, updateTournamentKnockouts } from './utils/tournamentUtils';
import { Button } from './components/Button';
import FloatingLines from './components/FloatingLines';
import { ConfirmationModal } from './components/ConfirmationModal';
import { UserHandler } from './components/UserHandler';

const loginPath = import.meta.env.VITE_LOGIN_URL || '/login';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 opacity-60">
        <FloatingLines />
      </div>
      <div className="relative z-10 w-full max-w-xl flex flex-col items-center text-center gap-6">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
          Admin Sign In
        </h1>
        <p className="text-slate-400">
          Use this private login page to access admin tools.
        </p>
        <SignedOut>
          <SignInButton mode="modal" forceRedirectUrl="/admin" fallbackRedirectUrl="/admin">
            <Button variant="primary">Sign In</Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <Link to="/admin" className="text-emerald-400 hover:text-emerald-300 text-sm">
              Go to Admin Dashboard
            </Link>
          </div>
        </SignedIn>
      </div>
    </div>
  );
};

const PublicHome: React.FC = () => {
  const [search, setSearch] = useState('');
  const tournaments = useQuery(api.tournaments.listPublicTournaments, {
    search: search.trim() ? search.trim() : undefined,
  });
  const currentUser = useQuery(api.users.getCurrentUser);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-black relative">
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <FloatingLines />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-end mb-4">
          {isAdmin && (
            <Link
              to="/admin"
              className="text-emerald-400 hover:text-emerald-300 text-sm border border-emerald-500/40 px-3 py-1.5 rounded-full"
            >
              Admin Dashboard
            </Link>
          )}
        </div>
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 mb-3">
            KickOff
          </h1>
          <p className="text-slate-400">Browse live public tournaments</p>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tournaments..."
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments === undefined && (
            <div className="col-span-full text-center text-slate-500">Loading tournaments...</div>
          )}
          {tournaments && tournaments.length === 0 && (
            <div className="col-span-full text-center text-slate-500">No public tournaments found.</div>
          )}
          {tournaments?.map((t) => (
            <Link
              key={t._id}
              to={`/t/${t.publicId}`}
              className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition"
            >
              <div className="text-lg font-semibold text-white mb-1">{t.name}</div>
              <div className="text-xs text-slate-500">Created {new Date(t.createdAt).toLocaleDateString()}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const PublicTournamentPage: React.FC = () => {
  const { publicId } = useParams();
  const tournamentDoc = useQuery(api.tournaments.getTournamentByPublicId, {
    publicId: publicId ?? '',
  });

  const tournament = useMemo(() => {
    if (!tournamentDoc) return null;
    return tournamentDoc.data as Tournament;
  }, [tournamentDoc]);

  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'bracket'>('standings');

  if (!publicId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 bg-black">
        Invalid tournament URL.
      </div>
    );
  }

  if (tournamentDoc === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 bg-black">
        Loading tournament...
      </div>
    );
  }

  if (!tournamentDoc || tournamentDoc.visibility !== 'public' || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 bg-black">
        Tournament not found or not public.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 relative">
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <FloatingLines />
      </div>
      <div className="relative z-10">
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
              <span className="text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                {tournament.type === TournamentType.LEAGUE ? 'League Format' : 'Group + Knockout'}
              </span>
            </div>
            <Link to="/" className="text-slate-400 hover:text-emerald-400 text-sm">
              Back to tournaments
            </Link>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-4 mb-8 border-b border-slate-800 pb-1">
            {(['standings', 'matches', 'bracket'] as const).map(tab => {
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
                  onUpdateMatch={() => undefined}
                  readOnly
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
    </div>
  );
};

const AdminTournamentList: React.FC<{
  onSelect: (doc: any) => void;
  onDelete: (docId: string) => void;
  enabled: boolean;
}> = ({ onSelect, onDelete, enabled }) => {
  const navigate = useNavigate();
  const tournaments = useQuery(api.tournaments.listAllTournaments, enabled ? {} : undefined);

  if (!enabled) return null;

  if (tournaments === undefined) {
    return (
      <div className="w-full max-w-4xl mb-8 text-center text-slate-500">
        Loading tournaments...
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="w-full max-w-4xl mb-8 text-center text-slate-500">
        No tournaments found.
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mb-8 space-y-3">
      <div className="text-sm font-semibold text-slate-300">All Tournaments</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tournaments.map((t) => (
          <div key={t._id} className="p-4 rounded-xl border border-slate-700 bg-slate-900/60 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-white font-semibold">{t.name}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${t.visibility === 'public' ? 'border-emerald-500/40 text-emerald-400' : 'border-slate-600 text-slate-400'}`}>
                {t.visibility}
              </span>
            </div>
            <div className="text-xs text-slate-500">Created {new Date(t.createdAt).toLocaleDateString()}</div>
            <div className="text-xs text-slate-500">Public ID: {t.publicId}</div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => { onSelect(t); navigate(`/admin/t/${t.publicId}`); }}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => onDelete(t._id as unknown as string)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const isAdmin = currentUser?.role === 'admin';

  const { publicId: adminPublicId } = useParams();
  const navigate = useNavigate();
  const tournamentDocFromUrl = useQuery(api.tournaments.getTournamentByPublicId, { publicId: adminPublicId ?? '' });

  const createTournamentMutation = useMutation(api.tournaments.createTournament);
  const updateTournamentMutation = useMutation(api.tournaments.updateTournament);
  const deleteTournamentMutation = useMutation(api.tournaments.deleteTournament);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'bracket'>('standings');
  const [hasSavedData, setHasSavedData] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [tournamentDocId, setTournamentDocId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [isCreating, setIsCreating] = useState(false);
  const [loadedPublicId, setLoadedPublicId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kickoff_tournament_data');
    setHasSavedData(!!saved);
  }, []);

  useEffect(() => {
    if (!adminPublicId) return;
    if (tournamentDocFromUrl === undefined) return;

    if (!tournamentDocFromUrl) {
      setTournament(null);
      setTournamentDocId(null);
      setPublicId(null);
      setVisibility('public');
      setLoadedPublicId(null);
      return;
    }

    if (loadedPublicId === adminPublicId) return;

    setTournament(tournamentDocFromUrl.data as Tournament);
    setTournamentDocId(tournamentDocFromUrl._id as unknown as string);
    setPublicId(tournamentDocFromUrl.publicId);
    setVisibility(tournamentDocFromUrl.visibility);
    setActiveTab('standings');
    setLoadedPublicId(adminPublicId);
  }, [adminPublicId, tournamentDocFromUrl, loadedPublicId]);

  const saveToLocalStorage = (data: Tournament) => {
    localStorage.setItem('kickoff_tournament_data', JSON.stringify(data));
    setHasSavedData(true);
  };

  const handleSelectTournament = (doc: any) => {
    setTournament(doc.data as Tournament);
    setTournamentDocId(doc._id as unknown as string);
    setPublicId(doc.publicId);
    setVisibility(doc.visibility);
    setActiveTab('standings');
  };

  const handleDeleteTournament = async (docId: string) => {
    await deleteTournamentMutation({ id: docId as any });
    if (tournamentDocId === docId) {
      setTournament(null);
      setTournamentDocId(null);
      setPublicId(null);
    }
  };

  const handleCreateTournament = async (name: string, type: TournamentType, teamNames: string[], numGroups?: number, advancingPerGroup?: number) => {
    if (!isAdmin) {
      toast.error('Only admins can create tournaments.');
      return;
    }

    setIsCreating(true);

    const shuffledNames = [...teamNames];
    for (let i = shuffledNames.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledNames[i], shuffledNames[j]] = [shuffledNames[j], shuffledNames[i]];
    }

    const groupCount = numGroups || 2;
    const groupNames = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));

    const teams: Team[] = shuffledNames.map((n, i) => ({
      id: generateId(),
      name: n,
      stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      group: type === TournamentType.GROUPS_KNOCKOUT
        ? groupNames[Math.floor(i / (shuffledNames.length / groupCount))]
        : undefined
    }));

    const newTournament: Tournament = {
      id: generateId(),
      name,
      type,
      teams,
      matches: generateFixtures(teams, type),
      groups: type === TournamentType.GROUPS_KNOCKOUT ? groupNames : [],
      currentStage: Stage.GROUP,
      createdAt: Date.now(),
      numGroups: type === TournamentType.GROUPS_KNOCKOUT ? groupCount : undefined,
      advancingPerGroup: type === TournamentType.GROUPS_KNOCKOUT ? advancingPerGroup : undefined
    };

    setTournament(newTournament);
    saveToLocalStorage(newTournament);
    setActiveTab('standings');

    try {
      const result = await createTournamentMutation({
        name,
        data: newTournament,
        visibility,
      });
      setPublicId(result.publicId);
      setTournamentDocId(result.id);
      setLoadedPublicId(result.publicId);
      navigate(`/admin/t/${result.publicId}`);
      toast.success('Tournament saved to Convex.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save tournament to Convex.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateMatch = async (matchId: string, homeScore: number, awayScore: number, homePenalty?: number, awayPenalty?: number) => {
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

    const updatedTeams = calculateStandings(tournament.teams, updatedMatches);

    let finalMatches = updatedMatches;
    if (tournament.type === TournamentType.GROUPS_KNOCKOUT) {
      finalMatches = updateTournamentKnockouts(
        updatedTeams,
        updatedMatches,
        tournament.numGroups || 2,
        tournament.advancingPerGroup || 2
      );
    }

    const updatedTournament = {
      ...tournament,
      teams: updatedTeams,
      matches: finalMatches
    };

    setTournament(updatedTournament);
    saveToLocalStorage(updatedTournament);

    if (tournamentDocId) {
      try {
        await updateTournamentMutation({
          id: tournamentDocId as any,
          data: updatedTournament,
          name: updatedTournament.name,
          visibility,
        });
      } catch (error) {
        console.error(error);
        toast.error('Failed to save match update to Convex.');
      }
    } else {
      toast.error('Missing tournament ID. Create a tournament first.');
    }
  };

  const handleSave = async () => {
    if (tournament) {
      saveToLocalStorage(tournament);

      if (tournamentDocId) {
        try {
          await updateTournamentMutation({
            id: tournamentDocId as any,
            data: tournament,
            name: tournament.name,
            visibility,
          });
          toast.success('Tournament saved to Convex.');
        } catch (error) {
          console.error(error);
          toast.error('Failed to save tournament to Convex.');
        }
      } else {
        toast.error('Missing tournament ID. Create a tournament first.');
      }

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
  };

  const confirmDelete = async () => {
    localStorage.removeItem('kickoff_tournament_data');
    setHasSavedData(false);
    setShowDeleteModal(false);

    if (tournamentDocId) {
      await deleteTournamentMutation({ id: tournamentDocId as any });
    }

    setTournament(null);
    setPublicId(null);
    setTournamentDocId(null);
    setLoadedPublicId(null);
    navigate('/admin');
    toast.success("Tournament deleted successfully");
  };

  const toggleVisibility = async () => {
    const nextVisibility = visibility === 'public' ? 'private' : 'public';
    setVisibility(nextVisibility);
    if (tournamentDocId) {
      await updateTournamentMutation({
        id: tournamentDocId as any,
        visibility: nextVisibility,
      });
    }
  };

  const isLoadingFromUrl = !!adminPublicId && tournamentDocFromUrl === undefined;
  const isNotFoundFromUrl = !!adminPublicId && tournamentDocFromUrl === null;

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-slate-400">
        Admin access required. Visit <Link to={loginPath} className="text-emerald-400 underline">{loginPath}</Link> to sign in.
      </div>
    );
  }

  if (!isLoading && isAuthenticated && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-slate-400">
        You are signed in, but not an admin.
      </div>
    );
  }

  if (!tournament) {
    if (isLoadingFromUrl) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-slate-400">
          Loading tournament...
        </div>
      );
    }

    if (isNotFoundFromUrl) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-slate-400 gap-4">
          <div>That tournament could not be found.</div>
          <Button variant="secondary" onClick={() => navigate('/admin')}>
            Back to Admin Dashboard
          </Button>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
        <div className="absolute inset-0 z-0 opacity-60">
          <FloatingLines />
        </div>
        <header className="absolute top-0 left-0 right-0 z-50 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="text-slate-400 hover:text-emerald-400 text-sm">
              Back to public
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">
          <div className="mb-8 text-center">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 mb-2">
              KickOff Admin
            </h1>
            <p className="text-slate-400">Create and manage tournaments</p>
          </div>

          {isAdmin && (
            <AdminTournamentList
              enabled={isAuthenticated && isAdmin}
              onSelect={handleSelectTournament}
              onDelete={handleDeleteTournament}
            />
          )}

          

          <div className="w-full flex justify-center">
            <Button variant="primary" onClick={() => setTournament(null)} disabled={isCreating}>
              Create Tournament
            </Button>
          </div>
          <div className="mt-6 w-full">
            <TournamentWizard onCreate={handleCreateTournament} />
          </div>
        </div>
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title="Delete Saved Tournament?"
          message="Are you sure you want to delete the saved tournament? This cannot be undone."
          confirmText="Delete Tournament"
        />
        <ToastContainer position="top-right" theme="dark" aria-label="Toast Notification Container" />
      </div>
    );
  }

  const shareUrl = publicId ? `${window.location.origin}/t/${publicId}` : null;

  return (
    <div className="min-h-screen bg-black pb-20 relative">
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <FloatingLines />
      </div>
      <div className="relative z-10">
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
                <span className="text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {tournament.type === TournamentType.LEAGUE ? 'League Format' : 'Group + Knockout'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Button id="save-btn" variant="secondary" size="sm" onClick={handleSave} className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-950">
                💾 Save
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setTournament(null); navigate('/admin'); }}>
                Dashboard
              </Button>
              <Button variant="secondary" size="sm" onClick={toggleVisibility}>
                {visibility === 'public' ? 'Make Private' : 'Make Public'}
              </Button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
          {shareUrl && (
            <div className="max-w-7xl mx-auto px-4 pb-4">
              <div className="text-xs text-slate-400">Public URL:</div>
              <a href={shareUrl} className="text-emerald-400 text-sm break-all" target="_blank" rel="noreferrer">
                {shareUrl}
              </a>
            </div>
          )}
        </header>

        <div className="max-w-7xl mx-auto px-4 py-4">
          {isAdmin && (
            <AdminTournamentList
              enabled={isAuthenticated && isAdmin}
              onSelect={handleSelectTournament}
              onDelete={handleDeleteTournament}
            />
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-4 mb-8 border-b border-slate-800 pb-1">
            {(['standings', 'matches', 'bracket'] as const).map(tab => {
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
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Saved Tournament?"
        message="Are you sure you want to delete the saved tournament? This cannot be undone."
        confirmText="Delete Tournament"
      />
      <ToastContainer position="top-right" theme="dark" aria-label="Toast Notification Container" />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <>
      <UserHandler />
      <Routes>
        <Route path={loginPath} element={<LoginPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/t/:publicId" element={<AdminDashboard />} />
        <Route path="/t/:publicId" element={<PublicTournamentPage />} />
        <Route path="/" element={<PublicHome />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;