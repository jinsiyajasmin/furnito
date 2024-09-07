const Customer= require("../models/userSchema");

const customerInfo = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10; // Or whatever limit you want to use
      const skip = (page - 1) * limit;
      
      const customers = await  Customer.find({})
        .select('name email phone googleId is_verified isBlocked createdOn')
        .sort({createdOn:-1})
        .skip(skip)
        .limit(limit);
  
      const totalCustomers = await  Customer.countDocuments({});
      const totalPages = Math.ceil(totalCustomers / limit);
  
      res.render('customers', {
        data: customers,
        currentPage: page,
        totalPages: totalPages
      });
    } catch (error) {
      console.error('Error fetching customer info:', error);
      res.status(500).send('An error occurred while fetching customer information');
    }
  };
  const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await Customer.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect('/admin/users');
    } catch (errors) {
        res.redirect("/pageerror");
    }
};

const customerunBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await Customer.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect('/admin/users');
    } catch (error) {
        res.redirect("/pageerror");
    }
};


  
  module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked
  };