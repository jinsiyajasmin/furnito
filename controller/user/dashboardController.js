const User = require("../../models/user/userSchema");
const env = require ('dotenv').config;
const bcrypt = require('bcryptjs');
const Product = require('../../models/admin/productSchema'); 
const Address = require('../../models/user/addressSchema')
const Category = require('../../models/admin/categorySchema');
const { userAuth } = require("../../middlewares/auth");






const  getAccountDetails = (req, res) => {
    
    const user = req.session.user; 
    
    res.render('accountDetails', { user });
};

   const getUserDashboard= async (req, res) => {
    try {
        const userId = req.session.user;
      
     
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).send('User not found');
      }
      
        res.render('userDashboard', { user: user });
    } catch (error) {
        console.error('Error loading signup page:', error);
        res.status(500).send('Internal Server Error');
    }
};





const  getUserProfile =async (req, res) => {
    try {
        
      const userId = req.session.user;
      
     
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).send('User not found');
      }
      
     
      res.render('userProfile', { user: user });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).send('Internal Server Error');
    }
};



const updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        
        const user = req.session.user;
        
        const updatedUser = await User.findByIdAndUpdate(user, 
            { name, phone },
            { new: true, runValidators: true }
        );
        
        if (updatedUser) {
            res.json({ success: true, message: 'Profile updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }};

    function validatePassword(password) {
        const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/;
        return regex.test(password);
    }
    
    const changePassword= async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.session.user; 
    
            if (!validatePassword(newPassword)) {
                return res.status(400).json({ success: false, message: 'New password does not meet the requirements' });
            }
    
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
    
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect' });
            }
    
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedNewPassword;
            await user.save();
    
            res.json({ success: true, message: 'Password changed successfully' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };
    const addAddress = async (req, res) => {
        const { name, phone, address, landmark, city, state, pincode } = req.body;
        const userId = req.session.user;
    
        try {
            // Check if required fields are provided
            if (!name || !phone || !address || !city || !state || !pincode) {
                return res.status(400).json({ success: false, message: 'All fields except landmark are required' });
            }
    
            // Validate name: only alphabets and spaces allowed
            const namePattern = /^[A-Za-z\s]+$/;
            if (!namePattern.test(name)) {
                return res.status(400).json({ success: false, message: 'Name must contain only letters and spaces' });
            }
    
            // Validate phone: must start with 8, 9, or 6 and be 10 digits
            const phonePattern = /^[689]\d{9}$/;
            if (!phonePattern.test(phone)) {
                return res.status(400).json({ success: false, message: 'Phone number must start with 8, 9, or 6 and be 10 digits long' });
            }
    
            // Validate pincode: must be a valid 6-digit number
            const pincodePattern = /^\d{6}$/;
            if (!pincodePattern.test(pincode)) {
                return res.status(400).json({ success: false, message: 'Pincode must be a 6-digit number' });
            }
    
           
            const pincodeNum = parseInt(pincode, 6);
            if (isNaN(pincodeNum)) {
                return res.status(400).json({ success: false, message: 'Pincode must be a valid number' });
            }
    
        
            const newAddress = new Address({
                name,
                phone,
                address,
                landmark,
                city,
                state,
                pincode: pincodeNum,
                user_id: userId,
                is_default: false
            });
    
            await newAddress.save();
    
            res.json({ success: true, message: 'Address added successfully' });
        } catch (error) {
            console.error('Error in addAddress:', error);
            res.status(500).json({ success: false, message: 'Error adding address', error: error.message });
        }
    };
    
    
    const  addresses = async (req, res) => {
        const user = req.session.user;
        try {
            const addresses = await Address.find();
           
            res.render('userAddress', {user:user, addresses  });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    };
       const getEditAddress = async (req, res) => {
        const address = await Address.findById(req.params.id);
        if (address) {
            res.json(address);
        } else {
            res.status(404).json({ message: 'Address not found' });
        }
    };
      const editAddress =   async (req, res) => {
     
    
        const { name, phone, address, landmark, city, state, pincode } = req.body;
        console.log(name)
        console.log(req.params.id)
        try {
            const updatedAddress = await Address.findByIdAndUpdate(req.params.id, {
                name,
                phone,
                address,
                landmark,
                city,
                state,
                pincode
            }, { new: true });
    
            console.log('Updated address:', updatedAddress);
    
            if (updatedAddress) {
                res.json({ success: true, message: 'Address updated successfully', address: updatedAddress });
            } else {
                console.log('Address not found');
                res.status(404).json({ success: false, message: 'Address not found' });
            }
        } catch (error) {
            console.error('Error updating address:', error);
            res.status(500).json({ success: false, message: 'Failed to update address', error: error.message });
        }
    };
    
    const deleteAddress = async (req, res) => {
        const addressId = req.params.id;

    
        try {
            const result = await Address.findByIdAndDelete(addressId);
            
            if (result) {
                console.log(`Address deleted successfully: ${result}`);
                res.status(200).json({ success: true, message: 'Address deleted successfully!' });
            } else {
                console.log(`Address with ID ${addressId} not found`);
                res.status(404).json({ success: false, message: 'Address not found' });
            }
        } catch (err) {
            console.error('Error deleting address:', err);
            res.status(500).json({ success: false, message: 'Error deleting address', error: err.message });
        }
    };



    module.exports = {
        getUserProfile,
        getAccountDetails,
        updateProfile,
        changePassword,
        getUserDashboard,
        getEditAddress,
        addresses,
        addAddress ,
        editAddress,
        deleteAddress  
    }