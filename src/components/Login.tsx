import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Eye, EyeOff, Shield, BarChart3, Globe, ArrowRight, RefreshCw,
  ChevronLeft, CheckCircle2, Zap, Lock
} from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, verifyOtp, resendOtp, otpPending, otpEmail, isAuthenticated } = useAuth();

  useEffect(() => { if (isAuthenticated) navigate('/'); }, [isAuthenticated, navigate]);

  const [email, setEmail] = useState('admin@billevo.ae');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState('');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error('');
    setStep1Loading(true);
    const result = await login(email, password);
    setStep1Loading(false);
    if (!result.success) setStep1Error(result.error || 'Login failed');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((ch, i) => { if (i < 6) newOtp[i] = ch; });
    setOtp(newOtp);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setOtpError('Please enter all 6 digits'); return; }
    setOtpError('');
    setOtpLoading(true);
    const result = await verifyOtp(code);
    setOtpLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setOtpError(result.error || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  const handleResend = () => {
    resendOtp();
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setResendCooldown(30);
  };

  const features = [
    { icon: BarChart3, title: 'Smart Analytics', desc: 'Real-time business insights and KPI tracking' },
    { icon: Shield, title: 'VAT Compliant', desc: 'UAE FTA compliant invoicing and VAT reporting' },
    { icon: Globe, title: 'Multi-Currency', desc: 'AED and international currency support' },
  ];

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)' }}
      >
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/30"
              style={{
                width: `${(i + 1) * 120}px`,
                height: `${(i + 1) * 120}px`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
              }}
            />
          ))}
        </div>
        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">Billevo</span>
              <div className="text-blue-200 text-xs font-medium tracking-widest uppercase">ERP Platform</div>
            </div>
          </div>
          {/* Headline */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Enterprise ERP<br />for Dubai Business
            </h1>
            <p className="text-blue-200 text-lg mb-12 leading-relaxed">
              Manage sales, purchases, inventory, and accounting — all in one UAE-compliant platform.
            </p>
            <div className="space-y-5">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{title}</div>
                    <div className="text-blue-200 text-sm">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-blue-300 text-sm">© 2024 Billevo ERP · Dubai, UAE</div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Billevo ERP</span>
          </div>

          {!otpPending ? (
            <div>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</h2>
                <p className="text-slate-500 dark:text-slate-400">Sign in to your ERP account</p>
              </div>

              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Demo: admin@billevo.ae / admin123</p>
              </div>

              {step1Error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                  {step1Error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="you@company.ae"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={step1Loading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                >
                  {step1Loading ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" />Signing in...</>
                  ) : (
                    <>Continue <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm mb-8 transition"
              >
                <ChevronLeft className="h-4 w-4" /> Back to login
              </button>

              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                  <Lock className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Verify OTP</h2>
                <p className="text-slate-500 dark:text-slate-400">
                  A 6-digit code was sent to{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">{otpEmail}</span>
                </p>
              </div>

              <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Check the <strong>browser console</strong> (F12) for your OTP code
                </p>
              </div>

              {otpError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                  {otpError}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 text-center">
                    Enter 6-digit code
                  </label>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          digit
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otp.join('').length < 6}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                >
                  {otpLoading ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" />Verifying...</>
                  ) : (
                    <>Verify &amp; Sign In <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
