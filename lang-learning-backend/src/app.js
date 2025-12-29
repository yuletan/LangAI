const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/apiRoutes");

const app = express();

app.use(express.json());
app.use(cors());

// Mount API routes
app.use("/api", apiRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Language Learning Backend API");
});

module.exports = app;
