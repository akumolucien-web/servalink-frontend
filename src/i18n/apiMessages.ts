import type { Lang } from "./core";

const SERVER_FALLBACK = "Un problème est survenu. Réessayez dans un instant.";

/** French for the exact English messages the backend, the sign-in service and the API client can show users. */
const FR: Record<string, string> = {
  // profile / location / phone / terms
  "Accept the Terms and Privacy notice to continue": "Acceptez les Conditions générales d'utilisation et la Politique de confidentialité pour continuer",
  "Select a valid region and city": "Sélectionnez une région et une ville valides",
  "Verify your phone number first": "Vérifiez d'abord votre numéro de téléphone",
  "Enter a valid Cameroon phone number": "Saisissez un numéro de téléphone camerounais valide",
  "Use a Cameroon mobile number, e.g. +237 6 77 12 34 56": "Utilisez un numéro mobile camerounais, ex. +237 6 77 12 34 56",
  "quartier is too long": "Le nom du quartier est trop long",
  "language must be fr or en": "La langue doit être fr ou en",
  "notify_sms must be true or false": "notify_sms doit être vrai ou faux",
  "full_name must be a non-empty string": "Le nom complet ne peut pas être vide",
  "Complete your user profile before applying as a provider": "Complétez votre profil avant de postuler comme prestataire",
  // bookings / services
  "Give a reason for cancelling": "Indiquez la raison de l'annulation",
  "price_from must be a whole number of FCFA between 100 and 10 000 000": "Le prix de départ doit être un nombre entier de FCFA compris entre 100 et 10 000 000",
  "This service is not available": "Ce service n'est pas disponible",
  "You cannot book your own service": "Vous ne pouvez pas réserver votre propre service",
  "Action is not allowed from the current booking status": "Cette action n'est pas possible dans l'état actuel de la réservation",
  "This booking action is not permitted": "Cette action sur la réservation n'est pas autorisée",
  "Invalid booking action": "Action de réservation non valide",
  "Resource changed; refresh and retry": "Les données ont changé ; actualisez la page et réessayez",
  "address_details must be 5 to 300 characters": "Les précisions sur l'adresse doivent comporter de 5 à 300 caractères",
  "booking_date must be a valid local datetime": "La date de réservation n'est pas valide",
  "booking_date must use YYYY-MM-DDTHH:mm": "La date de réservation n'est pas valide",
  "Select an active service category": "Sélectionnez une catégorie de service active",
  "Select an approved service category": "Sélectionnez une catégorie de service approuvée",
  "You cannot modify another provider's service": "Vous ne pouvez pas modifier le service d'un autre prestataire",
  "You cannot delete another provider's gallery item": "Vous ne pouvez pas supprimer la photo d'un autre prestataire",
  // reviews / reports
  "You can only review a completed booking": "Vous ne pouvez donner un avis que sur une réservation terminée",
  "You cannot review this booking": "Vous ne pouvez pas donner d'avis sur cette réservation",
  "This booking has already been reviewed": "Un avis a déjà été donné pour cette réservation",
  "You cannot report this booking": "Vous ne pouvez pas signaler cette réservation",
  "You have already reported this booking": "Vous avez déjà signalé cette réservation",
  "You already have a provider application": "Vous avez déjà une candidature de prestataire",
  // vouches
  "You can't vouch for yourself": "Vous ne pouvez pas vous recommander vous-même",
  "You already have 5 vouch requests waiting": "Vous avez déjà 5 demandes de recommandation en attente",
  "This client has already vouched 3 times this year": "Ce client a déjà recommandé 3 fois cette année",
  "This vouch has already been processed": "Cette recommandation a déjà été traitée",
  "This vouch link is invalid or has expired": "Ce lien de recommandation n'est pas valide ou a expiré",
  // limits
  "Too many codes requested": "Trop de codes demandés. Réessayez plus tard.",
  "Too many attempts": "Trop de tentatives. Réessayez plus tard.",
  "Too many attempts. Wait a few minutes and try again.": "Trop de tentatives. Patientez quelques minutes puis réessayez.",
  "Too Many Requests": "Trop de demandes. Réessayez dans un instant.", // API Gateway throttle (429)
  // gateway / runtime messages (not from our Lambdas)
  "Internal server error": SERVER_FALLBACK,
  "Endpoint request timed out": "Le service met trop de temps à répondre. Réessayez dans un instant.",
  "Missing Authentication Token": "Impossible de vérifier votre connexion. Veuillez vous reconnecter.",
  // admin / profile / images
  "Unable to access user profile": "Impossible d'accéder à votre profil. Réessayez dans un instant.",
  "Uploaded image was not found": "L'image téléversée est introuvable. Réessayez.",
  "Invalid image key": "Image non valide. Choisissez-en une autre.",
  "Provider's Cognito identity was not found in this user pool": "Le compte de connexion de ce prestataire est introuvable.",
  "Admin access required": "Accès réservé à l'administration",
  "Only a pending provider application can be rejected": "Seule une candidature de prestataire en attente peut être refusée",
  "This report has already been processed": "Ce signalement a déjà été traité",
  "This category request has already been processed": "Cette demande de catégorie a déjà été traitée",
  // not found / access
  "Booking not found": "Réservation introuvable",
  "Provider not found": "Prestataire introuvable",
  "Provider profile not found": "Profil de prestataire introuvable",
  "Service not found": "Service introuvable",
  "Gallery item not found": "Photo introuvable",
  "Report not found": "Signalement introuvable",
  "Route not found": "Page introuvable",
  "Access denied": "Accès refusé",
  "Provider access required": "Accès réservé aux prestataires",
  "Approved provider access required": "Accès réservé aux prestataires approuvés",
  "Unable to complete request": "Impossible de terminer la demande",
  // images
  "Only JPEG, PNG, and WEBP images are supported": "Seules les images JPEG, PNG et WEBP sont acceptées",
  "Image must be between 1 byte and 10 MiB": "L'image doit faire 10 Mo au maximum",
  "Use a JPEG, PNG or WEBP image.": "Utilisez une image JPEG, PNG ou WEBP.",
  "The image must be 10 MB or smaller.": "L'image doit faire 10 Mo au maximum.",
  "The image upload failed. Check your connection and try again.": "Le téléversement de l'image a échoué. Vérifiez votre connexion et réessayez.",
  "The image upload failed. Try again.": "Le téléversement de l'image a échoué. Réessayez.",
  // API client / sign-in service
  "Please sign in to continue.": "Veuillez vous connecter pour continuer.",
  "Your session has expired. Please sign in again.": "Votre session a expiré. Veuillez vous reconnecter.",
  "You don't have permission to do that.": "Vous n'avez pas l'autorisation d'effectuer cette action.",
  "Can't reach ServaLink. Check your connection and try again.": "Impossible de joindre ServaLink. Vérifiez votre connexion et réessayez.",
  "Something went wrong. Please try again.": "Une erreur est survenue. Veuillez réessayer.",
  "Your phone number isn't verified yet. Enter the code we sent by SMS.": "Votre numéro de téléphone n'est pas encore vérifié. Saisissez le code reçu par SMS.",
  "Incorrect phone number or password.": "Numéro de téléphone ou mot de passe incorrect.",
  "We couldn't find an account with that phone number.": "Aucun compte n'est associé à ce numéro de téléphone.",
  "An account with this phone number already exists. Log in instead.": "Un compte existe déjà avec ce numéro de téléphone. Connectez-vous plutôt.",
  "That code isn't right. Check it and try again.": "Ce code n'est pas correct. Vérifiez-le et réessayez.",
  "That code has expired. Request a new one.": "Ce code a expiré. Demandez-en un nouveau.",
  "Use at least 8 characters with an uppercase letter, a lowercase letter and a number.": "Utilisez au moins 8 caractères, avec une majuscule, une minuscule et un chiffre.",
  "We couldn't send the code by SMS. Check the number and try again.": "Impossible d'envoyer le code par SMS. Vérifiez le numéro et réessayez.",
  "Check the details you entered and try again.": "Vérifiez les informations saisies et réessayez.",
};

/** Exact-match lookup; anything unknown (or any English request) passes through unchanged, except that an unmapped
 *  server error (status >= 500) gets a generic French message instead of raw English. */
export function translateApiMessage(message: string, lang: Lang, status?: number): string {
  if (lang !== "fr") return message;
  return FR[message] ?? (status !== undefined && status >= 500 ? SERVER_FALLBACK : message);
}
