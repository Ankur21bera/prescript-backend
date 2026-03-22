import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import doctorModel from "../models/doctorModel.js";
import { v2 as cloudinary } from "cloudinary";
import appoinmentModel from "../models/appointmentModel.js";
import { io } from "../server.js";
import userModel from "../models/userModel.js";


// api for admin login--
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.json({ success: true, token });
    }
    res.json({ success: false, message: "Invalid Credentials" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// api for add doctor--
export const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
    } = req.body;
    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !degree ||
      !experience ||
      !about ||
      !fees ||
      !address
    ) {
      return res.json({ success: false, message: "Please Fill All Fields" });
    }
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Please Enter Valid Email" });
    }
    if (password.length > 8) {
      return res.json({
        success: false,
        message: "Password Is Weak Please Enter Wrong Password",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const upload = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "image",
    });

    const doctor = new doctorModel({
      name,
      email,
      password: hashedPassword,
      image: upload.secure_url,
      speciality,
      degree,
      experience,
      about,
      fees,
      address: JSON.parse(address),
      date: Date.now(),
    });

    await doctor.save();
    res.json({ success: true, message: "Doctor Add Successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// api to list all doctors--
export const listDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find({});
    res.json({ success: true, doctors });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// api to delete doctors--
export const deleteDoctors = async (req, res) => {
  try {
    const { id } = req.params;
    await doctorModel.findByIdAndDelete(id);
    res.json({ success: true, message: "Doctor Delete Successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// api to update doctor--
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
      password,
    } = req.body;

    const doctor = await doctorModel.findById(id);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor Not Found" });
    }

    if (email && !validator.isEmail(email)) {
      return res.json({ success: false, message: "Invalid Email" });
    }

    let imageUrl = doctor.image;
    if (req.file) {
      const upload = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
      });
      imageUrl = upload.secure_url;
    }

    let hashedPassword = doctor.password;
    if (password) {
      if (password.length < 8) {
        return res.json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updatedDoctor = await doctorModel.findByIdAndUpdate(
      id,
      {
        name: name || doctor.name,
        email: email || doctor.email,
        password: hashedPassword,
        speciality: speciality || doctor.speciality,
        degree: degree || doctor.degree,
        experience: experience || doctor.experience,
        about: about || doctor.about,
        fees: fees || doctor.fees,
        image: imageUrl,
        address: address ? JSON.parse(address) : doctor.address,
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Doctor Updated Successfully",
      doctor: updatedDoctor,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ADMIN APPROVES OFFLINE PAYMENT
export const approveOfflinePayment = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appointment = await appoinmentModel.findById(appointmentId);

    if (!appointment) {
      return res.json({
        success: false,
        message: "Appointment Not Found",
      });
    }

    if (appointment.paymentMethod !== "offline") {
      return res.json({
        success: false,
        message: "This is not an offline payment request",
      });
    }

    if (appointment.paymentStatus !== "requested") {
      return res.json({
        success: false,
        message: "Payment not requested or already approved",
      });
    }

    appointment.paymentStatus = "paid";
    appointment.payment = true;

    await appointment.save();

    io.to(appointment.userId.toString()).emit("offline-payment-approved", {
      appointmentId: appointment._id,
      paymentStatus: "paid",
      message: "Your offline payment has been approved!",
    });

    res.json({
      success: true,
      message: "Offline payment approved successfully",
      appointment,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const appointmentAdmin = async (req, res) => {
  try {
    const appointments = await appoinmentModel.find({});
    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};



// CANCEL APPOINTMENT (ADMIN)
export const appointmentCancel = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const appointmentData = await appoinmentModel.findById(appointmentId);
    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    if (appointmentData.cancelled) {
      // Already cancelled
      return res.json({
        success: false,
        message: "Appointment already cancelled",
        appointment: appointmentData,
      });
    }

    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);

    // Update doctor slots
    let slots_booked = doctorData.slots_booked || {};
    if (slots_booked[slotDate]) {
      slots_booked[slotDate] = slots_booked[slotDate].filter(
        (slot) => slot !== slotTime
      );
      await doctorModel.findByIdAndUpdate(docId, { slots_booked });
    }

    // Mark appointment as cancelled
    appointmentData.cancelled = true;
    appointmentData.cancelledBy = "admin";

    // Add notification
    const notificationMessage = `Your appointment with Dr. ${doctorData.name} on ${slotDate} at ${slotTime} has been cancelled due to some reason.`;
    if (!appointmentData.notifications) appointmentData.notifications = [];
    appointmentData.notifications.push({ message: notificationMessage });

    await appointmentData.save();

    // Emit real-time notification to user
    io.to(appointmentData.userId.toString()).emit("appointment-cancelled", {
      message: notificationMessage,
      appointment: appointmentData,
    });

    res.json({
      success: true,
      message: "Appointment Cancelled",
      appointment: appointmentData,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


export const adminDashboard = async (req,res) => {
  try {
    const doctorCount = await doctorModel.countDocuments()
    const userCount = await userModel.countDocuments()
    const appointmetCount = await appoinmentModel.countDocuments()

     const latestAppointments = await appoinmentModel
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "name email") 
      .populate("docId", "name speciality")
      .lean();

      return res.json({success:true,message:"Dashboard Data Fetch Successfully",
        data: {
        doctors: doctorCount,
        patients: userCount,
        appointments: appointmetCount,
        latestAppointments,
      },
      })
  } catch (error) {
   console.log(error);
   res.json({success:false,message:error.message}) 
  }
}