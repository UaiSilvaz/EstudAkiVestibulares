import { FeedbackProvider } from "@/components/feedback/feedback-provider";
import "./welcome.css";

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return <FeedbackProvider>{children}</FeedbackProvider>;
}
