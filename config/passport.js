const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user/userCredentials");
const dotenv = require("dotenv");


dotenv.config();


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
            user_name: profile.displayName,
            email_address: profile.emails[0].value,
            googleId: profile.id,
            is_valid: true,
            is_block: false,
          });

          await newUser.save();
          console.log("New user created:", newUser);
          return done(null, newUser);
        }
      } catch (error) {
        console.error("Error during authentication:", error);
        return done(error, null);
      }
    }
  )
);



passport.serializeUser((user, done) => {
  done(null, user.id); 
});


passport.deserializeUser(async (id, done) => {
  try {
    const user = await Users.findById(id);
    done(null, user); 
  } catch (error) {
    done(error, null); 
  }
});

module.exports = passport;
