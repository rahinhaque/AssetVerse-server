import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";

const PORT = process.env.PORT || 5000;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@simple-crud-sever.mcwoj3p.mongodb.net/?appName=simple-crud-sever`;

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

    const db = client.db("assetVerse");
    const hrCollections = db.collection("hrCollections");

    //Hr's APIS
    // Inside your run() function, after const hrCollections = db.collection("hrCollections");

    // Register HR
    app.post("/register/hr", async (req, res) => {
      try {
        const hrData = req.body;

        // Basic validation
        if (
          !hrData.name ||
          !hrData.companyName ||
          !hrData.email ||
          !hrData.password ||
          !hrData.dateOfBirth
        ) {
          return res.status(400).send({
            success: false,
            message: "Please fill in all required fields",
          });
        }

        // Check if email already exists
        const existingHR = await hrCollections.findOne({ email: hrData.email });
        if (existingHR) {
          return res.status(400).send({
            success: false,
            message: "Email already registered",
          });
        }

        // Add auto-assigned fields
        const hrUser = {
          ...hrData,
          role: "hr",
          packageLimit: 5,
          currentEmployees: 0,
          subscription: "basic",
          createdAt: new Date(),
        };

        // Insert into MongoDB
        const result = await hrCollections.insertOne(hrUser);

        res.status(201).send({
          success: true,
          message: "HR registered successfully",
          data: result,
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({
          success: false,
          message: "Server error",
        });
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

app.get("/", (req, res) => res.send("Server running"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
