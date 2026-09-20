import { CourseCatalogClient } from "@/components/courses/course-catalog-client";
import { getCurrentUser } from "@/lib/auth";
import { getCourseCatalog, getLearningUserId } from "@/lib/courses/learning";

export default async function CursosPage() {
  const user = await getCurrentUser();
  const userId = await getLearningUserId(user);
  const courses = await getCourseCatalog(userId);

  return <CourseCatalogClient courses={courses} />;
}
