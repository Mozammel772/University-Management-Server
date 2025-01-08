const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
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
        expiresIn: "1h",
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

    // In-memory storage for verification data (use a database in production)
    const verificationData = {};

    // Nodemailer setup
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for port 465, false for other ports
      auth: {
        user: "mdmozammelhosen15701@gmail.com",
        pass: "efbsllcsjefrtqkm",
      },
    });

    // Generate a 6-digit verification code
    const generateVerificationCode = () =>
      Math.floor(100000 + Math.random() * 900000);

    // Endpoint to send or resend the verification code
    app.post("/send-verification", async (req, res) => {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required!" });
      }
      const verificationCode = generateVerificationCode();
      const expirationTime = Date.now() + 5 * 60 * 1000; // Code valid for 5 minutes

      // Save or update verification data
      verificationData[email] = {
        code: verificationCode,
        expiresAt: expirationTime,
      };
      const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f9f9f9;
        color: #333333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border: 1px solid #dddddd;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        padding: 10px 0;
        border-bottom: 1px solid #dddddd;
      }
      .header h1 {
        font-size: 24px;
        color: #444444;
      }
      .content {
        text-align: center;
        padding: 20px;
      }
      .content h2 {
        font-size: 28px;
        color: #007BFF;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        color: #888888;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Crypto Verification</h1>
      </div>
      <div class="content">
        <p>Dear User,</p>
        <p>Your verification code is:</p>
        <h2>${verificationCode}</h2>
        <p>This code will expire in <strong>5 minutes</strong>.</p>
        <p>If you did not request this code, please ignore this email.</p>
      </div>
      <div class="footer">
        <p>&copy; 2024 Crypto Inc. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;
      try {
        // Send verification email
        await transporter.sendMail({
          from: `"Crypto" <${"mdmozammelhosen15701@gmail.com"}>`,
          to: email,
          subject: "Your Verification Code",
          // text: `Your verification code is ${verificationCode}. This code expires in 5 minutes.`,
          html: htmlContent,
        });

        res.status(200).json({
          message: "Verification email sent!",
          expirationTime: expirationTime,
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to send verification email." });
      }
    });

    // Endpoint to verify the code
    app.post("/verify-code", (req, res) => {
      const { email, code } = req.body;

      if (!email || !code) {
        return res
          .status(400)
          .json({ message: "Email and code are required!" });
      }

      const data = verificationData[email];

      if (!data) {
        return res
          .status(400)
          .json({ message: "No verification data found for this email!" });
      }

      if (Date.now() > data.expiresAt) {
        return res
          .status(400)
          .json({ message: "Verification code has expired!" });
      }

      if (Number(code) !== data.code) {
        return res.status(400).json({ message: "Invalid verification code!" });
      }

      // Code verified successfully
      delete verificationData[email]; // Clean up after verification
      res.status(200).json({ message: "Email verified successfully!" });
    });

    // Register user oo Google Login User collection Api Methods
    app.post("/register-users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send("User already exists");
      }
      const formattedDate = moment().format("YYYY-MM-DD HH:mm:ss");
      const imgUrl = "https://i.ibb.co.com/4Vg7qxJ/4042356.png";
      const newUser = {
        createdAt: formattedDate,
        role: "user",
        imgUrl: imgUrl,
        ...user,
      };
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    app.get("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      // console.log("login user", email);
      const result = await userCollection.findOne(query);
      if (!result) {
        return res.status(404).send("User not found");
      }
      res.send(result);
    });

    app.patch("/profile/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const { firstName, lastName, address, phone, imageUrl } = req.body;

      const query = { email };
      const updateProfile = {
        $set: {
          firstName,
          lastName,
          address,
          phone,
          ...(imageUrl && { imgUrl: imageUrl }), // Only update imgUrl if provided
        },
      };

      try {
        const result = await userCollection.updateOne(query, updateProfile);
        if (result.matchedCount === 0) {
          return res.status(404).send("User not found");
        }
        res.send({ success: true, message: "Profile updated successfully" });
      } catch (error) {
        res.status(500).send("Internal Server Error");
      }
    });

    app.patch("/update-password/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).send("Old and new passwords are required");
      }

      try {
        const query = { email: email };

        // Check if the user exists
        const user = await userCollection.findOne(query);
        if (!user) {
          return res.status(404).send("User not found");
        }

        // Validate old password (direct string comparison)
        if (user.password !== oldPassword) {
          return res.status(401).send("Old password is incorrect");
        }

        // Update password in the database
        const update = { $set: { password: newPassword } };
        const updateResult = await userCollection.updateOne(query, update);

        if (updateResult.modifiedCount === 0) {
          return res.status(500).send("Failed to update password");
        }

        res.send("Password updated successfully");
      } catch (error) {
        res.status(500).send("An error occurred while updating the password");
      }
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
