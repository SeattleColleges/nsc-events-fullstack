"use client";

import React, { ChangeEventHandler, FormEventHandler, useState, useEffect } from "react";
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Container, 
  Paper, 
  useMediaQuery, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle,
  InputAdornment,
  IconButton,
  Alert
} from '@mui/material';
import { textFieldStyle } from "@/components/InputFields";
import Image from "next/image";
import { useTheme } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const URL = process.env.NSC_EVENTS_PUBLIC_API_URL || 'http://localhost:3000/api';

const ResetPassword = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { palette } = useTheme();

  const darkImagePath = '/images/white_nsc_logo.png';
  const lightImagePath = '/images/blue_nsc_logo.png';
  const imagePath = palette.mode === "dark" ? darkImagePath : lightImagePath;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Get token from URL params
  const [token, setToken] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // Password form state
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dialog states
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Form validation errors
  const [errors, setErrors] = useState({
    password: "",
    confirmPassword: ""
  });

  // Extract token from URL on component mount
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      setIsValidToken(true); // For now, assume token is valid
    } else {
      setIsValidToken(false);
    }
  }, [searchParams]);

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Validate password form
  const validateForm = () => {
    const newErrors = {
      password: "",
      confirmPassword: ""
    };

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== "");
  };

  // Handle input changes
  const handleChange: ChangeEventHandler<HTMLInputElement> = ({ target }) => {
    const { name, value } = target;
    setFormData({ ...formData, [name]: value });
    
    // Clear errors when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  // Handle form submission
  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // TODO: Implement API call to reset password with token
      const res = await fetch(`${URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      if (res.ok) {
        setMessage("Your password has been reset successfully. You can now sign in with your new password.");
        setIsSuccess(true);
      } else {
        const errorData = await res.json();
        setMessage(errorData.message || "Failed to reset password. The link may be expired or invalid.");
        setIsSuccess(false);
      }
    } catch (error) {
      setMessage("An error occurred while resetting your password. Please try again later.");
      setIsSuccess(false);
    }

    setOpen(true);
  };

  // Handle dialog close
  const handleClose = () => {
    setOpen(false);
    if (isSuccess) {
      router.push('/auth/sign-in');
    }
  };

  // Show error if no token or invalid token
  if (isValidToken === false) {
    return (
      <Container component="main" maxWidth="xs" sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        height: '100vh',
        mt: isMobile ? -16 : isTablet ? -14 : -18
      }}>
        <Paper elevation={6} sx={{ padding: 4, width: '100%', borderRadius: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
            <Image
              src={imagePath}
              alt="North Seattle College Logo"
              width={150}
              height={50}
              style={{ borderRadius: "10px" }}
            />
          </Box>
          <Typography component="h1" variant="h6" textAlign="center" sx={{ mb: 2 }}>
            Reset Password
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            Invalid or missing reset token. Please request a new password reset link.
          </Alert>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => router.push('/auth/forgot-password')}
            sx={{ mt: 2 }}
            style={{ textTransform: 'none' }}
          >
            Request New Reset Link
          </Button>
        </Paper>
      </Container>
    );
  }

  // Show loading state while checking token
  if (isValidToken === null) {
    return (
      <Container component="main" maxWidth="xs" sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        height: '100vh',
        justifyContent: 'center'
      }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container component="main" 
      maxWidth="xs" 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        height: '100vh',
        mt: isMobile ? -16 : isTablet ? -14 : -18
      }}
    >
      <Paper 
        elevation={6} 
        sx={{ 
          padding: 4, 
          width: '100%', 
          borderRadius: 2, 
          mb: 2 
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
          <Image
            src={imagePath}
            alt="North Seattle College Logo"
            width={150}
            height={50}
            style={{ borderRadius: "10px" }}
          />
        </Box>
        <Typography component="h1" variant="h6" textAlign="center" sx={{ mb: 2 }}>
          Reset Password
        </Typography>
        <Typography variant="body2" textAlign="center" sx={{ mb: 3, color: 'text.secondary' }}>
          Enter your new password below
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            label="New Password"
            type={showPassword ? "text" : "password"}
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            error={Boolean(errors.password)}
            helperText={errors.password}
            InputProps={{ 
              style: textFieldStyle.input,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={togglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            InputLabelProps={{ style: textFieldStyle.label }}
          />
          
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm New Password"
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword}
            InputProps={{ 
              style: textFieldStyle.input,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={toggleConfirmPasswordVisibility}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            InputLabelProps={{ style: textFieldStyle.label }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 3, mb: 2 }}
            style={{ textTransform: 'none' }}
          >
            Reset Password
          </Button>
          
          <Box textAlign="center">
            <Button
              variant="text"
              color="primary"
              onClick={() => router.push('/auth/sign-in')}
              style={{ textTransform: 'none' }}
            >
              Back to Sign In
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{isSuccess ? "Success" : "Error"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ResetPassword;