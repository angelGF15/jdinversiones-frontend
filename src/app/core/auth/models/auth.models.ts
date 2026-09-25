export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface Profile {
  userId: string;
  entityId: string;
  firstName: string;
  lastName: string;
  businessName: string | null;
  email: string;
  avatarUrl: string | null;
  themePreference: 'light' | 'dark' | null;
  lastLoginAt: Date | string | null;
  roles: string[];
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  profile: Profile;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
  path?: string;
}
