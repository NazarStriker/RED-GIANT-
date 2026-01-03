import React, { useState, useEffect, useCallback } from 'react';
import GameHUD from './components/GameHUD';
import Terminal from './components/Terminal';
import { INITIAL_STATE, advanceGameTurn, generateVisual } from './services/gameLogic';
import { audioController } from './services/audio';
import { GameState, Message } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Initial Game Start (Auto-trigger)
  const startGame = useCallback(async () => {
    // Initialize audio context on user interaction (button click)
    audioController.playStartSound();
    
    setIsLoading(true);
    setHasStarted(true);

    try {
      // SCENARIO: 03:00 AM. Explicitly lying in bed. Room is clean/intact.
      const introPrompt = "СИТУАЦИЯ: 03:00 ночи. Я ЛЕЖУ в своей кровати. Комната ЦЕЛАЯ, порядок, но очень душно. Жалюзи на окнах закрыты, но сквозь щели пробивается зловещее темно-красное свечение с улицы. Я подношу Смартфон к лицу, чтобы проверить время.";
      
      const turnResult = await advanceGameTurn([], INITIAL_STATE, introPrompt);
      const imageUrl = await generateVisual(turnResult.imagePrompt);

      setGameState(turnResult.gameState);
      setMessages([
        {
          id: Date.now().toString(),
          role: 'ai',
          text: turnResult.story,
          imageUrl: imageUrl || undefined,
          timestamp: Date.now()
        }
      ]);
      audioController.playCue('BREATHING');
    } catch (error) {
      console.error("Failed to start game", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle User Input
  const handleSendMessage = async (text: string) => {
    audioController.playMessageSound(); // Sound feedback for typing
    
    // Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const historyContext = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`);
      
      // Get AI Logic Response
      const turnResult = await advanceGameTurn(historyContext, gameState, text);
      
      // Update State
      setGameState(turnResult.gameState);

      // Play Sound Effect triggered by AI
      if (turnResult.soundCue) {
        audioController.playCue(turnResult.soundCue);
      }

      // Generate Image
      const imageUrl = await generateVisual(turnResult.imagePrompt);

      // Add AI Response
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: turnResult.story,
        imageUrl: imageUrl || undefined,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error("Turn error", error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'system',
        text: "СБОЙ СИСТЕМЫ...",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (gameState.isGameOver && !isLoading) {
       audioController.playAlertSound();
    }
  }, [gameState.isGameOver, isLoading]);

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-center p-4">
        <div className="max-w-lg space-y-8 relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold text-red-600 animate-pulse tracking-tighter">
            LAST SURVIVOR
            <span className="block text-2xl text-red-800 mt-2">RED GIANT</span>
          </h1>
          <p className="text-gray-400 leading-relaxed">
            03:00 AM. Жара усиливается. Красный гигант скоро взойдет.
            Собери ресурсы до рассвета.
          </p>
          <button 
            onClick={startGame}
            className="px-8 py-3 bg-red-900/30 border border-red-600 text-red-500 hover:bg-red-600 hover:text-black transition-all rounded uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.5)]"
          >
            [ НАЧАТЬ ИСТОРИЮ ]
          </button>
        </div>
        
        {/* Ambient Background Visual */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#300000_0%,_#000000_80%)] opacity-50 z-0"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-black text-white overflow-hidden">
      <GameHUD state={gameState} />
      <Terminal 
        messages={messages} 
        isLoading={isLoading} 
        onSendMessage={handleSendMessage} 
        isGameOver={gameState.isGameOver}
      />
    </div>
  );
};

export default App;