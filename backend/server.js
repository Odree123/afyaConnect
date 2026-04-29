const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { Server } = require('socket.io');

const pool                = require('./config/db');
const userRoutes          = require('./routes/userRoutes');
const doctorRoutes        = require('./routes/doctorRoutes');
const consultationRoutes  = require('./routes/consultationRoutes');
const prescriptionRoutes  = require('./routes/prescriptionRoutes');
const messageRoutes       = require('./routes/messageRoutes');
const mpesaRoutes         = require('./routes/mpesaRoutes');
const authRoutes          = require('./routes/authRoutes');
const { setIO }           = require('./controllers/consultationController');
const adminRoutes         = require('./routes/adminRoutes');

const app    = express();
const server = http.createServer(app);


// ✅ CLEAN & CORRECT CORS CONFIG
const corsOptions = {
    origin: "https://afyaconnect-1.onrender.com", // your frontend
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());


// ✅ SOCKET.IO WITH MATCHING CORS
const io = new Server(server, {
    cors: {
        origin: "https://afyaconnect-1.onrender.com",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true
    }
});

global.io = io;
setIO(io);
app.set('io', io);


// ROUTES
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);


// TEST ROUTE
app.get('/', (req, res) => {
    res.send('AfyaConnect backend is running');
});

app.get('/api/test-cors', (req, res) => {
    res.json({ message: 'CORS is working!' });
});


// SOCKET HANDLING
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_user_room', (user_id) => {
        socket.join(`user_${user_id}`);
    });

    socket.on('join_consultation', (consultation_id) => {
        socket.join(`consultation_${consultation_id}`);
    });

    socket.on('join_room', (consultationId) => {
        socket.join(`consultation_${consultationId}`);
    });

    socket.on('send_message', async (data) => {
        const { consultation_id, sender_id, sender_role, message } = data;
        try {
            const result = await pool.query(
                `INSERT INTO messages (consultation_id, sender_id, sender_role, message)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [consultation_id, sender_id, sender_role, message]
            );

            io.to(`consultation_${consultation_id}`)
              .emit('receive_message', result.rows[0]);

        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    socket.on('typing', ({ consultation_id, sender_id, name }) => {
        socket.to(`consultation_${consultation_id}`)
              .emit('user_typing', { sender_id, name });
    });

    socket.on('stop_typing', ({ consultation_id }) => {
        socket.to(`consultation_${consultation_id}`)
              .emit('user_stop_typing');
    });

    socket.on('consultation_ended', (consultation_id) => {
        io.to(`consultation_${consultation_id}`)
          .emit('consultation_ended', { consultation_id });
    });

    socket.on('consultation_started', (data) => {
        const consultation_id = data.consultation_id || data;

        if (data.patient_id) {
            io.to(`user_${data.patient_id}`).emit('consultation_started', {
                consultation_id,
                message: 'Your consultation has started! Join now.'
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});


// START SERVER
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});