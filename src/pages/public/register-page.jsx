import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";

import { FormError } from "@/components/feedback/form-alerts";
import { FormField } from "@/components/forms/form-field";
import { DocumentTitle } from "@/components/layout/document-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/features/auth/auth-card";
import { useAuth } from "@/features/auth/auth-provider";
import { GoogleSignIn } from "@/features/auth/google-sign-in";
import { RedirectIfAuthenticated } from "@/features/auth/guards";
import { registerSchema } from "@/features/auth/schemas";
import { register as registerAccount } from "@/lib/api/auth";
import { applyServerErrors } from "@/lib/form-errors";

const SERVER_FIELDS = { full_name: "fullName", email: "email", password: "password" };

function RegisterForm() {
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const [formErrors, setFormErrors] = useState([]);
  const mutation = useMutation({
    mutationFn: registerAccount,
    onMutate: () => setFormErrors([]),
    onError: (error) => setFormErrors(applyServerErrors(error, setError, SERVER_FIELDS)),
    onSuccess: (session) => {
      startSession(session);
      navigate("/app", { replace: true });
    },
  });

  return (
    <AuthCard
      title="Create your PrepWise account"
      description="Sign up with Google, or create a password for your email address."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      <GoogleSignIn text="signup_with" onSession={() => navigate("/app", { replace: true })} />
      <FormError messages={formErrors} />
      <form
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="grid gap-5"
      >
        <FormField id="fullName" label="Full name" error={errors.fullName?.message}>
          {(fieldProps) => <Input autoComplete="name" {...fieldProps} {...register("fullName")} />}
        </FormField>
        <FormField id="email" label="Email" error={errors.email?.message}>
          {(fieldProps) => (
            <Input type="email" autoComplete="email" {...fieldProps} {...register("email")} />
          )}
        </FormField>
        <FormField
          id="password"
          label="Password"
          description="At least 8 characters, not only numbers, and not a common password."
          error={errors.password?.message}
        >
          {(fieldProps) => (
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldProps}
              {...register("password")}
            />
          )}
        </FormField>
        <FormField
          id="confirmPassword"
          label="Confirm password"
          error={errors.confirmPassword?.message}
        >
          {(fieldProps) => (
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldProps}
              {...register("confirmPassword")}
            />
          )}
        </FormField>
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}

function RegisterPage() {
  return (
    <>
      <DocumentTitle title="Create account" />
      <RedirectIfAuthenticated>
        <RegisterForm />
      </RedirectIfAuthenticated>
    </>
  );
}

export default RegisterPage;
