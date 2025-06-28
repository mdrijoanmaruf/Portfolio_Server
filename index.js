const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
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
let db;

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    db = client.db("portfolioDB");
    projectsCollection = db.collection("projects");
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}

// Initialize database connection
connectDB();

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
        const projects = await projectsCollection.find({}).toArray();
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
