import React, { useState, useEffect, useRef } from 'react';
import { Phone, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Flame, Compass } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
  // Flow states: 'PHONE_ENTRY' | 'PASSWORD_ENTRY' | 'OTP_VERIFY' | 'CREATE_PASSWORD'
  const [flowState, setFlowState] = useState('PHONE_ENTRY');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '']);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Seed default registered users in localStorage if they don't exist
  const getRegisteredUsers = () => {
    const users = localStorage.getItem('helpriders_registered_users');
    if (users) {
      try {
        return JSON.parse(users);
      } catch (e) {
        return {};
      }
    }
    // Default demo user seed
    const defaultUsers = {
      '+919876543210': 'rider123'
    };
    localStorage.setItem('helpriders_registered_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  };

  const [registeredUsers, setRegisteredUsers] = useState(getRegisteredUsers());

  // Auto-login check on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('helpriders_session');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.authenticated) {
          setLoading(true);
          setTimeout(() => {
            onLoginSuccess(parsed);
          }, 800);
        }
      } catch (e) {
        localStorage.removeItem('helpriders_session');
      }
    }
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

  const getFullPhoneNumber = () => {
    const cleanNum = phoneNumber.replace(/\D/g, '');
    return `${countryCode}${cleanNum}`;
  };

  // 1. Phone number submit handler
  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    const cleanNum = phoneNumber.replace(/\D/g, '');
    if (cleanNum.length < 8) {
      setError('Please enter a valid mobile number');
      return;
    }
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const fullNum = getFullPhoneNumber();
      
      if (registeredUsers[fullNum]) {
        // User exists: request password directly
        setFlowState('PASSWORD_ENTRY');
      } else {
        // First-time user: send OTP
        setFlowState('OTP_VERIFY');
        setTimer(30);
        setOtpValues(['', '', '', '']);
        setTimeout(() => otpRefs[0].current?.focus(), 100);
      }
    }, 1000);
  };

  // 2. Password submit handler for returning users
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password');
      return;
    }
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const fullNum = getFullPhoneNumber();
      const correctPassword = registeredUsers[fullNum];

      if (password === correctPassword) {
        // Login success
        completeLoginFlow(fullNum);
      } else {
        setError('Incorrect password. Please try again.');
      }
    }, 900);
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
      // Mock code verification (e.g. 1234 or any 4 digit matching)
      if (enteredCode === '1234' || enteredCode.length === 4) {
        const fullNum = getFullPhoneNumber();
        if (registeredUsers[fullNum]) {
          // If returning user bypassed with OTP verification directly
          completeLoginFlow(fullNum);
        } else {
          // First time user: proceed to create a password
          setFlowState('CREATE_PASSWORD');
          setNewPassword('');
          setLoading(false);
        }
      } else {
        setLoading(false);
        setError('Incorrect verification code. Hint: Use 1234');
        setOtpValues(['', '', '', '']);
        otpRefs[0].current?.focus();
      }
    }, 1000);
  };

  // 4. Create Password submit handler for new registration
  const handleCreatePassword = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const fullNum = getFullPhoneNumber();
      
      // Save new user credentials locally
      const updatedUsers = { ...registeredUsers, [fullNum]: newPassword };
      setRegisteredUsers(updatedUsers);
      localStorage.setItem('helpriders_registered_users', JSON.stringify(updatedUsers));

      // Successfully sign in
      completeLoginFlow(fullNum);
    }, 1000);
  };

  // Finish verification and login
  const completeLoginFlow = (fullNum) => {
    const cleanNumDisplay = fullNum.substring(0, 3) + ' ' + fullNum.substring(3);
    const userData = {
      phone: cleanNumDisplay,
      authenticated: true,
      level: 'Rookie Rider',
      joined: 'May 2026',
      displayName: 'Rider_' + fullNum.slice(-4),
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
        authenticated: true,
        level: 'Apex Rider',
        joined: 'Jan 2026',
        displayName: 'GhostRider',
      };
      localStorage.setItem('helpriders_session', JSON.stringify(userData));
      onLoginSuccess(userData);
    }, 800);
  };

  // Send an OTP directly from password screen as bypass
  const handleBypassWithOtp = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFlowState('OTP_VERIFY');
      setTimer(30);
      setOtpValues(['', '', '', '']);
      setError('');
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    }, 600);
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

        {/* FLOW 1: PHONE_ENTRY */}
        {flowState === 'PHONE_ENTRY' && (
          <form onSubmit={handlePhoneSubmit} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>Sign In / Register</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px', lineHeight: '1.4' }}>
                New users verify with OTP then set a password. Returning users log in directly via password.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                value={countryCode} 
                onChange={(e) => setCountryCode(e.target.value)}
                style={{ width: '85px', padding: '12px 6px', textAlign: 'center', background: '#1c1c24', fontSize: '14px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white' }}
              >
                <option value="+91">🇮🇳 +91</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+971">🇦🇪 +971</option>
              </select>
              <div style={{ position: 'relative', flex: 1 }}>
                <Phone size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value.replace(/\D/g, '')); setError(''); }}
                  style={{ width: '100%', paddingLeft: '44px', fontSize: '15px', background: '#1c1c24', color: 'white', height: '48px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setRememberMe(!rememberMe)}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => {}}
                style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Keep me logged in</span>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? (
                <div style={{ width: '18px', height: '18px', border: '3px solid transparent', borderTopColor: '#fff', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
              ) : (
                <>
                  Continue <ArrowRight size={16} />
                </>
              )}
            </button>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Default Test Account: **+91 9876543210** (Password: **rider123**)
            </p>
          </form>
        )}

        {/* FLOW 2: PASSWORD_ENTRY */}
        {flowState === 'PASSWORD_ENTRY' && (
          <form onSubmit={handlePasswordSubmit} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>Welcome Back</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                Enter password for <strong style={{ color: 'white' }}>{countryCode} {phoneNumber}</strong>
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Account Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                style={{ width: '100%', paddingLeft: '44px', paddingRight: '40px', fontSize: '14px', background: '#1c1c24', color: 'white', height: '48px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
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
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginTop: '4px' }}>
              <button 
                type="button"
                onClick={() => setFlowState('PHONE_ENTRY')} 
                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.3)', padding: 0 }}
              >
                Change number
              </button>
              <button 
                type="button"
                onClick={handleBypassWithOtp} 
                style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Forgot? Login via OTP
              </button>
            </div>
          </form>
        )}

        {/* FLOW 3: OTP_VERIFY */}
        {flowState === 'OTP_VERIFY' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>Verify OTP</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px', lineHeight: '1.4' }}>
                We've sent a 4-digit code to <span style={{ color: 'var(--primary)' }}>{countryCode} {phoneNumber}</span>
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
                onClick={() => setFlowState('PHONE_ENTRY')} 
                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.3)', padding: 0 }}
              >
                Change number
              </button>

              {timer > 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>Resend in {timer}s</span>
              ) : (
                <button 
                  type="button"
                  onClick={() => { setTimer(30); setOtpValues(['','','','']); setError(''); }} 
                  style={{ color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Resend OTP
                </button>
              )}
            </div>

            <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
              Mock Verification Code: Enter **1234** (or any 4 numbers) to verify.
            </p>
          </div>
        )}

        {/* FLOW 4: CREATE_PASSWORD */}
        {flowState === 'CREATE_PASSWORD' && (
          <form onSubmit={handleCreatePassword} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>Create Password</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                Set a secure password for <strong style={{ color: 'white' }}>{countryCode} {phoneNumber}</strong> to log in easily next time.
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Choose Account Password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                style={{ width: '100%', paddingLeft: '44px', paddingRight: '40px', fontSize: '14px', background: '#1c1c24', color: 'white', height: '48px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
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
                  Register & Log In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

      </div>

      {/* Bypass / Secondary Actions */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button 
          onClick={handleDirectDemoLogin}
          style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <ShieldCheck size={16} color="#ffaa00" />
          <span>Bypass with Demo Biker Session</span>
        </button>
        <p style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)' }}>
          By logging in, you agree to ride responsibly and wear protective gear.
        </p>
      </div>

    </div>
  );
}
