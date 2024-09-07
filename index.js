const express = require('express');
const app = express();
const env = require ("dotenv").config();
const db = require("./config/db");
const path = require('path');
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("./config/passport");
const userRouter = require('./router/userRouter');
const adminRouter = require('./router/adminRouter');
// const nocache = require('nocache');
db();
// MongoDB connection
// mongoose.connect("mongodb://127.0.0.1:27017/furniture")
//     .then(() => console.log('MongoDB Connected'))
//     .catch((err) => console.log('MongoDB connection error:', err));


    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

app.use('/adminassets',express.static(path.join(__dirname,"./public/adminassets")));



app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*100
    } 
}))

app.use(passport.initialize());
app.use(passport.session());


app.use('/', userRouter);
app.use('/admin',adminRouter);


const port = 7001;
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
