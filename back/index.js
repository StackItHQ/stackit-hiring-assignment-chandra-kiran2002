const express = require("express");
const path = require("path");
const multer = require("multer");
const csvParser = require("csv-parser");
const bodyParser = require('body-parser');
const { DataFrame } = require('dataframe-js');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require("fs");


const app = express();
app.use(bodyParser.json());
app.use(cors());

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + ".csv");
    console.log("cdaca");
  },
});

const maxSize = 1 * 1000 * 1000 * 1000 * 1000; // 1TB

var upload = multer({
  storage: storage,
  limits: { fileSize: maxSize },
  fileFilter: function (req, file, cb) {
    var filetypes = /csv/;
    var mimetype = filetypes.test(file.mimetype);
    var extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }

    cb("Error: File upload only supports CSV files.");
  },
}).single("csvFile");

app.post("/uploadCSVFile", function (req, res, next) {
  upload(req, res, function (err) {
    if (err) {
      res.status(400).json({ error: err });
    } else {
      const filePath = req.file.path;
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (data) => results.push(data))
        .on("end", () => {
          // Process the parsed CSV data (results array) as needed
          const df = new DataFrame(results);
          console.log(df.listColumns())
          res.json({
            message: "Success, CSV file uploaded and parsed!",
            data: df.listColumns(),
            file:filePath
          });

          // Remove the uploaded file after processing if needed
          // fs.unlinkSync(filePath);
        })
        .on("error", (error) => {
          res.status(500).json({ error: "Error parsing CSV: " + error.message });
        });
    }
  });
});

// Add a new route for filtering rows
app.post("/selectCSV", function (req, res) {
  console.log("in selectCSV")
  var path = req.body.path
  var columns = req.body.columns.split("@");
  console.log(columns)
  const results = [];

      fs.createReadStream(path)
        .pipe(csvParser())
        .on("data", (data) => results.push(data))
        .on("end", () => {
          // Process the parsed CSV data (results array) as needed
          const df = new DataFrame(results);
          const new_df = df.select(...columns)
          const csvData = new_df.toCSV(true); // Pass true to include the header row
          fs.writeFileSync(path, csvData);
          // Remove the uploaded file after processing if needed
          // fs.unlinkSync(filePath);
        })

  res.send("Received")

});

app.post('/download-csv', (req, res) => {
  // Replace 'your-csv-file.csv' with the path to your CSV file
  const filePath = req.body.fileName;
  console.log(filePath)


  // Read the CSV file from the server
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }

    // Set response headers for CSV file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');

    // Stream the CSV data as a response
    res.status(200).send(data);
  });
});

app.post("/filterCSV", function (req, res) {
  var path = req.body.path
  var columns = req.body.columns.split("@");
  const results = [];

      fs.createReadStream('./uploads/csvFile-1696082308117.csv')
        .pipe(csvParser())
        .on("data", (data) => results.push(data))
        .on("end", () => {
          // Process the parsed CSV data (results array) as needed
          const df = new DataFrame(results);
          const new_df = df.select(...columns)
          const csvData = new_df.toCSV(true); // Pass true to include the header row
          fs.writeFileSync('./uploads/csvFile-1696082308117.csv', csvData);
          // Remove the uploaded file after processing if needed
          // fs.unlinkSync(filePath);
        })

  res.send("Received")

});
app.post('/sendEmail', async (req, res) => {
  var toEmail = req.body.email
  var path = req.body.path
  console.log(path)


  // Create a Nodemailer transporter with your email provider's configuration
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // Use your email provider here
    port: 587,                      // Update with your SMTP port
    secure: false,   
    auth: {
      user: 'dummy.python10@gmail.com', // Your email address
      pass: 'tzxyxuwrgrdrnwbe', // Your email password or an app-specific password
    },
  });

  const mailOptions = {
    from: 'dummy.python10@gmail.com', // Your email address
    to: toEmail,
    subject: "CSV Importer",
    text: "Find your csv file below",
    attachments: [
      {
        filename: 'file.csv', // Name of the attached file
        content: fs.createReadStream(path), // Path to the attachment file
      },
    ],
  };

  try {
    // Send the email
    await transporter.sendMail(mailOptions);
    res.status(200).send('Email sent successfully.');
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send('Error sending email.');
  }
});

app.listen(8000, function (error) {
  if (error) throw error;
  console.log("Server created Successfully on PORT 8000");
});
