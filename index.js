import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";

const PORT = process.env.PORT || 5000;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@simple-crud-sever.mcwoj3p.mongodb.net/?appName=simple-crud-sever`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("assetVerse");
    const hrCollections = db.collection("hrCollections");
    const employeeCollections = db.collection("employeeCollections");

    // -----------------------
    // Register HR
    // -----------------------
    app.post("/register/hr", async (req, res) => {
      try {
        const hrData = req.body;

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

        const existingHR = await hrCollections.findOne({ email: hrData.email });
        if (existingHR) {
          return res.status(400).send({
            success: false,
            message: "Email already registered",
          });
        }

        const hrUser = {
          ...hrData,
          role: "hr",
          packageLimit: 5,
          currentEmployees: 0,
          subscription: "basic",
          createdAt: new Date(),
        };

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

    // -----------------------
    // Login HR (Plain-text password)
    // -----------------------
    app.post("/login/hr", async (req, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password)
          return res
            .status(400)
            .send({ success: false, message: "Email & password required" });

        const hr = await hrCollections.findOne({ email });
        if (!hr)
          return res
            .status(401)
            .send({ success: false, message: "User not found" });

        // Compare plain-text password directly
        if (hr.password !== password)
          return res
            .status(401)
            .send({ success: false, message: "Wrong password" });

        res.send({ success: true, message: "Login successful", hr });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    // Register Employee
    app.post("/register/employee", async (req, res) => {
      try {
        const employeeData = req.body;

        // Basic validation
        if (
          !employeeData.name ||
          !employeeData.email ||
          !employeeData.password ||
          !employeeData.dateOfBirth
        ) {
          return res.status(400).send({
            success: false,
            message: "Please fill in all required fields",
          });
        }

        // Check if email already exists
        const existingEmployee = await employeeCollections.findOne({
          email: employeeData.email,
        });

        if (existingEmployee) {
          return res.status(400).send({
            success: false,
            message: "Email already registered",
          });
        }

        // Final employee object
        const employeeUser = {
          name: employeeData.name,
          email: employeeData.email,
          password: employeeData.password, // plain text (for now)
          dateOfBirth: employeeData.dateOfBirth,
          role: "employee",
          createdAt: new Date(),
        };

        // Insert into MongoDB
        const result = await employeeCollections.insertOne(employeeUser);

        res.status(201).send({
          success: true,
          message: "Employee registered successfully",
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

    console.log("MongoDB connected successfully!");
  } finally {
    // client.close(); // Keep connection open for API
  }
}
run().catch(console.dir);

app.get("/", (req, res) => res.send("Server running"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
