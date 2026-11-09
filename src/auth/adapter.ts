import { translateApiMessage } from "../i18n/apiMessages";
import { getLang } from "../i18n/core";

export interface AuthSession {
  idToken: string;
  sub: string;
  /** E.164 phone from the `phone_number` claim. */
  phone: string;
  /** Optional alias; "" when the user gave none. */
  email: string;
  groups: string[];
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(translateApiMessage(message, getLang()));
    this.code = code;
  }
}

const CM_NUMBER_HINT = "Use a Cameroon mobile number, e.g. +237 6 77 12 34 56";

/** Cognito-style error name -> message a user can act on. */
export function friendlyAuthError(name: string, fallback?: string): AuthError {
  const messages: Record<string, string> = {
    UserNotConfirmedException: "Your phone number isn't verified yet. Enter the code we sent by SMS.",
    NotAuthorizedException: "Incorrect phone number or password.",
    UserNotFoundException: "We couldn't find an account with that phone number.",
    UsernameExistsException: "An account with this phone number already exists. Log in instead.",
    CodeMismatchException: "That code isn't right. Check it and try again.",
    ExpiredCodeException: "That code has expired. Request a new one.",
    InvalidPasswordException: "Use at least 8 characters with an uppercase letter, a lowercase letter and a number.",
    InvalidParameterException: "Check the details you entered and try again.",
    CodeDeliveryFailureException: "We couldn't send the code by SMS. Check the number and try again.",
    LimitExceededException: "Too many attempts. Wait a few minutes and try again.",
    TooManyRequestsException: "Too many attempts. Wait a few minutes and try again.",
    NetworkError: "Can't reach ServaLink. Check your connection and try again.",
  };
  // The PreSignUp trigger's text arrives as "PreSignUp failed with error <text>."
  if (name === "UserLambdaValidationException") {
    return new AuthError(name, fallback?.replace(/^.*?failed with error\s*/i, "").replace(/\.$/, "") || CM_NUMBER_HINT);
  }
  return new AuthError(name, messages[name] ?? (fallback || "Something went wrong. Please try again."));
}

export interface AuthAdapter {
  /** Current session, or null when signed out. forceRefresh re-issues the ID token (new Cognito groups). */
  getSession(forceRefresh?: boolean): Promise<AuthSession | null>;
  /** `username` is the E.164 phone number (+237XXXXXXXXX). */
  signIn(username: string, password: string, remember: boolean): Promise<void>;
  signUp(input: { phone: string; password: string; fullName: string; email?: string }): Promise<void>;
  confirmSignUp(username: string, code: string): Promise<void>;
  resendCode(username: string): Promise<void>;
  signOut(): Promise<void>;
  forgotPassword(username: string): Promise<void>;
  confirmForgotPassword(username: string, code: string, newPassword: string): Promise<void>;
}
