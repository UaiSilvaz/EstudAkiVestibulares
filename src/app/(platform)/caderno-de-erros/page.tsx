import { redirect } from "next/navigation";

export default function CadernoDeErrosPage() {
  redirect("/questions?vestibular=enem&mode=errors");
}
