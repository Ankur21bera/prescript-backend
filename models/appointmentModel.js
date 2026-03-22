import mongoose from "mongoose"

const appointmentSchema = new mongoose.Schema({
    userId:{type:String,required:true},
    docId:{type:String,required:true},
    slotDate:{type:String,required:true},
    slotTime:{type:String,required:true},
    userData:{type:Object,required:true},
    docData:{type:Object,required:true},
    amount:{type:Number,required:true},
    date:{type:Number,required:true},
    cancelled:{type:Boolean,default:false},
    cancelledBy: { type: String, default: null },
    payment:{type:Boolean,default:false},
    paymentMethod:{type:String,default:"online"},
    paymentStatus:{type:String,default:"pending"},
    isCompleted:{type:Boolean,default:false},
    isAlertShown: { type: Boolean, default: false },
    notifications: [
    {
      message: String,
      date: { type: Date, default: Date.now },
      read: { type: Boolean, default: false },
    },
  ],
})

const appoinmentModel = mongoose.models.appoinment || mongoose.model('appointment',appointmentSchema);

export default appoinmentModel;