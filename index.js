// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

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
    const packagesCollection = db.collection("packages");
    const assetsCollection = db.collection("assets");
    const requestsCollection = db.collection("requests");
    const employeeAssetsCollection = db.collection("employeeAssets");
    const affiliationCollection = db.collection("affiliations");

    // ================= PACKAGES ROUTE =================
    app.get("/packages", async (req, res) => {
      try {
        const packages = await packagesCollection.find().toArray();
        res.send({ success: true, data: packages });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch packages" });
      }
    });

    // ================= HR REGISTER =================
    app.post("/register/hr", async (req, res) => {
      try {
        const { name, companyName, email, password, dateOfBirth, companyLogo } =
          req.body;
        if (!name || !companyName || !email || !password || !dateOfBirth)
          return res
            .status(400)
            .send({ success: false, message: "All fields are required" });

        const exists = await hrCollections.findOne({ email });
        if (exists)
          return res
            .status(400)
            .send({ success: false, message: "Email already registered" });

        const hrUser = {
          name,
          companyName,
          companyLogo: companyLogo || "",
          email,
          password,
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
          user: hrUser,
          message: "HR registered successfully",
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    // in server.js
    app.get("/packages", async (req, res) => {
      try {
        const packages = await packagesCollection.find().toArray();
        // make sure to return success + data
        res.send({ success: true, data: packages });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch packages" });
      }
    });

    // ================= HR LOGIN =================
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
        if (hr.password !== password)
          return res
            .status(401)
            .send({ success: false, message: "Wrong password" });

        res.send({ success: true, user: hr });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    // ================= EMPLOYEE REGISTER =================
    app.post("/register/employee", async (req, res) => {
      try {
        const { name, email, password, dateOfBirth, companyName } = req.body;
        if (!name || !email || !password || !dateOfBirth || !companyName)
          return res
            .status(400)
            .send({ success: false, message: "All fields are required" });

        const exists = await employeeCollections.findOne({ email });
        if (exists)
          return res
            .status(400)
            .send({ success: false, message: "Email already registered" });

        const employeeUser = {
          name,
          email,
          password,
          dateOfBirth,
          role: "employee",
          companyName,
          createdAt: new Date(),
        };
        await employeeCollections.insertOne(employeeUser);
        res.status(201).send({
          success: true,
          user: employeeUser,
          message: "Employee registered successfully",
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    // ================= EMPLOYEE LOGIN =================
    app.post("/login/employee", async (req, res) => {
      try {
        const { email, password } = req.body;
        if (!email || !password)
          return res
            .status(400)
            .send({ success: false, message: "Email & password required" });

        const employee = await employeeCollections.findOne({ email });
        if (!employee)
          return res
            .status(401)
            .send({ success: false, message: "User not found" });
        if (employee.password !== password)
          return res
            .status(401)
            .send({ success: false, message: "Wrong password" });

        res.send({ success: true, user: employee });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    // ================= ASSETS CRUD =================
    app.post("/assets", async (req, res) => {
      try {
        const {
          productName,
          productImage,
          productType,
          productQuantity,
          hrEmail,
          companyName,
        } = req.body;
        if (!productName || !productType || typeof productQuantity !== "number")
          return res
            .status(400)
            .send({ success: false, message: "Missing required fields" });

        const asset = {
          productName,
          productImage: productImage || "",
          productType,
          productQuantity,
          availableQuantity: productQuantity,
          hrEmail,
          companyName,
          dateAdded: new Date(),
        };
        const result = await assetsCollection.insertOne(asset);
        res
          .status(201)
          .send({ success: true, data: { ...asset, _id: result.insertedId } });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to create asset" });
      }
    });

    app.get("/assets", async (req, res) => {
      try {
        const { hrEmail, companyName } = req.query;
        const filter = {};
        if (hrEmail) filter.hrEmail = hrEmail;
        if (companyName) filter.companyName = companyName;

        const assets = await assetsCollection.find(filter).toArray();
        res.send({ success: true, data: assets });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch assets" });
      }
    });

    // ================= REQUESTS =================
    app.get("/requests", async (req, res) => {
      try {
        const requests = await requestsCollection.find().toArray();
        res.send(requests);
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch requests" });
      }
    });

    app.patch("/requests/:id/approve", async (req, res) => {
      try {
        const id = req.params.id;
        const request = await requestsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!request)
          return res
            .status(404)
            .send({ success: false, message: "Request not found" });

        await assetsCollection.updateOne(
          { _id: new ObjectId(request.assetId) },
          { $inc: { productQuantity: -1, availableQuantity: -1 } }
        );

        await requestsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "Approved",
              approvalDate: new Date(),
              processedBy: request.hrEmail,
            },
          }
        );

        await employeeAssetsCollection.insertOne({
          employeeEmail: request.requesterEmail,
          employeeName: request.requesterName,
          assetName: request.assetName,
          assetId: request.assetId,
          dateAssigned: new Date(),
        });

        await affiliationCollection.updateOne(
          { employeeEmail: request.requesterEmail },
          {
            $setOnInsert: {
              createdAt: new Date(),
              companyName: request.companyName,
            },
          },
          { upsert: true }
        );

        res.send({ success: true });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Approve failed" });
      }
    });

    app.patch("/requests/:id/reject", async (req, res) => {
      try {
        const id = req.params.id;
        await requestsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "Rejected", processedBy: req.body.hrEmail || "" } }
        );
        res.send({ success: true });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Reject failed" });
      }
    });

    // ================= HR EMPLOYEE MANAGEMENT =================
    app.get("/hr/employees/:companyName", async (req, res) => {
      try {
        const { companyName } = req.params;

        const employees = await employeeCollections
          .find({ companyName })
          .toArray();

        const employeeWithAssets = await Promise.all(
          employees.map(async (emp) => {
            const assetsCount = await employeeAssetsCollection.countDocuments({
              employeeEmail: emp.email,
            });
            return { ...emp, assetsCount };
          })
        );

        res.send({ success: true, data: employeeWithAssets });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch employees" });
      }
    });

    app.delete("/hr/employees/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const result = await employeeCollections.deleteOne({ email });
        if (result.deletedCount === 0)
          return res
            .status(404)
            .send({ success: false, message: "Employee not found" });
        res.send({ success: true, message: "Employee removed" });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to remove employee" });
      }
    });

    console.log("🚀 Backend API ready!");
  } catch (err) {
    console.error(err);
  }
}

run();

app.get("/", (req, res) => res.send("✅ Server running"));
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
