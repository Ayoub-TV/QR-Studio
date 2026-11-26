import type { QrType } from './types';

export interface QrTypeMeta {
  value: QrType;
  label: string;
  description: string;
  fieldLabel: string;
  placeholder: string;
  hint: string;
  input: 'url' | 'handle' | 'phone' | 'text';
}

export const QR_TYPES: QrTypeMeta[] = [
  {
    value: 'url',
    label: 'Site web',
    description: 'Page, boutique, menu, campagne…',
    fieldLabel: 'Lien de destination',
    placeholder: 'https://exemple.com/offre',
    hint: 'Le lien vers lequel les scans sont redirigés.',
    input: 'url',
  },
  {
    value: 'instagram',
    label: 'Instagram',
    description: 'Profil ou publication',
    fieldLabel: 'Compte Instagram',
    placeholder: '@votrecompte',
    hint: 'Nom d’utilisateur ou lien complet du profil.',
    input: 'handle',
  },
  {
    value: 'facebook',
    label: 'Facebook',
    description: 'Page ou groupe',
    fieldLabel: 'Page Facebook',
    placeholder: 'votrepage',
    hint: 'Nom de la page ou lien complet.',
    input: 'handle',
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    description: 'Conversation directe',
    fieldLabel: 'Numéro WhatsApp',
    placeholder: '+33 6 12 34 56 78',
    hint: 'Numéro au format international, avec l’indicatif pays.',
    input: 'phone',
  },
  {
    value: 'youtube',
    label: 'YouTube',
    description: 'Chaîne ou vidéo',
    fieldLabel: 'Chaîne ou vidéo YouTube',
    placeholder: '@votrechaine',
    hint: 'Pseudo de chaîne (@nom) ou lien complet d’une vidéo.',
    input: 'handle',
  },
  {
    value: 'text',
    label: 'Texte simple',
    description: 'Message affiché au scan',
    fieldLabel: 'Texte à afficher',
    placeholder: 'Merci d’avoir scanné ce code !',
    hint: 'Le texte s’affiche sur une page QR Studio, le scan reste comptabilisé.',
    input: 'text',
  },
];

export function qrTypeMeta(type: QrType): QrTypeMeta {
  return QR_TYPES.find((item) => item.value === type) ?? QR_TYPES[0];
}

function withProtocol(value: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

function handleFromInput(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const segment = url.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] ?? '';
      if (segment) return segment;
      return url.searchParams.get('v') ? `watch?v=${url.searchParams.get('v')}` : '';
    } catch {
      return trimmed;
    }
  }
  return trimmed.replace(/^@/, '').replace(/\/+$/, '');
}

/** Turns the form input into the final destination stored in Firestore. */
export function buildDestination(type: QrType, raw: string): string {
  const value = raw.trim();
  switch (type) {
    case 'url':
      return withProtocol(value);
    case 'instagram': {
      const handle = handleFromInput(value);
      return `https://www.instagram.com/${handle}`;
    }
    case 'facebook': {
      const handle = handleFromInput(value);
      return `https://www.facebook.com/${handle}`;
    }
    case 'youtube': {
      if (/^https?:\/\//i.test(value)) return value;
      return `https://www.youtube.com/@${value.replace(/^@/, '')}`;
    }
    case 'whatsapp': {
      const digits = value.replace(/[^\d]/g, '');
      return `https://wa.me/${digits}`;
    }
    case 'text':
    default:
      return value;
  }
}

/** Returns a French error message, or null when the input is valid. */
export function validateDestination(type: QrType, raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Ce champ est obligatoire.';

  if (type === 'text') {
    return value.length > 1000 ? 'Le texte est limité à 1000 caractères.' : null;
  }

  if (type === 'url') {
    try {
      const url = new URL(withProtocol(value));
      if (!/^https?:$/.test(url.protocol)) return 'Le lien doit commencer par http:// ou https://.';
      if (!url.hostname.includes('.') && url.hostname !== 'localhost') {
        return 'Entrez un lien valide, par exemple https://exemple.com.';
      }
      return null;
    } catch {
      return 'Entrez un lien valide, par exemple https://exemple.com.';
    }
  }

  if (type === 'whatsapp') {
    const digits = value.replace(/[^\d]/g, '');
    if (digits.length < 8) return 'Entrez un numéro international, par exemple +33 6 12 34 56 78.';
    if (digits.length > 15) return 'Ce numéro semble trop long.';
    return null;
  }

  const handle = handleFromInput(value);
  if (!handle || handle.length < 2) return 'Entrez un nom d’utilisateur valide.';
  return null;
}

export function validateName(name: string): string | null {
  const value = name.trim();
  if (!value) return 'Donnez un nom à votre QR code.';
  if (value.length > 120) return 'Le nom est limité à 120 caractères.';
  return null;
}

export function displayDestination(destination: string): string {
  return destination.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}
