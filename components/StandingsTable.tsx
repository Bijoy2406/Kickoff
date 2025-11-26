import React from 'react';
import { Team } from '../types';

interface StandingsTableProps {
  teams: Team[];
  title?: string;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ teams, title }) => {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50 shadow-sm">
      {title && <div className="bg-slate-800 px-4 py-3 font-semibold text-emerald-400">{title}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-900 text-xs uppercase text-slate-300">
            <tr>
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3 text-center">P</th>
              <th className="px-4 py-3 text-center">W</th>
              <th className="px-4 py-3 text-center">D</th>
              <th className="px-4 py-3 text-center">L</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">GF</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">GA</th>
              <th className="px-4 py-3 text-center">GD</th>
              <th className="px-4 py-3 text-center font-bold text-white">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {teams.map((team, index) => (
              <tr key={team.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-500">{index + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-200 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                    {team.name.substring(0, 2).toUpperCase()}
                  </div>
                  {team.name}
                </td>
                <td className="px-4 py-3 text-center">{team.stats.played}</td>
                <td className="px-4 py-3 text-center text-emerald-400">{team.stats.won}</td>
                <td className="px-4 py-3 text-center text-yellow-500">{team.stats.drawn}</td>
                <td className="px-4 py-3 text-center text-red-400">{team.stats.lost}</td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">{team.stats.gf}</td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">{team.stats.ga}</td>
                <td className="px-4 py-3 text-center font-medium">{team.stats.gd}</td>
                <td className="px-4 py-3 text-center font-bold text-white bg-slate-700/20">{team.stats.points}</td>
              </tr>
            ))}
            {teams.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  No teams in this group yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};