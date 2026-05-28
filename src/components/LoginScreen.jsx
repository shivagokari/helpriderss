import React, { useState, useEffect, useRef } from 'react';
import { Phone, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Flame, Compass, Mail, User, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function LoginScreen({ onLoginSuccess }) {
  // Flow states: 'SIGN_IN' | 'SIGN_UP' | 'OTP_VERIFY' | 'CREATE_PASSWORD' | 'FORGOT_OTP' | 'RESET_PASSWORD'
  const [flowState, setFlowState] = useState('SIGN_IN');
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [timer, setTimer] = useState(60);

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

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
          const { data: profile } = await supabase
            .from('profiles')
            .select('mobile, name, level')
            .eq('id', session.user.id)
            .maybeSingle();

          completeLoginFlow(session.user, profile?.mobile || '', profile?.name || session.user.user_metadata?.full_name || '', profile?.level || 'Rookie Rider');
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
    if ((flowState === 'OTP_VERIFY' || flowState === 'FORGOT_OTP') && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    } else if (timer === 0 && interval) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [flowState, timer]);

  // ─── SIGN IN ────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (signInError) {
        // Auto-seed admin account
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

            if (signUpData.session) {
              completeLoginFlow(user, '+91 99999 88888', 'Admin Moderator', 'System Administrator');
              return;
            } else {
              setLoading(false);
              setFlowState('SIGN_IN');
              setError('Admin account registered! Verification email sent. Please confirm or disable "Confirm Email" in your Supabase Auth settings.');
              return;
            }
          }
        }

        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('mobile, name, level')
          .eq('id', data.user.id)
          .maybeSingle();

        completeLoginFlow(data.user, profile?.mobile || '', profile?.name || data.user.user_metadata?.full_name || '', profile?.level || 'Rookie Rider');
      } else {
        setError('Login failed. Please verify your credentials.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during sign in.');
      setLoading(false);
    }
  };

  // ─── SIGN UP → Send Real Supabase Email OTP ────────────
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
    setSuccessMsg('');
    setLoading(true);

    try {
      // Check if user already exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingProfile) {
        setError('This email is already registered. Please Sign In.');
        setLoading(false);
        return;
      }

      // Send real Supabase Email OTP for signup verification
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          data: {
            mobile: mobileNumber,
            full_name: fullName
          }
        }
      });

      if (otpError) {
        setError(otpError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccessMsg(`✅ A 6-digit verification code has been sent to ${cleanEmail}`);
      setFlowState('OTP_VERIFY');
      setTimer(60);
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => otpRefs[0].current?.focus(), 200);
    } catch (err) {
      console.warn('Sign-up OTP send failed:', err.message);
      setError(err.message || 'Failed to send verification code. Please try again.');
      setLoading(false);
    }
  };

  // ─── OTP Input Handler (6 digits) ──────────────────────
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = value.substring(value.length - 1);
    setOtpValues(newOtp);
    setError('');

    // Auto-focus next field
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }

    // Auto-submit on final digit
    if (index === 5 && value) {
      const enteredCode = newOtp.map((v, i) => i === 5 ? value : v).join('');
      verifyOtpCode(enteredCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // Handle paste of full OTP code
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newOtp = [...otpValues];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || '';
      }
      setOtpValues(newOtp);
      
      // Focus the next empty field or the last field
      const nextEmpty = newOtp.findIndex(v => !v);
      const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
      otpRefs[focusIndex].current?.focus();

      // Auto-submit if all 6 digits pasted
      if (pastedData.length === 6) {
        verifyOtpCode(pastedData);
      }
    }
  };

  // ─── Verify OTP with Supabase ──────────────────────────
  const verifyOtpCode = async (enteredCode) => {
    if (enteredCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: enteredCode,
        type: flowState === 'FORGOT_OTP' ? 'email' : 'email'
      });

      if (verifyError) {
        setError(verifyError.message || 'Invalid or expired OTP code. Please try again.');
        setOtpValues(['', '', '', '', '', '']);
        otpRefs[0].current?.focus();
        setLoading(false);
        return;
      }

      if (data.session && data.user) {
        if (flowState === 'FORGOT_OTP') {
          // Forgot password flow → go to reset password
          setSuccessMsg('✅ Email verified! Now set your new password.');
          setFlowState('RESET_PASSWORD');
          setNewPassword('');
          setLoading(false);
        } else {
          // Sign-up flow → go to create password step
          // The user is now authenticated via OTP, but we want them to set a password
          setSuccessMsg('✅ Email verified successfully! Now create your account password.');
          setFlowState('CREATE_PASSWORD');
          setNewPassword('');
          setLoading(false);
        }
      } else {
        setError('Verification failed. Please request a new code.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An error occurred during verification.');
      setOtpValues(['', '', '', '', '', '']);
      otpRefs[0].current?.focus();
      setLoading(false);
    }
  };

  // ─── Create Password (after sign-up OTP verify) ───────
  const handleCreatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // The user is already authenticated via OTP session
      // Update their password using the active session
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Get the current user from session
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Insert or upsert profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: email.trim().toLowerCase(),
            mobile: mobileNumber,
            name: fullName,
            level: 'Rookie Rider'
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Failed to create profile:', profileError.message);
        }

        completeLoginFlow(user, mobileNumber, fullName, 'Rookie Rider');
      } else {
        setError('Failed to retrieve user session. Please sign in again.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  // ─── Forgot Password → Send OTP ──────────────────────
  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter your registered Email Address first');
      return;
    }
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: false
        }
      });

      if (otpError) {
        setError(otpError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccessMsg(`✅ Recovery code sent to ${cleanEmail}`);
      setFlowState('FORGOT_OTP');
      setTimer(60);
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => otpRefs[0].current?.focus(), 200);
    } catch (err) {
      setError(err.message || 'Failed to send recovery code.');
      setLoading(false);
    }
  };

  // ─── Reset Password (after forgot-password OTP verify) ─
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('mobile, name, level')
          .eq('id', user.id)
          .maybeSingle();

        completeLoginFlow(user, profile?.mobile || '', profile?.name || user.user_metadata?.full_name || '', profile?.level || 'Rookie Rider');
      } else {
        setSuccessMsg('Password reset successful! Please sign in with your new password.');
        setFlowState('SIGN_IN');
        setPassword('');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
      setLoading(false);
    }
  };

  // ─── Resend OTP Code ──────────────────────────────────
  const handleResendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    setError('');

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: flowState === 'OTP_VERIFY'
        }
      });

      if (otpError) {
        setError(otpError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      setTimer(60);
      setOtpValues(['', '', '', '', '', '']);
      setSuccessMsg('✅ New code sent! Check your email inbox.');
      setTimeout(() => otpRefs[0].current?.focus(), 200);
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
      setLoading(false);
    }
  };

  // ─── Complete Login & Persist Session ─────────────────
  const completeLoginFlow = (user, mobile, name, level = 'Rookie Rider') => {
    const userData = {
      uid: user.id,
      phone: mobile,
      email: user.email,
      authenticated: true,
      level: level,
      joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      displayName: name || user.email.split('@')[0],
    };
    
    if (rememberMe) {
      localStorage.setItem('helpriders_session', JSON.stringify(userData));
    } else {
      sessionStorage.setItem('helpriders_session', JSON.stringify(userData));
    }
    
    onLoginSuccess(userData);
  };

  // ─── Input Field Component ────────────────────────────
  const InputField = ({ icon: Icon, type = 'text', placeholder, value, onChange, required = true, rightElement }) => (
    <div style={{ position: 'relative', width: '100%' }}>
      <Icon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          width: '100%',
          paddingLeft: '44px',
          paddingRight: rightElement ? '44px' : '14px',
          fontSize: '14px',
          background: '#1c1c24',
          color: 'white',
          height: '48px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          outline: 'none',
          transition: 'border-color 0.2s',
          boxSizing: 'border-box'
        }}
        onFocus={(e) => e.target.style.borderColor = 'rgba(255, 85, 0, 0.4)'}
        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        required={required}
      />
      {rightElement}
    </div>
  );

  // ─── OTP Input Grid Component ─────────────────────────
  const OtpInputGrid = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '8px 0' }}>
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
          onPaste={idx === 0 ? handleOtpPaste : undefined}
          style={{
            width: '46px',
            height: '54px',
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: '800',
            color: 'white',
            fontFamily: 'var(--font-display)',
            border: digit ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: digit ? '0 0 12px rgba(255, 85, 0, 0.2)' : 'none',
            background: '#121217',
            borderRadius: '12px',
            outline: 'none',
            transition: 'all 0.2s',
            boxSizing: 'border-box'
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="login-screen scroll-y" style={{ height: '100%', padding: '30px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(180deg, #0d0d12 0%, #050508 100%)', overflow: 'auto' }}>
      
      {/* Branding Header */}
      <div style={{ textAlign: 'center', marginTop: '24px', flexShrink: 0 }} className="animate-fade-in">
        <div style={{ width: '76px', height: '76px', margin: '0 auto 14px', background: 'rgba(255, 85, 0, 0.1)', border: '1px solid rgba(255, 85, 0, 0.3)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Flame size={42} color="#ff5500" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 85, 0, 0.5))' }} />
        </div>
        <h1 style={{ fontSize: '30px', marginBottom: '4px', fontFamily: 'var(--font-display)', fontWeight: '800', background: 'linear-gradient(90deg, #fff 30%, #ffaa00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          HELPRIDERSS
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>
          The Ultimate Premium Biker Portal
        </p>
      </div>

      {/* Main Form Box */}
      <div className="glass-panel" style={{ padding: '22px 20px', margin: '16px 0', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
        
        {/* Success Message */}
        {successMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '14px', lineHeight: '1.4' }} className="animate-zoom-in">
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', background: 'rgba(255,34,51,0.1)', border: '1px solid rgba(255,34,51,0.2)', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '14px', lineHeight: '1.4' }} className="animate-zoom-in">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Selector for SIGN_IN / SIGN_UP */}
        {(flowState === 'SIGN_IN' || flowState === 'SIGN_UP') && (
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px', marginBottom: '18px' }}>
            <button
              onClick={() => { setFlowState('SIGN_IN'); setError(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: flowState === 'SIGN_IN' ? 'var(--primary)' : 'transparent',
                color: flowState === 'SIGN_IN' ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.25s ease'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setFlowState('SIGN_UP'); setError(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: flowState === 'SIGN_UP' ? 'var(--primary)' : 'transparent',
                color: flowState === 'SIGN_UP' ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.25s ease'
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* ═══════ FLOW A: SIGN_IN ═══════ */}
        {flowState === 'SIGN_IN' && (
          <form onSubmit={handleSignIn} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>Welcome Back, Rider</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px', margin: 0 }}>
                Access your premium crew dashboard using your credentials.
              </p>
            </div>

            <InputField
              icon={Mail}
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
            />

            <InputField
              icon={Lock}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              rightElement={
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

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
                onClick={handleForgotPassword} 
                style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                Forgot Password? Recover with Email OTP
              </button>
            </div>
          </form>
        )}

        {/* ═══════ FLOW B: SIGN_UP ═══════ */}
        {flowState === 'SIGN_UP' && (
          <form onSubmit={handleSignUp} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>Register New Biker Account</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px', margin: 0 }}>
                Verify with Email OTP, then set your password.
              </p>
            </div>

            <InputField
              icon={User}
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
            />

            <InputField
              icon={Mail}
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
            />

            <InputField
              icon={Phone}
              type="tel"
              placeholder="Mobile Number (e.g. 9876543210)"
              value={mobileNumber}
              onChange={(e) => { setMobileNumber(e.target.value.replace(/\D/g, '')); setError(''); }}
            />

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? (
                <div style={{ width: '18px', height: '18px', border: '3px solid transparent', borderTopColor: '#fff', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
              ) : (
                <>
                  Send Verification Code <Mail size={16} /> <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                📧 A 6-digit OTP will be sent to your email address
              </p>
            </div>
          </form>
        )}

        {/* ═══════ FLOW C: OTP_VERIFY (Sign-up) ═══════ */}
        {flowState === 'OTP_VERIFY' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '17px', color: 'var(--text-primary)', marginBottom: '4px' }}>Verify Email OTP</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                Enter the 6-digit code sent to<br/>
                <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{email}</span>
              </p>
            </div>

            <OtpInputGrid />

            {loading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '24px', height: '24px', border: '3px solid transparent', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'dash 1s linear infinite', margin: '0 auto' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '8px' }}>Verifying with Supabase...</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <button 
                type="button"
                onClick={() => { setFlowState('SIGN_UP'); setError(''); setSuccessMsg(''); }}
                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.3)', padding: 0, fontSize: '12px' }}
              >
                ← Back
              </button>

              {timer > 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>Resend in {timer}s</span>
              ) : (
                <button 
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  style={{ color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                >
                  Resend Code
                </button>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              💡 <strong>Tip:</strong> Check your inbox & spam folder. You can also paste the full code directly into the first box.
            </div>
          </div>
        )}

        {/* ═══════ FLOW D: FORGOT_OTP (Password Recovery) ═══════ */}
        {flowState === 'FORGOT_OTP' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '17px', color: 'var(--text-primary)', marginBottom: '4px' }}>Password Recovery</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                Enter the 6-digit recovery code sent to<br/>
                <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{email}</span>
              </p>
            </div>

            <OtpInputGrid />

            {loading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '24px', height: '24px', border: '3px solid transparent', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'dash 1s linear infinite', margin: '0 auto' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '8px' }}>Verifying recovery code...</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <button 
                type="button"
                onClick={() => { setFlowState('SIGN_IN'); setError(''); setSuccessMsg(''); }}
                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.3)', padding: 0, fontSize: '12px' }}
              >
                ← Back to Sign In
              </button>

              {timer > 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>Resend in {timer}s</span>
              ) : (
                <button 
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  style={{ color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════ FLOW E: CREATE_PASSWORD (after sign-up OTP) ═══════ */}
        {flowState === 'CREATE_PASSWORD' && (
          <form onSubmit={handleCreatePassword} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '17px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                <ShieldCheck size={18} style={{ verticalAlign: '-3px', marginRight: '6px', color: '#22c55e' }} />
                Setup Your Password
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>
                Choose a password for <strong style={{ color: 'white' }}>{email}</strong> to sign in quickly next time.
              </p>
            </div>

            <InputField
              icon={Lock}
              type={showPassword ? "text" : "password"}
              placeholder="Create Account Password (min 6 chars)"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              rightElement={
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            {/* Password strength indicator */}
            {newPassword && (
              <div style={{ display: 'flex', gap: '4px', height: '3px' }}>
                <div style={{ flex: 1, borderRadius: '2px', background: newPassword.length >= 2 ? (newPassword.length >= 8 ? '#22c55e' : newPassword.length >= 6 ? '#f59e0b' : '#ef4444') : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                <div style={{ flex: 1, borderRadius: '2px', background: newPassword.length >= 6 ? (newPassword.length >= 8 ? '#22c55e' : '#f59e0b') : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                <div style={{ flex: 1, borderRadius: '2px', background: newPassword.length >= 8 ? '#22c55e' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
              </div>
            )}

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

        {/* ═══════ FLOW F: RESET_PASSWORD (after forgot OTP) ═══════ */}
        {flowState === 'RESET_PASSWORD' && (
          <form onSubmit={handleResetPassword} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '17px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                <ShieldCheck size={18} style={{ verticalAlign: '-3px', marginRight: '6px', color: '#22c55e' }} />
                Set New Password
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>
                Choose a new password for <strong style={{ color: 'white' }}>{email}</strong>
              </p>
            </div>

            <InputField
              icon={Lock}
              type={showPassword ? "text" : "password"}
              placeholder="New Password (min 6 chars)"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              rightElement={
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            {newPassword && (
              <div style={{ display: 'flex', gap: '4px', height: '3px' }}>
                <div style={{ flex: 1, borderRadius: '2px', background: newPassword.length >= 2 ? (newPassword.length >= 8 ? '#22c55e' : newPassword.length >= 6 ? '#f59e0b' : '#ef4444') : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                <div style={{ flex: 1, borderRadius: '2px', background: newPassword.length >= 6 ? (newPassword.length >= 8 ? '#22c55e' : '#f59e0b') : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                <div style={{ flex: 1, borderRadius: '2px', background: newPassword.length >= 8 ? '#22c55e' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? (
                <div style={{ width: '18px', height: '18px', border: '3px solid transparent', borderTopColor: '#fff', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
              ) : (
                <>
                  Save New Password <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginBottom: '16px', flexShrink: 0 }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
          By logging in, you agree to ride responsibly and wear protective gear.
        </p>
      </div>

    </div>
  );
}
