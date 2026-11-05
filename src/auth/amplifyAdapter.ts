import { Amplify } from "aws-amplify";
import {
  confirmResetPassword, confirmSignUp, fetchAuthSession, resendSignUpCode, resetPassword,
  signIn, signOut, signUp,
} from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { defaultStorage, sessionStorage as tabStorage } from "aws-amplify/utils";
import { config } from "../config/env";
import { friendlyAuthError, type AuthAdapter, type AuthSession } from "./adapter";

const REMEMBER_KEY = "servalink.remember";

function rememberPreference(): boolean {
  try { return localStorage.getItem(REMEMBER_KEY) !== "0"; } catch { return true; }
}

function wrap(error: unknown): never {
  const name = (error as { name?: string })?.name ?? "Error";
  throw friendlyAuthError(name, (error as { message?: string })?.message);
}

export function createAmplifyAdapter(): AuthAdapter {
  Amplify.configure({
    Auth: { Cognito: { userPoolId: config.userPoolId, userPoolClientId: config.userPoolClientId } },
  });
  // "Remember me" off keeps tokens in sessionStorage so closing the tab signs the user out.
  cognitoUserPoolsTokenProvider.setKeyValueStorage(rememberPreference() ? defaultStorage : tabStorage);

  return {
    async getSession(forceRefresh = false) {
      try {
        const { tokens } = await fetchAuthSession({ forceRefresh });
        const id = tokens?.idToken;
        if (!id) return null;
        const payload = id.payload as Record<string, unknown>;
        const groups = payload["cognito:groups"];
        return {
          idToken: id.toString(),
          sub: String(payload.sub),
          phone: String(payload.phone_number ?? ""),
          email: String(payload.email ?? ""),
          groups: Array.isArray(groups) ? groups.map(String) : [],
        } satisfies AuthSession;
      } catch {
        return null;
      }
    },
    async signIn(username, password, remember) {
      try { localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0"); } catch { /* storage unavailable */ }
      cognitoUserPoolsTokenProvider.setKeyValueStorage(remember ? defaultStorage : tabStorage);
      try {
        try {
          await signIn({ username, password });
        } catch (error) {
          if ((error as { name?: string }).name !== "UserAlreadyAuthenticatedException") throw error;
          await signOut();
          await signIn({ username, password });
        }
      } catch (error) { wrap(error); }
    },
    async signUp({ phone, password, fullName, email }) {
      try {
        await signUp({
          username: phone, password,
          options: { userAttributes: { phone_number: phone, name: fullName, ...(email ? { email } : {}) } },
        });
      } catch (error) { wrap(error); }
    },
    async confirmSignUp(username, code) {
      try { await confirmSignUp({ username, confirmationCode: code.trim() }); } catch (error) { wrap(error); }
    },
    async resendCode(username) {
      try { await resendSignUpCode({ username }); } catch (error) { wrap(error); }
    },
    async signOut() {
      try { await signOut(); } catch { /* already signed out */ }
    },
    async forgotPassword(username) {
      try { await resetPassword({ username }); } catch (error) { wrap(error); }
    },
    async confirmForgotPassword(username, code, newPassword) {
      try {
        await confirmResetPassword({ username, confirmationCode: code.trim(), newPassword });
      } catch (error) { wrap(error); }
    },
  };
}
