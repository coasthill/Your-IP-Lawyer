/** Shapes shared between the submission server action and the client form. */

export type SubmissionFormState =
  | { status: "idle" }
  /** Stored. Counsel will revert. */
  | { status: "received" }
  | { status: "error"; error: string; values?: SubmissionValues };

/** Echo of the text fields so a failed submission does not wipe the form. Files cannot be echoed. */
export type SubmissionValues = {
  name: string;
  email: string;
  affiliation: string;
  title: string;
  kind: string;
  abstract: string;
};

/** Must stay in step with the vocabulary accepted by createSubmission() and SUBMISSION_KINDS. */
export const SUBMISSION_KIND_OPTIONS = [
  { value: "article", label: "Article" },
  { value: "case-note", label: "Case note" },
  { value: "commentary", label: "Commentary" },
  { value: "other", label: "Other (student note, review, something else)" },
] as const;

export const ABSTRACT_MIN = 50;
export const ABSTRACT_MAX = 3000;
