import express, { response } from "express";
import bodyParser from "body-parser";
import mongoose, { mongo } from "mongoose";
import cors from "cors";
import twilio from "twilio";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const accountSid = process.env.SID;
const authToken = process.env.TOKEN;
const client = new twilio(accountSid, authToken);
const twilioPhoneNumber = process.env.TWILIO_NO;

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Generate a random 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

let otpSent;
// Send OTP via Twilio
app.post("/api/sendOtp", (req, res) => {
  const phoneNumber = req.body.number;
  otpSent = generateOTP();

  client.messages
    .create({
      body: `Your OTP is: ${otpSent}`,
      from: twilioPhoneNumber,
      to: phoneNumber,
    })
    .then(() => {
      res.json({ message: "OTP sent successfully" });
    })
    .catch((error) => {
      res.status(500).json({ error: "Failed to send OTP" });
    });
});

// Verify OTP
app.post("/api/verifyOtp", (req, res) => {
  const phoneNumber = req.body.number;
  const otpEntered = req.body.otp;
  if (otpEntered === otpSent) {
    res.status(201).json({ message: "success" });
  } else {
    res.status(400).json({ message: "failure" });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log("Server listening on port " + PORT);
});

try {
  const conn = await mongoose.connect(process.env.URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log(`MongoDB Connected`);
} catch (error) {
  console.error(error.message);
}

const userDataDBSchema = mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String },
  password: { type: String },
  birthday: { type: String },
  mobile: { type: String },
  username: { type: String },
  gender: { type: String },
  member: { type: String },
});

const userDatabaseModel = mongoose.model("usersDatabase", userDataDBSchema);

app.post("/api/addNewUser", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      birthday,
      mobile,
      username,
      gender,
    } = req.body;
    const newUser = new userDatabaseModel({
      firstName,
      lastName,
      email,
      password,
      birthday,
      mobile,
      username,
      gender,
      member: "None",
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: "Error creating User" });
  }
});

app.put("/api/updatePassword", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    await userDatabaseModel.updateOne(
      { email, currentPassword },
      { $set: { password: newPassword } }
    );
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/updateUsername", async (req, res) => {
  try {
    const { email, currentUsername, newUsername } = req.body;
    await userDatabaseModel.updateOne(
      { email, currentUsername },
      { $set: { username: newUsername } }
    );
    res.json({ message: "Username updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/updateMembership", async (req, res) => {
  try {
    const { email, username, membership } = req.body;
    await userDatabaseModel.updateOne(
      { email, username },
      { $set: { member: membership } }
    );
    res.json({ message: "Membership updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/getAllUsers", async (req, res) => {
  try {
    const data = await userDatabaseModel.find({});
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching data" });
  }
});

const transporter = nodemailer.createTransport({
  host: "smtp.forwardemail.net",
  port: 465,
  secure: true,
  auth: {
    // TODO: replace `user` and `pass` values from <https://forwardemail.net>
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});
let otp;
app.post("/api/getotp", async (req, res) => {
  try {
    const { email } = req.body;
    otp = generateOTP();
    let info = await transporter.sendMail({
      from: MAIL_SETTINGS.auth.user,
      to: email,
      subject: "OTP VERIFICATION",
      html: `
      <div
        class="container"
        style="max-width: 90%; margin: auto; padding-top: 20px"
      >
        <h2>Change PassWord.</h2>
        <h4>OTP</h4>
        <p style="margin-bottom: 30px;">Your OTP is :</p>
        <h1 style="font-size: 40px; letter-spacing: 2px; text-align:center;">${otp}</h1>
   </div>
    `,
    });
    res.status(200).json("OTP sent");
  } catch (err) {
    res.status(500).json(err);
  }
});
app.post("/checkotp", async (req, res) => {
  const { otpEntered } = req.body;
  if (otpEntered === otp) {
    res.status(201).json({ message: "success" });
  } else {
    res.status(400).json({ message: "failure" });
  }
});
