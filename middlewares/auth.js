const User = require ("../models/user/userSchema");
const session = require('express-session');






const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user);
    if (!user || user.isBlocked) {
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
      return res.redirect("/login");
    }

     
    next();
  } catch (error) {
    console.error('Error in user auth middleware:', error);
    res.status(500).send("Internal server error");
  }
};



const adminAuth = async (req, res, next) => {
  try {
   
      if (!req.session.admin || req.session.admin !== process.env.ADMIN_EMAIL) {
          return res.redirect('/admin/login'); 
      }
      next();
  } catch (error) {
      console.error("Error in admin auth middleware:", error);
      return res.status(500).send("Internal Server Error");
  }
};





module.exports = {
    userAuth,
    adminAuth 

}