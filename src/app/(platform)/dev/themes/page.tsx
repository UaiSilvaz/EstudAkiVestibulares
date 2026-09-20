import { notFound } from "next/navigation";
import { DevThemeLab } from "@/components/dev-theme-lab";

export default function DevThemesPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DevThemeLab />;
}
