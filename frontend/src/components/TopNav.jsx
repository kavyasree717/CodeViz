import { useTheme } from '../context/ThemeContext';
import { Play, RotateCcw, Sun, Moon, ChevronDown, Settings, Sparkles } from 'lucide-react';

export default function TopNav({ onVisualize, onReset }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b transition-colors duration-300 dark:bg-dark-bg dark:border-dark-border bg-light-bg border-light-border">
      {/* Left: Logo & Language */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-viz-accent to-viz-mid flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-viz-accent to-viz-mid bg-clip-text text-transparent">
            CodeViz
          </span>
        </div>
        
        <div className="h-6 w-px dark:bg-dark-border bg-light-border" />
        
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors dark:bg-dark-elevated dark:text-gray-300 dark:hover:bg-dark-border bg-gray-100 text-gray-700 hover:bg-gray-200">
          <span className="text-orange-500 font-semibold">Java</span>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Center: Main Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onVisualize}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-viz-accent to-viz-mid text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-viz-accent/25"
        >
          <Play size={16} fill="currentColor" />
          Visualize
        </button>
        
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors dark:bg-dark-elevated dark:text-gray-300 dark:hover:bg-dark-border dark:border dark:border-dark-border bg-white text-gray-700 hover:bg-gray-50 border border-light-border"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* Right: Theme & Settings */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors dark:bg-dark-elevated dark:text-yellow-400 dark:hover:bg-dark-border bg-amber-50 text-amber-600 hover:bg-amber-100"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        <button className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors dark:bg-dark-elevated dark:text-gray-400 dark:hover:bg-dark-border dark:hover:text-gray-200 bg-gray-100 text-gray-500 hover:bg-gray-200">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}