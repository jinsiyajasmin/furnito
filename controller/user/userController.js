const User = require("../../models/user/userSchema");
const nodemailer = require('nodemailer');
const env = require ('dotenv').config;
const bcrypt = require('bcryptjs');
const Product = require('../../models/admin/productSchema'); 
const Address = require('../../models/user/addressSchema')
const   Offer = require('../../models/admin/offerSchema');
const Category = require('../../models/admin/categorySchema');
const { userAuth } = require("../../middlewares/auth");




const pageNotFound = async(req,res)=>{
    try{
        res.render("page-404")
    }catch(error){
        res.redirect('/pageNotFound');
    }
}

const loadHome = async (req, res) => {
    try {
        const products = await Product.find({status:'active'});
        const categories = await Category.find({isListed:'true'}); 
     
        
        const user = req.session.user;
        if(user){
            const userData = await User.findOne({_id: user});
            res.render('home', {
                user: userData,
                categories,
                products,
              
            });
        } else {
            res.render('home', {
                categories ,
                products,
             
            });
        }
    } catch (error) {
        console.error('Error loading home page:', error);
        res.status(500).send('Internal Server Error');
    }
};

const loadSignup = (req, res) => {
    try {
        res.render('signup');
    } catch (error) {
        console.error('Error loading signup page:', error);
        res.status(500).send('Internal Server Error');
    }
};

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}



async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        console.log(`Sending OTP ${otp} to email ${email}`); 

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Verify your email',
            text: `Your verification code is ${otp}`, 
            html: `<b>Your OTP: ${otp}</b>`, 
        });

        console.log('Message sent: %s', info.messageId);
        return info.accepted.length > 0; 
    } catch (error) {
        console.error('Error sending email:', error);
        if (error.response) {
            console.error('SMTP response:', error.response); 
        }
        console.error('Detailed error:', error.message); 
        return false;
    }
}


const signup = async (req, res) => {
    try {
        const { name, phone, email, password, Cpassword } = req.body;

        if (password !== Cpassword) {
            return res.status(400).json({ msg: "Password and Confirm Password don't match" });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.status(400).json({ msg: "Email already exists" });
        }
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.status(400).json({ msg: "Failed to send email" });
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };
        res.render('verify-otp');
        console.log("OTP Sent ", otp);
    } catch (error) {
        console.error("signup error", error);
        res.redirect("/pageNotFound");
    }
};

const securePassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error("Failed to secure password");
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
       

        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);
            const saveUserData = new User({
                name: user.name,
                phone: user.phone,
                email: user.email,
                password: passwordHash
                
            });
            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({ success: true, redirectUrl: "/" });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP. Please try again" });
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const resendOtp = async (req, res) => {
    try {
       
        if (!req.session.userData || !req.session.userData.email) {
            console.error('User data not found in session.');
            return res.status(400).json({ success: false, message: "User data not found" });
        }

       
        const newOtp = generateOtp();
        console.log(`Generated OTP: ${newOtp} for email: ${req.session.userData.email}`); // Debugging

      
        const emailSent = await sendVerificationEmail(req.session.userData.email, newOtp);

        if (emailSent) {
          
            req.session.userOtp = newOtp;
            console.log('OTP resent successfully.');
            return res.json({ success: true, message: "OTP resent successfully" });
        } else {
            console.error('Failed to send OTP email.');
            return res.status(500).json({ success: false, message: "Failed to resend OTP" });
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({ success: false, message: "An error occurred while resending OTP" });
    }
};

const loadLogin = async (req,res) => {
    try {
        if(!req.session.user){
            return res.render("login")
        } else {
            res.redirect("/")
        }
    } catch(error) {
        res.redirect("/pageNotFound")
    }
}


const login = async (req, res) => {
    try {
        
        const { email, password } = req.body;

        const user = await User.findOne({ email });
     

        if (!user) {
            return res.render('login', { message: "Invalid email or password" });
        }

        
        if (user.isBlocked) {
            return res.render('login', { message: "Your account is blocked" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { message: "Invalid email or password" });
        }

      
        req.session.user = user._id;
     
        res.redirect('/');
    } catch (error) {
        console.error("Error logging in user", error);
        res.render('login', { message: "An error occurred while logging in" });
    }
};

const logout = async (req,res)=>{
    try{
        req.session.destroy((err)=>{
            if(err){
                console.error("Error logging out user", err.message);
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/login")
        });
    }catch(error){
        console.error("Error logging out user", error.message);
        res.redirect("/pageNotFound")
    }
};



const getProductList = async (req, res) => {
    try {
        const products = await Product.find({status:'active'});
        const categories = await Category.find(); 
        const user = req.session.user;
       
        const userId = req.session.user;
        
        
        let userData = null;
        if (userId) {
            userData = await User.findById(userId);
        }
   
        
        res.render('productList', { products, categories, user:userData});
    } catch (error) {
        console.error('Error fetching product list or categories:', error);
        res.status(500).send('Internal Server Error');
    }
};
   const getProductDetails = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findById( user);
        const productId = req.params.id;
        const product = await Product.findById(productId).populate('Category');
        const allProductData = await Product.find();

        if (!product) {
            return res.status(404).render('404', { message: 'Product not found' });
        }
        
       
        res.render('productDetails', { userData,productData:product, allProductData  });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).render('500', { message: 'Server error' });
    }
};
   const   getCategory = async (req,res)=>{
    try {
        if(!req.session.user){
            return res.render("categoryList")
        } 
         else {
            res.redirect("/")
        }

    } catch(error) {
        res.redirect("/pageNotFound")
    }
}

   
const filterProducts = async (req, res) => {
    try {
        const {
            sort = 'name_asc',
            category = '',
            minPrice,
            maxPrice,
            search = ''
        } = req.query;

        // Filter query object
        const filterQuery = {};

        // Add category filter
        if (category) {
            filterQuery.category = { $in: category.split(',') };
        }

        // Add price range filter
        if (minPrice || maxPrice) {
            filterQuery.price = {};
            if (minPrice) filterQuery.price.$gte = parseFloat(minPrice);
            if (maxPrice) filterQuery.price.$lte = parseFloat(maxPrice);
        }

        // Add search filter
        if (search) {
            filterQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Sort options
        const sortOptions = {
            name_asc: { name: 1 },
            name_desc: { name: -1 },
            price_asc: { price: 1 },
            price_desc: { price: -1 },
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
        };

        const sortQuery = sortOptions[sort] || { name: 1 };

        // Fetch filtered and sorted products
        const products = await Product.find(filterQuery).sort(sortQuery);

        res.json({
            products,
            pagination: {
                visibleCount: products.length,
                totalCount: await Product.countDocuments()
            },
            appliedFilters: {
                sort,
                category,
                minPrice,
                maxPrice,
                search
            }
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const searchProducts =  async (req, res) => {
    const query = req.query.q || ''; // Get the search query from the request
    try {
        // Search for products by name (or other fields you want to search by)
        const products = await Product.find({
            name: { $regex: query, $options: 'i' } // Case-insensitive search
        });

        // Render a page with the search results
        res.render('search-results', { products }); // Adjust view as necessary
    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred while searching.');
    }
};










   

module.exports = {
    loadHome,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    pageNotFound,
    login,
    logout,
    getProductList,
    getProductDetails,
    filterProducts,
    getCategory,
    searchProducts
   
    
};