import React, { useState } from 'react';
import { TournamentType } from '../types';
import { Button } from './Button';

interface TournamentWizardProps {
  onCreate: (name: string, type: TournamentType, teams: string[]) => void;
}

export const TournamentWizard: React.FC<TournamentWizardProps> = ({ onCreate }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TournamentType>(TournamentType.LEAGUE);
  const [teamCount, setTeamCount] = useState(4);
  const [teams, setTeams] = useState<string[]>(Array(4).fill(''));
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTeamCountChange = (count: number) => {
    setTeamCount(count);
    setTeams(prev => {
      const newTeams = [...prev];
      if (count > prev.length) {
        return [...newTeams, ...Array(count - prev.length).fill('')];
      }
      return newTeams.slice(0, count);
    });
  };

  const handleTeamNameChange = (index: number, value: string) => {
    const newTeams = [...teams];
    newTeams[index] = value;
    setTeams(newTeams);
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(name, type, teams);
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

        {/* Team Count */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Number of Teams</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="2"
              max="16"
              step={type === TournamentType.GROUPS_KNOCKOUT ? 2 : 1} // Groups usually even
              value={teamCount}
              onChange={(e) => handleTeamCountChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-xl font-bold text-white w-8 text-center">{teamCount}</span>
          </div>
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

        <Button type="submit" size="lg" className="w-full mt-8">
          Start Tournament
        </Button>
      </form>
    </div>
  );
};