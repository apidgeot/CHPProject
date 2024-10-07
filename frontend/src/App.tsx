import QuestionVoice from "./components/voiceQuiz.tsx";
import Header from "./components/header.tsx";

export default function App() {
  return (
    <div className="h-screen w-screen bg-[#191c2e] flex flex-col py-10 gap-10">
        <Header />
        <QuestionVoice />
    </div>
  )
}
