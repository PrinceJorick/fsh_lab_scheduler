# FSH Lab Scheduler - Refactored

## Overview
A laboratory scheduling system for Fidelis Senior High School with authentication, password recovery, and dashboard functionality.

## Features

### Authentication
- **Email/Password Login**: Secure login with school email validation
- **Sign Up**: New user registration with password confirmation
- **Google Sign-In**: OAuth integration for seamless authentication
- **Forgot Password**: OTP-based password recovery via email
- **Role Selection**: Teacher/Admin role assignment

### Password Recovery Flow
1. User clicks "Forgot password?" on login screen
2. Enter email address
3. Receive 6-digit OTP code (simulated via console/alert in development)
4. Verify OTP code
5. Create new password
6. Login with new credentials

### Security Features
- Email domain validation (@firstasia.edu.ph)
- Password strength requirements (minimum 6 characters)
- OTP expiration (5 minutes)
- Input validation and error handling
- localStorage-based user management

## File Structure

```
fsh-lab-scheduler/
├── index.html              # Main landing/authentication page
├── dashboard.html          # Laboratory selection dashboard
├── auth.js                 # Authentication logic (login, signup, password recovery)
├── ui.js                   # UI management and view transitions
├── google-auth.js          # Google OAuth integration
├── style.css               # All styling and responsive design
└── README.md              # This file
```

## Code Organization

### auth.js
Handles all authentication-related logic:
- Role selection
- Login validation
- Signup flow (email → password)
- Forgot password (email → OTP → new password)
- OTP generation and verification
- User data management (localStorage)
- Input validation utilities

### ui.js
Manages user interface and view transitions:
- View navigation system
- Password visibility toggle
- Form input management
- Dashboard initialization
- Error state management

### google-auth.js
Google Sign-In integration:
- JWT token decoding
- Domain validation
- Google button initialization
- OAuth callback handling

### style.css
Comprehensive styling:
- Split-screen layout (content + image)
- Responsive design (mobile-first)
- Form styling and animations
- Dashboard grid layout
- Error states and feedback

## Views

1. **Selection View**: Choose Teacher or Admin role
2. **Login View**: Email/password authentication
3. **Signup View**: New account email entry
4. **Signup Password View**: Password creation
5. **Forgot Password View**: Email entry for recovery
6. **OTP View**: Verification code entry
7. **Reset Password View**: New password creation
8. **Dashboard**: Laboratory selection grid

## Usage

### Development Setup
1. Place all files in the same directory
2. Ensure `../public/` directory contains required images:
   - fsh_logo_black.png
   - nsc_bldg.png
   - Computer_Laboratory.jpg
   - General_Science_Laboratory.jpg
   - Clinical_Laboratory.jpg
   - Physics_Laboratory.jpg

3. Open `index.html` in a web browser

### Production Deployment
For production use, replace the simulated OTP system with actual email service:

```javascript
// In auth.js, replace this section in sendOTP():
console.log(`OTP for ${email}: ${otp}`);
alert(`Your verification code is: ${otp}\n\n(In production, this would be sent to your email)`);

// With actual email service:
await sendEmailOTP(email, otp);
```

## Email Service Integration

To integrate with a real email service (e.g., SendGrid, AWS SES, Mailgun):

```javascript
async function sendEmailOTP(email, otp) {
    try {
        const response = await fetch('YOUR_EMAIL_API_ENDPOINT', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: email,
                subject: 'FSH Lab Scheduler - Password Reset Code',
                html: `
                    <h2>Password Reset Request</h2>
                    <p>Your verification code is: <strong>${otp}</strong></p>
                    <p>This code will expire in 5 minutes.</p>
                `
            })
        });
        
        return response.ok;
    } catch (error) {
        console.error('Email send failed:', error);
        return false;
    }
}
```

## Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design included

## Security Notes

### Current Implementation (Development)
- User data stored in localStorage
- OTP displayed in console/alert
- Client-side validation only

### Production Recommendations
1. **Backend API**: Implement server-side authentication
2. **Database**: Use secure database for user management
3. **Email Service**: Integrate real email provider
4. **HTTPS**: Deploy with SSL certificate
5. **Rate Limiting**: Implement OTP request limits
6. **Password Hashing**: Use bcrypt or similar
7. **Session Management**: Implement JWT or session tokens
8. **CSRF Protection**: Add CSRF tokens
9. **Input Sanitization**: Server-side validation

## Customization

### Styling
All visual elements are in `style.css`. Key variables:
- Primary color: `#081316` (black)
- Accent color: `#707475` (gray)
- Error color: `#ff4d4d` (red)
- Border radius: `30px` (cards), `50px` (buttons/inputs)

### Email Domain
Change the required email domain in `auth.js`:
```javascript
function validateEmailDomain(email) {
    return email.endsWith('@yourdomain.edu');
}
```

### OTP Settings
Modify OTP expiration in `auth.js`:
```javascript
otpData = {
    email: email,
    code: otp,
    timestamp: Date.now(),
    expiresIn: 10 * 60 * 1000 // Change to 10 minutes
};
```

## Troubleshooting

### "Access Denied: Use school email"
- Ensure email ends with @firstasia.edu.ph
- Check for typos in email address

### Password toggle icon not showing
- Icon appears only when password field has content
- Check that Font Awesome CSS is loaded

### Google Sign-In not working
- Verify Google Client ID is correct
- Check that domain is authorized in Google Console
- Ensure google-auth.js is loaded

### OTP not working
- Check browser console for OTP code (development mode)
- Verify OTP hasn't expired (5 minute limit)
- Ensure correct email was entered

## Future Enhancements
- Backend API integration
- Real email service for OTP
- Laboratory booking system
- Admin panel for lab management
- Calendar integration
- Booking history
- User profile management
- Multi-language support

## License
Proprietary - Fidelis Senior High School

## Support
For issues or questions, contact the IT department.
