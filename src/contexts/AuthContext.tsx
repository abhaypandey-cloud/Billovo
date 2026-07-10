import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserRole = 'admin' | 'manager' | 'accountant' | 'sales' | 'purchase' | 'warehouse' | 'viewer';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  avatar?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  otpPending: boolean;
  otpEmail: string;
  login: (email: string, password: string) => Promise<{ success: boolean; requiresOtp?: boolean; error?: string }>;
  verifyOtp: (otp: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: () => void;
  logout: () => void;
  can: (action: 'create' | 'read' | 'update' | 'delete', module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Demo users
const DEMO_USERS: (AuthUser & { password: string })[] = [
  { id: '1', username: 'admin', email: 'admin@billevo.ae', password: 'admin123', role: 'admin', fullName: 'Abhay Pandey' },
  { id: '2', username: 'manager', email: 'manager@billevo.ae', password: 'manager123', role: 'manager', fullName: 'Sara Abdullah' },
  { id: '3', username: 'accountant', email: 'accountant@billevo.ae', password: 'acc123', role: 'accountant', fullName: 'Khalid Hassan' },
];

// Permissions matrix
const PERMISSIONS: Record<UserRole, Record<string, string[]>> = {
  admin:      { '*': ['create', 'read', 'update', 'delete'] },
  manager:    { '*': ['create', 'read', 'update'], settings: ['read'] },
  accountant: { accounting: ['create', 'read', 'update', 'delete'], reports: ['read'], sales: ['read'], purchases: ['read'], inventory: ['read'] },
  sales:      { sales: ['create', 'read', 'update'], customers: ['create', 'read', 'update'], products: ['read'], reports: ['read'] },
  purchase:   { purchases: ['create', 'read', 'update'], suppliers: ['create', 'read', 'update'], inventory: ['read'], reports: ['read'] },
  warehouse:  { inventory: ['create', 'read', 'update', 'delete'], products: ['read', 'update'], reports: ['read'] },
  viewer:     { '*': ['read'] },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [otpPending, setOtpPending] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [currentOtp, setCurrentOtp] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('billevo_user_v2');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem('billevo_user_v2'); }
    }
  }, []);

  const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

  const login = async (email: string, password: string) => {
    await new Promise(r => setTimeout(r, 800));
    const found = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) return { success: false, error: 'Invalid email or password' };
    const { password: _, ...userData } = found;
    setPendingUser(userData);
    const otp = generateOtp();
    setCurrentOtp(otp);
    setOtpEmail(email);
    setOtpPending(true);
    console.log(`%c🔐 OTP for ${email}: ${otp}`, 'background:#1e40af;color:white;padding:4px 8px;border-radius:4px;font-size:14px;font-weight:bold');
    return { success: true, requiresOtp: true };
  };

  const verifyOtp = async (otp: string) => {
    await new Promise(r => setTimeout(r, 600));
    if (otp !== currentOtp) return { success: false, error: 'Invalid OTP. Please try again.' };
    if (!pendingUser) return { success: false, error: 'Session expired. Please login again.' };
    setUser(pendingUser);
    localStorage.setItem('billevo_user_v2', JSON.stringify(pendingUser));
    setOtpPending(false);
    setPendingUser(null);
    setCurrentOtp('');
    return { success: true };
  };

  const resendOtp = () => {
    const otp = generateOtp();
    setCurrentOtp(otp);
    console.log(`%c🔐 New OTP for ${otpEmail}: ${otp}`, 'background:#1e40af;color:white;padding:4px 8px;border-radius:4px;font-size:14px;font-weight:bold');
  };

  const logout = () => {
    setUser(null);
    setOtpPending(false);
    setPendingUser(null);
    localStorage.removeItem('billevo_user_v2');
  };

  const can = (action: 'create' | 'read' | 'update' | 'delete', module: string): boolean => {
    if (!user) return false;
    const perms = PERMISSIONS[user.role];
    if (perms['*']) return perms['*'].includes(action);
    const modulePerm = perms[module];
    return modulePerm ? modulePerm.includes(action) : false;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, otpPending, otpEmail, login, verifyOtp, resendOtp, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
};
