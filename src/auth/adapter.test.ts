import { describe, expect, it } from "vitest";
import { friendlyAuthError } from "./adapter";

describe("friendlyAuthError (phone wording)", () => {
  it.each([
    ["NotAuthorizedException", "Incorrect phone number or password."],
    ["UsernameExistsException", "An account with this phone number already exists. Log in instead."],
    ["UserNotFoundException", "We couldn't find an account with that phone number."],
    ["UserNotConfirmedException", "Your phone number isn't verified yet. Enter the code we sent by SMS."],
  ])("%s", (name, message) => {
    expect(friendlyAuthError(name).message).toBe(message);
    expect(friendlyAuthError(name).code).toBe(name);
  });

  it("never mentions email in the phone-first messages", () => {
    for (const name of ["NotAuthorizedException", "UsernameExistsException", "UserNotFoundException", "UserNotConfirmedException"]) {
      expect(friendlyAuthError(name).message.toLowerCase()).not.toContain("email");
    }
  });

  it("shows the PreSignUp rejection without the Lambda prefix", () => {
    const text = "Use a Cameroon mobile number, e.g. +237 6 77 12 34 56";
    expect(friendlyAuthError("UserLambdaValidationException", `PreSignUp failed with error ${text}.`).message).toBe(text);
    expect(friendlyAuthError("UserLambdaValidationException").message).toBe(text);
  });
});
