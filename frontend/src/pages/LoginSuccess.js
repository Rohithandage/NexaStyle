import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import api from '../api/api';

const LoginSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const processAuth = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        toast.error('Google authentication failed. Please try again.');
        navigate('/login', { replace: true });
        return;
      }

      if (token) {
        console.log('Token received, processing authentication...');
        
        try {
          // Store the token immediately
          localStorage.setItem('token', token);
          
          // Set the token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Refresh user data in AuthContext
          const result = await refreshUser();
          console.log('User authenticated successfully:', result);
          
          toast.success('Login successful!');
          
          // Navigate to home page after a brief delay
          setTimeout(() => {
            window.location.href = '/'; // Use window.location for full page reload
          }, 500);
        } catch (err) {
          console.error('Error refreshing user:', err);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          toast.error('Failed to authenticate. Please try again.');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 1000);
        }
      } else {
        // No token in URL, redirect to login
        console.warn('No token found in callback URL');
        navigate('/login', { replace: true });
      }
    };

    processAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h2>Completing authentication...</h2>
      <p>Please wait while we log you in.</p>
    </div>
  );
};

export default LoginSuccess;

