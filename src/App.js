import React, { useState, useEffect, useRef } from "react";
import "./index.css";

const phases = [
  { name: "Inhale", duration: 4 },
  { name: "Hold", duration: 7 },
  { name: "Exhale", duration: 8 },
];

function getTodayKey() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

function updateLocalStorage(minutes) {
  const key = getTodayKey();
  const data = JSON.parse(localStorage.getItem("breathingHistory") || "{}");
  data[key] = (data[key] || 0) + minutes;
  localStorage.setItem("breathingHistory", JSON.stringify(data));
}

function preloadAudio(audioRefs) {
  audioRefs.forEach((ref) => {
    const audio = ref.current;
    audio.play().catch(() => {});
    audio.pause();
    audio.currentTime = 0;
  });
}

export default function BreathingApp() {
  const [isRunning, setIsRunning] = useState(false);
  const [meditationTime, setMeditationTime] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(phases[0].duration);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const intervalRef = useRef(null);

  const inhaleAudio = useRef(new Audio("/inhale.mp3"));
  const holdAudio = useRef(new Audio("/hold.mp3"));
  const exhaleAudio = useRef(new Audio("/exhale.mp3"));
  const finishAudio = useRef(new Audio("/finish.mp3"));

  const stopAllSounds = () => {
    [inhaleAudio, holdAudio, exhaleAudio, finishAudio].forEach((ref) => {
      const audio = ref.current;
      audio.pause();
      audio.currentTime = 0;
    });
  };

  const playAudioForPhase = (phaseName) => {
    stopAllSounds();
    let audio;
    if (phaseName === "Inhale") audio = inhaleAudio.current;
    else if (phaseName === "Hold") audio = holdAudio.current;
    else if (phaseName === "Exhale") audio = exhaleAudio.current;

    if (audio) {
      audio.currentTime = 0;
      audio.volume = 1;
      audio.play().catch((e) => console.warn("Audio play interrupted:", e));
    }
  };

  useEffect(() => {
    if (isRunning && !sessionComplete) {
      intervalRef.current = setInterval(() => {
        setPhaseTimeLeft((prev) => {
          if (prev > 1) return prev - 1;

          setPhaseIndex((prevIndex) => {
            const nextIndex = (prevIndex + 1) % phases.length;
            const nextPhase = phases[nextIndex];
            setPhaseTimeLeft(nextPhase.duration);
            playAudioForPhase(nextPhase.name);

            if (nextIndex === 0) {
              setElapsed((prevElapsed) => {
                const nextElapsed = prevElapsed + phases.reduce((a, b) => a + b.duration, 0);
                if (nextElapsed >= meditationTime * 60) {
                  setIsRunning(false);
                  setSessionComplete(true);
                  updateLocalStorage(meditationTime);
                  stopAllSounds();
                  finishAudio.current.currentTime = 0;
                  finishAudio.current.volume = 1;
                  finishAudio.current.play().catch((e) =>
                    console.warn("Finish audio play interrupted:", e)
                  );
                }
                return nextElapsed;
              });
            }

            return nextIndex;
          });

          return 0;
        });

        setElapsed((prevElapsed) => prevElapsed + 1);
      }, 1000);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, meditationTime, sessionComplete]);

  const startMeditation = () => {
    preloadAudio([inhaleAudio, holdAudio, exhaleAudio, finishAudio]);
    stopAllSounds();
    setElapsed(0);
    setPhaseIndex(0);
    setPhaseTimeLeft(phases[0].duration);
    setIsRunning(true);
    setSessionStarted(true);
    setSessionComplete(false);
    playAudioForPhase("Inhale");
  };

  const togglePause = () => {
    if (isRunning) {
      clearInterval(intervalRef.current);
      stopAllSounds();
    } else {
      playAudioForPhase(phases[phaseIndex].name);
    }
    setIsRunning((prev) => !prev);
  };

  const todayKey = getTodayKey();
  const history = JSON.parse(localStorage.getItem("breathingHistory") || "{}");
  const todayMinutes = history[todayKey] || 0;
  const timeRemaining = Math.max(meditationTime * 60 - elapsed, 0);

  return (
    <div className="app-container">
      <h1 className="title">Time to Get Sleepy</h1>
      <p className="subtext">Today’s total: {todayMinutes} minute(s)</p>

      <div className="input-group">
        <label className="label">Duration (minutes)</label>
        <input
          type="number"
          value={meditationTime}
          onChange={(e) => setMeditationTime(Number(e.target.value))}
          min={1}
          className="input"
        />
      </div>

      {!isRunning && !sessionStarted && (
        <button className="button start" onClick={startMeditation}>
          Start
        </button>
      )}

      {sessionStarted && !sessionComplete && (
        <div className="session">
          <p className="phase-name">{phases[phaseIndex].name}</p>
          <p className="phase-timer">{phaseTimeLeft}s</p>
          <p className="time-remaining">
            Time remaining: {Math.floor(timeRemaining / 60)}:
            {(timeRemaining % 60).toString().padStart(2, "0")}
          </p>
          <button className="button pause" onClick={togglePause}>
            {isRunning ? "Pause" : "Resume"}
          </button>
        </div>
      )}

      {sessionComplete && (
        <div className="session-complete">
          <p className="complete-text">Session complete. 🧘</p>
          <button className="button start" onClick={startMeditation}>
            Start Another Session
          </button>
        </div>
      )}
    </div>
  );
}
