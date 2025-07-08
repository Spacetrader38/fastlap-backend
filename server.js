require('dotenv').config();

const express = require("express");
const cors = require("cors");

const app = express();
const paymentRoutes = require('./routes/payment');
const clientInfoRoutes = require('./routes/clientInfo');
const invoiceRoutes = require('./routes/invoice');

app.use(cors());
app.use(express.json());
app.use("/api/payment", paymentRoutes);
app.use('/api/clientInfo', clientInfoRoutes);
app.use('/api/invoice', invoiceRoutes);

let files = [
  {
    name: "Ferrari 499P – Le Mans",
    url: "https://drive.google.com/file/d/1LS5XfrU_0AUe7WqMBAGsOpO614qiGLMq/view?usp=drive_link"
  },
  {
    name: "Porsche 992 – Nürburgring",
    url: "https://drive.google.com/file/d/1C4iSQ5R7BMfsIM6zShn_xXuwDpDKwrgo/view?usp=drive_link"
  }
];

// GET all files
app.get("/files", (req, res) => {
  res.json(files);
});

// POST new file
app.post("/files", (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: "Missing name or url" });
  }
  files.push({ name, url });
  res.status(201).json({ message: "File added" });
});

// DELETE file by index
app.delete("/files/:index", (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0 || index >= files.length) {
    return res.status(400).json({ error: "Invalid index" });
  }
  files.splice(index, 1);
  res.json({ message: "File deleted" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Backend démarré sur le port ${PORT}`));
