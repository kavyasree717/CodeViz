import { Code2 } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-14 flex-shrink-0 flex flex-col items-center py-4 gap-2 border-r transition-colors duration-300 dark:bg-dark-bg dark:border-dark-border bg-light-bg border-light-border">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-viz-accent to-viz-mid flex items-center justify-center text-white font-bold text-lg mb-2">
        CV
      </div>
      
      {/* Code button */}
      <button
        title="Code"
        className="w-10 h-10 rounded-xl flex items-center justify-center bg-viz-accent/20 text-viz-accent transition-all duration-200"
      >
        <Code2 size={20} />
      </button>
    </aside>
  );
}