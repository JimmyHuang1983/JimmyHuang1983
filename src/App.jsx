// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import Button from "./components/Button";
// import FloatingText from "./components/FloatingText"; // <-- 移除 FloatingText 的引入

const CHAR_SETS = {
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ135790",
  zh: "ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ"
};

const ZHUYIN_KEY_MAP = {
  'ㄅ': '1', 'ㄆ': 'Q', 'ㄇ': 'A', 'ㄈ': 'Z', 'ㄉ': '2',
  'ㄊ': 'W', 'ㄋ': 'S', 'ㄌ': 'X', 'ㄍ': 'E', 'ㄎ': 'D',
  'ㄏ': 'C', 'ㄐ': 'R', 'ㄑ': 'F', 'ㄒ': 'V', 'ㄓ': '5',
  'ㄔ': 'T', 'ㄕ': 'G', 'ㄖ': 'B', 'ㄗ': 'Y', 'ㄘ': 'H',
  'ㄙ': 'N', 'ㄧ': 'U', 'ㄨ': 'J', 'ㄩ': 'M', 'ㄚ': '8',
  'ㄛ': 'I', 'ㄜ': 'K', 'ㄝ': ',', 'ㄞ': '9', 'ㄟ': 'O',
  'ㄠ': 'L', 'ㄡ': '.', 'ㄢ': '0', 'ㄣ': 'P', 'ㄤ': ';',
  'ㄥ': '/', 'ㄦ': '-',
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
  // const [floatingTexts, setFloatingTexts] = useState([]); // <-- 移除 floatingTexts 狀態

  const bombIdRef = useRef(0);
  const canvasRef = useRef();
  const audioRefs = useRef({});
  // const floatingTextIdRef = useRef(0); // <-- 移除 floatingTextIdRef

  const currentDifficulty = difficulties[difficultyIndex];
  const bombsToNextLevel = 50;

  const loadSounds = useCallback(() => {
    const sounds = {
      hit: "/sounds/hit.mp3",
      fail: "/sounds/fail.mp3",
      gameover: "/sounds/gameover.mp3"
    };
    for (const type in sounds) {
      if (Object.hasOwnProperty.call(sounds, type)) {
        if (!audioRefs.current[type]) {
          audioRefs.current[type] = new Audio(sounds[type]);
          audioRefs.current[type].load();
        }
      }
    }
  }, []);

  const playSound = useCallback((type) => {
    const audio = audioRefs.current[type];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.error(`Error playing sound ${type}:`, e));
    } else {
      console.warn(`Sound ${type} not loaded or found.`);
    }
  }, []);

  useEffect(() => {
    loadSounds();
    const stored = localStorage.getItem("leaderboard");
    if (stored) setLeaderboard(JSON.parse(stored));
  }, [loadSounds]);

  const createBomb = useCallback(() => {
    const canvasWidth = 400;
    const bombRadius = 20;

    setBombs((prev) => {
      let newBombsBatch = [];
      const currentChars = CHAR_SETS[mode];

      if (!currentChars || currentChars.length === 0) {
          console.error("Invalid mode selected or empty character set for generation.");
          return prev;
      }

      for (let i = 0; i < currentDifficulty.count; i++) {
        let newX;
        let overlapped;
        let attempts = 0;
        const maxAttempts = 50;

        do {
          overlapped = false;
          newX = Math.random() * (canvasWidth - bombRadius * 2) + bombRadius;

          const allBombs = [...prev, ...newBombsBatch];
          for (const existingBomb of allBombs) {
            const dx = newX - existingBomb.x;
            const dy = 0 - existingBomb.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < bombRadius * 2) {
              overlapped = true;
              break;
            }
          }
          attempts++;
        } while (overlapped && attempts < maxAttempts);

        if (!overlapped) {
          newBombsBatch.push({
            id: bombIdRef.current++,
            char: currentChars[Math.floor(Math.random() * currentChars.length)],
            x: newX,
            y: 0
          });
        } else {
          console.warn("Could not find non-overlapping position for bomb after max attempts.");
        }
      }
      return [...prev, ...newBombsBatch];
    });
  }, [mode, currentDifficulty.count]);

  useEffect(() => {
    if (step === "game") {
      const dropInterval = setInterval(() => {
        setBombs((prev) => prev.map((b) => ({ ...b, y: b.y + 10 })));
        createBomb();
      }, currentDifficulty.speed);
      return () => clearInterval(dropInterval);
    }
  }, [step, currentDifficulty.speed, createBomb]);

  // const handleDisappear = useCallback((idToRemove) => { // <-- 移除 handleDisappear 函數
  //   setFloatingTexts((prevTexts) => prevTexts.filter((text) => text.id !== idToRemove));
  //   console.log("🔥 Floating text removed:", idToRemove);
  // }, []);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (step !== "game" || gameOver) return;

      const inputKey = e.key.toUpperCase();

      setBombs((prev) => {
        let hitOccurred = false;
        const updatedBombs = prev.filter((b) => {
          let charOnBomb = b.char;

          if (mode === 'zh') {
            if (Object.prototype.hasOwnProperty.call(ZHUYIN_KEY_MAP, charOnBomb)) {
              const expectedKey = ZHUYIN_KEY_MAP[charOnBomb];
              if (expectedKey && inputKey === expectedKey.toUpperCase() && !hitOccurred) {
                setScore((s) => s + 1);
                setBombsCleared((n) => n + 1);
                playSound("hit");
                hitOccurred = true;
                // setFloatingTexts((prevTexts) => [ // <-- 移除 floatingTexts 相關程式碼
                //   ...prevTexts,
                //   { id: floatingTextIdRef.current++, x: b.x, y: b.y, value: "+1" }
                // ]);
                return false;
              }
            } else if (charOnBomb.toUpperCase() === inputKey && !hitOccurred) {
              setScore((s) => s + 1);
              setBombsCleared((n) => n + 1);
              playSound("hit");
              hitOccurred = true;
              // setFloatingTexts((prevTexts) => [ // <-- 移除 floatingTexts 相關程式碼
              //   ...prevTexts,
              //   { id: floatingTextIdRef.current++, x: b.x, y: b.y, value: "+1" }
              // ]);
              return false;
            }
          } else { // 英文模式
            if (charOnBomb.toUpperCase() === inputKey && !hitOccurred) {
              setScore((s) => s + 1);
              setBombsCleared((n) => n + 1);
              playSound("hit");
              hitOccurred = true;
              // setFloatingTexts((prevTexts) => [ // <-- 移除 floatingTexts 相關程式碼
              //   ...prevTexts,
              //   { id: floatingTextIdRef.current++, x: b.x, y: b.y, value: "+1" }
              // ]);
              return false;
            }
          }
          return true;
        });
        return updatedBombs;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, gameOver, mode, playSound]);

  // useEffect(() => { // <-- 移除監聽 floatingTexts 狀態變化的日誌
  //   console.log("🔄 floatingTexts state updated:", floatingTexts);
  // }, [floatingTexts]);


  useEffect(() => {
    const checkInterval = setInterval(() => {
      setBombs((prev) => {
        const stillActive = [];
        prev.forEach((b) => {
          if (b.y >= 500 - 20) {
            setLives((l) => l - 1);
            playSound("fail");
          } else {
            stillActive.push(b);
          }
        });
        return stillActive;
      });
    }, 100);

    return () => clearInterval(checkInterval);
  }, [playSound]);

  useEffect(() => {
    if (lives <= 0 && step === "game") {
      setGameOver(true);
      setStep("enter-name");
      playSound("gameover");
    }
  }, [lives, step, playSound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    bombs.forEach((b) => {
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "gray";
      ctx.fillRect(b.x - 2, b.y - 25, 4, 10);

      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(b.x, b.y - 25, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.char, b.x, b.y);
    });
  }, [bombs]);

  useEffect(() => {
    if (bombsCleared >= bombsToNextLevel) {
      setBombsCleared(0);
      if (difficultyIndex < difficulties.length - 1) {
        setDifficultyIndex((i) => i + 1);
        alert("LEVEL COMPLETED! 下一關開始");
      }
    }
  }, [bombsCleared, difficultyIndex, difficulties.length]);

  const startGame = () => {
    setScore(0);
    setLives(10);
    setBombs([]);
    setBombsCleared(0);
    setGameOver(false);
    setStep("game");
    // setFloatingTexts([]); // <-- 移除浮動文字清空
  };

  const submitScore = () => {
    const newEntry = { name: username || "匿名玩家", score, date: new Date().toLocaleString() };
    const newBoard = [...leaderboard, newEntry].sort((a, b) => b.score - a.score).slice(0, 10);
    setLeaderboard(newBoard);
    localStorage.setItem("leaderboard", JSON.stringify(newBoard));
    setStep("leaderboard");
  };

  return (
    <div className="p-4 relative min-h-screen flex flex-col items-center justify-start bg-gray-50">
      {step === "select-mode" && (
        <div className="p-4 text-center min-h-screen flex flex-col justify-center items-center">
          <h1 className="text-4xl font-extrabold text-blue-700 mb-6 animate-pulse">歡迎來到打字炸彈！</h1>
          <p className="text-xl mb-6 text-gray-700">請選擇您想練習的語言模式：</p>
          <div className="space-x-6 mb-10">
            <Button className="px-10 py-4 text-2xl bg-green-500 hover:bg-green-600 shadow-lg" onClick={() => setMode("en")}>英文模式</Button>
            <Button className="px-10 py-4 text-2xl bg-purple-500 hover:bg-purple-600 shadow-lg" onClick={() => setMode("zh")}>中文注音模式</Button>
          </div>

          {mode && (
            <div className="mt-8 text-center">
              <h2 className="text-3xl font-bold mb-4 text-gray-800">選擇難度：</h2>
              <div className="flex justify-center space-x-4">
                {difficulties.map((level, i) => (
                  <Button
                    key={level.name}
                    className={`px-8 py-3 text-xl ${difficultyIndex === i ? 'bg-yellow-500 text-black' : 'bg-gray-700 hover:bg-gray-800'}`}
                    onClick={() => {
                      setDifficultyIndex(i);
                      startGame();
                    }}
                  >
                    {level.name.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "enter-name" && (
        <div className="p-4 text-center min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-red-200 to-red-400 text-white">
          <h1 className="text-5xl font-extrabold text-red-800 mb-6 animate-bounce">GAME OVER!</h1>
          <p className="text-2xl mb-6 font-semibold">你的分數: <span className="font-extrabold text-green-800 text-3xl">{score}</span></p>
          <input
            className="border border-gray-400 p-4 rounded-lg mb-6 text-xl w-80 text-center text-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-300"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="請輸入你的姓名 (可選)"
            maxLength={15}
          />
          <br />
          <Button className="px-10 py-4 text-xl bg-blue-700 hover:bg-blue-800 shadow-xl" onClick={submitScore}>送出成績</Button>
        </div>
      )}

      {step === "leaderboard" && (
        <div className="p-4 text-center min-h-screen flex flex-col justify-center items-center">
          <h1 className="text-4xl font-extrabold text-yellow-700 mb-6">🏆 排行榜 🏆</h1>
          {leaderboard.length === 0 ? (
            <p className="text-xl text-gray-600">目前還沒有人上榜，快來創造歷史！</p>
          ) : (
            <ol className="mb-8 list-decimal list-inside text-xl font-medium max-w-lg mx-auto bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              {leaderboard.map((entry, i) => (
                <li key={i} className="mb-3 flex justify-between items-center border-b pb-2 last:border-b-0 last:pb-0">
                  {/* 排行榜名字與分數之間加空格 */}
                  <span className="text-gray-800">{i + 1}. <span className="font-semibold">{entry.name}</span></span>
                  <span className="font-extrabold text-blue-700 text-2xl">
                    &nbsp;&nbsp;&nbsp;&nbsp;{entry.score} 分 <span className="text-sm text-gray-500 ml-2">({entry.date.split(',')[0]})</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <Button className="px-10 py-4 text-xl bg-green-600 hover:bg-green-700 shadow-lg" onClick={() => setStep("select-mode")}>再玩一次</Button>
        </div>
      )}

      {step === "game" && (
        <>
          <div className="w-full flex justify-between items-center px-6 py-4 bg-white shadow-md rounded-lg mb-6">
            <div className="flex items-center text-red-600 font-extrabold text-6xl select-none"> {/* 字體加大至 text-6xl */}
              <span role="img" aria-label="heart" className="mr-2 animate-pulse">❤️</span> {lives}
            </div>

            <div className="flex flex-col items-center text-blue-600 font-extrabold text-6xl select-none"> {/* 字體加大至 text-6xl */}
              <span role="img" aria-label="trophy" className="mb-1">🏆</span> {score}
            </div>

            <div className="flex flex-col items-center text-green-700 font-extrabold text-4xl select-none"> {/* 字體加大至 text-4xl */}
              <span className="text-sm">下一關：</span>
              <span className="text-4xl">{bombsToNextLevel - (bombsCleared % bombsToNextLevel)}</span>
            </div>
          </div>

          <div className="relative w-[400px] h-[500px] mx-auto block">
            <canvas
              ref={canvasRef}
              width={400}
              height={500}
              className="bg-gray-900 border-4 border-gray-700 rounded-lg shadow-2xl"
            />

            {/* floatingTexts.map 的部分已移除 */}
          </div>

          <div className="mt-8 text-center text-gray-800 text-xl font-medium">
            <p>當前難度: <span className="font-bold capitalize text-green-700">{currentDifficulty.name}</span></p>
          </div>
        </>
      )}
    </div>
  );
};

export default Game;
