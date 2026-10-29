import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";

import { FormError, FormNotice } from "@/components/feedback/form-alerts";
import { FormField } from "@/components/forms/form-field";
import { DocumentTitle } from "@/components/layout/document-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/features/auth/auth-card";
import { useAuth } from "@/features/auth/auth-provider";
import { GoogleSignIn } from "@/features/auth/google-sign-in";
import { RedirectIfAuthenticated } from "@/features/auth/guards";
import { loginSchema } from "@/features/auth/schemas";
import { login } from "@/lib/api/auth";
import { applyServerErrors } from "@/lib/form-errors";

const LOGIN_FIELDS = { email: "email", password: "password" };

function LoginForm() {
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/app";
  const notice =
    location.state?.reason === "expired"
      ? "Your session has ended. Please log in again."
      : location.state?.notice;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const [formErrors, setFormErrors] = useState([]);
  const mutation = useMutation({
    mutationFn: login,
    onMutate: () => setFormErrors([]),
    onError: (error) => setFormErrors(applyServerErrors(error, setError, LOGIN_FIELDS)),
    onSuccess: (session) => {
      startSession(session);
      navigate(redirectTo, { replace: true });
    },
  });

  return (
    <AuthCard
      title="Log in to PrepWise"
      description="Continue with Google, or use your email address and password."
      footer={
        <p>
          New to PrepWise?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      {notice && !mutation.error ? <FormNotice>{notice}</FormNotice> : null}
      <GoogleSignIn onSession={() => navigate(redirectTo, { replace: true })} />
      <FormError messages={formErrors} />
      <form
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="grid gap-5"
      >
        <FormField id="email" label="Email" error={errors.email?.message}>
          {(fieldProps) => (
            <Input type="email" autoComplete="email" {...fieldProps} {...register("email")} />
          )}
        </FormField>
        <FormField id="password" label="Password" error={errors.password?.message}>
          {(fieldProps) => (
            <Input
              type="password"
              autoComplete="current-password"
              {...fieldProps}
              {...register("password")}
            />
          )}
        </FormField>
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}

function LoginPage() {
  return (
    <>
      <DocumentTitle title="Log in" />
      <RedirectIfAuthenticated>
        <LoginForm />
      </RedirectIfAuthenticated>
    </>
  );
}

export default LoginPage;
