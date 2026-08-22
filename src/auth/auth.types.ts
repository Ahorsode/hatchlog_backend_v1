export type AuthUser = {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  role: string;
  farmIds: string[];
  supabaseSub: string;
};

export type JwtPayload = {
  sub: string;
  email?: string;
  phone?: string;
  role?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  user_metadata?: {
    email?: string;
    full_name?: string;
    name?: string;
  };
};
