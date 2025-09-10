const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const nodemailer = require('nodemailer')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const PORT = process.env.PORT || 5000;

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

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
let resumeCollection;
let db;

// Connect to MongoDB
async function connectDB() {
  try {
    // await client.connect();
    db = client.db("portfolioDB");
    projectsCollection = db.collection("projects");
    courseworkCollection = db.collection("coursework");
    resumeCollection = db.collection("resume");
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}

// Initialize database connection
connectDB();

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify email configuration
transporter.verify((error, success) => {
    if (error) {
        console.log('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
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
            images,
            clientSourceCode,
            serverSourceCode,
            liveLink,
            liveVideoUrl,
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
            images: Array.isArray(images) ? images : [], // Handle multiple images
            clientSourceCode: clientSourceCode ? clientSourceCode.trim() : null,
            serverSourceCode: serverSourceCode ? serverSourceCode.trim() : null,
            liveLink: liveLink ? liveLink.trim() : null,
            liveVideoUrl: liveVideoUrl ? liveVideoUrl.trim() : null,
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
            images,
            clientSourceCode,
            serverSourceCode,
            liveLink,
            liveVideoUrl,
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
            images: Array.isArray(images) ? images : [], // Handle multiple images
            clientSourceCode: clientSourceCode ? clientSourceCode.trim() : null,
            serverSourceCode: serverSourceCode ? serverSourceCode.trim() : null,
            liveLink: liveLink ? liveLink.trim() : null,
            liveVideoUrl: liveVideoUrl ? liveVideoUrl.trim() : null,
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

// Resume Link Management Routes

// Get resume link
app.get('/api/resume', async (req, res) => {
    try {
        const resumeData = await resumeCollection.findOne({});
        
        if (!resumeData) {
            // Return default if no resume link is set
            res.json({
                success: true,
                data: {
                    link: null,
                    updatedAt: null
                }
            });
        } else {
            res.json({
                success: true,
                data: resumeData
            });
        }
    } catch (error) {
        console.error('Error fetching resume link:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching resume link',
            error: error.message
        });
    }
});

// Update resume link (admin only)
app.put('/api/resume', async (req, res) => {
    try {
        const { link, userEmail } = req.body;

        // Check if user is admin
        if (userEmail !== 'rijoanmaruf@gmail.com') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // Validation
        if (!link || link.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Resume link is required'
            });
        }

        // URL validation (basic)
        const urlRegex = /^https?:\/\/.+/;
        if (!urlRegex.test(link.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid URL (must start with http:// or https://)'
            });
        }

        const resumeData = {
            link: link.trim(),
            updatedAt: new Date()
        };

        // Use upsert to update if exists or create if doesn't exist
        const result = await resumeCollection.replaceOne(
            {},
            resumeData,
            { upsert: true }
        );

        res.json({
            success: true,
            message: 'Resume link updated successfully',
            data: resumeData
        });
    } catch (error) {
        console.error('Error updating resume link:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating resume link',
            error: error.message
        });
    }
});

// Contact Form Route - Send Email
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

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to your email
            subject: `New Contact Form Message from ${name.trim()}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; margin-bottom: 20px; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
                            New Contact Form Submission
                        </h2>
                        
                        <div style="margin-bottom: 15px;">
                            <strong style="color: #555;">Name:</strong>
                            <span style="margin-left: 10px; color: #333;">${name.trim()}</span>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <strong style="color: #555;">Email:</strong>
                            <a href="mailto:${email.trim()}" style="margin-left: 10px; color: #4f46e5; text-decoration: none;">
                                ${email.trim()}
                            </a>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <strong style="color: #555;">Message:</strong>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #4f46e5; border-radius: 4px;">
                            <p style="margin: 0; line-height: 1.6; color: #333;">
                                ${message.trim().replace(/\n/g, '<br>')}
                            </p>
                        </div>
                        
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                            <small style="color: #888;">
                                Received on: ${new Date().toLocaleString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </small>
                        </div>
                        
                        <div style="margin-top: 15px;">
                            <a href="mailto:${email.trim()}?subject=Re: Your message to Rijoan Maruf" 
                               style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Reply to ${name.trim()}
                            </a>
                        </div>
                    </div>
                </div>
            `,
            text: `
New Contact Form Submission

Name: ${name.trim()}
Email: ${email.trim()}

Message:
${message.trim()}

Received on: ${new Date().toLocaleString()}
            `.trim()
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.status(200).json({
            success: true,
            message: 'Message sent successfully! Thank you for reaching out.'
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
