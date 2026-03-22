import express from 'express';
import { bookAppointment, cancelAppointment, createRazorpayOrder,  forgotPassword, getLatestAppointmentNotification, getProfile, listAppointment, loginUser, registerUser, requestOfflinePayment, resetPassword, updateProfile, verifyRazorpayPayment} from '../controllers/userController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js';


const userRouter = express.Router();

userRouter.post("/register",registerUser);
userRouter.post('/login',loginUser)
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);
userRouter.get('/user-profile',authMiddleware,getProfile)
userRouter.put('/update-profile',authMiddleware,upload.single("image"),updateProfile);
userRouter.post('/book-appointment',authMiddleware,bookAppointment)
userRouter.get('/list-appointment',authMiddleware,listAppointment)
userRouter.post('/cancel-appointment',authMiddleware,cancelAppointment);
userRouter.post('/offline-payment',authMiddleware,requestOfflinePayment);
userRouter.post('/razorpay-create',authMiddleware,createRazorpayOrder);
userRouter.post('/razorpay-verify',authMiddleware,verifyRazorpayPayment);
userRouter.post('/notifications',authMiddleware,getLatestAppointmentNotification);



export default userRouter;