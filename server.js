import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoute.js';
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());
connectDB();
connectCloudinary();

app.use('/api/admin', adminRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/user', userRouter);

app.get('/', (req, res) => {
    res.send("Api Is Working")
});


const httpServer = createServer(app);
export const io = new Server(httpServer, {
    cors: { origin: "*" }
});

io.on("connection", (socket) => {

    socket.on("join-room", (userId) => {
        socket.join(userId); 
    });
});


httpServer.listen(port, () => console.log("Server Started on port", port));
