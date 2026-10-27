import { useEffect, useRef, useState, type DragEvent } from "react";
import { ApiError, proposeConcepts, uploadSource, type UploadResult } from "../api/courses";
import {
  addPrereq,
  checkFile,
  confirmAll,
  ERRORS,
  merge,
  remove,
  rename,
  type Graph,
} from "../concepts";

type Row = UploadResult & { error?: string };
const STATUS = { processing: "Processing", processed: "Done", error: "Error" };

/** S3 Upload + S4 Concept editor (spec section 5), backed by the mock in api/courses.ts. */
export function CoursesPage({ courseId }: { courseId: string }) {
  const [files, setFiles] = useState<Row[]>([]);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [undo, setUndo] = useState<{ graph: Graph; title: string } | null>(null);
  const [edgeError, setEdgeError] = useState<{ id: string; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);

  const update = (name: string, row: Partial<Row>) =>
    setFiles((fs) => fs.map((f) => (f.file_name === name ? { ...f, ...row } : f)));

  const upload = async (list: FileList | null) => {
    let proposed = graph !== null;
    for (const file of Array.from(list ?? [])) {
      const rejected = checkFile(file);
      setFiles((fs) => [
        ...fs.filter((f) => f.file_name !== file.name),
        {
          file_name: file.name,
          pages: 0,
          status: rejected ? "error" : "processing",
          error: rejected ? ERRORS[rejected] : undefined,
        },
      ]);
      if (rejected) continue;
      try {
        update(file.name, await uploadSource(courseId, file));
        if (!proposed) {
          proposed = true;
          setGraph(await proposeConcepts(courseId));
        }
      } catch (err) {
        update(file.name, {
          status: "error",
          error: err instanceof ApiError ? ERRORS[err.code] : ERRORS.invalid_pdf,
        });
      }
    }
  };

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void upload(e.dataTransfer.files);
  };

  const edit = (next: Graph) => {
    setGraph(next);
    setEdgeError(null);
  };
  const title = (id: string) => graph?.concepts.find((c) => c.id === id)?.title ?? id;

  return (
    <section className="courses" aria-labelledby="upload-title">
      <div className="card">
        <h2 id="upload-title">Course materials</h2>
        <div
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
        >
          <p>Drag and drop PDF files here (up to 20 MB)</p>
          <button className="primary-action" onClick={() => picker.current?.click()}>
            Choose PDF files
          </button>
          <input
            ref={picker}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            hidden
            aria-label="Choose PDF files to upload"
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {files.length > 0 && (
          <ul className="file-list" aria-live="polite">
            {files.map((f) => (
              <li key={f.file_name} className={f.status}>
                <span>{f.file_name}</span>
                <span>{f.pages ? `${f.pages} trang` : ""}</span>
                <span>{STATUS[f.status]}</span>
                {f.error && <span className="row-error">{f.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {graph && (
        <div className="card">
          <div className="concept-toolbar">
            <h2>Concept ({graph.concepts.length})</h2>
            <button
              className="secondary-action"
              disabled={selected.length !== 2}
              onClick={() => {
                edit(merge(graph, selected[0], selected[1]));
                setSelected([]);
              }}
            >
              Merge
            </button>
            <button className="primary-action" onClick={() => edit(confirmAll(graph))}>
              Confirm all
            </button>
          </div>
          {graph.concepts.length === 0 && <p>No concepts yet.</p>}
          <ul className="concept-list">
            {graph.concepts.map((c) => {
              const parents = graph.prereqs.filter((p) => p.child_id === c.id);
              return (
                <li key={c.id} className={c.confirmed ? "confirmed" : ""}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${c.title} to merge`}
                    checked={selected.includes(c.id)}
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked ? [...s, c.id].slice(-2) : s.filter((x) => x !== c.id),
                      )
                    }
                  />
                  <div className="concept-body">
                    <input
                      className="concept-title"
                      aria-label={`Rename ${c.title}`}
                      value={c.title}
                      onChange={(e) => edit(rename(graph, c.id, e.target.value))}
                    />
                    <p>{c.summary}</p>
                    <span className="citation">
                      {c.source_file} · p. {c.source_pages.join(", ")}
                    </span>
                    {parents.length > 0 && (
                      <p className="parents">
                        Learn first: {parents.map((p) => title(p.parent_id)).join(", ")}
                      </p>
                    )}
                    <select
                      aria-label={`Add a prerequisite for ${c.title}`}
                      value=""
                      onChange={(e) => {
                        const result = addPrereq(graph, e.target.value, c.id);
                        if ("error" in result) setEdgeError({ id: c.id, text: result.error });
                        else edit(result);
                      }}
                    >
                      <option value="">+ Add prerequisite…</option>
                      {graph.concepts
                        .filter((o) => o.id !== c.id)
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.title}
                          </option>
                        ))}
                    </select>
                    {edgeError?.id === c.id && (
                      <p role="alert" className="row-error">
                        {edgeError.text}
                      </p>
                    )}
                  </div>
                  <button
                    className="secondary-action"
                    aria-label={`Delete ${c.title}`}
                    onClick={() => {
                      setUndo({ graph, title: c.title });
                      edit(remove(graph, c.id));
                      setSelected((s) => s.filter((x) => x !== c.id));
                    }}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {undo && (
        <div className="toast" role="status">
          Deleted “{undo.title}”.{" "}
          <button
            className="undo"
            onClick={() => {
              edit(undo.graph);
              setUndo(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
    </section>
  );
}
