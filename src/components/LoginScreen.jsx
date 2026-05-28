import React, { useState, useEffect, useRef } from 'react';
import { Phone, Lock, Eye, AlertCircle, ArrowRight, ShieldCheck, Flame, Compass } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '']);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

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
    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    } else if (timer === 0 && interval) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (phoneNumber.length < 8) {
      setError('Please enter a valid mobile number');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setTimer(30);
      // Autofocus first OTP box
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    }, 1200);
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = value.substring(value.length - 1); // Keep last char
    setOtpValues(newOtp);
    setError('');

    // Auto-focus next field
    if (value && index < 3) {
      otpRefs[index + 1].current?.focus();
    }

    // Auto-submit on final digit entered
    if (index === 3 && value) {
      const fullCode = newOtp.join('') + value.substring(value.length - 1);
      checkOtpCode(newOtp.map((v, i) => i === 3 ? value : v).join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace: focus previous field
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const checkOtpCode = (enteredCode) => {
    setLoading(true);
    setTimeout(() => {
      // Allow '1234' or any code for testing comfort, with fallback validation
      if (enteredCode === '1234' || enteredCode.length === 4) {
        const userData = {
          phone: `${countryCode} ${phoneNumber}`,
          authenticated: true,
          level: 'Veteran Biker',
          joined: 'May 2026',
          displayName: 'Rider_' + phoneNumber.slice(-4),
        };
        
        if (rememberMe) {
          localStorage.setItem('helpriders_session', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('helpriders_session', JSON.stringify(userData));
        }
        
        onLoginSuccess(userData);
      } else {
        setLoading(false);
        setError('Incorrect verification code. Hint: Use 1234');
        setOtpValues(['', '', '', '']);
        otpRefs[0].current?.focus();
      }
    }, 1000);
  };

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

  return (
    <div className="login-screen scroll-y" style={{ height: '100%', padding: '30px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(180deg, #0d0d12 0%, #050508 100%)' }}>
      
      {/* Branding and Graphic */}
      <div style={{ textAlign: 'center', marginTop: '40px' }} className="animate-fade-in">
        <div style={{ width: '80px', height: '80px', margin: '0 auto 16px', background: 'rgba(255, 85, 0, 0.1)', border: '1px solid rgba(255, 85, 0, 0.3)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
          <Flame size={44} color="#ff5500" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 85, 0, 0.5))' }} />
        </div>
        <h1 style={{ fontSize: '32px', marginBottom: '8px', fontFamily: 'var(--font-display)', fontWeight: '800', background: 'linear-gradient(90deg, #fff 30%, #ffaa00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          HELPRIDERSS
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          The Ultimate Premium Biker Portal
        </p>
      </div>

      {/* Main Login Card */}
      <div className="glass-panel" style={{ padding: '24px', margin: '30px 0', border: '1px solid var(--glass-border)' }}>
        {!otpSent ? (
          // Mobile number entry state
          <form onSubmit={handleSendOtp} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '-10px' }}>Sign In with Mobile</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>
              We'll send a 4-digit verification code to log in securely.
            </p>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', background: 'rgba(255,34,51,0.1)', border: '1px solid rgba(255,34,51,0.2)', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <select 
                value={countryCode} 
                onChange={(e) => setCountryCode(e.target.value)}
                style={{ width: '85px', padding: '12px 6px', textAlign: 'center', background: '#1c1c24', fontSize: '14px' }}
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
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  style={{ width: '100%', paddingLeft: '44px', fontSize: '15px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setRememberMe(!rememberMe)}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => {}} // Controlled by label click
                style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Remember my session</span>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '16px' }}>
              {loading ? (
                <div style={{ width: '20px', height: '20px', border: '3px solid transparent', borderTopColor: '#fff', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
              ) : (
                <>
                  Send OTP Code <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          // OTP input entry state
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>Verify Code</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>
                Enter the 4-digit code sent to <span style={{ color: 'var(--primary)' }}>{countryCode} {phoneNumber}</span>
              </p>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', background: 'rgba(255,34,51,0.1)', border: '1px solid rgba(255,34,51,0.2)', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '10px 0' }}>
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
                    fontSize: '24px',
                    fontWeight: '800',
                    fontFamily: 'var(--font-display)',
                    border: digit ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                    boxShadow: digit ? '0 0 10px var(--primary-glow)' : 'none',
                    background: '#121217',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <button 
                onClick={() => setOtpSent(false)} 
                style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--text-muted)' }}
              >
                Change number
              </button>

              {timer > 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>Resend in {timer}s</span>
              ) : (
                <button 
                  onClick={() => { setTimer(30); setOtpValues(['','','','']); }} 
                  style={{ color: 'var(--primary)', fontWeight: '600' }}
                >
                  Resend OTP
                </button>
              )}
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
              Test code: Entering "1234" (or any 4 digits) will log you in instantly.
            </p>
          </div>
        )}
      </div>

      {/* Quick Demo Bypass */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button 
          onClick={handleDirectDemoLogin}
          style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)' }}
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
