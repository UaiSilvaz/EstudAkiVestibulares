"use client";

import { forwardRef } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { Aicon, type AiconName } from "./aicon";

// Preserve the existing SVG props and refs used by navigation and action cards.
function artwork(name: AiconName, displayName: string): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, Omit<LucideProps, "ref">>((props, ref) =>
    <Aicon ref={ref} {...props} name={name} tone="outline" />);
  Icon.displayName = displayName;
  return Icon;
}

export const House = artwork("home", "House");
export const Home = artwork("home", "Home");
export const Book = artwork("book", "Book");
export const BookOpen = artwork("book", "BookOpen");
export const BookOpenCheck = artwork("book", "BookOpenCheck");
export const BookMarked = artwork("book", "BookMarked");
export const BookText = artwork("book", "BookText");
export const Bookmark = artwork("bookmark", "Bookmark");
export const Calendar = artwork("calendar", "Calendar");
export const CalendarDays = artwork("calendar", "CalendarDays");
export const CalendarCheck = artwork("calendar", "CalendarCheck");
export const CalendarCheck2 = artwork("calendar", "CalendarCheck2");
export const Clock = artwork("clock", "Clock");
export const Clock3 = artwork("clock", "Clock3");
export const BarChart3 = artwork("chart", "BarChart3");
export const BarChart = artwork("chart", "BarChart");
export const ChartColumn = artwork("chart", "ChartColumn");
export const Folder = artwork("folder", "Folder");
export const FolderOpen = artwork("folder", "FolderOpen");
export const FileText = artwork("document", "FileText");
export const NotebookPen = artwork("essay", "NotebookPen");
export const PenLine = artwork("essay", "PenLine");
export const Pencil = artwork("pencil", "Pencil");
export const Target = artwork("target", "Target");
export const Scale = artwork("law", "Scale");
export const Landmark = artwork("bank", "Landmark");
export const Stethoscope = artwork("health", "Stethoscope");
export const HeartPulse = artwork("health", "HeartPulse");
export const FlaskConical = artwork("flask", "FlaskConical");
export const TestTubes = artwork("chemistry", "TestTubes");
export const Dna = artwork("anatomy", "Dna");
export const Globe2 = artwork("geography", "Globe2");
export const Globe = artwork("geography", "Globe");
export const Video = artwork("video", "Video");
export const Users = artwork("community", "Users");
export const UsersRound = artwork("community", "UsersRound");
export const MessagesSquare = artwork("community", "MessagesSquare");
export const Presentation = artwork("live", "Presentation");
export const Monitor = artwork("desktop", "Monitor");
export const ShoppingCart = artwork("cart", "ShoppingCart");
export const Mail = artwork("mail", "Mail");
export const Award = artwork("medal", "Award");
export const Medal = artwork("medal", "Medal");
export const Trophy = artwork("medal", "Trophy");
