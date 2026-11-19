# CodeViz – Interactive Java Code Visualization Platform

CodeViz is an interactive Java code execution and visualization platform designed to help students understand how programs execute internally. Instead of simply displaying the final output, CodeViz captures runtime execution events and presents them visually, helping learners understand how variables change, how methods execute, how conditions are evaluated, and how loops progress.

## Overview

Understanding programming is not just about writing code — it is about understanding how the code executes.

CodeViz aims to bridge the gap between writing code and understanding its runtime behavior by combining Java execution, runtime tracing, and interactive visualizations into a single platform.

Users can write Java code, execute it, inspect runtime events, and explore the execution process step by step.

## Key Features

- **Interactive Code Execution** – Write and execute Java programs through a web-based interface.
- **Step-by-Step Execution** – Navigate through captured execution events.
- **Runtime Variable Tracking** – Observe local variables and their changing values.
- **Branch Visualization** – Understand conditional statements and their execution outcomes.
- **Loop Visualization** – Explore loop conditions, iterations, and termination.
- **Array Visualization** – Visualize array values and algorithm-related pointer movements.
- **Method Execution Tracking** – Understand method calls, arguments, and returns.
- **Execution History** – Navigate through recorded runtime events.
- **Byte Mascot** – An interactive mascot designed to guide users through the execution process.
- **Runtime Insights** – View explanations and details associated with execution events.

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS
- Lucide React

### Backend
- Node.js
- Express.js

### Java Runtime and Tracing
- Java
- Java Debug Interface (JDI)
- Java Compiler API / AST-based source instrumentation

## System Architecture

CodeViz follows a frontend-backend architecture.

1. The user writes a Java program in the frontend editor.
2. The frontend sends the source code to the backend.
3. The backend prepares and instruments the source code for runtime tracing.
4. The Java program is compiled and executed.
5. JDI captures runtime execution events.
6. The captured events are structured and sent to the frontend.
7. The frontend uses the runtime events to generate interactive visualizations.

```text
             USER
              |
              v
    +----------------------+
    | React Frontend      |
    | Java Code Editor    |
    | Visualization Panel |
    | Output Panel        |
    +----------------------+
              |
              v
    +----------------------+
    | Node.js / Express   |
    | Backend API         |
    +----------------------+
              |
              v
    +----------------------+
    | Source Instrumenter  |
    | AST-based Analysis   |
    +----------------------+
              |
              v
    +----------------------+
    | Java Compilation    |
    | & Execution        |
    +----------------------+
              |
              v
    +----------------------+
    | JDI Runtime Tracing |
    +----------------------+
              |
              v
    +----------------------+
    | Runtime Event Data  |
    +----------------------+
              |
              v
    +----------------------+
    | Interactive         |
    | Visualization       |
    +----------------------+
```

## Visualizations

CodeViz is designed to provide different visual representations depending on the runtime behavior of the program.

### 1. Runtime Variable Visualization
Displays variables and their values as execution progresses, allowing users to observe how data changes.

### 2. Branch Visualization
Represents conditional decisions such as `if`, `else if`, and `else`, showing which execution path is taken.

### 3. Loop Visualization
Visualizes loop execution, condition evaluations, iterations, and loop termination.

### 4. Array Visualization
Displays array elements and supports understanding indexing, traversal, and algorithmic pointer movements.

### 5. Method Visualization
Helps understand method execution, arguments, stack frames, and return values.

### 6. Execution Timeline
Allows users to navigate captured runtime events using execution controls and event history.

## Project Structure

```text
CodeViz/
│
├── backend/
│   ├── Java tracing components
│   ├── Source instrumentation
│   ├── JDI execution engine
│   └── Express server
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   └── visualization/
│   │       ├── arrays/
│   │       ├── branches/
│   │       ├── loops/
│   │        ├── runtime/
│   │        └── shared/
│   └── package.json
│
├── .gitignore
└── README.md
```

## Installation and Setup

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Java JDK
- Git

Verify installations:

```bash
node --version
npm --version
java --version
javac --version
git --version
```

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/CodeViz.git
cd CodeViz
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Start the Backend

Open a terminal:

```bash
cd backend
npm install
npm run server
```

The backend server should start at:

```text
http://localhost:5000
```

### 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend in your browser:

```text
http://localhost:5173
```

Keep both the backend and frontend servers running while using CodeViz.

## How It Works

```text
Write Java Code
      |
      v
Submit Code for Execution
      |
      v
Source Instrumentation
      |
      v
Compile Java Program
      |
      v
Execute with JDI
      |
      v
Capture Runtime Events
      |
      v
Process Variables and Execution State
      |
      v
Generate Interactive Visualization
      |
      v
Explore Execution Step by Step
```

The visualization is intended to reflect captured execution data rather than predetermined demonstration states.

## Future Enhancements

- More comprehensive runtime visualization for different Java constructs.
- Improved nested-loop and recursion visualization.
- More detailed object and memory-related visualization.
- Enhanced runtime variable tracking.
- Improved execution control and termination handling.
- Better visualization for complex algorithms and data structures.
- More interactive explanations of runtime behavior.
- Improved handling of large execution histories.
- Expanded test coverage for different Java programs.

## Project Goal

The goal of CodeViz is to make programming easier to understand by transforming abstract execution processes into observable, interactive visual experiences.

By combining runtime tracing with dynamic visualization, CodeViz aims to help learners develop a deeper understanding of Java programming, algorithm execution, and debugging.

---

**CodeViz — See how your code executes.**
