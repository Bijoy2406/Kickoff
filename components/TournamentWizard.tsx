import React, { useState, useMemo } from 'react';
import { TournamentType } from '../types';
import { Button } from './Button';
import { getFirstKnockoutRoundName } from '../utils/tournamentUtils';

interface TournamentWizardProps {
  onCreate: (name: string, type: TournamentType, teams: string[], numGroups?: number, advancingPerGroup?: number) => void;
}

export const TournamentWizard: React.FC<TournamentWizardProps> = ({ onCreate }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TournamentType>(TournamentType.LEAGUE);
  const [teamCount, setTeamCount] = useState(4);
  const [teams, setTeams] = useState<string[]>(Array(4).fill(''));
  const [isGenerating, setIsGenerating] = useState(false);
  const [numGroups, setNumGroups] = useState(2);
  const [advancingPerGroup, setAdvancingPerGroup] = useState(2);
  const [numGroupsInput, setNumGroupsInput] = useState('2');
  const [advancingInput, setAdvancingInput] = useState('2');
  const [teamCountInput, setTeamCountInput] = useState('4');

  // Calculate the first knockout round name based on current settings
  const firstKnockoutRound = useMemo(() => {
    return getFirstKnockoutRoundName(numGroups, advancingPerGroup);
  }, [numGroups, advancingPerGroup]);

  // Calculate teams per group
  const teamsPerGroup = useMemo(() => {
    return Math.floor(teamCount / numGroups);
  }, [teamCount, numGroups]);

  // Validation checks
  const hasUnevenGroups = teamCount % numGroups !== 0;
  const advancingTooMany = advancingPerGroup > teamsPerGroup;
  const hasInvalidConfig = hasUnevenGroups || advancingTooMany;
  const isFormValid = type === TournamentType.LEAGUE || !hasInvalidConfig;

  const sanitizeNumber = (rawValue: string, min: number, max: number) => {
    const cleaned = rawValue.replace(/^-+/, '').replace(/[^0-9]/g, '');
    if (cleaned === '') return { input: '', value: null as number | null };
    const parsed = parseInt(cleaned, 10);
    const clamped = Math.min(max, Math.max(min, parsed));
    return { input: String(clamped), value: clamped };
  };
  
  const handleTeamCountChange = (rawValue: string) => {
    const { input, value } = sanitizeNumber(rawValue, 2, 64);
    setTeamCountInput(input);
    if (value === null) return;
  
    setTeamCount(value);
    setTeams(prev => {
      const newTeams = [...prev];
      if (value > prev.length) {
        return [...newTeams, ...Array(value - prev.length).fill('')];
      }
      return newTeams.slice(0, value);
    });
  };
  
  const handleNumGroupsChange = (rawValue: string) => {
    const { input, value } = sanitizeNumber(rawValue, 1, 16);
    setNumGroupsInput(input);
    if (value === null) return;
    setNumGroups(value);
  };
  
  const handleAdvancingChange = (rawValue: string) => {
    const { input, value } = sanitizeNumber(rawValue, 1, 16);
    setAdvancingInput(input);
    if (value === null) return;
    setAdvancingPerGroup(value);
  };

  const handleTeamNameChange = (index: number, value: string) => {
    const newTeams = [...teams];
    newTeams[index] = value;
    setTeams(newTeams);
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === TournamentType.GROUPS_KNOCKOUT) {
      onCreate(name, type, teams, numGroups, advancingPerGroup);
    } else {
      onCreate(name, type, teams);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-emerald-500">⚽</span> Create Tournament
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tournament Name */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Tournament Name</label>
          <input
            type="text"
            required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            placeholder="e.g., Champions Cup 2024"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Format</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setType(TournamentType.LEAGUE)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${type === TournamentType.LEAGUE
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-600'
                }`}
            >
              <div className="font-bold mb-1">League</div>
              <div className="text-xs opacity-75">Round Robin table. Most points wins.</div>
            </button>
            <button
              type="button"
              onClick={() => setType(TournamentType.GROUPS_KNOCKOUT)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${type === TournamentType.GROUPS_KNOCKOUT
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-600'
                }`}
            >
              <div className="font-bold mb-1">Groups + Knockout</div>
              <div className="text-xs opacity-75">Divide into groups. Top teams play Final.</div>
            </button>
          </div>
        </div>

        {/* Group Settings - Only show for Groups + Knockout */}
        {type === TournamentType.GROUPS_KNOCKOUT && (
          <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="grid grid-cols-2 gap-4">
              {/* Number of Groups */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Number of Groups</label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={numGroupsInput}
                  onChange={(e) => handleNumGroupsChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Advancing Per Group */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Advancing Per Group</label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={advancingInput}
                  onChange={(e) => handleAdvancingChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Knockout Round Estimation */}
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div className="text-sm text-slate-400">
                <span className="font-medium text-white">{teamsPerGroup}</span> teams per group
              </div>
              <div className="text-sm">
                <span className="text-slate-400">First Knockout Round: </span>
                <span className="font-bold text-emerald-400">{firstKnockoutRound}</span>
              </div>
            </div>

            {/* Validation Warnings */}
            {hasUnevenGroups && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                ❌ {teamCount} teams cannot be evenly divided into {numGroups} groups. Each group would have {teamsPerGroup} teams with {teamCount % numGroups} team(s) remaining.
              </div>
            )}
            
            {!hasUnevenGroups && advancingTooMany && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                ❌ Cannot advance {advancingPerGroup} teams per group when each group only has {teamsPerGroup} teams.
              </div>
            )}

            {!hasInvalidConfig && firstKnockoutRound === 'Play-off' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
                ⚠️ {numGroups * advancingPerGroup} advancing teams is not a power of 2. A play-off round will be needed.
              </div>
            )}
          </div>
        )}

        {/* Team Count */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Number of Teams</label>
          <input
            type="number"
            min="2"
            max="64"
            value={teamCountInput}
            onChange={(e) => handleTeamCountChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Teams Inputs */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-slate-400">Team Names</label>

          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teams.map((team, idx) => (
              <input
                key={idx}
                type="text"
                required
                placeholder={`Team ${idx + 1}`}
                value={team}
                onChange={(e) => handleTeamNameChange(idx, e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full mt-8" disabled={!isFormValid}>
          Start Tournament
        </Button>
      </form>
    </div>
  );
};