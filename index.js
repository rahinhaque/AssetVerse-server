import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Multer configuration for file upload (stored in memory)
const upload = multer({ storage: multer.memoryStorage() });

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
    console.log("MongoDB connected");

    const db = client.db("assetVerse");
    const hrCollections = db.collection("hrCollections");
    const employeeCollections = db.collection("employeeCollections");
    const packagesCollection = db.collection("packages");
    const assetsCollection = db.collection("assets");
    const requestsCollection = db.collection("requests");
    const employeeAssetsCollection = db.collection("assignedAssets");
    const affiliationCollection = db.collection("employeeAffiliations");

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
        const { name, email, password, dateOfBirth } = req.body;
        if (!name || !email || !password || !dateOfBirth)
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

    // ================= AVAILABLE ASSETS FOR EMPLOYEE REQUESTS =================
    app.get("/assets/available", async (req, res) => {
      try {
        const availableAssets = await assetsCollection
          .find({ availableQuantity: { $gt: 0 } })
          .toArray();

        res.send({ success: true, data: availableAssets });
      } catch (err) {
        console.error(err);
        res.status(500).send({
          success: false,
          message: "Failed to fetch available assets",
        });
      }
    });

    // ================= CREATE ASSET REQUEST (EMPLOYEE) =================
    app.post("/requests", async (req, res) => {
      try {
        const {
          assetId,
          assetName,
          assetType,
          requesterName,
          requesterEmail,
          hrEmail,
          companyName,
          note,
        } = req.body;

        console.log("Incoming request payload:", req.body);

        if (!assetId || !requesterEmail || !hrEmail || !companyName) {
          return res.status(400).send({
            success: false,
            message: "Missing required fields",
          });
        }

        if (!ObjectId.isValid(assetId)) {
          return res.status(400).send({
            success: false,
            message: "Invalid asset ID format",
          });
        }

        const asset = await assetsCollection.findOne({
          _id: new ObjectId(assetId),
          availableQuantity: { $gt: 0 },
        });

        if (!asset) {
          return res.status(400).send({
            success: false,
            message: "Asset not found or not available",
          });
        }

        const newRequest = {
          assetId: new ObjectId(assetId),
          assetName: assetName || asset.productName,
          assetType: assetType || asset.productType,
          requesterName,
          requesterEmail,
          hrEmail,
          companyName,
          requestDate: new Date(),
          approvalDate: null,
          requestStatus: "pending",
          note: note || "",
          processedBy: "",
        };

        const result = await requestsCollection.insertOne(newRequest);

        console.log("Request saved:", result.insertedId);

        res.status(201).send({
          success: true,
          message: "Request submitted successfully",
          data: { ...newRequest, _id: result.insertedId },
        });
      } catch (err) {
        console.error("Request creation error:", err);
        res.status(500).send({
          success: false,
          message: "Server error while submitting request",
        });
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

    // ================= DELETE ASSET =================
    app.delete("/assets/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid asset ID" });
        }

        const result = await assetsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res
            .status(404)
            .send({ success: false, message: "Asset not found" });
        }

        res.send({ success: true, message: "Asset deleted successfully" });
      } catch (err) {
        console.error("Delete asset error:", err);
        res
          .status(500)
          .send({ success: false, message: "Failed to delete asset" });
      }
    });

    // ================= UPDATE ASSET =================
    app.put("/assets/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid asset ID" });
        }

        const { productName, productImage, productType, productQuantity } =
          req.body;

        if (!productName || !productType || productQuantity == null) {
          return res
            .status(400)
            .send({ success: false, message: "Missing required fields" });
        }

        const currentAsset = await assetsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!currentAsset) {
          return res
            .status(404)
            .send({ success: false, message: "Asset not found" });
        }

        const assignedCount =
          currentAsset.productQuantity - currentAsset.availableQuantity;
        const newAvailable = Number(productQuantity) - assignedCount;
        if (newAvailable < 0) {
          return res.status(400).send({
            success: false,
            message: "Cannot reduce quantity below assigned assets",
          });
        }

        const result = await assetsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              productName,
              productImage: productImage || "",
              productType,
              productQuantity: Number(productQuantity),
              availableQuantity: newAvailable,
            },
          }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(400)
            .send({ success: false, message: "Nothing updated" });
        }

        res.send({ success: true, message: "Asset updated successfully" });
      } catch (err) {
        console.error("Update asset error:", err);
        res
          .status(500)
          .send({ success: false, message: "Failed to update asset" });
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

    // ================= NEW: GET EMPLOYEE'S ASSIGNED ASSETS =================
    app.get("/employee/assets/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const assignedAssets = await employeeAssetsCollection
          .find({ employeeEmail: email })
          .toArray();

        res.send({ success: true, data: assignedAssets });
      } catch (err) {
        console.error("Error fetching employee assets:", err);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch employee assets" });
      }
    });

    // ================= NEW: RETURN ASSET ROUTE =================
    app.patch("/assets/return/:assetId", async (req, res) => {
      try {
        const { assetId } = req.params;
        const { employeeEmail } = req.body;

        if (!employeeEmail) {
          return res
            .status(400)
            .send({ success: false, message: "Employee email required" });
        }

        const updateResult = await employeeAssetsCollection.updateOne(
          { assetId: new ObjectId(assetId), employeeEmail },
          { $set: { status: "returned", returnDate: new Date() } }
        );

        if (updateResult.modifiedCount === 0) {
          return res.status(400).send({
            success: false,
            message: "Asset not found or not assigned to you",
          });
        }

        await assetsCollection.updateOne(
          { _id: new ObjectId(assetId) },
          { $inc: { productQuantity: 1, availableQuantity: 1 } }
        );

        res.send({ success: true, message: "Asset returned successfully" });
      } catch (err) {
        console.error("Return asset error:", err);
        res
          .status(500)
          .send({ success: false, message: "Failed to return asset" });
      }
    });

    // ================= NEW: GET EMPLOYEE'S AFFILIATIONS =================
    app.get("/employee/affiliations/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const affiliations = await affiliationCollection
          .find({ employeeEmail: email, status: "active" })
          .toArray();

        res.send({ success: true, data: affiliations });
      } catch (err) {
        console.error("Error fetching affiliations:", err);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch affiliations" });
      }
    });

    // ================= UPDATE EMPLOYEE PROFILE (WITH PHOTO UPLOAD SUPPORT) =================
    app.patch("/employee/profile", upload.single("photo"), async (req, res) => {
      try {
        const email = req.headers["x-user-email"];
        if (!email) {
          return res
            .status(401)
            .send({ success: false, message: "Unauthorized - missing email" });
        }

        const { name, dateOfBirth } = req.body;
        const photo = req.file;

        const updateFields = {};
        if (name) updateFields.name = name;
        if (dateOfBirth) updateFields.dateOfBirth = new Date(dateOfBirth);

        if (photo) {
          const base64 = photo.buffer.toString("base64");
          updateFields.photoURL = `data:${photo.mimetype};base64,${base64}`;
        }

        if (Object.keys(updateFields).length === 0) {
          return res
            .status(400)
            .send({ success: false, message: "No data to update" });
        }

        const result = await employeeCollections.updateOne(
          { email },
          { $set: updateFields }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(400)
            .send({ success: false, message: "Nothing updated" });
        }

        res.send({ success: true, message: "Profile updated successfully" });
      } catch (err) {
        console.error("Profile update error:", err);
        res
          .status(500)
          .send({ success: false, message: "Failed to update profile" });
      }
    });

    // ================= NEW: HR DIRECT ASSET ASSIGNMENT =================
    app.post("/hr/assign-asset", async (req, res) => {
      try {
        const { employeeEmail, assetId } = req.body;

        if (!employeeEmail || !assetId) {
          return res
            .status(400)
            .send({
              success: false,
              message: "Employee email and asset ID required",
            });
        }

        if (!ObjectId.isValid(assetId)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid asset ID" });
        }

        // Check if asset is available
        const asset = await assetsCollection.findOne({
          _id: new ObjectId(assetId),
          availableQuantity: { $gt: 0 },
        });

        if (!asset) {
          return res
            .status(400)
            .send({
              success: false,
              message: "Asset not available or not found",
            });
        }

        // Get employee name for assignment
        const employee = await employeeCollections.findOne({
          email: employeeEmail,
        });
        if (!employee) {
          return res
            .status(404)
            .send({ success: false, message: "Employee not found" });
        }

        // Decrement asset quantity
        await assetsCollection.updateOne(
          { _id: new ObjectId(assetId) },
          { $inc: { productQuantity: -1, availableQuantity: -1 } }
        );

        // Create assignment record
        await employeeAssetsCollection.insertOne({
          assetId: new ObjectId(assetId),
          assetName: asset.productName,
          assetImage: asset.productImage || "",
          assetType: asset.productType,
          employeeEmail,
          employeeName: employee.name,
          hrEmail: asset.hrEmail,
          companyName: asset.companyName,
          assignmentDate: new Date(),
          returnDate: null,
          status: "assigned",
        });

        // Ensure affiliation exists
        await affiliationCollection.updateOne(
          { employeeEmail },
          {
            $set: {
              employeeName: employee.name,
              hrEmail: asset.hrEmail,
              companyName: asset.companyName,
              companyLogo: "",
              affiliationDate: new Date(),
              status: "active",
            },
          },
          { upsert: true }
        );

        res.send({
          success: true,
          message: "Asset assigned successfully to employee",
        });
      } catch (err) {
        console.error("HR assign asset error:", err);
        res
          .status(500)
          .send({ success: false, message: "Failed to assign asset" });
      }
    });

    // ================= APPROVE REQUEST (GUARANTEED AFFILIATION) =================
    app.patch("/requests/:id/approve", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid request ID format" });
        }

        const request = await requestsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!request) {
          return res
            .status(404)
            .send({ success: false, message: "Request not found" });
        }

        if (request.requestStatus === "Approved") {
          return res.send({
            success: true,
            message: "Request already approved",
          });
        }

        if (request.requestStatus !== "pending") {
          return res
            .status(400)
            .send({ success: false, message: "Request cannot be approved" });
        }

        // Guard against missing fields
        if (
          !request.requesterEmail ||
          !request.requesterName ||
          !request.companyName
        ) {
          return res
            .status(400)
            .send({ success: false, message: "Missing employee data" });
        }

        // Safe assetId
        let assetObjectId;
        if (!request.assetId) {
          return res
            .status(400)
            .send({ success: false, message: "Missing asset ID in request" });
        }
        if (typeof request.assetId === "string") {
          assetObjectId = new ObjectId(request.assetId);
        } else {
          assetObjectId = request.assetId;
        }

        // ALWAYS CREATE AFFILIATION FIRST
        const affiliationResult = await affiliationCollection.updateOne(
          { employeeEmail: request.requesterEmail },
          {
            $set: {
              employeeName: request.requesterName,
              hrEmail: request.hrEmail || "",
              companyName: request.companyName,
              companyLogo: "",
              affiliationDate: new Date(),
              status: "active",
            },
          },
          { upsert: true }
        );

        console.log("Employee affiliated:", affiliationResult);

        // Decrement quantity (ignore if fails)
        try {
          await assetsCollection.updateOne(
            { _id: assetObjectId },
            { $inc: { productQuantity: -1, availableQuantity: -1 } }
          );
        } catch (assetErr) {
          console.log(
            "Asset update failed (out of stock?), but proceeding:",
            assetErr
          );
        }

        // Update request status
        await requestsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              requestStatus: "Approved",
              approvalDate: new Date(),
              processedBy: request.hrEmail || "",
            },
          }
        );

        // Assign asset
        await employeeAssetsCollection.insertOne({
          assetId: assetObjectId,
          assetName: request.assetName || "Unknown",
          assetImage: "",
          assetType: request.assetType || "Unknown",
          employeeEmail: request.requesterEmail,
          employeeName: request.requesterName,
          hrEmail: request.hrEmail || "",
          companyName: request.companyName,
          assignmentDate: new Date(),
          returnDate: null,
          status: "assigned",
        });

        res.send({
          success: true,
          message: "Request approved and employee added to team",
        });
      } catch (err) {
        console.error("Approve error:", err);
        res
          .status(500)
          .send({ success: false, message: "Server error during approval" });
      }
    });

    // ================= REJECT REQUEST =================
    app.patch("/requests/:id/reject", async (req, res) => {
      try {
        const id = req.params.id;
        const { hrEmail } = req.body;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid request ID format" });
        }

        const updateResult = await requestsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              requestStatus: "Rejected",
              processedBy: hrEmail || "",
            },
          }
        );

        if (updateResult.modifiedCount === 0) {
          return res
            .status(404)
            .send({ success: false, message: "Request not found" });
        }

        res.send({ success: true, message: "Request rejected" });
      } catch (err) {
        console.error("Reject error:", err);
        res.status(500).send({ success: false, message: "Reject failed" });
      }
    });

    // ================= MY EMPLOYEE LIST (UPDATED TO INCLUDE dateOfBirth FOR BIRTHDAYS) =================
    app.get("/hr/employees/:companyName", async (req, res) => {
      try {
        const { companyName } = req.params;

        const affiliatedEmployees = await affiliationCollection
          .find({ companyName, status: "active" })
          .toArray();

        const employeeWithDetails = await Promise.all(
          affiliatedEmployees.map(async (aff) => {
            const employeeDetails = await employeeCollections.findOne({
              email: aff.employeeEmail,
            });

            const assetsCount = await employeeAssetsCollection.countDocuments({
              employeeEmail: aff.employeeEmail,
            });

            return {
              employeeName: aff.employeeName,
              employeeEmail: aff.employeeEmail,
              affiliationDate: aff.affiliationDate,
              assetsCount,
              dateOfBirth: employeeDetails?.dateOfBirth || null,
            };
          })
        );

        res.send({ success: true, data: employeeWithDetails });
      } catch (err) {
        console.error("Employee list error:", err);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch employees" });
      }
    });

    // ================= REMOVE EMPLOYEE FROM TEAM =================
    app.delete("/hr/employees/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const result = await affiliationCollection.updateOne(
          { employeeEmail: email },
          { $set: { status: "inactive" } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ success: false, message: "Employee not found" });
        }

        res.send({ success: true, message: "Employee removed from team" });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to remove employee" });
      }
    });

    console.log("Backend API ready!");
  } catch (err) {
    console.error(err);
  }
}

run();

app.get("/", (req, res) => res.send("Server running"));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
