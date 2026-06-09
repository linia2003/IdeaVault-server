const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());

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
    await client.connect();
    console.log(" Successfully linked local server to MongoDB Cluster!");

    const database = client.db("ideavault");
    const ideacollection = database.collection("ideas");
    const commentcollection = database.collection("comments");

    app.get("/", (req, res) => {
      res.send("IdeaVault Node API is running smoothly...");
    });

    app.get("/ideas/trending", async (req, res) => {
      try {
        const trendingideas = await ideacollection
          .find()
          .sort({ commentCount: -1 }) 
          .limit(6)                  
          .toArray();                
        res.send(trendingideas);
      } catch (error) {
        console.error("Trending analytics extraction drop:", error);
        res.status(500).send({ message: "Failed to load trending items", error });
      }
    });

    app.get("/ideas/:id", async (req, res) => {
      try {
        const { ObjectId } = require("mongodb");
        const singleId = req.params.id;
        
        const targetedIdea = await ideacollection.findOne({ _id: new ObjectId(singleId) });
        if (!targetedIdea) {
          return res.status(404).json({ success: false, message: "Concept document missing." });
        }
        res.json(targetedIdea);
      } catch (error) {
        res.status(500).json({ success: false, message: "Malformed identifier token parameter handling crash." });
      }
    });

    app.get("/ideas", async (req, res) => {
      try {
        const { search, category } = req.query;
        let databaseQueryFilter = {};

        if (search) {
          databaseQueryFilter.ideaTitle = { $regex: search, $options: "i" };
        }

        if (category && category !== "All") {
          databaseQueryFilter.category = category;
        }

        const matchedIdeas = await ideacollection
          .find(databaseQueryFilter)
          .sort({ createdAt: -1 })
          .toArray();

        res.json(matchedIdeas); 
        
      } catch (error) {
        console.error("Failed to query records from storage core:", error);
        res.status(500).json({ success: false, message: "Internal server read failure.", error });
      }
    });
    
    app.post("/ideas", async (req, res) => {
      try {
        const payloadData = req.body;

        const customIdeaDocument = {
          ideaTitle: payloadData.title || payloadData.ideaTitle, 
          category: payloadData.category || "Tech",
          shortDescription: payloadData.shortDescription,
          detailedDescription: payloadData.detailedDescription,
          tags: Array.isArray(payloadData.tags) ? payloadData.tags : [],
          imageUrl: payloadData.imageUrl,
          estimatedBudget: payloadData.estimatedBudget ? Number(payloadData.estimatedBudget) : null,
          targetAudience: payloadData.targetAudience,
          problemStatement: payloadData.problemStatement,
          proposedSolution: payloadData.proposedSolution,
          commentCount: 0, 
          createdAt: payloadData.createdAt ? new Date(payloadData.createdAt) : new Date()
        };

        const executionTransaction = await ideacollection.insertOne(customIdeaDocument);
        
        res.status(201).send({
          success: true,
          message: "Idea blueprint successfully stamped inside the database cluster context.",
          insertedId: executionTransaction.insertedId
        });
      } catch (error) {
        console.error("Critical block failure writing concept record:", error);
        res.status(500).send({ 
          success: false, 
          message: "Internal framework failed to write document context record safely.", 
          error 
        });
      }
    });

    app.get("/comments/:ideaId", async (req, res) => {
      try {
        const targetFeedback = await commentcollection
          .find({ ideaId: req.params.ideaId })
          .sort({ createdAt: -1 })
          .toArray();
        res.json(targetFeedback);
      } catch (error) {
        res.status(500).json({ success: false, message: "Failed to read feedback tracks." });
      }
    });

    app.post("/comments", async (req, res) => {
      try {
        const { ideaId, userName, userEmail, commentText } = req.body;
        const { ObjectId } = require("mongodb");

        const newCommentDoc = {
          ideaId,
          userName,
          userEmail,
          commentText,
          createdAt: new Date()
        };

        const writeOutcome = await commentcollection.insertOne(newCommentDoc);
        
        await ideacollection.updateOne(
          { _id: new ObjectId(ideaId) },
          { $inc: { commentCount: 1 } }
        );

        res.status(201).json({ success: true, comment: { ...newCommentDoc, _id: writeOutcome.insertedId } });
      } catch (error) {
        res.status(500).json({ success: false, message: "Storage transaction dropped on comment write hook." });
      }
    });

    app.patch("/comments/:commentId", async (req, res) => {
      try {
        const { ObjectId } = require("mongodb");
        const { commentText } = req.body;

        await commentcollection.updateOne(
          { _id: new ObjectId(req.params.commentId) },
          { $set: { commentText, updatedAt: new Date() } }
        );

        res.json({ success: true, message: "Text field committed cleanly." });
      } catch (error) {
        res.status(500).json({ success: false, message: "Operational drop processing text update step." });
      }
    });

    
    app.delete("/comments/:commentId", async (req, res) => {
      try {
        const { ObjectId } = require("mongodb");
        const commentId = req.params.commentId;
        const { ideaId } = req.query;

        await commentcollection.deleteOne({ _id: new ObjectId(commentId) });

        if (ideaId) {
          await ideacollection.updateOne(
            { _id: new ObjectId(ideaId) },
            { $inc: { commentCount: -1 } }
          );
        }

        res.json({ success: true, message: "Document record purged successfully from cluster stack." });
      } catch (error) {
        res.status(500).json({ success: false, message: "Purge process crashed internally." });
      }
    });

    app.listen(port, () => {
      console.log(`🚀 IdeaVault Express server active on local port: ${port}`);
    });

  } catch (error) {
    console.error(" Database connection structural failure:", error);
  }
}

runServer().catch(console.dir);