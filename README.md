# Portfolio Backend Server

Node.js/Express backend API for the portfolio project management system. Provides RESTful endpoints for managing portfolio projects with MongoDB integration.

## 🌐 Live API

**Base URL:** [https://api.portfolio.rijoan.com](https://api.portfolio.rijoan.com)  
**Portfolio Website:** [portfolio.rijoan.com](https://portfolio.rijoan.com)

## ✨ Features

- **RESTful API:** Complete CRUD operations for portfolio projects
- **MongoDB Integration:** Scalable NoSQL database with proper data modeling
- **Input Validation:** Comprehensive request validation and error handling
- **CORS Support:** Cross-origin resource sharing enabled for frontend integration
- **Admin Security:** Protected routes for project management operations
- **Error Handling:** Structured error responses and logging
- **Environment Configuration:** Secure environment variable management

## 🛠️ Technology Stack

- **Node.js** - JavaScript runtime environment
- **Express.js** - Fast, unopinionated web framework
- **MongoDB** - NoSQL document database
- **MongoDB Node.js Driver** - Official MongoDB driver
- **CORS** - Cross-Origin Resource Sharing middleware
- **dotenv** - Environment variable loader

## 📁 Project Structure

```
Server/
├── index.js          # Main server file with all routes
├── package.json      # Dependencies and scripts
├── README.md         # This file
└── .env             # Environment variables (not in repo)
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB installation
- npm or yarn package manager

### Installation

1. **Navigate to server directory**
   ```bash
   cd Server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   PORT=5000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   # Development
   npm start
   # or
   node index.js
   
   # Production
   NODE_ENV=production node index.js
   ```

5. **Verify installation**
   ```bash
   curl http://localhost:5000
   # Should return server status
   ```

## 📝 API Documentation

### Base URL (Development)
```
http://localhost:5000/api
```

### Authentication
- Admin operations require specific email authentication
- Admin email: `rijoanmaruf@gmail.com`

### Endpoints

#### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server health status |

#### Projects Management

| Method | Endpoint | Description | Admin Only |
|--------|----------|-------------|------------|
| GET | `/api/projects` | Get all projects | No |
| GET | `/api/projects/featured` | Get featured projects only | No |
| GET | `/api/projects/:id` | Get single project by ID | No |
| POST | `/api/projects` | Create new project | Yes |
| PUT | `/api/projects/:id` | Update existing project | Yes |
| DELETE | `/api/projects/:id` | Delete project | Yes |

### Request/Response Examples

#### Get All Projects
```bash
GET /api/projects

Response (200):
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "60a7c9b8e4b0a72f4c8d9e1f",
      "title": "Project Title",
      "description": "Project description",
      "image": "https://example.com/image.jpg",
      "tags": ["React", "Node.js"],
      "isFeatured": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create New Project
```bash
POST /api/projects
Content-Type: application/json

{
  "title": "New Project",
  "description": "Detailed project description",
  "image": "https://example.com/image.jpg",
  "clientSourceCode": "https://github.com/user/client-repo",
  "serverSourceCode": "https://github.com/user/server-repo",
  "liveLink": "https://project-demo.com",
  "isFeatured": true,
  "tags": ["React", "Node.js", "MongoDB"]
}

Response (201):
{
  "success": true,
  "message": "Project added successfully",
  "data": {
    "_id": "60a7c9b8e4b0a72f4c8d9e1f",
    // ... project data
  }
}
```

#### Error Response
```bash
Response (400/404/500):
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## 📊 Database Schema

### Projects Collection (`portfolioDB.projects`)

```javascript
{
  _id: ObjectId,                    // Auto-generated MongoDB ID
  title: String,                    // Required - Project title
  description: String,              // Required - Project description
  image: String,                    // Required - Project image URL
  clientSourceCode: String | null,  // Optional - Frontend repository URL
  serverSourceCode: String | null,  // Optional - Backend repository URL
  liveLink: String | null,          // Optional - Live demo URL
  isFeatured: Boolean,              // Featured status (default: false)
  tags: Array<String>,              // Array of technology tags
  createdAt: Date,                  // Auto-generated creation timestamp
  updatedAt: Date                   // Auto-updated modification timestamp
}
```

### Validation Rules
- **title**: Required, string, trimmed
- **description**: Required, string, trimmed
- **image**: Required, string, trimmed (URL)
- **clientSourceCode**: Optional, string, trimmed
- **serverSourceCode**: Optional, string, trimmed
- **liveLink**: Optional, string, trimmed
- **isFeatured**: Boolean conversion
- **tags**: Array of strings, each trimmed

## 🔧 Available Scripts

```bash
npm start        # Start the server
node index.js    # Direct Node.js execution
```

## 🌍 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `PORT` | Server port number | No | 5000 |
| `NODE_ENV` | Environment mode | No | development |

## 🔐 Security Features

- **Input Validation**: All inputs are validated and sanitized
- **MongoDB Injection Protection**: Using parameterized queries
- **CORS Configuration**: Properly configured for frontend integration
- **Error Handling**: Sensitive information not exposed in production
- **Admin Protection**: Write operations restricted to admin users

## 🚀 Deployment

### Production Environment
- **Hosting**: Railway/Heroku/DigitalOcean
- **Database**: MongoDB Atlas
- **Environment**: Production environment variables set

### Deployment Steps
1. Set production environment variables
2. Deploy to hosting platform
3. Configure database connection
4. Test API endpoints

## 📈 Performance Considerations

- **Database Indexing**: Proper indexes on frequently queried fields
- **Connection Pooling**: MongoDB driver handles connection pooling
- **Error Logging**: Comprehensive error logging for debugging
- **Response Optimization**: Minimal response payloads

## 🐛 Common Issues

### Database Connection
```bash
# Check MongoDB URI format
mongodb+srv://username:password@cluster.mongodb.net/database

# Verify network access in MongoDB Atlas
# Ensure IP whitelist includes deployment server
```

### CORS Issues
```bash
# Frontend running on different port
# CORS is configured to allow all origins (*)
# Update CORS settings for production
```

## 👨‍💻 Developer

**Rijoan Maruf**
- Website: [portfolio.rijoan.com](https://portfolio.rijoan.com)
- Email: rijoanmaruf@gmail.com

---

**Portfolio Backend API - Built with Node.js, Express.js, and MongoDB**