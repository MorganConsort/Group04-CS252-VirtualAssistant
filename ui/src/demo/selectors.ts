import { courses } from "./fixtures";
export const courseFor = (id: string) =>
  courses.find((course) => course.id === id)!;
