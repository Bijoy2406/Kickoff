import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Match, MatchStatus, Stage, Team } from '../types';
import { Button } from './Button';

interface MatchesViewProps {
    matches: Match[];
    teams: Team[];
    onUpdateMatch: (matchId: string, homeScore: number, awayScore: number, homePenalty?: number, awayPenalty?: number) => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({ matches, teams, onUpdateMatch }) => {
    const getTeam = (id: string) => teams.find(t => t.id === id);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempScores, setTempScores] = useState<{ h: string, a: string, hp: string, ap: string }>({ h: '', a: '', hp: '', ap: '' });

    const handleEdit = (match: Match) => {
        setEditingId(match.id);
        setTempScores({
            h: match.homeScore?.toString() || '0',
            a: match.awayScore?.toString() || '0',
            hp: match.homePenalty?.toString() || '',
            ap: match.awayPenalty?.toString() || ''
        });
    };

    const validateScoreInput = (value: string) => {
        // Allow empty or positive integers only
        if (value === '') return '';
        if (/^\d+$/.test(value)) return value;
        return null;
    };

    const handleScoreChange = (field: 'h' | 'a', value: string) => {
        const valid = validateScoreInput(value);
        if (valid !== null) {
            setTempScores(prev => ({ ...prev, [field]: valid }));
        }
    };

    const handlePenaltyChange = (field: 'hp' | 'ap', value: string) => {
        const valid = validateScoreInput(value);
        if (valid !== null) {
            setTempScores(prev => ({ ...prev, [field]: valid }));
        }
    };

    const handleSave = (match: Match) => {
        const h = tempScores.h === '' ? 0 : parseInt(tempScores.h);
        const a = tempScores.a === '' ? 0 : parseInt(tempScores.a);

        if (isNaN(h) || isNaN(a)) return;

        let hp: number | undefined = undefined;
        let ap: number | undefined = undefined;

        // Penalties are only valid if it's a knockout match ending in a draw
        const isKnockout = match.stage !== Stage.GROUP;
        const isDraw = h === a;

        if (isKnockout && isDraw) {
            if (tempScores.hp === '' || tempScores.ap === '') {
                toast.error("Knockout matches cannot end in a draw. Please enter penalty scores.");
                return;
            }

            hp = parseInt(tempScores.hp);
            ap = parseInt(tempScores.ap);

            if (hp === ap) {
                toast.error("Penalty shootout cannot end in a draw. Please enter a winner.");
                return;
            }
        }

        onUpdateMatch(match.id, h, a, hp, ap);
        setEditingId(null);
    };

    if (matches.length === 0) return <div className="text-center text-slate-500 py-10">No matches scheduled yet.</div>;

    // Group matches by stage
    const stageOrder = [Stage.FINAL, Stage.SEMI_FINAL, Stage.QUARTER_FINAL, Stage.GROUP];
    const groupedMatches = matches.reduce((acc, match) => {
        if (!acc[match.stage]) acc[match.stage] = [];
        acc[match.stage].push(match);
        return acc;
    }, {} as Record<string, Match[]>);

    const getStageTitle = (stage: string) => {
        switch (stage) {
            case Stage.FINAL: return "🏆 Final";
            case Stage.SEMI_FINAL: return "🔥 Semi Finals";
            case Stage.QUARTER_FINAL: return "⚔️ Quarter Finals";
            case Stage.GROUP: return "⚽ Group Stage";
            default: return stage;
        }
    }

    // Calculate Champion
    let champion: Team | undefined;
    const finalMatch = matches.find(m => m.stage === Stage.FINAL && m.status === MatchStatus.FINISHED);
    if (finalMatch && finalMatch.homeScore !== null && finalMatch.awayScore !== null) {
        if (finalMatch.homeScore > finalMatch.awayScore) {
            champion = getTeam(finalMatch.homeTeamId);
        } else if (finalMatch.awayScore > finalMatch.homeScore) {
            champion = getTeam(finalMatch.awayTeamId);
        } else if (finalMatch.homePenalty !== undefined && finalMatch.awayPenalty !== undefined) {
            if (finalMatch.homePenalty > finalMatch.awayPenalty) {
                champion = getTeam(finalMatch.homeTeamId);
            } else if (finalMatch.awayPenalty > finalMatch.homePenalty) {
                champion = getTeam(finalMatch.awayTeamId);
            }
        }
    }

    return (
        <div className="space-y-12">
            {champion && (
                <div className="animate-in zoom-in-50 duration-1000 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-yellow-500/20 to-transparent rounded-3xl border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.2)] mb-12">
                    <div className="text-yellow-400 text-sm font-bold uppercase tracking-[0.3em] mb-4">Tournament Champion</div>
                    <div className="text-6xl mb-6">🏆</div>
                    <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-sm text-center">
                        {champion.name}
                    </h2>
                    <div className="mt-6 flex items-center gap-2 text-yellow-500/60 text-sm">
                        <span>👑</span>
                        <span>The Ultimate Winner</span>
                        <span>👑</span>
                    </div>
                </div>
            )}

            {stageOrder.map(stage => {
                const stageMatches = groupedMatches[stage];
                if (!stageMatches || stageMatches.length === 0) return null;

                return (
                    <div key={stage} className="animate-in slide-in-from-bottom-4 duration-700">
                        <h3 className="text-xl font-bold text-white mb-4 pl-2 border-l-4 border-emerald-500">{getStageTitle(stage)}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stageMatches.map(match => {
                                const home = getTeam(match.homeTeamId);
                                const away = getTeam(match.awayTeamId);

                                const isTBD = !home || !away;

                                const isEditing = editingId === match.id;
                                const isFinished = match.status === MatchStatus.FINISHED;
                                const isKnockout = match.stage !== Stage.GROUP;

                                // Check if draw
                                const isDraw = tempScores.h === tempScores.a && tempScores.h !== '';
                                const showPenalties = isEditing && isKnockout && isDraw;
                                const hasPenalties = match.homePenalty !== undefined && match.awayPenalty !== undefined;

                                return (
                                    <div key={match.id} className={`bg-slate-800 border rounded-xl p-4 shadow-lg flex flex-col transition-all ${stage === Stage.FINAL ? 'border-emerald-500/50 shadow-emerald-900/20 scale-105' : 'border-slate-700'} ${isFinished ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}>
                                        {/* Header with Status Badge */}
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                {match.stage.replace('_', ' ')} {match.group ? `• Grp ${match.group}` : ''}
                                            </span>
                                            {isFinished ? (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    FINISHED
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-700/30 border border-slate-600 text-slate-400 text-[10px] font-bold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                                                    SCHEDULED
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col gap-4">
                                            {/* Home Team */}
                                            <div className="flex justify-between items-center">
                                                <div className={`flex items-center gap-3 font-semibold ${home ? 'text-white' : 'text-slate-500'}`}>
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                                                        {home ? home.name.substring(0, 2).toUpperCase() : '?'}
                                                    </div>
                                                    {home ? home.name : 'TBD'}
                                                </div>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        className="w-12 bg-slate-900 border border-slate-600 rounded px-1 text-center text-white"
                                                        value={tempScores.h}
                                                        onChange={e => handleScoreChange('h', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className={`text-2xl font-bold ${isFinished ? 'text-white' : 'text-slate-500'}`}>{match.homeScore ?? '-'}</span>
                                                )}
                                            </div>

                                            {/* Away Team */}
                                            <div className="flex justify-between items-center">
                                                <div className={`flex items-center gap-3 font-semibold ${away ? 'text-white' : 'text-slate-500'}`}>
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                                                        {away ? away.name.substring(0, 2).toUpperCase() : '?'}
                                                    </div>
                                                    {away ? away.name : 'TBD'}
                                                </div>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        className="w-12 bg-slate-900 border border-slate-600 rounded px-1 text-center text-white"
                                                        value={tempScores.a}
                                                        onChange={e => handleScoreChange('a', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className={`text-2xl font-bold ${isFinished ? 'text-white' : 'text-slate-500'}`}>{match.awayScore ?? '-'}</span>
                                                )}
                                            </div>

                                            {/* Penalties Display/Input */}
                                            {(hasPenalties || showPenalties) && (
                                                <div className="mt-2 p-2 bg-slate-900/30 rounded border border-slate-700/50">
                                                    <div className="text-[10px] text-slate-400 text-center uppercase tracking-wider mb-1">Penalties</div>
                                                    <div className="flex justify-center items-center gap-4">
                                                        {isEditing ? (
                                                            <>
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="\d*"
                                                                    placeholder="H"
                                                                    className="w-10 bg-slate-900 border border-slate-600 rounded px-1 text-center text-emerald-400 text-sm"
                                                                    value={tempScores.hp}
                                                                    onChange={e => handlePenaltyChange('hp', e.target.value)}
                                                                />
                                                                <span className="text-slate-600">-</span>
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="\d*"
                                                                    placeholder="A"
                                                                    className="w-10 bg-slate-900 border border-slate-600 rounded px-1 text-center text-emerald-400 text-sm"
                                                                    value={tempScores.ap}
                                                                    onChange={e => handlePenaltyChange('ap', e.target.value)}
                                                                />
                                                            </>
                                                        ) : (
                                                            <div className="text-sm font-mono text-emerald-400">
                                                                ({match.homePenalty}) - ({match.awayPenalty})
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="mt-4 pt-3 border-t border-slate-700 flex justify-end">
                                            {isEditing ? (
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                                                    <Button size="sm" onClick={() => handleSave(match)}>
                                                        Save Score
                                                    </Button>
                                                </div>
                                            ) : (
                                                // Only allow editing if teams are determined
                                                <Button size="sm" variant="secondary" onClick={() => handleEdit(match)} disabled={isTBD}>
                                                    {isFinished ? 'Edit Result' : (isTBD ? 'Waiting for Teams' : 'Enter Score')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};