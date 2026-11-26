const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/wrong-password': 'Email ou mot de passe incorrect.',
  'auth/user-not-found': 'Aucun compte ne correspond à cet email.',
  'auth/invalid-email': 'Cette adresse email est invalide.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse email.',
  'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
  'auth/missing-password': 'Entrez votre mot de passe.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/network-request-failed': 'Connexion impossible. Vérifiez votre réseau.',
  'auth/requires-recent-login': 'Reconnectez-vous avant de modifier votre mot de passe.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/operation-not-allowed': "La connexion email/mot de passe n'est pas activée dans Firebase.",
};

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  if (MESSAGES[code]) return MESSAGES[code];
  const message = (error as { message?: string } | null)?.message;
  return message?.replace(/^Firebase:\s*/, '') || 'Une erreur est survenue. Réessayez.';
}
