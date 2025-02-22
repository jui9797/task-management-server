const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();

// HTTP Server and Socket.io setup
const port = process.env.PORT || 5000; // Ensure PORT is uppercase
const server = http.createServer(app); 
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB setup

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jwr0f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster01`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const userCollection = client.db('task-management').collection('users');
    const taskCollection = client.db('task-management').collection('tasks');

    io.on('connection', (socket) => {
      // console.log('A user connected');
      socket.on('disconnect', () => {
        // console.log('User disconnected');
      });
    });

    // Routes

    // Get all users
    app.get('/users', async (req, res) => {
      const cursor = userCollection.find({});
      const users = await cursor.toArray();
      res.send(users);
    });

    // Create new user
    app.post('/users', async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null });
      }
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    // Add task
    app.post('/tasks', async (req, res) => {
      const task = req.body;
      const result = await taskCollection.insertOne(task);
      io.emit('newTask', task); // Broadcast new task to all clients
      res.send(result);
    });

    // Get all tasks
    app.get('/tasks', async (req, res) => {
      const cursor = taskCollection.find({});
      const tasks = await cursor.toArray();
      res.send(tasks);
    });

    // Get single task by ID
    app.get('/tasks/:id', async (req, res) => {
      const id = req.params.id;
      
      const query = { _id: new ObjectId(id) };
      const task = await taskCollection.findOne(query);
      res.send(task);
    });

    // Delete task
    app.delete('/tasks/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await taskCollection.deleteOne(query);
      io.emit('newTask', result); // Broadcast task deletion to all clients
      res.send(result);
    });

    // Update task
    app.patch('/tasks/:id', async (req, res) => {
      const id = req.params.id;
      const updatedTask = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedDocument = {
        $set: updatedTask,
      };
      const result = await taskCollection.findOneAndUpdate(
        query,
        updatedDocument,
        { returnDocument: 'after' }
      );
      io.emit('newTask', updatedTask); // Broadcast updated task to all clients
      res.send(result);
    });


    // update category drag and drop
    app.patch("/tasks/category/:id", async (req, res) => {
      const { id } = req.params;
      const { category } = req.body;
    
      try {
        const result = await db.collection("tasks").updateOne(
          { _id: new ObjectId(id) },
          { $set: { category } }
        );
    
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Task not found" });
        }
    
        res.json({ message: "Task updated successfully" });
      } catch (error) {
        res.status(500).json({ message: "Error updating task", error });
      }
    });

    // Test MongoDB connection
    // await client.db('admin').command({ ping: 1 });
    // console.log('Successfully connected to MongoDB!');
  } finally {
    // Ensure client will close when finished
    // await client.close();
  }
}
run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send('Task API is waiting...');
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});