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

// Add this schema definition for the 'projects' collection
const projectSchema = new mongoose.Schema({
  projectName: String,
  projectDescription: String,
  projectStatus: String,
  // Add other fields as needed
});

const Project = mongoose.model('Project', projectSchema);

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

// ... (existing imports and code)

// New route for adding a project
app.get('/addprojects', (req, res) => {
  res.render('addProject.ejs');
});

// New route for handling the form submission when adding a project
app.post('/addprojects', async (req, res) => {
  const { projectName, projectDescription, projectStatus } = req.body;

  try {
    const newProject = new Project({
      projectName: projectName,
      projectDescription: projectDescription,
      projectStatus: projectStatus,
      // Add values for other fields as needed
    });

    await newProject.save();
    console.log('Project added successfully:', newProject);
    res.redirect('/admin/dashboard'); // Redirect to admin dashboard or wherever you need
  } catch (error) {
    console.error('Error adding project:', error);
    res.status(500).send('Internal Server Error');
  }
});

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

// New route to view projects
app.get('/viewProjects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.render('viewProjects.ejs', { projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).send('Internal Server Error');
  }
});

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

// Add this route to server.js
app.get('/projectTable', async (req, res) => {
  try {
    // Assuming 'Project' is the Mongoose model for 'projects' collection
    const projects = await Project.find();
    res.render('projectTable.ejs', { projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).send('Internal Server Error: ' + error.message); // Log the error message
  }
});

// New route for adding a tribe
app.get('/addTribe', checkAdminAuthenticated, (req, res) => {
  res.render('tribe1.ejs');
});

// New route for handling the form submission when adding a tribe
app.post('/addTribe', checkAdminAuthenticated, async (req, res) => {
  const { tribe_name, tribe_ID } = req.body;

  try {
      const newTribe = new Info({
          tribe_name: tribe_name,
          tribe_ID: tribe_ID,
      });

      await newTribe.save();
      console.log('Tribe added successfully:', newTribe);
      res.redirect('/admin/dashboard');
  } catch (error) {
      console.error('Error adding tribe:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Add this route to handle "/addinfos"
app.get('/addinfos', (req, res) => {
  res.render('addinfos.ejs'); // Replace with the correct EJS file or logic for adding 'infos'
});

app.post('/addinfos', (req, res) => {
  // Process the data from the form and add the 'infos'
  // This is where you would handle the logic to save the 'infos' to the database

  // For example, assuming 'tribe_name' and 'tribe_ID' are form fields
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

// ... (rest of the existing code)

// Add this route to server.js
app.get('/addadmins', checkAdminAuthenticated, (req, res) => {
  res.render('addadmin.ejs'); // Replace with the correct EJS file or logic for adding admins
});

app.post('/addadmins', checkAdminAuthenticated, async (req, res) => {
  // Process the data from the form and add the 'admins'
  // This is where you would handle the logic to save the 'admins' to the database

  // For example, assuming 'adminID' and 'adminPassword' are form fields
  const { adminID, adminPassword } = req.body;

  // Create a new Admin instance
  const newAdmin = new Admin({
    adminID: adminID,
    adminPassword: adminPassword,
    // Add values for other fields as needed
  });

  // Save the newAdmin to the database
  newAdmin.save()
    .then(result => {
      console.log('Admin saved:', result);
      // Handle success, redirect, or send a response
      res.redirect('/admin/dashboard'); // Redirect to admin dashboard or wherever you need
    })
    .catch(error => {
      console.error('Error saving admin:', error);
      // Handle error, redirect, or send a response
      res.redirect('/admin'); // Redirect with an error message or handle differently
    });
});
  

app.get('/adduser', checkAdminAuthenticated, (req, res) => {
  res.render('adduser.ejs');
});

// Add this route to server.js
app.get('/addusers', checkAdminAuthenticated, (req, res) => {
  res.render('adduser.ejs'); // Replace with the correct EJS file or logic for adding users
});

app.post('/addusers', checkAdminAuthenticated, async (req, res) => {
  // Process the data from the form and add the 'users'
  // This is where you would handle the logic to save the 'users' to the database

  // For example, assuming 'name', 'email', and 'password' are form fields
  const { name, email, password } = req.body;

  // Create a new User instance
  const newUser = new User({
    name: name,
    email: email,
    password: password,
    // Add values for other fields as needed
  });

  // Save the newUser to the database
  newUser.save()
    .then(result => {
      console.log('User saved:', result);
      // Handle success, redirect, or send a response
      res.redirect('/admin/dashboard'); // Redirect to admin dashboard or wherever you need
    })
    .catch(error => {
      console.error('Error saving user:', error);
      // Handle error, redirect, or send a response
      res.redirect('/admin'); // Redirect with an error message or handle differently
    });
});

// Delete route for 'infos'
app.get('/delinfos', (req, res) => {
  res.render('delinfos.ejs');
});

app.post('/delinfos', async (req, res) => {
  const { tribe_name, tribe_ID } = req.body;

  try {
      // Assuming 'Info' is the Mongoose model for 'infos' collection
      await Info.deleteOne({ tribe_name: tribe_name, tribe_ID: tribe_ID });
      console.log('Information deleted successfully');
      res.redirect('/'); // Redirect to home page or wherever you need
  } catch (error) {
      console.error('Error deleting information:', error);
      res.redirect('/'); // Redirect with an error message or handle differently
  }
});

// Delete route for 'admins'
app.get('/deladmins', (req, res) => {
  res.render('deladmins.ejs');
});

app.post('/deladmins', async (req, res) => {
  const { adminID } = req.body;

  try {
      // Assuming 'Admin' is the Mongoose model for 'admins' collection
      await Admin.deleteOne({ adminID: adminID });
      console.log('Admin deleted successfully');
      res.redirect('/'); // Redirect to home page or wherever you need
  } catch (error) {
      console.error('Error deleting admin:', error);
      res.redirect('/'); // Redirect with an error message or handle differently
  }
});

// Delete route for 'users'
app.get('/delusers', (req, res) => {
  res.render('delusers.ejs');
});

app.post('/delusers', async (req, res) => {
  const { userID } = req.body;

  try {
      // Assuming 'User' is the Mongoose model for 'users' collection
      await User.deleteOne({ _id: userID });
      console.log('User deleted successfully');
      res.redirect('/'); // Redirect to home page or wherever you need
  } catch (error) {
      console.error('Error deleting user:', error);
      res.redirect('/'); // Redirect with an error message or handle differently
  }
});

// Add this route to server.js for rendering the delete projects page
app.get('/delprojects', checkAdminAuthenticated, async (req, res) => {
  try {
    const projects = await Project.find();
    res.render('delprojects.ejs', { projects });
  } catch (error) {
    console.error('Error fetching projects for deletion:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Add this route to server.js for handling the form submission when deleting a project
app.post('/delprojects', checkAdminAuthenticated, async (req, res) => {
  const { projectID } = req.body;

  try {
    // Assuming 'Project' is the Mongoose model for 'projects' collection
    await Project.deleteOne({ _id: projectID });
    console.log('Project deleted successfully');
    res.redirect('/admin/dashboard'); // Redirect to admin dashboard or wherever you need
  } catch (error) {
    console.error('Error deleting project:', error);
    res.redirect('/admin/dashboard'); // Redirect with an error message or handle differently
  }
});

// New route for the update info page
app.get('/upinfos', (req, res) => {
  res.render('upinfos.ejs');
});

// New route for handling the update form submission for info
app.post('/upinfos', async (req, res) => {
  // Process the data from the form and update the 'infos'
  // This is where you would handle the logic to update the 'infos' in the database

  // For example, assuming 'tribe_name' and 'tribe_ID' are form fields
  const { tribe_name, tribe_ID } = req.body;

  try {
    // Find the Info in the database based on some condition
    const infoToUpdate = await Info.findOne({ tribe_name: tribe_name });

    if (!infoToUpdate) {
      console.error('Info not found for update');
      return res.redirect('/');
    }

    // Update the info fields
    infoToUpdate.tribe_ID = tribe_ID;

    // Save the updated info to the database
    await infoToUpdate.save();

    console.log('Information updated:', infoToUpdate);
    // Handle success, redirect, or send a response
    res.redirect('/'); // Redirect to home page or wherever you need
  } catch (error) {
    console.error('Error updating information:', error);
    // Handle error, redirect, or send a response
    res.redirect('/'); // Redirect with an error message or handle differently
  }
});

// ... (existing code)

// New route for the update admin page
app.get('/upadmin', (req, res) => {
  res.render('upadmin.ejs');
});

// Add this route to handle the update for admins
app.get('/upadmins', checkAdminAuthenticated, (req, res) => {
  res.render('upadmins.ejs'); // Replace with the correct EJS file for updating admins
});

// Add a corresponding POST route to handle the form submission for updating admins
app.post('/upadmins', checkAdminAuthenticated, async (req, res) => {
  // Process the data from the form and update the admin in the database
  // This is where you would handle the logic to update the admin in the database

  // For example, assuming 'adminID' and 'adminPassword' are form fields
  const { adminID, adminPassword } = req.body;

  try {
      // Find the admin in the Admin collection and update its password
      const admin = await Admin.findOne({ adminID: adminID });
      if (admin) {
          admin.adminPassword = adminPassword;
          await admin.save();
          console.log('Admin updated successfully:', admin);
          res.redirect('/admin/dashboard');
      } else {
          console.error('Admin not found');
          res.status(404).send('Admin not found');
      }
  } catch (error) {
      console.error('Error updating admin:', error);
      res.status(500).send('Internal Server Error');
  }
});


// New route for the update user page
app.get('/upuser', (req, res) => {
  res.render('upuser.ejs');
});

// Render the form for updating users
app.get('/upusers', checkAuthenticated, (req, res) => {
  res.render('upusers.ejs'); // Replace with the correct EJS file for updating users
});

// Handle the form submission for updating users
app.post('/upusers', checkAuthenticated, async (req, res) => {
  // Process the data from the form and update the user in the database
  // This is where you would handle the logic to update the user in the database

  // For example, assuming 'userID', 'userName', and 'userEmail' are form fields
  const { userID, userName, userEmail } = req.body;

  try {
      // Find the user in the User collection and update its information
      const user = await User.findOne({ _id: userID });
      if (user) {
          user.name = userName;
          user.email = userEmail;
          await user.save();
          console.log('User updated successfully:', user);
          res.redirect('/');
      } else {
          console.error('User not found');
          res.status(404).send('User not found');
      }
  } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Add this route to server.js for rendering the update projects page
app.get('/upprojects', checkAdminAuthenticated, async (req, res) => {
  try {
    const projects = await Project.find();
    res.render('upprojects.ejs', { projects });
  } catch (error) {
    console.error('Error fetching projects for update:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Add this route to server.js for handling the form submission when updating a project
app.post('/upprojects', checkAdminAuthenticated, async (req, res) => {
  const { projectID, updatedProjectName, updatedProjectDescription, updatedProjectStatus } = req.body;

  try {
    // Assuming 'Project' is the Mongoose model for 'projects' collection
    const projectToUpdate = await Project.findById(projectID);

    if (!projectToUpdate) {
      console.error('Project not found for update');
      return res.redirect('/admin/dashboard');
    }

    // Update the project fields
    projectToUpdate.projectName = updatedProjectName;
    projectToUpdate.projectDescription = updatedProjectDescription;
    projectToUpdate.projectStatus = updatedProjectStatus;

    // Save the updated project to the database
    await projectToUpdate.save();

    console.log('Project updated successfully:', projectToUpdate);
    // Handle success, redirect, or send a response
    res.redirect('/admin/dashboard'); // Redirect to admin dashboard or wherever you need
  } catch (error) {
    console.error('Error updating project:', error);
    res.redirect('/admin/dashboard'); // Redirect with an error message or handle differently
  }
});

// Update the route for handling project search
app.get('/searchProject', async (req, res) => {
  const { projectName } = req.query;

  try {
    // Assuming 'Project' is the Mongoose model for 'projects' collection
    const projectResults = await Project.find({ projectName });

    // Send the projectResults as JSON
    res.json(projectResults);
  } catch (error) {
    console.error('Error searching project:', error);
    // Handle error, redirect, or send a response
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/donate', (req, res) => {
  res.render('donate.ejs'); // Replace with the correct EJS file for the donation page
});


app.delete('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.render('login.ejs');
  });
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