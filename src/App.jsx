// Typing Practice Game - Tetris Style with Leaderboard and Enhancements
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

const CHAR_SETS = {
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  zh: "ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ1234567890"
};

const getRandomChar = (mode) => {
  const chars = CHAR_SETS[mode];
  return chars[Math.floor(Math.random() * chars.length)];
};

const difficulties = [
  { name: "easy", speed: 2000, count: 1 },
  { name: "medium", speed: 1500, count: 2 },
  { name: "hard", speed: 1000, count: 3 },
];

const Game = () => {
  const [mode, setMode] = useState(null);
  const [difficultyIndex, setDifficultyIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(10);
  const [gameOver, setGameOver] = useState(false);
  const [bombs, setBombs] = useState([]);
  const [step, setStep] = useState("select-mode");
  const [username, setUsername] = useState("");
  const [bombsCleared, setBombsCleared] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  const bombIdRef = useRef(0);
  const canvasRef = useRef();
  const audioRef = useRef({});

  useEffect(() => {
    const stored = localStorage.getItem("leaderboard");
    if (stored) setLeaderboard(JSON.parse(stored));
  }, []);

  const currentDifficulty = difficulties[difficultyIndex];

  const createBomb = () => {
    setBombs((prev) => {
      const newBombs = [...prev];
      for (let i = 0; i < currentDifficulty.count; i++) {
        newBombs.push({
          id: bombIdRef.current++,
          char: getRandomChar(mode),
          x: Math.random() * 300,
          y: 0
        });
      }
      return newBombs;
    });
  };

  useEffect(() => {
    if (step === "game") {
      const dropInterval = setInterval(() => {
        setBombs((prev) => prev.map((b) => ({ ...b, y: b.y + 10 })));
        createBomb();
      }, currentDifficulty.speed);
      return () => clearInterval(dropInterval);
    }
  }, [step, difficultyIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toUpperCase();
      let hit = false;
      setBombs((prev) => {
        const updated = prev.filter((b) => {
          if (b.char === key && !hit) {
            setScore((s) => s + 1);
            setBombsCleared((n) => n + 1);
            hit = true;
            playSound("hit");
            return false;
          }
          return true;
        });
        return updated;
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setBombs((prev) => {
      const stillActive = [];
      prev.forEach((b) => {
        if (b.y >= 400) {
          setLives((l) => l - 1);
          playSound("fail");
        } else {
          stillActive.push(b);
        }
      });
      return stillActive;
    });
  }, [bombs]);

  useEffect(() => {
    if (lives <= 0) {
      setGameOver(true);
      setStep("enter-name");
      playSound("gameover");
    }
  }, [lives]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 400, 500);
    bombs.forEach((b) => {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 20, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText(b.char, b.x, b.y + 5);
    });
  }, [bombs]);

  useEffect(() => {
    if (bombsCleared >= 50) {
      setBombsCleared(0);
      if (difficultyIndex < difficulties.length - 1) {
        setDifficultyIndex((i) => i + 1);
        alert("LEVEL COMPLETED! 下一關開始");
      }
    }
  }, [bombsCleared]);

  const startGame = () => {
    setScore(0);
    setLives(10);
    setBombs([]);
    setBombsCleared(0);
    setGameOver(false);
    setStep("game");
  };

  const submitScore = () => {
    const newEntry = { name: username, score, date: new Date().toLocaleString() };
    const newBoard = [...leaderboard, newEntry].sort((a, b) => b.score - a.score).slice(0, 10);
    setLeaderboard(newBoard);
    localStorage.setItem("leaderboard", JSON.stringify(newBoard));
    setStep("leaderboard");
  };

  const playSound = (type) => {
    const audios = {
      hit: new Audio("/sounds/hit.mp3"),
      fail: new Audio("/sounds/fail.mp3"),
      gameover: new Audio("/sounds/gameover.mp3")
    };
    audios[type]?.play();
  };

  if (step === "select-mode") {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold mb-4">選擇語言模式</h1>
        <Button onClick={() => setMode("en")}>英文</Button>
        <Button onClick={() => setMode("zh")}>中文</Button>
        {mode && (
          <div className="mt-4">
            <h2 className="text-lg mb-2">選擇難度</h2>
            {difficulties.map((level, i) => (
              <Button key={level.name} className="m-1" onClick={() => { setDifficultyIndex(i); startGame(); }}>
                {level.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === "enter-name") {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold">GAME OVER</h1>
        <p className="mb-2">你的分數: {score}</p>
        <input className="border p-2 mb-2" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="請輸入姓名" />
        <br />
        <Button onClick={submitScore}>送出成績</Button>
      </div>
    );
  }

  if (step === "leaderboard") {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold mb-2">🏆 排行榜</h1>
        <ol className="mb-4">
          {leaderboard.map((entry, i) => (
            <li key={i}>{entry.name} - {entry.score} 分 ({entry.date})</li>
          ))}
        </ol>
        <Button onClick={() => setStep("select-mode")}>再玩一次</Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between">
        <div>❤️ {lives}</div>
        <div>🏆 {score}</div>
      </div>
      <canvas ref={canvasRef} width={400} height={500} className="bg-gray-100 border mx-auto mt-4" />
    </div>
  );
};

export default Game;
