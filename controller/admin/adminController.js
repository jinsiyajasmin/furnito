const User = require("../../models/user/userSchema");
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');


const pageerror = async (req,res)=>{
    res.render("admin-error")
}


const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }
    res.render("admin-login", { message: null });
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check admin credentials
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            // Store admin details in session
            req.session.admin = email;

            return res.redirect('/admin/dashboard'); // Redirect to the dashboard after successful login
        }

        // Handle incorrect credentials
        return res.status(401).render('admin/login', {
            errorMessage: "Invalid email or password",
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).render('admin/login', {
            errorMessage: "Internal server error",
        });
    }
};


const loadDashboard = async (req,res)=>{
    if(req.session.admin){
        try{
            res.render("dashboard");
        }catch(error){
            res.redirect('/pageerror')
        }
    }
};


const logout = async(req,res)=>{
    try{
        req.session.destroy(err=>{
            if(err){
                console.log('error destroying session');
                return res.redirect('/pageerror')
            }
             res.redirect('/admin/login')
        })
    }catch(error){
        console.log('error logging out',error);
        res.redirect("/pageerror")
    }
}



module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout
}