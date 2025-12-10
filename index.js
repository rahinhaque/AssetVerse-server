import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
    console.log("✅ MongoDB connected");

    const db = client.db("assetVerse");
    const hrCollections = db.collection("hrCollections");
    const employeeCollections = db.collection("employeeCollections");

    // ================= HR REGISTER =================
    app.post("/register/hr", async (req, res) => {
      const { name, companyName, email, password, dateOfBirth, companyLogo } =
        req.body;

      if (!name || !companyName || !email || !password || !dateOfBirth) {
        return res.status(400).send({
          success: false,
          message: "All fields are required",
        });
      }

      const exists = await hrCollections.findOne({ email });
      if (exists) {
        return res.status(400).send({
          success: false,
          message: "Email already registered",
        });
      }

      const hrUser = {
        name,
        companyName,
        companyLogo: companyLogo || "",
        email,
        password, // ✅ plain text (as requested)
        dateOfBirth,
        role: "hr",
        packageLimit: 5,
        currentEmployees: 0,
        subscription: "basic",
        createdAt: new Date(),
      };

      await hrCollections.insertOne(hrUser);

      res.status(201).send({
        success: true,
        message: "HR registered successfully",
      });
    });

    // ================= HR LOGIN =================
    app.post("/login/hr", async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .send({ success: false, message: "Email & password required" });
      }

      const hr = await hrCollections.findOne({ email });

      if (!hr) {
        return res
          .status(401)
          .send({ success: false, message: "User not found" });
      }

      if (hr.password !== password) {
        return res
          .status(401)
          .send({ success: false, message: "Wrong password" });
      }

      res.send({ success: true, user: hr });
    });

    // ================= EMPLOYEE REGISTER =================
    app.post("/register/employee", async (req, res) => {
      const { name, email, password, dateOfBirth } = req.body;

      if (!name || !email || !password || !dateOfBirth) {
        return res.status(400).send({
          success: false,
          message: "All fields are required",
        });
      }

      const exists = await employeeCollections.findOne({ email });
      if (exists) {
        return res.status(400).send({
          success: false,
          message: "Email already registered",
        });
      }

      const employeeUser = {
        name,
        email,
        password, // ✅ plain text
        dateOfBirth,
        role: "employee",
        createdAt: new Date(),
      };

      await employeeCollections.insertOne(employeeUser);

      res.status(201).send({
        success: true,
        message: "Employee registered successfully",
      });
    });

    // ================= EMPLOYEE LOGIN =================
    app.post("/login/employee", async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .send({ success: false, message: "Email & password required" });
      }

      const employee = await employeeCollections.findOne({ email });

      if (!employee) {
        return res
          .status(401)
          .send({ success: false, message: "User not found" });
      }

      if (employee.password !== password) {
        return res
          .status(401)
          .send({ success: false, message: "Wrong password" });
      }

      res.send({ success: true, user: employee });
    });
  } catch (err) {
    console.error(err);
  }
}

run();

app.get("/", (req, res) => res.send("✅ Server running"));
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
