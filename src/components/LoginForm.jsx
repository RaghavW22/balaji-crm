import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, KeyRound, ShieldAlert, CheckCircle2, ArrowLeft } from 'lucide-react';
import { loginUser, resetUserPassword } from '../firebaseConfig';

const LoginForm = ({ onLoginSuccess }) => {
  // Mode: 'login' | 'forgot_password'
  const [viewMode, setViewMode] = useState('login');
  
  // Pre-fill remembered email if saved in localStorage
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('remembered_email') || '';
  });
  
  const [password, setPassword] = useState('');
  
  // Remember Me checkbox state (restores saved preference or defaults to true if email exists)
  const [rememberMe, setRememberMe] = useState(() => {
    const savedFlag = localStorage.getItem('remember_me_checked');
    if (savedFlag !== null) {
      return savedFlag === 'true';
    }
    return Boolean(localStorage.getItem('remembered_email'));
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // UI Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Login Submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter your registered email address and password.');
      return;
    }

    setIsLoading(true);

    const result = await loginUser(email, password, rememberMe);
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg('Login successful!');
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } else {
      setErrorMsg(result.error);
    }
  };

  // Handle Forgot Password Submission
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!resetEmail.trim()) {
      setErrorMsg('Please enter your email address to receive password reset instructions.');
      return;
    }

    setIsLoading(true);

    const result = await resetUserPassword(resetEmail);
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg(result.message);
    } else {
      setErrorMsg(result.error);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card-wrapper">
        <div className="glass-card">
          
          {/* LOGIN VIEW */}
          {viewMode === 'login' && (
            <>
              <div className="auth-header">
                <h2 className="auth-title">Welcome to Balaji CRM</h2>
                <p className="auth-subtitle">Customer Relationship Management</p>
              </div>

              {/* Admin Access Restriction Notice (Strictly NO SIGNUP) */}
              <div className="admin-notice-banner">
                <ShieldAlert size={18} className="admin-notice-icon" />
                <div className="admin-notice-text">
                  <strong>Authorized Access Only:</strong> Account creation is managed exclusively by system administrators. Initial login credentials are issued directly.
                </div>
              </div>

              {/* Success Alert */}
              {successMsg && (
                <div className="alert-box success">
                  <CheckCircle2 size={18} />
                  <div>{successMsg}</div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="alert-box error">
                  <ShieldAlert size={18} />
                  <div>{errorMsg}</div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit}>
                {/* Email Input */}
                <div className="form-group">
                  <label className="form-label" htmlFor="user-email">Email Address</label>
                  <div className="input-container">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="user-email"
                      type="email"
                      className="form-input"
                      placeholder="admin@balajicrm.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="form-group">
                  <label className="form-label" htmlFor="user-password">Password</label>
                  <div className="input-container">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="user-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input has-end-icon"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="input-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide Password" : "Show Password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Options Row (Remember Me & Forgot Password) */}
                <div className="form-options-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember Me</span>
                  </label>

                  <button
                    type="button"
                    className="forgot-link"
                    onClick={() => {
                      setViewMode('forgot_password');
                      setErrorMsg('');
                      setSuccessMsg('');
                      setResetEmail(email);
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit Button */}
                <button type="submit" className="btn-primary" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Log In</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {viewMode === 'forgot_password' && (
            <>
              <div className="auth-header">
                <h2 className="auth-title">Reset Password</h2>
                <p className="auth-subtitle">Enter your registered email address to receive password recovery instructions.</p>
              </div>

              {/* Success Alert */}
              {successMsg && (
                <div className="alert-box success">
                  <CheckCircle2 size={18} />
                  <div>{successMsg}</div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="alert-box error">
                  <ShieldAlert size={18} />
                  <div>{errorMsg}</div>
                </div>
              )}

              <form onSubmit={handleForgotSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-email">Registered Email Address</label>
                  <div className="input-container">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="reset-email"
                      type="email"
                      className="form-input"
                      placeholder="admin@balajicrm.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginBottom: '1rem' }}>
                  {isLoading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={18} />
                      <span>Send Recovery Instructions</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setViewMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Login</span>
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginForm;
