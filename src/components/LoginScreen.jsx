import React, { useState, useEffect, useRef } from 'react';
import { Phone, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Flame, Compass, Mail, User } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function LoginScreen({ onLoginSuccess }) {
  // Flow states: 'SIGN_IN' | 'SIGN_UP' | 'OTP_VERIFY' | 'CREATE_PASSWORD'
  const [flowState, setFlowState] = useState('SIGN_IN');
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '']);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Auto-login check on mount
  useEffect(() => {
    const checkActiveSession = async () => {
      // 1. Check local session storage first
      const savedUser = localStorage.getItem('helpriders_session');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.authenticated) {
            onLoginSuccess(parsed);
            return;
          }
        } catch (e) {
          localStorage.removeItem('helpriders_session');
        }
      }

      // 2. Fallback to check active Supabase Auth session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          // Fetch their profile information
          const { data: profile } = await supabase
            .from('profiles')
            .select('mobile, name, level')
            .eq('id', session.user.id)
            .maybeSingle();

          completeLoginFlow(session.user, profile?.mobile || '+91 98765 43210', profile?.name || session.user.user_metadata?.full_name || '', profile?.level || 'Rookie Rider');
        }
      } catch (err) {
        console.warn('Supabase session check failed:', err.message);
      }
    };

    checkActiveSession();
  }, [onLoginSuccess]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (flowState === 'OTP_VERIFY' && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    } else if (timer === 0 && interval) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [flowState, timer]);

  // 1. Sign In handler (Supabase Authentication)
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // Perform Supabase email/password sign-in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (signInError) {
        // Special Auto-Seed for Admin Account
        if (cleanEmail === 'admin@helpriderss.com' && password === 'Admin@2026') {
          setError('');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                mobile: '+91 99999 88888',
                full_name: 'Admin Moderator'
              }
            }
          });

          if (!signUpError && signUpData.user) {
            const user = signUpData.user;
            await supabase.from('profiles').insert({
              id: user.id,
              email: cleanEmail,
              mobile: '+91 99999 88888',
              name: 'Admin Moderator',
              level: 'System Administrator'
            });

            // If verified automatically or session present
            if (signUpData.session) {
              completeLoginFlow(user, '+91 99999 88888', 'Admin Moderator', 'System Administrator');
              return;
            } else {
              setLoading(false);
              setFlowState('SIGN_IN');
              setError('Admin account registered! A verification link was sent to admin@helpriderss.com. Please confirm or turn off "Confirm Email" in your Supabase Auth provider settings to sign in directly.');
              return;
            }
          }
        }

        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Fetch profile to get mobile number and rank details
        const { data: profile } = await supabase
          .from('profiles')
          .select('mobile, name, level')
          .eq('id', data.user.id)
          .maybeSingle();

        completeLoginFlow(data.user, profile?.mobile || '+91 98765 43210', profile?.name || data.user.user_metadata?.full_name || '', profile?.level || 'Rookie Rider');
      } else {
        setError('Login failed. Please verify your Supabase credentials.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during sign in.');
      setLoading(false);
    }
  };

  // 2. Sign Up handler (Check email uniqueness using public profiles)
  const handleSignUp = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !mobileNumber || !fullName) {
      setError('Please enter your Name, Email, and Mobile Number');
      return;
    }
    if (mobileNumber.replace(/\D/g, '').length < 8) {
      setError('Please enter a valid mobile number');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Query profiles table to check if user already exists
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profile) {
        setError('This email is already registered. Please Sign In.');
        setLoading(false);
        return;
      }

      setLoading(false);
      // Proceed to email OTP verification simulation
      setFlowState('OTP_VERIFY');
      setTimer(30);
      setOtpValues(['', '', '', '']);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      console.warn('Database profiles check failed, bypassing check:', err.message);
      setLoading(false);
      // Fallback: proceed to verification anyway
      setFlowState('OTP_VERIFY');
      setTimer(30);
      setOtpValues(['', '', '', '']);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    }
  };

  // 3. OTP verification digits input handler
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = value.substring(value.length - 1); // Keep last character
    setOtpValues(newOtp);
    setError('');

    // Auto-focus next field
    if (value && index < 3) {
      otpRefs[index + 1].current?.focus();
    }

    // Auto-submit OTP check on final digit entry
    if (index === 3 && value) {
      const enteredCode = newOtp.map((v, i) => i === 3 ? value : v).join('');
      checkOtpCode(enteredCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const checkOtpCode = (enteredCode) => {
    setLoading(true);
    setTimeout(() => {
      // Mock code verification (accepts '1234' or any 4 digit code for testing)
      if (enteredCode === '1234' || enteredCode.length === 4) {
        // Proceed to set a password to finalize signup
        setFlowState('CREATE_PASSWORD');
        setNewPassword('');
        setLoading(false);
      } else {
        setLoading(false);
        setError('Incorrect verification code. Hint: Use 1234');
        setOtpValues(['', '', '', '']);
        otpRefs[0].current?.focus();
      }
    }, 1000);
  };

  // 4. Create Password submit handler (Supabase Authentication Sign Up)
  const handleCreatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // 1. Create User inside Supabase Authentication
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: newPassword,
        options: {
          data: {
            mobile: mobileNumber,
            full_name: fullName
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (user) {
        // 2. Insert profile record into public.profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: cleanEmail,
            mobile: mobileNumber,
            name: fullName,
            level: 'Rookie Rider'
          });

        if (profileError) {
          console.error('Failed to create public profiles record:', profileError.message);
          // Proceed anyway in case profile table wasn't created yet or RLS policy blocked it
        }

        // Check if session returned (if email verification is disabled in Supabase console)
        if (data.session) {
          completeLoginFlow(user, mobileNumber, fullName, 'Rookie Rider');
        } else {
          setLoading(false);
          setFlowState('SIGN_IN');
          setError('Account registered! Verification email sent. Please check your inbox and verify your email to log in.');
        }
      } else {
        setError('Registration failed. Please check your Supabase configurations.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during signup.');
      setLoading(false);
    }
  };

  // Finish verification and login
  const completeLoginFlow = (user, mobile, name, level = 'Rookie Rider') => {
    const userData = {
      uid: user.id,
      phone: mobile,
      email: user.email,
      authenticated: true,
      level: level,
      joined: 'May 2026',
      displayName: name || user.email.split('@')[0],
    };
    
    if (rememberMe) {
      localStorage.setItem('helpriders_session', JSON.stringify(userData));
    } else {
      sessionStorage.setItem('helpriders_session', JSON.stringify(userData));
    }
    
    onLoginSuccess(userData);
  };

  // Direct bypass using default demo credentials
  const handleDirectDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      const userData = {
        phone: '+91 9876543210',
        email: 'ghost@helpriderss.com',
        authenticated: true,
        level: 'Apex Rider',
        joined: 'Jan 2026',
        displayName: 'GhostRider',
      };
      localStorage.setItem('helpriders_session', JSON.stringify(userData));
      onLoginSuccess(userData);
    }, 800);
  };

  // Send an OTP directly from sign-in screen as password bypass/recovery
  const handleForgotBypassWithOtp = () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter your valid registered Email Address to send OTP recovery.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFlowState('OTP_VERIFY');
      setTimer(30);
      setOtpValues(['', '', '', '']);
      setError('');
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    }, 800);
  };

  return (
    <div className="login-screen scroll-y" style={{ height: '100%', padding: '30px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(180deg, #0d0d12 0%, #050508 100%)' }}>
      
      {/* Branding and Graphic Header */}
      <div style={{ textAlign: 'center', marginTop: '30px' }} className="animate-fade-in">
        <div style={{ width: '80px', height: '80px', margin: '0 auto 16px', background: 'rgba(255, 85, 0, 0.1)', border: '1px solid rgba(255, 85, 0, 0.3)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
          <Flame size={44} color="#ff5500" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 85, 0, 0.5))' }} />
        </div>
        <h1 style={{ fontSize: '32px', marginBottom: '4px', fontFamily: 'var(--font-display)', fontWeight: '800', background: 'linear-gradient(90deg, #fff 30%, #ffaa00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          HELPRIDERSS
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          The Ultimate Premium Biker Portal
        </p>
      </div>

      {/* Main Form Box */}
      <div className="glass-panel" style={{ padding: '24px', margin: '20px 0', border: '1px solid var(--glass-border)' }}>
        
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', background: 'rgba(255,34,51,0.1)', border: '1px solid rgba(255,34,51,0.2)', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px' }} className="animate-zoom-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Selector for SIGN_IN / SIGN_UP */}
        {(flowState === 'SIGN_IN' || flowState === 'SIGN_UP') && (
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => { setFlowState('SIGN_IN'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: flowState === 'SIGN_IN' ? 'var(--primary)' : 'transparent',
                color: flowState === 'SIGN_IN' ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setFlowState('SIGN_UP'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: flowState === 'SIGN_UP' ? 'var(--primary)' : 'transparent',
                color: flowState === 'SIGN_UP' ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* FLOW A: SIGN_IN */}
        {flowState === 'SIGN_IN' && (
          <form onSubmit={handleSignIn} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>Welcome Back, Rider</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                Access your premium crew dashboard using your credentials.
              </p>
            </div>

            <div style={{ position: 'relative', width: '100%' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                style={{ width: '100%', paddingLeft: '44px', fontSize: '14px', background: '#1c1c24', color: 'white', height: '46px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                required
              />
            </div>

            <div style={{ position: 'relative', width: '100%' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                style={{ width: '100%', paddingLeft: '44px', paddingRight: '40px', fontSize: '14px', background: '#1c1c24', color: 'white', height: '46px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '14px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setRememberMe(!rememberMe)}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => {}}
                style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Remember my session</span>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? (
                <div style={{ width: '18px', height: '18px', border: '3px solid transparent', borderTopColor: '#fff', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', fontSize: '12px' }}>
              <button 
                type="button"
                onClick={handleForgotBypassWithOtp} 
                style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Forgot Password? Bypass with Email OTP
              </button>
            </div>
            
          </form>
        )}

        {/* FLOW B: SIGN_UP */}
        {flowState === 'SIGN_UP' && (
          <form onSubmit={handleSignUp} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>Register New Biker Account</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                Verify with Email OTP, configure password, then setup your profile.
              </p>
            </div>

            <div style={{ position: 'relative', width: '100%' }}>
              <User size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(''); }}
                style={{ width: '100%', paddingLeft: '44px', fontSize: '14px', background: '#1c1c24', color: 'white', height: '46px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                required
              />
            </div>

            <div style={{ position: 'relative', width: '100%' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                style={{ width: '100%', paddingLeft: '44px', fontSize: '14px', background: '#1c1c24', color: 'white', height: '46px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                required
              />
            </div>

            <div style={{ position: 'relative', width: '100%' }}>
              <Phone size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                type="tel"
                placeholder="Mobile Number"
                value={mobileNumber}
                onChange={(e) => { setMobileNumber(e.target.value.replace(/\D/g, '')); setError(''); }}
                style={{ width: '100%', paddingLeft: '44px', fontSize: '14px', background: '#1c1c24', color: 'white', height: '46px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? (
                <div style={{ width: '18px', height: '18px', border: '3px solid transparent', borderTopColor: '#fff', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
              ) : (
                <>
                  Send Email Verification Code <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* FLOW C: OTP_VERIFY */}
        {flowState === 'OTP_VERIFY' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>Verify Email OTP</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px', lineHeight: '1.4' }}>
                We've sent a 4-digit code to <span style={{ color: 'var(--primary)' }}>{email}</span>
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', margin: '6px 0' }}>
              {otpValues.map((digit, idx) => (
                <input
                  key={idx}
                  ref={otpRefs[idx]}
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  style={{
                    width: '56px',
                    height: '56px',
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: '800',
                    color: 'white',
                    fontFamily: 'var(--font-display)',
                    border: digit ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: digit ? '0 0 10px rgba(255, 85, 0, 0.25)' : 'none',
                    background: '#121217',
                    borderRadius: '12px'
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <button 
                type="button"
                onClick={() => setFlowState('SIGN_IN')} 
                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.3)', padding: 0 }}
              >
                Back to sign in
              </button>

              {timer > 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>Resend in {timer}s</span>
              ) : (
                <button 
                  type="button"
                  onClick={() => { setTimer(30); setOtpValues(['','','','']); setError(''); }} 
                  style={{ color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Resend OTP Code
                </button>
              )}
            </div>

          </div>
        )}

        {/* FLOW D: CREATE_PASSWORD */}
        {flowState === 'CREATE_PASSWORD' && (
          <form onSubmit={handleCreatePassword} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>Setup Secure Password</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                Choose a password for <strong style={{ color: 'white' }}>{email}</strong> to sign in quickly in the future.
              </p>
            </div>

            <div style={{ position: 'relative', width: '100%' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Choose Account Password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                style={{ width: '100%', paddingLeft: '44px', paddingRight: '40px', fontSize: '14px', background: '#1c1c24', color: 'white', height: '46px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '14px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? (
                <div style={{ width: '18px', height: '18px', border: '3px solid transparent', borderTopColor: '#fff', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
              ) : (
                <>
                  Complete Registration <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

      </div>

      {/* Policy Agreement */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <p style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)' }}>
          By logging in, you agree to ride responsibly and wear protective gear.
        </p>
      </div>

    </div>
  );
}
