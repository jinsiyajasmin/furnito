const User = require("../../models/user/userSchema");
const mongoose = require("mongoose");
const Product = require('../../models/admin/productSchema');
const Orders = require('../../models/user/userOrder');
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

       
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
          
            req.session.admin = email;

            return res.redirect('/admin/dashboard'); 
        }

      
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


const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            const { timeFrame = "yearly" } = req.query;

           
            const orderStatusData = await getOrderStatusCounts(timeFrame);
            const salesData = await getSalesData(timeFrame);
            const bestSellingProducts = await getBestSellingProducts(timeFrame);
            const bestSellingCategories = await getBestSellingCategories(timeFrame);

           
            res.render("dashboard", {
                timeFrame,
                orderStatusData,
                salesData,
                bestSellingProducts,
                bestSellingCategories,
            });
        } catch (error) {
            console.error("Error loading dashboard:", error);
            res.redirect('/pageerror');
        }
    } else {
        res.redirect('/admin/login');
    }
};




async function getOrderStatusCounts(timeFrame) {
    const matchStage = getTimeFrameMatchStage(timeFrame);
    return await Orders.aggregate([
        matchStage,
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.status",
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: null,
                delivered: {
                    $sum: {
                        $cond: [{ $eq: ["$_id", "Delivered"] }, "$count", 0]
                    }
                },
                canceled: {
                    $sum: {
                        $cond: [{ $eq: ["$_id", "Cancelled"] }, "$count", 0]
                    }
                },
                returned: {
                    $sum: {
                        $cond: [{ $eq: ["$_id", "Returned"] }, "$count", 0]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                delivered: 1,
                canceled: 1,
                returned: 1
            }
        }
    ]).then(result => result[0] || { delivered: 0, canceled: 0, returned: 0 });
}

async function getSalesData(timeFrame) {
    let query = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (timeFrame) {
        case 'daily':
            query.createdAt = { $gte: today };
            break;
        case 'weekly':
            const oneWeekAgo = new Date(today);
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            query.createdAt = { $gte: oneWeekAgo };
            break;
        case 'monthly':
            const oneMonthAgo = new Date(today);
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            query.createdAt = { $gte: oneMonthAgo };
            break;
        case 'yearly':
            const oneYearAgo = new Date(today);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            query.createdAt = { $gte: oneYearAgo };
            break;
        default:
           
            break;
    }

    const groupingFormat = getGroupingFormat(timeFrame);

    return await Orders.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    $dateToString: { format: groupingFormat, date: "$createdAt" }
                },
                totalSales: { $sum: "$total_amount" }
            }
        },
        { $sort: { "_id": 1 } },
        {
            $group: {
                _id: null,
                labels: { $push: "$_id" },
                values: { $push: "$totalSales" }
            }
        },
        {
            $project: {
                _id: 0,
                labels: 1,
                values: 1
            }
        }
    ]).then(result => result[0] || { labels: [], values: [] });
}

function getGroupingFormat(timeFrame) {
    switch(timeFrame) {
        case 'yearly':
            return "%Y";
        case 'monthly':
            return "%Y-%m-%d";
        case 'weekly':
        case 'daily':
            return "%Y-%m-%d";
        default:
            return "%Y-%m-%d";
    }
}


async function getBestSellingProducts(timeFrame) {
    const matchStage = getTimeFrameMatchStage(timeFrame);
    return await Orders.aggregate([
        matchStage,
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.product",
                name: { $first: "$items.name" },
                sales: { $sum: "$items.quantity" }
            }
        },
        { $sort: { sales: -1 } },
        { $limit: 10 },
        {
            $project: {
                _id: 0,
                name: 1,
                sales: 1
            }
        }
    ]);
}

async function getBestSellingCategories(timeFrame) {
    const matchStage = getTimeFrameMatchStage(timeFrame);
    return await Orders.aggregate([
        matchStage,
        { $unwind: "$items" },
        {
            $lookup: {
                from: "products", 
                localField: "items.product",
                foreignField: "_id", 
                as: "product"
            }
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } }, 
        {
            $lookup: {
                from: "categories", 
                localField: "product.Category", 
                foreignField: "_id", 
                as: "category"
            }
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } }, 
        {
            $group: {
                _id: "$category._id", 
                name: { $first: "$category.name" },
                sales: { $sum: "$items.quantity" } 
            }
        },
        { $sort: { sales: -1 } }, 
        { $limit: 10 },
        {
            $project: {
                _id: 0, 
                name: 1,
                sales: 1
            }
        }
    ]);
}


function getTimeFrameMatchStage(timeFrame) {
    const now = new Date();
    let startDate;

    switch(timeFrame) {
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'weekly':
            startDate = new Date(now.setDate(now.getDate() - now.getDay()));
            break;
        case 'daily':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
        default:
            startDate = new Date(0); 
    }

    return { $match: { createdAt: { $gte: startDate } } };
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout
}