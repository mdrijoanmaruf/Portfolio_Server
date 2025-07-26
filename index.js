const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const requestIp = require('request-ip');
const useragent = require('express-useragent');

const PORT = process.env.PORT || 5000;

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())
app.use(requestIp.mw())
app.use(useragent.express())

// MongoDB Connection
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let projectsCollection;
let courseworkCollection;
let contactsCollection;
let visitorsCollection;
let db;

// Connect to MongoDB
async function connectDB() {
  try {
    // await client.connect();
    db = client.db("portfolioDB");
    projectsCollection = db.collection("projects");
    courseworkCollection = db.collection("coursework");
    contactsCollection = db.collection("contacts");
    visitorsCollection = db.collection("visitors");
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}

// Initialize database connection
connectDB();

// Middleware to track visitor
const trackVisitor = async (req, res, next) => {
  try {
    // Skip tracking for API requests and admin routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) {
      return next();
    }

    const ip = req.clientIp || '127.0.0.1';
    const userAgent = req.useragent;
    
    const browser = `${userAgent.browser} ${userAgent.version}`;
    const device = userAgent.isMobile ? 'Mobile' : 
                  userAgent.isTablet ? 'Tablet' : 'Desktop';
    const os = userAgent.os;
    
    const now = new Date();
    
    // Check if this IP exists in the database
    const existingVisitor = await visitorsCollection.findOne({ ip });
    
    if (existingVisitor) {
      // Update existing visitor record
      await visitorsCollection.updateOne(
        { ip },
        { 
          $set: { 
            lastVisit: now,
            browser,
            device,
            os,
            // Update session start time for time tracking
            sessionStart: now
          },
          $inc: { visitCount: 1 }
        }
      );
    } else {
      // Create new visitor record
      await visitorsCollection.insertOne({
        ip,
        browser,
        device,
        os,
        firstVisit: now,
        lastVisit: now,
        visitCount: 1,
        totalTimeSpent: 0,
        sessionStart: now,
        path: req.path
      });
    }
    
    // Add session ID to identify this visit
    req.visitorSessionId = now.getTime().toString();
    res.cookie('visitorSessionId', req.visitorSessionId, { 
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true 
    });
    
  } catch (error) {
    console.error('Error tracking visitor:', error);
  }
  
  next();
};

// Apply visitor tracking middleware
app.use(trackVisitor);

// Endpoint to update session time when user leaves
app.post('/api/track/end-session', async (req, res) => {
  try {
    const { sessionId, timeSpent } = req.body;
    const ip = req.clientIp || '127.0.0.1';
    
    if (!sessionId || !timeSpent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Session ID and time spent are required' 
      });
    }
    
    // Update the visitor's total time spent
    await visitorsCollection.updateOne(
      { ip },
      { 
        $inc: { totalTimeSpent: Number(timeSpent) },
        $unset: { sessionStart: "" }
      }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating session time:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating session time'
    });
  }
});

// Route to get visitors data
app.get('/api/visitors', async (req, res) => {
  try {
    const { userEmail } = req.query;

    // Check if user is admin
    if (userEmail !== 'rijoanmaruf@gmail.com') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    const visitors = await visitorsCollection.find({}).sort({ lastVisit: -1 }).toArray();
    
    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching visitors',
      error: error.message
    });
  }
});

// Client-side tracking code endpoint
app.get('/api/track/script.js', (req, res) => {
  const trackingScript = `
    // Visitor tracking script
    (function() {
      const sessionId = new Date().getTime().toString();
      const startTime = new Date();
      
      // Function to send time spent data when user leaves page
      function sendTimeSpent() {
        const timeSpent = Math.floor((new Date() - startTime) / 1000); // Time in seconds
        
        // Only send if time is significant
        if (timeSpent > 3) {
          navigator.sendBeacon('/api/track/end-session', JSON.stringify({
            sessionId: sessionId,
            timeSpent: timeSpent
          }));
        }
      }
      
      // Track when user leaves page
      window.addEventListener('beforeunload', sendTimeSpent);
      
      // Track page changes in SPA
      const originalPushState = history.pushState;
      history.pushState = function() {
        sendTimeSpent();
        originalPushState.apply(this, arguments);
        // Reset timer for new page
        startTime = new Date();
      };
      
      // Add periodic updates for long sessions
      setInterval(() => {
        const currentTimeSpent = Math.floor((new Date() - startTime) / 1000);
        if (currentTimeSpent > 60) { // Update every minute for long sessions
          fetch('/api/track/end-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId: sessionId,
              timeSpent: currentTimeSpent
            })
          }).then(() => {
            // Reset timer after updating
            startTime = new Date();
          });
        }
      }, 60000); // Check every minute
    })();
  `;
  
  res.set('Content-Type', 'application/javascript');
  res.send(trackingScript);
});

// Routes

// Health check
app.get('/', (req, res) => {
    res.json({
        message: "Portfolio Server is Running....",
        status: "active",
        timestamp: new Date().toISOString()
    })
})

// Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await projectsCollection.find({}).sort({ updatedAt: -1 }).toArray();
        res.json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching projects',
            error: error.message
        });
    }
});

// Get featured projects (must come before /:id route)
app.get('/api/projects/featured', async (req, res) => {
    try {
        const featuredProjects = await projectsCollection.find({ isFeatured: true }).toArray();
        res.json({
            success: true,
            count: featuredProjects.length,
            data: featuredProjects
        });
    } catch (error) {
        console.error('Error fetching featured projects:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching featured projects',
            error: error.message
        });
    }
});

// Get single project by ID
app.get('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID'
            });
        }

        const project = await projectsCollection.findOne({ _id: new ObjectId(id) });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.json({
            success: true,
            data: project
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching project',
            error: error.message
        });
    }
});

// Add new project
app.post('/api/projects', async (req, res) => {
    try {
        const {
            title,
            description,
            image,
            clientSourceCode,
            serverSourceCode,
            liveLink,
            isFeatured,
            tags
        } = req.body;

        // Validation
        if (!title || !description || !image) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: title, description, image'
            });
        }

        // Create project object
        const newProject = {
            title: title.trim(),
            description: description.trim(),
            image: image.trim(),
            clientSourceCode: clientSourceCode ? clientSourceCode.trim() : null,
            serverSourceCode: serverSourceCode ? serverSourceCode.trim() : null,
            liveLink: liveLink ? liveLink.trim() : null,
            isFeatured: Boolean(isFeatured),
            tags: Array.isArray(tags) ? tags.map(tag => tag.trim()) : [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await projectsCollection.insertOne(newProject);

        res.status(201).json({
            success: true,
            message: 'Project added successfully',
            data: {
                _id: result.insertedId,
                ...newProject
            }
        });
    } catch (error) {
        console.error('Error adding project:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding project',
            error: error.message
        });
    }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID'
            });
        }

        const result = await projectsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting project',
            error: error.message
        });
    }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            image,
            clientSourceCode,
            serverSourceCode,
            liveLink,
            isFeatured,
            tags
        } = req.body;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID'
            });
        }

        // Validation
        if (!title || !description || !image) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: title, description, image'
            });
        }

        // Update project object
        const updatedProject = {
            title: title.trim(),
            description: description.trim(),
            image: image.trim(),
            clientSourceCode: clientSourceCode ? clientSourceCode.trim() : null,
            serverSourceCode: serverSourceCode ? serverSourceCode.trim() : null,
            liveLink: liveLink ? liveLink.trim() : null,
            isFeatured: Boolean(isFeatured),
            tags: Array.isArray(tags) ? tags.map(tag => tag.trim()) : [],
            updatedAt: new Date()
        };

        const result = await projectsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedProject }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Get updated project
        const project = await projectsCollection.findOne({ _id: new ObjectId(id) });

        res.json({
            success: true,
            message: 'Project updated successfully',
            data: project
        });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating project',
            error: error.message
        });
    }
});

// Coursework CRUD Routes

// Get all coursework
app.get('/api/coursework', async (req, res) => {
    try {
        const coursework = await courseworkCollection.find({}).sort({ createdAt: 1 }).toArray();
        res.json({
            success: true,
            count: coursework.length,
            data: coursework
        });
    } catch (error) {
        console.error('Error fetching coursework:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching coursework',
            error: error.message
        });
    }
});

// Add new coursework (admin only)
app.post('/api/coursework', async (req, res) => {
    try {
        const { title, status, userEmail } = req.body;

        // Check if user is admin
        if (userEmail !== 'rijoanmaruf@gmail.com') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // Validation
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }

        // Validate status
        const validStatuses = ['Completed', 'Ongoing', 'Upcoming'];
        const courseStatus = status && validStatuses.includes(status) ? status : 'Ongoing';

        // Create coursework object
        const newCoursework = {
            title: title.trim(),
            status: courseStatus,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await courseworkCollection.insertOne(newCoursework);

        res.status(201).json({
            success: true,
            message: 'Coursework added successfully',
            data: {
                _id: result.insertedId,
                ...newCoursework
            }
        });
    } catch (error) {
        console.error('Error adding coursework:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding coursework',
            error: error.message
        });
    }
});

// Update coursework (admin only)
app.put('/api/coursework/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, status, userEmail } = req.body;

        // Check if user is admin
        if (userEmail !== 'rijoanmaruf@gmail.com') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coursework ID'
            });
        }

        // Validation
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }

        // Validate status
        const validStatuses = ['Completed', 'Ongoing', 'Upcoming'];
        const courseStatus = status && validStatuses.includes(status) ? status : 'Ongoing';

        const updatedCoursework = {
            title: title.trim(),
            status: courseStatus,
            updatedAt: new Date()
        };

        const result = await courseworkCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedCoursework }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Coursework not found'
            });
        }

        // Get updated coursework
        const coursework = await courseworkCollection.findOne({ _id: new ObjectId(id) });

        res.json({
            success: true,
            message: 'Coursework updated successfully',
            data: coursework
        });
    } catch (error) {
        console.error('Error updating coursework:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating coursework',
            error: error.message
        });
    }
});

// Delete coursework (admin only)
app.delete('/api/coursework/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userEmail } = req.body;

        // Check if user is admin
        if (userEmail !== 'rijoanmaruf@gmail.com') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coursework ID'
            });
        }

        const result = await courseworkCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Coursework not found'
            });
        }

        res.json({
            success: true,
            message: 'Coursework deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting coursework:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting coursework',
            error: error.message
        });
    }
});

// Contact Form Routes

// Submit contact form
app.post('/api/contacts', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Validation
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and message are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Create contact object
        const newContact = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            message: message.trim(),
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await contactsCollection.insertOne(newContact);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully! Thank you for reaching out.',
            data: {
                _id: result.insertedId,
                ...newContact
            }
        });
    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again.',
            error: error.message
        });
    }
});

// Get all contacts (admin only)
app.get('/api/contacts', async (req, res) => {
    try {
        const { userEmail } = req.query;

        // Check if user is admin
        if (userEmail !== 'rijoanmaruf@gmail.com') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const contacts = await contactsCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        res.json({
            success: true,
            count: contacts.length,
            data: contacts
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching contacts',
            error: error.message
        });
    }
});

// Mark contact as read (admin only)
app.put('/api/contacts/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const { userEmail } = req.body;

        // Check if user is admin
        if (userEmail !== 'rijoanmaruf@gmail.com') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contact ID'
            });
        }

        const result = await contactsCollection.updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    isRead: true,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.json({
            success: true,
            message: 'Contact marked as read'
        });
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating contact',
            error: error.message
        });
    }
});

// Delete contact (admin only)
app.delete('/api/contacts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userEmail } = req.body;

        // Check if user is admin
        if (userEmail !== 'rijoanmaruf@gmail.com') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contact ID'
            });
        }

        const result = await contactsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.json({
            success: true,
            message: 'Contact deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting contact',
            error: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

app.listen(PORT, () => {
    console.log(`Portfolio Server is running at port: ${PORT}`)
    console.log(`API Documentation: http://localhost:${PORT}/api/projects`)
})
