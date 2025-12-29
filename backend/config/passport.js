const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Get the base URL for OAuth callback
const getCallbackURL = () => {
  // Check if BACKEND_URL is set, otherwise use defaults
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL}/api/auth/google/callback`;
  }
  
  // Use production URL if NODE_ENV is production
  if (process.env.NODE_ENV === 'production') {
    return 'https://nexastyle1.onrender.com/api/auth/google/callback';
  }
  
  // Default to localhost for development
  return 'http://localhost:5000/api/auth/google/callback';
};

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: getCallbackURL()
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      return done(null, user);
    }

    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      user.googleId = profile.id;
      user.avatar = profile.photos[0].value;
      await user.save();
      return done(null, user);
    }

    user = new User({
      name: profile.displayName,
      email: profile.emails[0].value,
      googleId: profile.id,
      avatar: profile.photos[0].value
    });
    
    await user.save();
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}
));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});


