import React, { useState } from 'react';
import { Match, Stage, Team } from '../types';
import { getMatchWinner } from '../utils/tournamentUtils';

interface BracketViewProps {
  matches: Match[];
  teams: Team[];
}

export const BracketView: React.FC<BracketViewProps> = ({ matches, teams }) => {
  const [isGroupsVisible, setIsGroupsVisible] = useState(true);
  const getTeam = (id: string) => teams.find(t => t.id === id);
  
  const groupMatches = matches.filter(m => m.stage === Stage.GROUP);
  const quarters = matches.filter(m => m.stage === Stage.QUARTER_FINAL);
  const semis = matches.filter(m => m.stage === Stage.SEMI_FINAL);
  const final = matches.find(m => m.stage === Stage.FINAL);
  
  const groupA = groupMatches.filter(m => m.group === 'A');
  const groupB = groupMatches.filter(m => m.group === 'B');

  const hasQuarters = quarters.length > 0;

  // Render Helpers
  const renderMatchNode = (match: Match | undefined, label?: string, isFinal: boolean = false, isCompact: boolean = false) => {
    if (!match) return <div className="w-64 h-24 bg-slate-800/20 border border-slate-800 rounded-lg"></div>;

    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    const winnerId = getMatchWinner(match);

    return (
        <div className={`w-64 relative bg-slate-800 border ${isFinal ? 'border-yellow-500/50 shadow-yellow-900/20' : 'border-slate-700'} rounded-lg shadow-lg flex flex-col z-10 transition-transform hover:scale-105 shrink-0`}>
            {label && (
                <div className="absolute -top-3 left-2 bg-slate-900 text-[10px] text-slate-500 px-1.5 border border-slate-700 rounded uppercase font-bold tracking-wider">
                    {label}
                </div>
            )}
             
             {/* Home Team */}
             <div className={`flex justify-between items-center px-3 py-2 rounded-t-lg ${winnerId === match.homeTeamId ? 'bg-gradient-to-r from-emerald-900/30 to-transparent' : ''}`}>
                 <div className="flex items-center gap-2 truncate">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${winnerId === match.homeTeamId ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                        {home ? home.name.substring(0,2).toUpperCase() : '?'}
                    </div>
                    <span className={`text-sm truncate font-medium ${winnerId === match.homeTeamId ? 'text-white' : 'text-slate-400'}`}>
                        {home ? home.name : 'TBD'}
                    </span>
                 </div>
                 <div className="flex items-center gap-1">
                     <span className={`font-bold ${winnerId === match.homeTeamId ? 'text-white' : 'text-slate-500'}`}>{match.homeScore ?? '-'}</span>
                     {match.homePenalty !== undefined && <span className="text-[10px] text-emerald-400">({match.homePenalty})</span>}
                 </div>
             </div>

             {/* Divider */}
             <div className="h-px bg-slate-700 mx-2"></div>

             {/* Away Team */}
             <div className={`flex justify-between items-center px-3 py-2 rounded-b-lg ${winnerId === match.awayTeamId ? 'bg-gradient-to-r from-emerald-900/30 to-transparent' : ''}`}>
                 <div className="flex items-center gap-2 truncate">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${winnerId === match.awayTeamId ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                        {away ? away.name.substring(0,2).toUpperCase() : '?'}
                    </div>
                    <span className={`text-sm truncate font-medium ${winnerId === match.awayTeamId ? 'text-white' : 'text-slate-400'}`}>
                        {away ? away.name : 'TBD'}
                    </span>
                 </div>
                 <div className="flex items-center gap-1">
                     <span className={`font-bold ${winnerId === match.awayTeamId ? 'text-white' : 'text-slate-500'}`}>{match.awayScore ?? '-'}</span>
                     {match.awayPenalty !== undefined && <span className="text-[10px] text-emerald-400">({match.awayPenalty})</span>}
                 </div>
             </div>
             
             {isFinal && <div className="absolute -top-3 -right-3 text-2xl">🏆</div>}
        </div>
    );
  };

  if (matches.length === 0) return <div className="text-center py-10 text-slate-500">Tournament not started.</div>;

  const hasGroups = groupA.length > 0 || groupB.length > 0;

  return (
    <div className="p-8 overflow-x-auto min-w-full flex flex-col items-start">
        {/* Toggle Button for Groups */}
        {hasGroups && (
            <div className="mb-6 sticky left-0">
                 <button 
                    onClick={() => setIsGroupsVisible(!isGroupsVisible)}
                    className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-slate-800/80 px-4 py-2 rounded-lg border border-emerald-500/30 hover:bg-slate-800"
                 >
                    <span>{isGroupsVisible ? '➖' : '➕'}</span>
                    {isGroupsVisible ? 'Hide Group Stage Matches' : 'Show Group Stage Matches'}
                 </button>
            </div>
        )}

        {/* Dynamic Tree Grid */}
        <div className="flex items-center gap-16">
            
            {/* Column 0: Group Stage Matches (Collapsible) */}
            {hasGroups && isGroupsVisible && (
                <div className="flex flex-col gap-8 shrink-0 relative animate-in slide-in-from-left-4 fade-in duration-300">
                     {/* Group A */}
                     {groupA.length > 0 && (
                        <div className="bg-slate-900/40 p-3 rounded-xl border border-dashed border-slate-700">
                             <div className="text-xs font-bold text-slate-500 uppercase mb-3 px-1">Group A Matches</div>
                             <div className="flex flex-col gap-3">
                                {groupA.map((m, i) => renderMatchNode(m, undefined, false, true))}
                             </div>
                        </div>
                     )}
                     
                     {/* Group B */}
                     {groupB.length > 0 && (
                        <div className="bg-slate-900/40 p-3 rounded-xl border border-dashed border-slate-700">
                             <div className="text-xs font-bold text-slate-500 uppercase mb-3 px-1">Group B Matches</div>
                             <div className="flex flex-col gap-3">
                                {groupB.map((m, i) => renderMatchNode(m, undefined, false, true))}
                             </div>
                        </div>
                     )}

                     {/* Arrow to Next Stage */}
                     <div className="absolute top-1/2 -right-10 transform -translate-y-1/2 text-slate-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                     </div>
                </div>
            )}

            {/* Column 1: Quarter Finals (Optional) */}
            {hasQuarters && (
                <div className="flex flex-col gap-8">
                    {/* QF Pair 1 -> Feeds SF1 */}
                    <div className="flex flex-col gap-12 relative">
                        <div className="relative">
                            {renderMatchNode(quarters[0], 'QF1')}
                            <svg width="60" height="100" className="absolute top-1/2 -right-16 z-0 pointer-events-none overflow-visible">
                                <path d="M 0 0 L 30 0 L 30 60 L 60 60" stroke="#475569" strokeWidth="2" fill="none" />
                            </svg>
                        </div>
                        <div className="relative">
                            {renderMatchNode(quarters[1], 'QF2')}
                            <svg width="60" height="100" className="absolute top-1/2 -right-16 z-0 pointer-events-none overflow-visible">
                                <path d="M 0 0 L 30 0 L 30 -60 L 60 -60" stroke="#475569" strokeWidth="2" fill="none" />
                            </svg>
                        </div>
                    </div>

                    {/* QF Pair 2 -> Feeds SF2 */}
                    <div className="flex flex-col gap-12 relative mt-8">
                        <div className="relative">
                            {renderMatchNode(quarters[2], 'QF3')}
                            <svg width="60" height="100" className="absolute top-1/2 -right-16 z-0 pointer-events-none overflow-visible">
                                <path d="M 0 0 L 30 0 L 30 60 L 60 60" stroke="#475569" strokeWidth="2" fill="none" />
                            </svg>
                        </div>
                        <div className="relative">
                            {renderMatchNode(quarters[3], 'QF4')}
                            <svg width="60" height="100" className="absolute top-1/2 -right-16 z-0 pointer-events-none overflow-visible">
                                <path d="M 0 0 L 30 0 L 30 -60 L 60 -60" stroke="#475569" strokeWidth="2" fill="none" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {/* Column 2: Semi Finals */}
            {/* Only show if we have semis scheduled or finished */}
            {semis.length > 0 && (
                <div className="flex flex-col gap-32"> 
                    {/* SF1 */}
                    <div className="relative">
                        {renderMatchNode(semis[0] || undefined, 'Semi Final 1')}
                        {/* Connect to Final */}
                        <svg width="60" height="200" className="absolute top-1/2 -right-16 z-0 pointer-events-none overflow-visible">
                            <path d="M 0 0 L 30 0 L 30 100 L 60 100" stroke="#475569" strokeWidth="2" fill="none" />
                        </svg>
                    </div>

                    {/* SF2 */}
                    <div className="relative">
                        {renderMatchNode(semis[1] || undefined, 'Semi Final 2')}
                        {/* Connect to Final */}
                        <svg width="60" height="200" className="absolute top-1/2 -right-16 z-0 pointer-events-none overflow-visible">
                            <path d="M 0 0 L 30 0 L 30 -100 L 60 -100" stroke="#475569" strokeWidth="2" fill="none" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Column 3: Final */}
            {final && (
                 <div className="relative">
                    {renderMatchNode(final || undefined, 'Grand Final', true)}
                </div>
            )}

        </div>
    </div>
  );
};