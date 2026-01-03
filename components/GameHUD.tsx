import React from 'react';
import { GameState } from '../types';

interface GameHUDProps {
  state: GameState;
}

const StatBar: React.FC<{ label: string; value: number; color: string; max?: number }> = ({ label, value, color, max = 100 }) => (
  <div className="flex flex-col w-full mb-2">
    <div className="flex justify-between text-xs uppercase tracking-widest text-gray-400 mb-1 font-mono">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700">
      <div 
        className={`h-full ${color} transition-all duration-500`} 
        style={{ width: `${(Math.max(0, value) / max) * 100}%` }}
      ></div>
    </div>
  </div>
);

const GameHUD: React.FC<GameHUDProps> = ({ state }) => {
  return (
    <div className="w-full lg:w-80 bg-black/90 border-r border-red-900/30 flex flex-col p-6 shrink-0 h-auto lg:h-screen overflow-y-auto font-mono z-20 scrollbar-hide">
      <h1 className="text-2xl font-bold text-red-500 mb-6 tracking-tighter border-b border-red-900/50 pb-4">
        RED GIANT
        <span className="block text-xs text-red-400/50 font-normal mt-1 uppercase">Протокол Выживания</span>
      </h1>

      <div className="mb-8 space-y-4">
        <div className="flex justify-between items-center bg-red-950/20 p-2 rounded border border-red-900/30">
          <span className="text-red-400 text-sm uppercase">ТЕМП</span>
          <span className={`text-xl font-bold ${state.temperature > 50 ? 'animate-pulse text-red-500' : 'text-orange-400'}`}>
            {state.temperature}°C
          </span>
        </div>
        <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-800">
          <span className="text-gray-400 text-sm uppercase">ВРЕМЯ</span>
          <span className="text-xl font-bold text-blue-200">{state.time}</span>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <StatBar label="Здоровье" value={state.health} color="bg-red-600" />
        <StatBar label="Кислород" value={state.oxygen} color="bg-blue-500" />
        <StatBar label="Жажда" value={state.thirst} color="bg-cyan-600" />
        <StatBar label="Голод" value={state.hunger} color="bg-green-600" />
      </div>

      <div className="mb-8">
        <h3 className="text-xs uppercase text-gray-500 mb-3 border-b border-gray-800 pb-1">Инвентарь</h3>
        <ul className="space-y-2">
          {state.inventory.length === 0 ? (
            <li className="text-gray-600 italic text-sm">Пусто...</li>
          ) : (
            state.inventory.map((item, idx) => (
              <li key={idx} className="text-sm text-gray-300 flex items-center">
                <span className="w-1.5 h-1.5 bg-red-500/50 rounded-full mr-2"></span>
                {item}
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="flex-1 mb-8">
        <h3 className="text-xs uppercase text-blue-500/80 mb-3 border-b border-blue-900/30 pb-1">Память / Знания</h3>
        <ul className="space-y-2">
           {state.knowledgeBase && state.knowledgeBase.length > 0 ? (
             state.knowledgeBase.map((fact, idx) => (
               <li key={idx} className="text-xs text-blue-200/70 border-l border-blue-900/50 pl-2 leading-tight">
                 {fact}
               </li>
             ))
           ) : (
             <li className="text-gray-600 italic text-xs">Нет данных...</li>
           )}
        </ul>
      </div>
      
      <div className="mt-auto text-xs text-gray-600 border-t border-gray-800 pt-4">
        ЛОК: {state.location.toUpperCase()} <br/>
        ФАЗА: {state.gamePhase.toUpperCase()}
      </div>
    </div>
  );
};

export default GameHUD;