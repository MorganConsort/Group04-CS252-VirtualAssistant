import { checkFile, type Concept, type Graph, type Prereq } from "../concepts";

// shortcut: mock of spec 8.1–8.2; week 2 (#9, #13) replaces each body with fetch() and keeps the signatures.
export type UploadResult = {
  file_name: string;
  pages: number;
  status: "processing" | "processed" | "error";
};
export class ApiError extends Error {
  constructor(public code: "not_pdf" | "file_too_large" | "invalid_pdf" | "scanned_pdf") {
    super(code);
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function uploadSource(_courseId: string, file: File): Promise<UploadResult> {
  const rejected = checkFile(file);
  if (rejected) throw new ApiError(rejected);
  const raw = new TextDecoder("latin1").decode(await file.arrayBuffer());
  await delay(1500);
  if (!raw.startsWith("%PDF-")) throw new ApiError("invalid_pdf");
  // shortcut: no text layer usually means no fonts; the real ingest decides this server-side.
  if (!raw.includes("/Font")) throw new ApiError("scanned_pdf");
  const pages = raw.match(/\/Type\s*\/Page(?![s\w])/g)?.length ?? 0;
  return { file_name: file.name, pages, status: "processed" };
}

const WEEK1 = "CSC10014_2026_Week01_Problem_Framing.pdf";
const sample: [string, string, string, number][] = [
  ["framing-ladder", "Framing ladder", "Need → Problem → Split → Options → Success", 26],
  ["problem-statement", "Problem statement", "A template that forces clarity", 29],
  ["stakeholders", "Stakeholders", "Users are only one kind of stakeholder", 38],
  ["personas", "Personas", "Four personas, four problems", 41],
  ["jobs-to-be-done", "Jobs-to-be-Done", "When…, I want to…, so I can…", 45],
  ["four-layers", "Four layers", "User need, product goal, requirement, implementation", 52],
  ["fr-vs-nfr", "FR vs NFR", "What it does vs how well", 55],
  ["non-goals", "Non-goals", "The most underrated section of a brief", 59],
  ["solution-ladder", "Solution ladder", "Climb only as high as the problem requires", 77],
  ["product-risks", "Four product risks", "Value, usability, feasibility, viability", 101],
];

export async function proposeConcepts(_courseId: string): Promise<Graph> {
  await delay(600);
  const concepts: Concept[] = sample.map(([slug, title, summary, page], i) => ({
    id: `c_${i + 1}`,
    slug,
    title,
    summary,
    bloom_level: "understand",
    source_file: WEEK1,
    source_pages: [page],
    confirmed: false,
  }));
  const edge = (parent: number, child: number): Prereq => ({
    parent_id: `c_${parent}`,
    child_id: `c_${child}`,
    kind: "strict",
    confidence: 0.8,
  });
  return {
    concepts,
    prereqs: [edge(1, 2), edge(3, 4), edge(6, 7), edge(2, 8), edge(1, 9)],
  };
}
