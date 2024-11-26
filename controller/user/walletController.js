const Wallet = require('../../models/user/userWallet');
const User = require('../../models/user/userSchema');
const mongoose = require('mongoose')

const loadWallet = async(req,res)=>{
    try {

        const [walletData, userData] = await Promise.all([
            Wallet.aggregate([
              { $match: { user_id: new mongoose.Types.ObjectId(req.session.user) } },
              { $unwind: "$history" },
              { $sort: { "history.date": -1 } },
              { $group: {
                _id: "$_id",
                user_id: { $first: "$user_id" },
                balance: { $first: "$balance" },
                history: { $push: "$history" }
              }}
            ]),
            User.findById(req.session.user)
          ]);

          
          
       
        
        res.render('wallet',{wallet:walletData,user:userData})
    } catch (error) {
        
    }
}

module.exports = {
    loadWallet
};