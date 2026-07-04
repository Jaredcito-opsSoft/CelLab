import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';

export type BusinessProfile = {
  businessName: string;
  businessType: string;
  logoUrl: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  ticketMessage: string | null;
  warrantyMessage: string | null;
  currency: string;
  primaryColor: string;
};

type BusinessProfileResponse = { item: BusinessProfile | null };

const normalizePhoneLabel = (phone?: string | null) => {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length !== 10) return phone ?? '';
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

export function buildWhatsappLink(profile: BusinessProfile | null, message: string) {
  if (!profile?.whatsappPhone) return null;
  return `https://wa.me/${profile.whatsappPhone}?text=${encodeURIComponent(message)}`;
}

export function buildPhoneLink(profile: BusinessProfile | null) {
  const digits = (profile?.phone ?? '').replace(/\D/g, '');
  return digits ? `tel:+${digits.length === 10 ? `52${digits}` : digits}` : null;
}

export function useBusinessProfile() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    apiRequest<BusinessProfileResponse>('/api/public/business-profile')
      .then((response) => { if (mounted) setProfile(response.item); })
      .catch(() => { if (mounted) setProfile(null); });
    return () => { mounted = false; };
  }, []);

  const phoneLabel = useMemo(() => normalizePhoneLabel(profile?.phone), [profile?.phone]);
  return { profile, phoneLabel };
}
