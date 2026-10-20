/** Add only approved names, specialties and local photographs of real faculty. */
export type PublicFaculty = { name: string; specialty: string; description: string; photo: string; courseHref: string };
export const publicFaculty: PublicFaculty[] = [];
