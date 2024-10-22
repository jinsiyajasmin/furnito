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
        
        const admin = await User.findOne({ email, isAdmin: true });
        
        if (!admin) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (passwordMatch) {
            req.session.admin = admin._id; 
            res.redirect('/admin/dashboard')
        } else {
            res.redirect('/admin/login')
        }
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal server error" });
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