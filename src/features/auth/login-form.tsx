"use client";

import { Alert, Button, Input } from "@nicolassancho/storybook-core";
import { useActionState, useEffect, useRef } from "react";

import { signIn, type SignInState } from "./actions";

const initialState: SignInState = { attempt: 0, email: "" };

/**
 * The email and password form. It posts to a Server Action, so it also works before JavaScript
 * loads. After a failed attempt focus moves to the message above the form, or to the first field
 * with an error, so a screen reader announces it; a repeated error moves it again.
 */
export function LoginForm({ primary }: { primary: boolean }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.attempt === 0) return;
    if (state.formError) {
      messageRef.current?.focus();
      return;
    }
    const field = state.fieldErrors?.email
      ? "email"
      : state.fieldErrors?.password
        ? "password"
        : "";
    const input = field && formRef.current?.elements.namedItem(field);
    if (input instanceof HTMLInputElement) input.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-4">
      {state.formError && (
        // The wrapper takes focus, shows it, and the alert inside it is announced, as in GOV.UK's
        // error summary. The key remounts it on each attempt, so a repeated message is announced
        // again.
        <div
          key={state.attempt}
          ref={messageRef}
          tabIndex={-1}
          className="rounded-lg focus:outline-2 focus:outline-offset-2 focus:outline-primary"
        >
          <Alert title={state.formError.title}>
            {state.formError.traceId && <p>Reference: {state.formError.traceId}</p>}
          </Alert>
        </div>
      )}
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="name@company.com"
        // React resets an action form after it runs, so the email comes back from the state.
        defaultValue={state.email}
        error={state.fieldErrors?.email}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />
      <Button
        type="submit"
        // In demo mode "Enter the demo" is the one primary action, so this one is neutral.
        variant={primary ? "primary" : "outline"}
        disabled={pending}
        className="justify-center"
      >
        Sign in
      </Button>
    </form>
  );
}
