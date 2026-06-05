const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Standard class-style middleware configurations
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());

// MongoDB client initialization following your teacher's configuration pattern
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function runServer() {
  try {
    // Connect local code to your remote MongoDB deployment
    await client.connect();
    console.log("🎒 Successfully linked local server to MongoDB Cluster!");

    // Custom lowercase variable shapes matching assignment preferences
    const database = client.db("ideavault");
    const ideacollection = database.collection("ideas");
    const commentcollection = database.collection("comments");

    // ----------------------------------------------------
    // PUBLIC ROUTES
    // ----------------------------------------------------

    // Baseline root confirmation endpoint
    app.get("/", (req, res) => {
      res.send("IdeaVault Node API is running smoothly...");
    });

    // CRITICAL FIX: Real Trending Endpoint utilizing explicit MongoDB limits
    app.get("/ideas/trending", async (req, res) => {
      try {
        const trendingideas = await ideacollection
          .find()
          .sort({ commentCount: -1 }) // Highest interactive comments first
          .limit(6)                  // Restrict data flow to exactly 6 records
          .toArray();
          
        res.send(trendingideas);
      } catch (error) {
        res.status(500).send({ message: "Failed to load trending items", error });
      }
    });

  } catch (error) {
    console.error("❌ Database connection structural failure:", error);
  }
}

// Invoke connection sequence
runServer().catch(console.dir);

app.listen(port, () => {
  console.log(`🚀 IdeaVault Express server active on local port: ${port}`);
});