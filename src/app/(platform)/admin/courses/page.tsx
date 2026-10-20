import TeacherCourseStudioPage from "@/components/admin/teacher-course-studio-page";
import { requireManager } from "@/lib/auth";
export default async function AdminCoursesPage() {
  await requireManager();
  return <TeacherCourseStudioPage />;
}