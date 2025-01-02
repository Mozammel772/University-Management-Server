const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const moment = require("moment");
const port = process.env.PORT || 3000;
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

// mongodb server
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@university-management.scjla.mongodb.net/?retryWrites=true&w=majority&appName=University-Management`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const userCollection = client
      .db("University-Management")
      .collection("Register-Users");

    // JWT Authorization
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5m",
      });
      res.send({ token });
    });

    // middlewares Verify Token all User
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    // Register user oo Google Login User collection Api Methods
    app.post("/register-users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send("User already exists");
      }
      const formattedDate = moment().format("YYYY-MM-DD HH:mm:ss");
      const imgUrl = "https://i.ibb.co.com/4Vg7qxJ/4042356.png"
      const newUser = {
        createdAt: formattedDate,
        role: "user",
        imgUrl: imgUrl,
        ...user,
      };
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    
    app.get("/register-users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      console.log(email);
      const result = await userCollection.findOne(query);
      if (!result) {
        return res.status(404).send("User not found");
      }
      res.send(result);
    });

    app.patch("/register-users/:id", async (req, res) => {
      const id = req.params.id;
      const { name } = req.body;
      const filter = { _id: new ObjectId(id) };
      const formattedDate = moment().format("YYYY-MM-DD HH:mm:ss");
      const updateDoc = {
        $set: {
          name: name,
          updatedAt:formattedDate
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.get("/protected", verifyToken, (req, res) => {
      res.send({ message: "Welcome to the protected route!", user: req.user });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

app.listen(port, () => {
  console.log(`Welcome to the API ${port}`);
});
