const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user/userSchema");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Use GoogleStrategy for Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          if (user) {
            console.log("User found:", user);
            return done(null, user);  
          } else {
            console.log("Creating new user");
            const newUser = new User({
              name: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
            
            });
      
            await newUser.save();
            console.log("New user created:", newUser);
            return done(null, newUser);
          }
        } catch (error) {
          console.error("Error during authentication:", error);
          return done(error, null);  // Log the error
        }
      }
      
  )
);

// Serialize the user to store in the session
passport.serializeUser((user, done) => {
  done(null, user.id); // Store user ID in the session
});

// Deserialize the user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); // Attach user to req.user
  } catch (error) {
    done(error, null); // Handle errors
  }
});

module.exports = passport;
