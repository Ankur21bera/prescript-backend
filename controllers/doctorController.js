import doctorModel from "../models/doctorModel.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { io } from "../server.js";
import appoinmentModel from "../models/appointmentModel.js";

export const changeAvailability = async (req, res) => {
  try {
    const { id } = req.body;

    const docData = await doctorModel.findById(id);
    if (!docData) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const updatedDoctor = await doctorModel.findByIdAndUpdate(
      id,
      { available: !docData.available },
      { new: true }
    );

    res.json({ success: true, updatedDoctor });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const doctorList = async (req,res) => {
    try {
       const doctors = await doctorModel.find({}).select(['-password','-email'])
      res.json({success:true, doctors})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export const loginDoctor = async (req,res) => {
  try {
    const {email,password} = req.body;
    const doctor = await doctorModel.findOne({email});
    if(!doctor) {
        return res.json({success:false,message:"Invalid Credentials"})
    }

    const isMatch = await bcrypt.compare(password,doctor.password)

    if(isMatch) {
        const token = jwt.sign({id:doctor._id},process.env.JWT_SECRET)
        res.json({success:true,token})
    } else{
        res.json({success:false,message:"invalid credentials"})
    }
  } catch (error) {
    console.log(error);
    res.json({success:false,message:error.message})
  }
}


export const appointmentsDoctor = async (req, res) => {
  try {
    const docId = req.doctorId; 

    if (!docId) {
      return res.status(400).json({ success: false, message: "Doctor ID not found" });
    }

    
    const appointments = await appoinmentModel.find({ docId });

    res.status(200).json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const appointmentComplete = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const doctorId = req.doctorId;

    // Fetch appointment
    const appointment = await appoinmentModel.findOne({
      _id: appointmentId,
      docId: doctorId
    });

    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // Prepare message
    const doctorName = appointment.docData.name;
    const date = appointment.slotDate;
    const time = appointment.slotTime;

    const userMessage = `Your appointment with ${doctorName} on ${date} at ${time} has been successfully completed.`;

    // Update appointment
    appointment.isCompleted = true;
    appointment.cancelled = false;
    appointment.notifications = [
      {
        message: userMessage,
        date: new Date(),
        read: false
      }
    ];

    await appointment.save();

    io.to(appointment.userId).emit("appointment-completed", {
  appointmentId,
  message: appointment.notifications[0].message
});


    return res.json({
      success: true,
      message: "Appointment completed successfully",
      notification: userMessage
    });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const appointmentCancel = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const doctorId = req.doctorId;

    const appointment = await appoinmentModel.findOne({
      _id: appointmentId,
      docId: doctorId
    });

    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    const doctorName = appointment.docData.name;
    const date = appointment.slotDate;
    const time = appointment.slotTime;

    const userMessage = `Your appointment with ${doctorName} scheduled on ${date} at ${time} has been cancelled by the doctor.`;

    appointment.cancelled = true;
    appointment.isCompleted = false;

    appointment.notifications = [
      {
        message: userMessage,
        date: new Date(),
        read: false
      }
    ];

    await appointment.save();

     io.to(appointment.userId).emit("appointment-cancelled", {
      appointmentId,
      message: appointment.notifications[0].message
    });


    return res.json({
      success: true,
      message: "Appointment cancelled successfully",
      notification: userMessage
    });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const doctorDashboard = async (req,res) => {
  try {
    const docId = req.doctorId;
    const appointments = await appoinmentModel.find({docId}).populate("userId","name image email")

    const earnings = appointments.reduce((sum,item)=>{
      if(item.isCompleted || item.payment){
        return sum + item.amount;
      }
      return sum;
    },0)

    const uniquePatients = new Set(appointments.map((item)=>item.userId.toString()))

    const latestAppointments = appointments.slice(0,5);

    res.json({success:true,data:{
       earnings,
        appointments: appointments.length,
        patients: uniquePatients.size,
        latestAppointments,
    }})
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
}

export const doctorProfile = async (req,res) => {
  try {
    const doctorId = req.doctorId;
    if(!doctorId){
      return res.json({success:false,message:"Doctor Not Found"})
    }
    const profileData = await doctorModel.findById(doctorId).select("-password");
    if(!profileData){
      return res.json({success:false,message:"Doctor Profile Not Found"})
    }
    res.json({success:true,profileData})
  } catch (error) {
    console.log(error);
    res.json({success:false,message:error.message})
  }
}

export const updateDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.doctorId;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID missing",
      });
    }

    const { fees, available, address } = req.body;

    
    let updateFields = {};

    if (fees !== undefined) updateFields.fees = fees;
    if (available !== undefined) updateFields.available = available;

    
    if (address) {
      updateFields.address = {
        line1: address.line1 ?? null,
        line2: address.line2 ?? null,
      };
    }

    
    await doctorModel.findByIdAndUpdate(doctorId, updateFields, { new: true });

    res.json({
      success: true,
      message: "Doctor profile updated successfully",
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

