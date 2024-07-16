const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const bcrypt = require("bcryptjs");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    // credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.DB_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const uri =
  "mongodb+srv://CashWallet:6i70mcPj5sVxmSxJ@cluster0.3liiwir.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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
    const usersCollection = client.db("Cash_Wallet").collection("users");

    // Registration endpoint
    app.post("/register", async (req, res) => {
      const { name, image, email, password } = req.body;
      console.log("from server");
      // Check if the user already exists
      const userExists = await usersCollection.findOne({ email });
      if (userExists) {
        return res.status(400).send("User already exists");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = {
        name,
        image,
        email,
        password: hashedPassword,
        status: "pending",
        balance: 0,
      };

      const result = await usersCollection.insertOne(newUser);

      res.send(result);
    });

    // Login endpoint
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      console.log("login", email, password);
      // Find the user by email
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(400).send("Invalid credentials");
      }

      // Compare the input password with the hashed password in the database
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).send("Invalid credentials");
      }

      const data = {
        nam: user.name,
        image: user.image,
        email: user.email,
        status: "pending",
      };
      res.send(data);
    });

    app.get("/user-balance/:info", async (req, res) => {
      try {
        const info = req.params.info;
        const query = { email: info };
        const result = await usersCollection.findOne(query);

        if (result) {
          res.send(result);
        } else {
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });






    app.patch('/send-money/:email', async (req, res) => {
      const  email  = req.params.email;
      const  amount  = req.body.amount;
  console.log('send money',email,amount);
      try {
         
  
          // Check if recipient exists
          const recipient = await usersCollection.findOne({ email });
  
          if (!recipient) {
              return res.status(404).json({ message: 'Recipient not found' });
          }
  
          // Update recipient's amount
          const newRecipientAmount = parseFloat(recipient.balance) + parseFloat(amount);
  
          const recipientUpdateResult = await usersCollection.updateOne(
              { email },
              { $set: { balance: newRecipientAmount } }
          );
  
          res.status(200).json({ recipient });
      } catch (error) {
          console.error('Error updating recipient amount:', error);
          res.status(500).json({ message: 'Internal server error' });
      }
  });


    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // You can add any cleanup code here if needed
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
