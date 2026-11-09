import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { friendlyAuthError } from "../auth/adapter";
import { formatBookingDate, formatDate, formatFcfa } from "../lib/format";
import { ratingLabel } from "../lib/status";
import { translateApiMessage } from "./apiMessages";
import { applyLang, detectLang, getLang, translate } from "./core";
import { en } from "./en";
import { fr } from "./fr";

afterEach(() => applyLang("en"));

describe("dictionaries", () => {
  it("fr has exactly the keys of en, with no empty values", () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    for (const [key, value] of Object.entries(fr)) expect(value.trim(), key).not.toBe("");
    for (const [key, value] of Object.entries(en)) expect(value.trim(), key).not.toBe("");
  });

  it("uses the same {placeholders} in both languages", () => {
    const names = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) expect(names(fr[key]), key).toEqual(names(en[key]));
  });
});

describe("translate", () => {
  it("interpolates {name} placeholders", () => {
    expect(translate("en", "feat.workAlt", { name: "Awa" })).toBe("Example of work by Awa");
    expect(translate("fr", "feat.workAlt", { name: "Awa" })).toBe("Exemple de travail de Awa");
    expect(translate("fr", "verify.resendIn", { seconds: 42 })).toBe("Renvoyer le code dans 42 s");
  });
  it("leaves an unknown placeholder visible rather than dropping it", () => {
    expect(translate("en", "feat.workAlt", {})).toBe("Example of work by {name}");
  });
});

describe("detectLang", () => {
  it("prefers the stored choice, then the browser language, defaulting to French", () => {
    expect(detectLang("en", "fr-CM")).toBe("en");
    expect(detectLang("fr", "en-US")).toBe("fr");
    expect(detectLang(null, "en-GB")).toBe("en");
    expect(detectLang(null, "fr-CM")).toBe("fr");
    expect(detectLang(null, undefined)).toBe("fr");
    expect(detectLang("de", "de-DE")).toBe("fr");
  });
});

describe("translateApiMessage", () => {
  it("translates known backend messages", () => {
    expect(translateApiMessage("Give a reason for cancelling", "fr")).toBe("Indiquez la raison de l'annulation");
    expect(translateApiMessage("Use a Cameroon mobile number, e.g. +237 6 77 12 34 56", "fr")).toContain("+237 6 77 12 34 56");
  });
  it("passes unknown messages and English through", () => {
    expect(translateApiMessage("Something nobody mapped", "fr")).toBe("Something nobody mapped");
    expect(translateApiMessage("Give a reason for cancelling", "en")).toBe("Give a reason for cancelling");
  });
  it("covers every message users can hit that the brief lists", () => {
    for (const message of [
      "Accept the Terms and Privacy notice to continue", "Select a valid region and city", "Enter a valid Cameroon phone number",
      "quartier is too long", "Give a reason for cancelling", "price_from must be a whole number of FCFA between 100 and 10 000 000",
      "This service is not available", "You cannot book your own service", "Action is not allowed from the current booking status",
      "Resource changed; refresh and retry", "language must be fr or en", "notify_sms must be true or false",
      "You can't vouch for yourself", "You already have 5 vouch requests waiting", "This client has already vouched 3 times this year",
      "This vouch link is invalid or has expired", "Verify your phone number first", "Too many codes requested", "Too many attempts",
      "Too Many Requests", "Use a Cameroon mobile number, e.g. +237 6 77 12 34 56",
      "Internal server error", "Endpoint request timed out", "Missing Authentication Token", "Unable to access user profile",
      "Uploaded image was not found", "Invalid image key", "Provider's Cognito identity was not found in this user pool",
      "Admin access required", "Only a pending provider application can be rejected", "This report has already been processed",
      "This category request has already been processed",
    ]) expect(translateApiMessage(message, "fr"), message).not.toBe(message);
  });
});

describe("unmapped server errors", () => {
  it("get a generic French message at status >= 500 only, and mapped messages are unchanged", () => {
    const generic = "Un problème est survenu. Réessayez dans un instant.";
    expect(translateApiMessage("Boom from nowhere", "fr", 500)).toBe(generic);
    expect(translateApiMessage("Boom from nowhere", "fr", 502)).toBe(generic);
    expect(translateApiMessage("Boom from nowhere", "fr", 400)).toBe("Boom from nowhere");
    expect(translateApiMessage("Boom from nowhere", "fr")).toBe("Boom from nowhere");
    expect(translateApiMessage("Boom from nowhere", "en", 500)).toBe("Boom from nowhere");
    expect(translateApiMessage("Endpoint request timed out", "fr", 504)).toBe("Le service met trop de temps à répondre. Réessayez dans un instant.");
    applyLang("fr");
    expect(new ApiError(500, "Traceback (most recent call last)").message).toBe(generic);
    expect(new ApiError(404, "Booking not found").message).toBe("Réservation introuvable");
  });
  it("Cognito SMS delivery failures and invalid parameters are translated, never raw", () => {
    applyLang("fr");
    expect(friendlyAuthError("CodeDeliveryFailureException").message).toBe("Impossible d'envoyer le code par SMS. Vérifiez le numéro et réessayez.");
    expect(friendlyAuthError("InvalidParameterException", "1 validation error detected: Value at 'x' failed").message)
      .toBe("Vérifiez les informations saisies et réessayez.");
    applyLang("en");
    expect(friendlyAuthError("CodeDeliveryFailureException").message).toBe("We couldn't send the code by SMS. Check the number and try again.");
    expect(friendlyAuthError("InvalidParameterException", "raw cognito text").message).toBe("Check the details you entered and try again.");
  });
});

describe("messages follow the active language", () => {
  it("ApiError and sign-in errors are created in the current language", () => {
    applyLang("fr");
    expect(new ApiError(400, "Give a reason for cancelling").message).toBe("Indiquez la raison de l'annulation");
    expect(friendlyAuthError("NotAuthorizedException").message).toBe("Numéro de téléphone ou mot de passe incorrect.");
    applyLang("en");
    expect(new ApiError(400, "Give a reason for cancelling").message).toBe("Give a reason for cancelling");
  });
  it("ratings are words in French", () => {
    expect(["BAD", "GOOD", "VERY_GOOD", "EXCELLENT"].map((r) => ratingLabel(r as "BAD", "fr"))).toEqual(["Mauvais", "Bien", "Très bien", "Excellent"]);
  });
  it("dates and prices follow the language", () => {
    expect(formatBookingDate("2026-02-03T09:05", "fr")).toBe("3 févr. 2026, 09:05");
    expect(formatDate("2026-08-15T10:00:00", "fr")).toBe("15 août 2026");
    applyLang("fr");
    expect(getLang()).toBe("fr");
    expect(formatFcfa(null)).toBe("Sur devis");
    expect(formatFcfa(5000)).toBe("5 000 FCFA");
  });
});
