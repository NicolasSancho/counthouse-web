"use server";

import { redirect, RedirectType } from "next/navigation";

import type { FieldError } from "@/server/api/schema";
import { signIn as apiSignIn } from "@/server/auth";
import { getDemoAccounts } from "@/server/demo";
import { readApiMode } from "@/server/env";
import { fieldMessage } from "@/server/field-messages";

const FIELDS = { email: "your email", password: "your password" } as const;

type Field = keyof typeof FIELDS;

export type SignInState = {
  /** Counts the attempts, so the form moves focus again when the same error repeats. */
  attempt: number;
  /** Sent back so the field keeps its value; the password never is. */
  email: string;
  formError?: { title: string; traceId?: string };
  fieldErrors?: Partial<Record<Field, string>>;
};

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

/**
 * Sign-in with an email and a password, for `useActionState`. The API is the only validator: the
 * form sends whatever was typed and words the field errors the API returns.
 */
export async function signIn(previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = text(formData.get("email"));
  const password = text(formData.get("password"));
  const state = { attempt: previous.attempt + 1, email };

  const result = await apiSignIn(email, password);
  if (result.ok) redirect("/products", RedirectType.replace);

  switch (result.reason) {
    case "credentials":
      return {
        ...state,
        formError: { title: "Email or password is wrong. Check them and try again." },
      };
    case "fields": {
      const fieldErrors = toFieldErrors(result.errors);
      if (fieldErrors) return { ...state, fieldErrors };
      return { ...state, formError: { title: "Sign-in failed. Try again." } };
    }
    case "failed":
      return {
        ...state,
        formError: { title: "Sign-in failed. Try again.", traceId: result.traceId },
      };
  }
}

/** One message per form field, the first the API sent; `undefined` when none is a form field. */
function toFieldErrors(errors: FieldError[]): SignInState["fieldErrors"] {
  const messages: Partial<Record<Field, string>> = {};
  for (const { field, code } of errors) {
    if (!Object.hasOwn(FIELDS, field)) continue;
    const name = field as Field;
    messages[name] ??=
      name === "email" && code === "INVALID_FORMAT"
        ? "Enter an email address in the right format, like name@company.com."
        : fieldMessage(code, FIELDS[name]);
  }
  return Object.keys(messages).length > 0 ? messages : undefined;
}

/**
 * Signs in as a public demo account, from its email alone: the password is looked up here. Mock
 * mode only, checked at request time, because the sign-in page is built once and a deployment can
 * change its mode.
 */
export async function signInAsDemo(formData: FormData): Promise<void> {
  if (readApiMode() !== "mock") throw new Error("Demo accounts exist only in mock mode.");
  const email = text(formData.get("email"));
  const account = getDemoAccounts().find((candidate) => candidate.email === email);
  if (!account) throw new Error("Unknown demo account.");

  const result = await apiSignIn(account.email, account.password);
  if (!result.ok) throw new Error(`Demo sign-in failed: ${result.reason}.`);
  redirect("/products", RedirectType.replace);
}
