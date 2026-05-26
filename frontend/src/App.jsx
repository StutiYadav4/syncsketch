import { useState } from "react";
import LandingPage from "./components/LandingPage";
import CanvasBoard from "./components/CanvasBoard";

const App = () => {
  const [session, setSession] = useState(null);
  // session: { username, roomCode, roomName, color, strokes, users }

  if (!session) return <LandingPage onJoin={setSession} />;
  return <CanvasBoard session={session} />;
};

export default App;