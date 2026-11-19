
import { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import VisualizationPanel from './components/VisualizationPanel';
import { executeJava } from './services/javaRunner';

const DEFAULT_CODE = `public class BinarySearch {
    public static int search(int[] arr, int target) {
        int left = 0;
        int right = arr.length - 1;

        while(left <= right) {
            int mid = left + (right - left) / 2;

            if(arr[mid] == target) {
                return mid;
            }

            if(arr[mid] < target)
                left = mid + 1;
            else
                right = mid - 1;
        }

        return -1;
    }

    public static void main(String[] args) {
        int[] arr = {10, 20, 30, 40, 50};
        int target = 30;
        System.out.println(search(arr, target));
    }
}`;

function AppContent() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const [events, setEvents] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState('1.0x');

  const totalSteps = events.length;
  const currentEvent = events[currentStep] || null;
  const currentLine = currentEvent?.line || 0;

  // Execute the actual Java program through the backend.
  const runCode = async (shouldPlay = false) => {
    setIsRunning(true);
    setIsPlaying(false);
    setEvents([]);
    setCurrentStep(0);
    setOutput('');

    try {
      const result = await executeJava(code);

      if (result.error) {
        setOutput(result.error);
        return;
      }

      setOutput(result.output || 'Program executed successfully.');
      setEvents(result.events || []);

      if (shouldPlay && result.events?.length) {
        setCurrentStep(0);
        setIsPlaying(true);
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRun = () => runCode(false);

  const handleVisualize = () => runCode(true);

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (!events.length) return;

    if (currentStep >= totalSteps - 1) {
      setCurrentStep(0);
      setIsPlaying(true);
      return;
    }

    setIsPlaying(value => !value);
  };

  const handleNext = () => {
    setIsPlaying(false);

    setCurrentStep(step =>
      Math.min(step + 1, totalSteps - 1)
    );
  };

  const handlePrev = () => {
    setIsPlaying(false);

    setCurrentStep(step =>
      Math.max(step - 1, 0)
    );
  };

  const handleFirst = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleLast = () => {
    setIsPlaying(false);
    setCurrentStep(Math.max(totalSteps - 1, 0));
  };

  const handleSeek = step => {
    setIsPlaying(false);

    setCurrentStep(
      Math.max(0, Math.min(Number(step), totalSteps - 1))
    );
  };

  // Slower playback gives enough time to follow pointer movement
  // and inspect each actual runtime snapshot.
  useEffect(() => {
    if (!isPlaying || !events.length) return;

    if (currentStep >= events.length - 1) {
      setIsPlaying(false);
      return;
    }

    const delays = {
      '0.25x': 4000,
      '0.5x': 2400,
      '0.75x': 1600,
      '1.0x': 1000,
      '1.5x': 650,
      '2.0x': 450,
    };

    const timer = setTimeout(() => {
      setCurrentStep(step =>
        Math.min(step + 1, events.length - 1)
      );
    }, delays[speed] || 1000);

    return () => clearTimeout(timer);
  }, [isPlaying, events, currentStep, speed]);

  return (
    <div className="h-screen flex flex-col dark:bg-dark-bg bg-light-bg transition-colors duration-300">
      <TopNav
        onVisualize={handleVisualize}
        onReset={handleReset}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex gap-4 p-4 overflow-hidden">
          {/* Existing code editor and output area */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="flex-1 min-h-0">
              <CodeEditor
                code={code}
                setCode={setCode}
                currentLine={currentLine}
              />
            </div>

            <OutputPanel
              output={output}
              onRun={handleRun}
              isRunning={isRunning}
            />
          </div>

          {/* Existing visualization panel location */}
          <div className="flex-1 min-w-0">
            <VisualizationPanel
              currentStep={currentStep}
              totalSteps={totalSteps}
              currentEvent={currentEvent}
              events={events}
              code={code}
              isPlaying={isPlaying}
              speed={speed}
              setSpeed={setSpeed}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrev={handlePrev}
              onFirst={handleFirst}
              onLast={handleLast}
              onReset={handleReset}
              onSeek={handleSeek}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
