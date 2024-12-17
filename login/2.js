if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }
  
  const express = require('express');
  const app = express();
  const bcrypt = require('bcrypt');
  const passport = require('passport');
  const initializePassport = require('./passport-config');
  const flash = require('express-flash');
  const session = require('express-session');
  const methodOverride = require('method-override');
  const mongoose = require('mongoose');
  
  initializePassport(
  passport,
  email => User.findOne({ email: email }),
  id => User.findById(id)
  );
  
  app.use(express.urlencoded({ extended: false }));
  app.use(flash());
  app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(methodOverride('_method'));
  
  
  // Connect to MongoDB Atlas (replace <your_connection_string> with your actual connection string)
  mongoose.connect('mongodb+srv://aniketha:aniketha123456@tribalframework.mi4wes4.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  });
  
  // Define User Schema
  const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  });
  
  const User = mongoose.model('User', userSchema);
  
  const infoSchema = new mongoose.Schema({
  tribe_name: String,
  tribe_ID: String,
  });
  
  const Info = mongoose.model('Info', infoSchema);
  
  const adminSchema = new mongoose.Schema({
    adminID: String,
    adminPassword: String,
  });
  
  const Admin = mongoose.model('Admin', adminSchema);
  
  
  app.post('/saveInfo', (req, res) => {
  // Assuming the data comes from a form or request body
  const { tribe_name, tribe_ID } = req.body;
  
  // Create a new Info instance
  const newInfo = new Info({
      tribe_name: tribe_name,
      tribe_ID: tribe_ID,
      // Add values for other fields as needed
  });
  
  // Save the newInfo to the database
  newInfo.save()
      .then(result => {
          console.log('Information saved:', result);
          // Handle success, redirect, or send a response
          res.redirect('/'); // Redirect to home page or wherever you need
      })
      .catch(error => {
          console.error('Error saving information:', error);
          // Handle error, redirect, or send a response
          res.redirect('/'); // Redirect with an error message or handle differently
      });
  });
  
  app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true,
  }));
  
  app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
  
      const user = new User({
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
      });
  
      await user.save();
      console.log('User registered:', user);
      res.redirect('/login');
    } catch (error) {
      console.error(error);
      res.redirect('/register');
    }
  });
  
  app.post('/validateAdmin', async (req, res) => {
    const adminID = req.body.adminID;
  
    try {
        // Check if the admin ID exists in the Admin collection
        const admin = await Admin.findOne({ adminID: adminID });
        if (admin) {
            res.json({ valid: true });
        } else {
            res.json({ valid: false });
        }
    } catch (error) {
        console.error('Error validating admin:', error);
        res.status(500).json({ valid: false });
    }
  });
  
  
  app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { name: req.user.name });
  });
  
  app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs');
  });
  
  app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs');
  });
  
  app.get('/tribe', checkAuthenticated, (req, res) => {
  res.render('tribe.ejs'); // Assuming 'tribe.ejs' is in the 'views' folder
  });
  
  // New route for admin page
  app.get('/admin', (req, res) => {
    res.render('admin.ejs', { errorMessage: null }); // Pass errorMessage with a default value
  });
  
  app.post('/admin/login', async (req, res) => {
    const { adminID, adminPassword } = req.body;
  
    try {
        // Check if the admin ID exists in the Admin collection
        const admin = await Admin.findOne({ adminID: adminID });
  
        if (admin && await bcrypt.compare(adminPassword, admin.adminPassword)) {
            // Admin login successful
            res.redirect('/admin/dashboard'); // Redirect to admin dashboard or any other page
        } else {
            // Admin login failed
            res.render('admin.ejs', { errorMessage: 'Invalid admin credentials' });
        }
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).send('Internal Server Error');
    }
  });
  
  // ... (rest of the existing code)
  
  
  app.get('/searchTribe', async (req, res) => {
  const tribeName = req.query.tribe_name;
  
  try {
      const tribeInfo = await Info.find({ tribe_name: tribeName });
      res.json(tribeInfo);
  } catch (error) {
      console.error('Error searching tribe:', error);
      res.status(500).send('Internal Server Error');
  }
  });
  
  app.get('/usertable', async (req, res) => {
    try {
        const data = await mongoose.connection.db.collection('users').find().toArray();
        console.log('User data:', data); // Log the retrieved data
        res.render('usertable.ejs', { data });
    } catch (error) {
        console.error('Error fetching data for users:', error);
        res.status(500).send('Internal Server Error');
    }
  });
  
  app.get('/infotable', async (req, res) => {
    try {
        const data = await mongoose.connection.db.collection('infos').find().toArray();
        console.log('Info data:', data); // Log the retrieved data
        res.render('infotable.ejs', { data });
    } catch (error) {
        console.error('Error fetching data for info:', error);
        res.status(500).send('Internal Server Error');
    }
  });
  
  app.get('/admintable', async (req, res) => {
    try {
        const data = await mongoose.connection.db.collection('admins').find().toArray();
        console.log('Admin data:', data); // Log the retrieved data
        res.render('admintable.ejs', { data });
    } catch (error) {
        console.error('Error fetching data for admin:', error);
        res.status(500).send('Internal Server Error');
    }
  });
  
  // ... (existing imports and code)
  
  
  app.get('/admin/dashboard', checkAdminAuthenticated, async (req, res) => {
    try {
      // Get the names of all collections (tables) in the MongoDB database
      const collections = await mongoose.connection.db.listCollections().toArray();
      const tables = collections.map(collection => collection.name);
  
      res.render('admin_dashboard.ejs', { tables });
    } catch (error) {
      console.error('Error getting table names:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  // ... (rest of the existing code)
  
  
  // Add this route to server.js
  app.get('/view1', (req, res) => {
    res.render('view1.ejs');
  });
  
  // Add this route to server.js
  app.get('/viewcollection', async (req, res) => {
    const collectionName = req.query.name;
  
    try {
      const data = await mongoose.connection.db.collection(collectionName).find().toArray();
      res.render('viewcollection.ejs', { data, collectionName });
    } catch (error) {
      console.error(`Error fetching data for ${collectionName}:`, error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  app.delete('/logout', (req, res) => {
  req.logout();
  res.redirect('/login');
  });
  
  function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
  }
  
  function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
  }
  
  // New middleware function for admin authentication
  function checkAdminAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/admin'); // Redirect to the admin login page if not authenticated as an admin
  }
  
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  }); 