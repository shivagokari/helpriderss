import React, { useState, useEffect, useRef } from 'react';
import { Phone, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Flame, Mail, User, CheckCircle, Send, Headphones } from 'lucide-react';
import { supabase } from '../utils/supabase';

/* ═══════════════════════════════════════════════════════════
   Shared input style constants (defined OUTSIDE the component 
   so React never re-creates them on render)
   ═══════════════════════════════════════════════════════════ */
const inputStyle = {
  width: '100%',
  paddingLeft: '44px',
  paddingRight: '14px',
  fontSize: '14px',
  background: '#1c1c24',
  color: 'white',
  height: '48px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.08)',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box'
};

const inputStyleWithRight = { ...inputStyle, paddingRight: '44px' };

const iconAbsStyle = {
  position: 'absolute',
  left: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
  zIndex: 1
};

const otpBoxStyle = (hasDigit) => ({
  width: '46px',
  height: '54px',
  textAlign: 'center',
  fontSize: '20px',
  fontWeight: '800',
  color: 'white',
  fontFamily: 'var(--font-display)',
  border: hasDigit ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
  boxShadow: hasDigit ? '0 0 12px rgba(255, 85, 0, 0.2)' : 'none',
  background: '#121217',
  borderRadius: '12px',
  outline: 'none',
  transition: 'all 0.2s',
  boxSizing: 'border-box'
});

const handleFocus = (e) => { e.target.style.borderColor = 'rgba(255, 85, 0, 0.4)'; };
const handleBlur = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; };

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
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
  const [sessionChecked, setSessionChecked] = useState(false);

  // Contact Developer states (for unauthenticated support)
  const [showDevForm, setShowDevForm] = useState(false);
  const [devSent, setDevSent] = useState(false);
  const [devName, setDevName] = useState('');
  const [devMobile, setDevMobile] = useState('');
  const [devError, setDevError] = useState('');

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // Auto-login check on mount — only if a REAL Supabase session exists
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          // Valid Supabase session — fetch profile and auto-login
          const { data: profile } = await supabase
            .from('profiles')
            .select('mobile, name, level, unique_id')
            .eq('id', session.user.id)
            .maybeSingle();

          let uniqueId = profile?.unique_id;
          let mobile = profile?.mobile || session.user.user_metadata?.mobile || '';
          let name = profile?.name || session.user.user_metadata?.full_name || session.user.email.split('@')[0];
          let level = profile?.level || 'Rookie Rider';

          if (!profile) {
            uniqueId = 'HR-' + Math.floor(10000 + Math.random() * 90000);
            await supabase.from('profiles').insert({
              id: session.user.id,
              email: session.user.email,
              mobile: mobile,
              name: name,
              level: level,
              unique_id: uniqueId
            });
          } else if (!uniqueId) {
            uniqueId = 'HR-' + Math.floor(10000 + Math.random() * 90000);
            await supabase.from('profiles').update({ unique_id: uniqueId }).eq('id', session.user.id);
          }

          const userData = {
            uid: session.user.id,
            phone: mobile,
            email: session.user.email,
            authenticated: true,
            level: level,
            joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            displayName: name,
            uniqueId: uniqueId
          };
          localStorage.setItem('helpriders_session', JSON.stringify(userData));
          onLoginSuccess(userData);
          return;
        }
      } catch (err) {
        console.warn('Session check failed:', err.message);
      }

      // No valid Supabase session — clear any stale local data
      localStorage.removeItem('helpriders_session');
      setSessionChecked(true);
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
    }
    return () => { if (interval) clearInterval(interval); };
  }, [flowState, timer]);

  // Don't render login form until session check is done
  if (!sessionChecked) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d12' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid transparent', borderTopColor: '#ff5500', borderRadius: '50%', animation: 'dash 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</p>
        </div>
      </div>
    );
  }

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
            const generatedId = 'HR-ADMIN';
            await supabase.from('profiles').insert({
              id: user.id,
              email: cleanEmail,
              mobile: '+91 99999 88888',
              name: 'Admin Moderator',
              level: 'System Administrator',
              unique_id: generatedId
            });

            if (signUpData.session) {
              completeLoginFlow(user, '+91 99999 88888', 'Admin Moderator', 'System Administrator', generatedId);
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
          .select('mobile, name, level, unique_id')
          .eq('id', data.user.id)
          .maybeSingle();

        let uniqueId = profile?.unique_id;
        let mobile = profile?.mobile || data.user.user_metadata?.mobile || '';
        let name = profile?.name || data.user.user_metadata?.full_name || data.user.email.split('@')[0];
        let level = profile?.level || 'Rookie Rider';

        if (!profile) {
          if (!uniqueId) {
            uniqueId = 'HR-' + Math.floor(10000 + Math.random() * 90000);
          }
          await supabase.from('profiles').insert({
            id: data.user.id,
            email: data.user.email,
            mobile: mobile,
            name: name,
            level: level,
            unique_id: uniqueId
          });
        } else if (!uniqueId) {
          uniqueId = 'HR-' + Math.floor(10000 + Math.random() * 90000);
          await supabase.from('profiles').update({ unique_id: uniqueId }).eq('id', data.user.id);
        }

        completeLoginFlow(data.user, mobile, name, level, uniqueId);
      } else {
        setError('Login failed. Please verify your credentials.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during sign in.');
      setLoading(false);
    }
  };

  // ─── SIGN UP ───────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !mobileNumber || !fullName || !password) {
      setError('Please fill in all fields (Name, Email, Mobile, and Password)');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // Indian Mobile Number Validation
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    let normalizedMobile = cleanMobile;
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      normalizedMobile = cleanMobile.substring(2);
    } else if (cleanMobile.length === 11 && cleanMobile.startsWith('0')) {
      normalizedMobile = cleanMobile.substring(1);
    }

    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(normalizedMobile)) {
      setError('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)');
      return;
    }

    // Repeated digits check (reject numbers like 9999999999)
    const isRepeatedNumber = new Set(normalizedMobile).size === 1;
    if (isRepeatedNumber) {
      setError('Please enter a valid working mobile number (repeated/fancy numbers are not allowed)');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // Check if email already exists in profiles
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (emailCheckError) {
        console.error('Email check error:', emailCheckError.message);
      }

      if (existingEmail) {
        setError('An account with this email address already exists. Please Sign In.');
        setLoading(false);
        return;
      }

      // Check if mobile number already exists in profiles (case insensitive check for last 10 digits)
      const { data: existingMobile, error: mobileCheckError } = await supabase
        .from('profiles')
        .select('mobile')
        .ilike('mobile', `%${normalizedMobile}`)
        .maybeSingle();

      if (mobileCheckError) {
        console.error('Mobile check error:', mobileCheckError.message);
      }

      if (existingMobile) {
        setError('An account with this mobile number already exists. Please use a different number.');
        setLoading(false);
        return;
      }

      const formattedMobile = `+91 ${normalizedMobile}`;

      // Sign up directly with credentials
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            mobile: formattedMobile,
            full_name: fullName
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (signUpData.session && signUpData.user) {
        const user = signUpData.user;
        let generatedId = 'HR-' + Math.floor(10000 + Math.random() * 90000);
        let finalName = fullName;
        let finalMobile = formattedMobile;

        const testAccounts = {
          'test22@helpriders.com': { uniqueId: 'HR-22000', name: 'Rider TwentyTwo', mobile: '+91 99999 22222' },
          'test24@helpriders.com': { uniqueId: 'HR-24000', name: 'Rider TwentyFour', mobile: '+91 99999 24242' },
          'test26@helpriders.com': { uniqueId: 'HR-26000', name: 'Rider TwentySix', mobile: '+91 99999 26262' },
          'test28@helpriders.com': { uniqueId: 'HR-28000', name: 'Rider TwentyEight', mobile: '+91 99999 28282' },
          'test30@helpriders.com': { uniqueId: 'HR-30000', name: 'Rider Thirty', mobile: '+91 99999 30303' }
        };

        const testAcc = testAccounts[user.email.trim().toLowerCase()];
        if (testAcc) {
          generatedId = testAcc.uniqueId;
          finalName = testAcc.name;
          finalMobile = testAcc.mobile;
        }

        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          email: cleanEmail,
          mobile: finalMobile,
          name: finalName,
          level: 'Rookie Rider',
          unique_id: generatedId
        });
        if (profileError) {
          console.error('Failed to create profile:', profileError.message);
        }
        localStorage.setItem('helpriders_first_login', 'true');
        completeLoginFlow(user, finalMobile, finalName, 'Rookie Rider', generatedId);
      } else if (signUpData.user) {
        const user = signUpData.user;
        const generatedId = 'HR-' + Math.floor(10000 + Math.random() * 90000);

        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          email: cleanEmail,
          mobile: formattedMobile,
          name: fullName,
          level: 'Rookie Rider',
          unique_id: generatedId
        });
        if (profileError) {
          console.error('Failed to create profile on unconfirmed signup:', profileError.message);
        }
        localStorage.setItem('helpriders_first_login', 'true');
        setSuccessMsg('✅ Account registered! Please check your email inbox to confirm your account, then sign in.');
        setFlowState('SIGN_IN');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during registration. Please try again.');
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

    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }

    if (index === 5 && value) {
      const enteredCode = newOtp.join('');
      verifyOtpCode(enteredCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newOtp = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || '';
      }
      setOtpValues(newOtp);
      const nextEmpty = newOtp.findIndex(v => !v);
      const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
      otpRefs[focusIndex].current?.focus();
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
        type: 'email'
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
          setSuccessMsg('✅ Email verified! Now set your new password.');
          setFlowState('RESET_PASSWORD');
          setNewPassword('');
          setLoading(false);
        } else {
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
        let generatedId = 'HR-' + Math.floor(10000 + Math.random() * 90000);
        let finalName = fullName;
        let finalMobile = mobileNumber;

        const testAccounts = {
          'test22@helpriders.com': { uniqueId: 'HR-22000', name: 'Rider TwentyTwo', mobile: '+91 99999 22222' },
          'test24@helpriders.com': { uniqueId: 'HR-24000', name: 'Rider TwentyFour', mobile: '+91 99999 24242' },
          'test26@helpriders.com': { uniqueId: 'HR-26000', name: 'Rider TwentySix', mobile: '+91 99999 26262' },
          'test28@helpriders.com': { uniqueId: 'HR-28000', name: 'Rider TwentyEight', mobile: '+91 99999 28282' },
          'test30@helpriders.com': { uniqueId: 'HR-30000', name: 'Rider Thirty', mobile: '+91 99999 30303' }
        };

        const testAcc = testAccounts[user.email.trim().toLowerCase()];
        if (testAcc) {
          generatedId = testAcc.uniqueId;
          finalName = testAcc.name;
          finalMobile = testAcc.mobile;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: email.trim().toLowerCase(),
            mobile: finalMobile,
            name: finalName,
            level: 'Rookie Rider',
            unique_id: generatedId
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Failed to create profile:', profileError.message);
        }

        completeLoginFlow(user, finalMobile, finalName, 'Rookie Rider', generatedId);
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
          .select('mobile, name, level, unique_id')
          .eq('id', user.id)
          .maybeSingle();

        let uniqueId = profile?.unique_id;
        let mobile = profile?.mobile || user.user_metadata?.mobile || '';
        let name = profile?.name || user.user_metadata?.full_name || user.email.split('@')[0];
        let level = profile?.level || 'Rookie Rider';

        const testAccounts = {
          'test22@helpriders.com': { uniqueId: 'HR-22000', name: 'Rider TwentyTwo', mobile: '+91 99999 22222' },
          'test24@helpriders.com': { uniqueId: 'HR-24000', name: 'Rider TwentyFour', mobile: '+91 99999 24242' },
          'test26@helpriders.com': { uniqueId: 'HR-26000', name: 'Rider TwentySix', mobile: '+91 99999 26262' },
          'test28@helpriders.com': { uniqueId: 'HR-28000', name: 'Rider TwentyEight', mobile: '+91 99999 28282' },
          'test30@helpriders.com': { uniqueId: 'HR-30000', name: 'Rider Thirty', mobile: '+91 99999 30303' }
        };

        const testAcc = testAccounts[user.email.trim().toLowerCase()];
        if (testAcc) {
          uniqueId = testAcc.uniqueId;
          name = testAcc.name;
          mobile = testAcc.mobile;
        }

        if (!profile) {
          if (!uniqueId) {
            uniqueId = 'HR-' + Math.floor(10000 + Math.random() * 90000);
          }
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            mobile: mobile,
            name: name,
            level: level,
            unique_id: uniqueId
          });
        } else {
          if (testAcc && (profile.unique_id !== uniqueId || profile.name !== name || profile.mobile !== mobile)) {
            await supabase
              .from('profiles')
              .update({ unique_id: uniqueId, name: name, mobile: mobile })
              .eq('id', user.id);
          } else if (!uniqueId) {
            uniqueId = 'HR-' + Math.floor(10000 + Math.random() * 90000);
            await supabase.from('profiles').update({ unique_id: uniqueId }).eq('id', user.id);
          }
        }

        completeLoginFlow(user, mobile, name, level, uniqueId);
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
  const completeLoginFlow = (user, mobile, name, level = 'Rookie Rider', uniqueId = '') => {
    const userData = {
      uid: user.id,
      phone: mobile,
      email: user.email,
      authenticated: true,
      level: level,
      joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      displayName: name || user.email.split('@')[0],
      uniqueId: uniqueId
    };
    
    if (rememberMe) {
      localStorage.setItem('helpriders_session', JSON.stringify(userData));
    } else {
      sessionStorage.setItem('helpriders_session', JSON.stringify(userData));
    }
    
    onLoginSuccess(userData);
  };

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
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
                flex: 1, padding: '10px 12px', fontSize: '13px', fontWeight: 'bold',
                borderRadius: '10px', border: 'none', cursor: 'pointer',
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
                flex: 1, padding: '10px 12px', fontSize: '13px', fontWeight: 'bold',
                borderRadius: '10px', border: 'none', cursor: 'pointer',
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

            {/* Email */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Mail size={16} style={iconAbsStyle} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputStyle}
                required
              />
            </div>

            {/* Password */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Lock size={16} style={iconAbsStyle} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputStyleWithRight}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setRememberMe(!rememberMe)}>
              <input type="checkbox" checked={rememberMe} onChange={() => {}} style={{ cursor: 'pointer', accentColor: 'var(--primary)' }} />
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Remember my session</span>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? (
                <div style={{ width: '18px', height: '18px', border: '3px solid transparent', borderTopColor: '#fff', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>

            <div style={{ textAlign: 'center', fontSize: '12px' }}>
              <button type="button" onClick={handleForgotPassword} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
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
              <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px', margin: 0 }}>Create a new account with email, mobile, and password.</p>
            </div>

            {/* Full Name */}
            <div style={{ position: 'relative', width: '100%' }}>
              <User size={16} style={iconAbsStyle} />
              <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => { setFullName(e.target.value); setError(''); }} onFocus={handleFocus} onBlur={handleBlur} style={inputStyle} required />
            </div>

            {/* Email */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Mail size={16} style={iconAbsStyle} />
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} onFocus={handleFocus} onBlur={handleBlur} style={inputStyle} required />
            </div>

            {/* Mobile */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Phone size={16} style={iconAbsStyle} />
              <input type="tel" placeholder="Mobile Number (e.g. 9876543210)" value={mobileNumber} onChange={(e) => { setMobileNumber(e.target.value.replace(/\D/g, '')); setError(''); }} onFocus={handleFocus} onBlur={handleBlur} style={inputStyle} required />
            </div>

            {/* Password */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Lock size={16} style={iconAbsStyle} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Choose Password (exactly 6 chars)"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputStyleWithRight}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? (
                <div style={{ width: '18px', height: '18px', border: '3px solid transparent', borderTopColor: '#fff', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
              ) : (
                <>Register Account <ArrowRight size={16} /></>
              )}
            </button>
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

            {/* OTP Boxes — rendered inline, NOT as a sub-component */}
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
                  style={otpBoxStyle(!!digit)}
                />
              ))}
            </div>

            {loading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '24px', height: '24px', border: '3px solid transparent', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'dash 1s linear infinite', margin: '0 auto' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '8px' }}>Verifying...</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <button type="button" onClick={() => { setFlowState('SIGN_UP'); setError(''); setSuccessMsg(''); }} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.3)', padding: 0, fontSize: '12px' }}>
                ← Back
              </button>
              {timer > 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>Resend in {timer}s</span>
              ) : (
                <button type="button" onClick={handleResendOtp} disabled={loading} style={{ color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                  Resend Code
                </button>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              💡 <strong>Tip:</strong> Check your inbox & spam folder. You can also paste the full code.
            </div>
          </div>
        )}

        {/* ═══════ FLOW D: FORGOT_OTP ═══════ */}
        {flowState === 'FORGOT_OTP' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '17px', color: 'var(--text-primary)', marginBottom: '4px' }}>Password Recovery</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                Enter the 6-digit recovery code sent to<br/>
                <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{email}</span>
              </p>
            </div>

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
                  style={otpBoxStyle(!!digit)}
                />
              ))}
            </div>

            {loading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '24px', height: '24px', border: '3px solid transparent', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'dash 1s linear infinite', margin: '0 auto' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '8px' }}>Verifying...</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <button type="button" onClick={() => { setFlowState('SIGN_IN'); setError(''); setSuccessMsg(''); }} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.3)', padding: 0, fontSize: '12px' }}>
                ← Back to Sign In
              </button>
              {timer > 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>Resend in {timer}s</span>
              ) : (
                <button type="button" onClick={handleResendOtp} disabled={loading} style={{ color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                  Resend Code
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════ FLOW E: CREATE_PASSWORD ═══════ */}
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

            <div style={{ position: 'relative', width: '100%' }}>
              <Lock size={16} style={iconAbsStyle} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create Account Password (exactly 6 chars)"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputStyleWithRight}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

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
                <>Complete Registration <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        )}

        {/* ═══════ FLOW F: RESET_PASSWORD ═══════ */}
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

            <div style={{ position: 'relative', width: '100%' }}>
              <Lock size={16} style={iconAbsStyle} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password (exactly 6 chars)"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputStyleWithRight}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

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
                <>Save New Password <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        )}

      </div>

      {/* Contact Developer */}
      <div className="glass-panel" style={{ padding: '16px', margin: '0 0 16px 0', border: '1px solid rgba(255,170,0,0.15)', flexShrink: 0 }}>
        <h4 style={{ fontSize: '15px', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Headphones size={16} color="#ffaa00" /> Contact Developer
        </h4>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
          Need help? Search Admin in the request bar after logging in, or reach out to the developer directly below.
        </p>

        {!showDevForm && !devSent ? (
          <button 
            type="button"
            onClick={() => setShowDevForm(true)}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #ffaa00, #ff7700)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Headphones size={14} /> Contact Developer
          </button>
        ) : devSent ? (
          <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
            <strong style={{ color: '#22c55e', fontSize: '13px', display: 'block' }}>Message Sent!</strong>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '4px 0 0' }}>Our team will contact you soon.</p>
            <button type="button" onClick={() => { setDevSent(false); setDevName(''); setDevMobile(''); setShowDevForm(true); }} style={{ marginTop: '10px', fontSize: '11px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Send another message
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              
              const cleanPhone = devMobile.replace(/\D/g, '');
              const indianPhoneRegex = /^[6-9]\d{9}$/;
              if (!indianPhoneRegex.test(cleanPhone)) {
                setDevError('⚠️ Please enter a valid 10-digit Indian phone number.');
                return;
              }

              if (new Set(cleanPhone).size === 1) {
                setDevError('⚠️ Repeated/fancy phone numbers are not allowed.');
                return;
              }

              // Check local storage daily limit
              const lastContact = localStorage.getItem('helpriders_last_dev_contact');
              let isLimitExceeded = false;
              if (lastContact) {
                const timeDiff = Date.now() - parseInt(lastContact, 10);
                if (timeDiff < 24 * 60 * 60 * 1000) {
                  isLimitExceeded = true;
                }
              }

              if (isLimitExceeded) {
                setDevSent(true);
                return;
              }

              try {
                const { error } = await supabase.from('dev_contacts').insert({
                  name: devName.trim(), 
                  mobile: devMobile.trim(),
                  email: 'Guest User (Not Logged In)', 
                  user_id: null, 
                  is_read: false
                });
                if (error) { 
                  setDevError('⚠️ Could not send message. Please try again.'); 
                  return; 
                }
                
                // Save last submission timestamp
                localStorage.setItem('helpriders_last_dev_contact', Date.now().toString());
                setDevSent(true);
              } catch { 
                setDevError('⚠️ Network error. Please try again.'); 
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            className="animate-zoom-in"
          >
            {devError && (
              <div style={{ color: 'var(--accent)', background: 'rgba(255,34,51,0.1)', border: '1px solid rgba(255,34,51,0.2)', padding: '8px 10px', borderRadius: '8px', fontSize: '11px' }}>
                {devError}
              </div>
            )}
            <input type="text" placeholder="Your Full Name" value={devName} onChange={e => { setDevName(e.target.value); setDevError(''); }} required style={inputStyle} />
            <input type="tel" placeholder="Working Mobile Number (10 digits)" value={devMobile} onChange={e => { setDevMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setDevError(''); }} required style={inputStyle} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setShowDevForm(false)} className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '12px' }}>
                Cancel
              </button>
              <button type="submit" style={{ flex: 2, padding: '10px', background: 'linear-gradient(135deg, #ffaa00, #ff7700)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Send size={14} /> Send to Developer
              </button>
            </div>
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
