"use client";

import { useActionState, useRef } from "react";
import { addStep, type FormState } from "@/app/actions/project";
import { KIND_LABEL } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: FormState = {};

export function AddStepForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(addStep, initial);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        action(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <Input
        name="title"
        placeholder="Nouvelle étape"
        required
        className="w-52"
      />
      <select
        name="kind"
        defaultValue="OTHER"
        className="h-9 rounded-lg border border-[var(--color-line)] bg-white px-2 text-sm"
      >
        {Object.entries(KIND_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Input name="description" placeholder="Description (option)" className="w-56" />
      <Button type="submit" size="sm" disabled={pending}>
        Ajouter
      </Button>
      {state.error && (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
