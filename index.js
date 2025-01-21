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


db();
  
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));  



app.use('/adminassets',express.static(path.join(__dirname,"./public/adminassets")));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  







app.use('/', userRouter);
app.use('/admin',adminRouter); 


  
app.use((req, res, next) => {
    res.status(404).render('page-404');
});


app.use((error, req, res, next) => {
    
    res.redirect('/pageNotFound');
});


const port = 7000 || process.env.PORT;  
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
 