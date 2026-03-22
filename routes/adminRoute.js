import express from 'express';
import { addDoctor, adminDashboard, adminLogin, appointmentAdmin, appointmentCancel, approveOfflinePayment,deleteDoctors, listDoctors, updateDoctor } from '../controllers/adminController.js';
import { verifyAdmin } from '../middlewares/adminAuth.js';
import upload from '../middlewares/multer.js';
import { changeAvailability } from '../controllers/doctorController.js';

const adminRouter = express.Router();

adminRouter.post('/login',adminLogin);
adminRouter.post('/add',verifyAdmin,upload.single("image"),addDoctor);
adminRouter.get('/list',verifyAdmin,listDoctors);
adminRouter.delete('/delete-doctor/:id',verifyAdmin,deleteDoctors);
adminRouter.put('/update-doctor/:id', verifyAdmin, upload.single("image"), updateDoctor);
adminRouter.post('/change-availability',verifyAdmin,changeAvailability);
adminRouter.post('/approve-online',verifyAdmin,approveOfflinePayment);
adminRouter.get('/list-appointment',verifyAdmin,appointmentAdmin);
adminRouter.post('/cancel-appointment',verifyAdmin,appointmentCancel)
adminRouter.get('/dashboard',verifyAdmin,adminDashboard)


export default adminRouter;