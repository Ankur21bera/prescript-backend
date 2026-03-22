import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appoinmentModel from "../models/appointmentModel.js";
import Razorpay from "razorpay";
import crypto from "crypto";

// export const registerUser = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;
//     if (!name || !email || !password) {
//       return res.json({ success: false, message: "Please Fill All Fields" });
//     }
//     if (!validator.isEmail(email)) {
//       return res.json({ success: false, message: "Please Enter Valid Email" });
//     }
//     const exists = await userModel.findOne({ email });
//     if (exists) {
//       return res.json({ success: false, message: "User Is Already Exist" });
//     }
//     if (password.length < 8) {
//       return res.json({
//         success: false,
//         message: "Please Enter Strong Password",
//       });
//     }
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);
//     const user = new userModel({
//       name,
//       email,
//       password: hashedPassword,
//     });
//     await user.save();
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "7d",
//     });
//     res.json({ success: true, message: "Registration Successfull", token });
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: error.message });
//   }
// };

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Please Fill All Fields" });
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Please Enter Valid Email" });
    }

    const exists = await userModel.findOne({ email });
    if (exists) {
      return res.json({ success: false, message: "User Is Already Exist" });
    }

    if (password.length < 8) {
      return res.json({
        success: false,
        message: "Please Enter Strong Password",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new userModel({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Generate Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // 👉 Send token + user data
    res.json({
      success: true,
      message: "Registration Successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image ?? "",
      },
    });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User Is Not Registered" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Password Is Incorrect" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const forgotPassword = async (req,res) => {
    try {
        const {email} = req.body;
        if(!email){
            return res.json({success:false,message:"Please Enter Email"})
        }
        const user = await userModel.findOne({email});
        if(!user){
            return res.json({success:false,message:"User Is Not Found"})
        }

        user.resetAllowed = true;
        await user.save();

        return res.json({success:true,message:"Password Reset Successfully"})

    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export const resetPassword = async (req,res) => {
    try {
        const {newPassword} = req.body;
        if(!newPassword){
            return res.json({success:false,message:"Please Enter Password"})
        }
        if(newPassword.length < 8) {
            return res.json({success:false,message:"Please Enter Strong Password"})
        }
        const user = await userModel.findOne({resetAllowed:true});
        if (!user) {
        return res.json({
         success: false,
        message: "No user allowed for password reset",
        });
       }

       const salt = await bcrypt.genSalt(10);
       const hashedPassword = await bcrypt.hash(newPassword,salt);

       user.password = hashedPassword;
       user.resetAllowed = false;
       await user.save();

       return res.json({success:true,message:"Password Reset Successfully"})

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// api to get user profile update--
export const getProfile = async (req,res) => {
    try {
        const userId = req.userId;
        const userData = await userModel.findById(userId).select("-password");
        if(!userData){
            return res.json({success:false,message:"User Not Found"})
        }
        res.json({success:true,userData})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

// api to get update profile--

export const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, phone, address, dob, gender } = req.body;
        const imageFile = req.file;

        if (!name || !phone || !address || !dob || !gender) {
            return res.json({
                success: false,
                message: "Please Fill All Details",
            });
        }

    
        await userModel.findByIdAndUpdate(userId, {
            name,
            phone,
            address: JSON.parse(address),
            dob,
            gender,
        });

      
        if (imageFile) {
            const upload = await cloudinary.uploader.upload(imageFile.path, {
                resource_type: "image",
            });

            await userModel.findByIdAndUpdate(userId, {
                image: upload.secure_url,
            });
        }

       
        const updatedUser = await userModel.findById(userId).select("-password");

       
        res.json({
            success: true,
            message: "Profile Updated Successfully",
            updatedUser, 
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};


export const bookAppointment = async (req,res) => {
    try {
        const userId = req.userId;
        const {docId,slotDate,slotTime} = req.body;
        const docData = await doctorModel.findById(docId).select('-password');
        if(!docData.available){
            return res.json({success:false,message:"Doctor Is Not Available Please Try Another Slot"})
        }
        let slots_booked = docData.slots_booked || {};
        if(!slots_booked[slotDate]) slots_booked[slotDate] = [];

        if(slots_booked[slotDate].length >= 10) {
            return res.json({success:false,message:"Doctor Slot Is Full Please Try Another Slot"})
        }
        const alreadyBooked = await appoinmentModel.findOne({
            userId,
            docId,
            slotDate,
            slotTime,
             cancelled: { $ne: true },
             isCompleted: { $ne: true }
        })
        if(alreadyBooked){
            return res.json({success:false,message:"You Have Already Book This Appointment"})
        }

        if(slots_booked[slotDate].includes(slotTime)){
            return res.json({success:false,message:"This Slot Is Already Book"})
        }
        slots_booked[slotDate].push(slotTime);

        const userData = await userModel.findById(userId).select("-password");
        if(!userData){
            return res.json({ success: false, message: "User Not Found" });
        }
        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount:docData.fees,
            slotDate,
            slotTime,
            date:Date.now()
        }
        const newAppt = new appoinmentModel(appointmentData);
        await newAppt.save();

        await doctorModel.findByIdAndUpdate(docId,{slots_booked});
        return res.json({success:true,message:"Appointment Booked Successfully",appointment:newAppt})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export const listAppointment = async (req,res) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.json({success:false,message:"User Id Is Missing"})
        }
        const appointments = await appoinmentModel.find({userId});
        return res.json({success:true,appointments})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

// api to cancel appointment---
export const cancelAppointment = async (req,res) => {
    try {
        const {appointmentId} = req.body;
        const userId = req.userId;
        const appoinment = await appoinmentModel.findById(appointmentId);
        if(!appoinment){
            return res.json({success:false,message:"Appointment Not Found"})
        }
        if(appoinment.userId.toString() !== userId.toString()){
            return res.json({ success: false, message: "Unauthorized Action" });
        }
        const {docId,slotDate,slotTime} = appoinment;
        const doctor = await doctorModel.findById(docId);

         if (doctor && doctor.slots_booked[slotDate]) {
           doctor.slots_booked[slotDate] = doctor.slots_booked[slotDate].filter(
          (slot) => slot !== slotTime
         );

         await doctorModel.findByIdAndUpdate(docId, {
         slots_booked: doctor.slots_booked,
         });
       }

       await appoinmentModel.findByIdAndUpdate(appointmentId,{
        cancelled:true,
        cancelledBy:"user",
       })

       return res.json({success:true,message:"Appointment Cancelled Successfully"})

    } catch (error) {
         console.log(error);
         res.json({ success: false, message: error.message });
    }
}


export const requestOfflinePayment = async (req,res) => {
    try {
        const {appointmentId} = req.body;
        const userId = req.userId;
        const appointment = await appoinmentModel.findById(appointmentId);
        if(!appointment){
            return res.json({success:false,message:"Appointment Not Found"})
        }
        if(appointment.userId.toString() !== userId.toString()){
            return res.json({ success: false, message: "Unauthorized Action" });
        }
        if (appointment.paymentStatus === "paid") {
            return res.json({ success: false, message: "Payment Already Completed" });
        }
        
        appointment.paymentMethod = "offline";
        appointment.paymentStatus = "requested";

        await appointment.save()

        res.json({success:true,message:"Offline Payment Request Sent"})

    } catch (error) {
         console.log(error);
        res.json({ success: false, message: error.message });
    }
}


export const razorpayInstance = new Razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET
})



export const createRazorpayOrder = async (req,res) => {
    try {
        const {appointmentId} = req.body;
        const appointment = await appoinmentModel.findById(appointmentId);

        if(!appointment || appointment.cancelled) {
            return res.json({success:false,message:"Appointment Not Found"})
        }
        const options = {
            amount:appointment.amount * 100,
            currency:process.env.CURRENCY || "INR",
            receipt:appointmentId
        }
        const order = await razorpayInstance.orders.create(options);
        res.json({success:true,order});
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      const order = await razorpayInstance.orders.fetch(razorpay_order_id);

      await appoinmentModel.findByIdAndUpdate(order.receipt, {
        payment: true,
        paymentStatus: "paid",
      });

      return res.json({
        success: true,
        message: "Payment Is Successfull",
      });
    }

    return res.json({
      success: false,
      message: "Invalid Signature",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


export const getLatestAppointmentNotification = async (req, res) => {
  try {
    const userId = req.userId; // from auth middleware

    if (!userId) {
      return res.json({ success: false, message: "User ID not found" });
    }

    // Find the latest appointment for this user with a notification
    const appointment = await appoinmentModel.findOne({ userId })
      .sort({ "notifications.date": -1 }) // latest notification first
      .select("notifications docData slotDate slotTime isCompleted cancelled");

    if (!appointment || !appointment.notifications || appointment.notifications.length === 0) {
      return res.json({ success: false, message: "No notifications found" });
    }

    // Get the latest notification
    const latestNotification = appointment.notifications[appointment.notifications.length - 1];

    res.json({
      success: true,
      notification: latestNotification.message,
      appointmentId: appointment._id,
      doctorName: appointment.docData.name,
      slotDate: appointment.slotDate,
      slotTime: appointment.slotTime,
      status: appointment.isCompleted
        ? "completed"
        : appointment.cancelled
        ? "cancelled"
        : "upcoming",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};