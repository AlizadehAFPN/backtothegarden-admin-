"use client";

import { useState } from "react";
import type { DocData } from "./useCollection";
import type { FormMode } from "./formValues";

interface FormModalState {
  open: boolean;
  mode: FormMode;
  /** Record the form starts from: the one being edited, or the copy's source. */
  record: DocData | null;
}

/**
 * Open/closed state of a section's FormModal and what it was opened for.
 *
 * Kept as a single state value so opening the form for one purpose can never
 * carry over a record from another, e.g. "New …" opening prefilled with the
 * last item that was duplicated.
 */
export function useFormModal() {
  const [state, setState] = useState<FormModalState>({
    open: false,
    mode: "create",
    record: null,
  });

  return {
    ...state,
    /** The record a save writes over. Only set in edit mode. */
    editing: state.mode === "edit" ? state.record : null,
    openCreate: () => setState({ open: true, mode: "create", record: null }),
    openEdit: (record: DocData) => setState({ open: true, mode: "edit", record }),
    openDuplicate: (record: DocData) => setState({ open: true, mode: "duplicate", record }),
    close: () => setState((prev) => ({ ...prev, open: false })),
  };
}
