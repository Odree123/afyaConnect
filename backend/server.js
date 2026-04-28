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
const authRoutes = require('./routes/authRoutes');
const { setIO } = require('./controllers/consultationController');
const adminRoutes = require('./routes/adminRoutes');

const app    = express();
const server = http.createServer(app); // ✅ wrap express with http

// ✅ FIRST create io
const io = new Server(server, {
    
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
global.io = io; 

// ✅ THEN pass io
setIO(io);

app.set('io', io);
app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/auth', authRoutes);

app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('AfyaConnect backend is running');
});


io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join personal notification room
    socket.on('join_user_room', (user_id) => {
        socket.join(`user_${user_id}`);
        console.log(`User ${user_id} joined their notification room`);
    });

    // Join consultation room
    socket.on('join_consultation', (consultation_id) => {
        socket.join(`consultation_${consultation_id}`);
        console.log(`User joined room: consultation_${consultation_id}`);
    });

    // Also support old event name
    socket.on('join_room', (consultationId) => {
        socket.join(`consultation_${consultationId}`);
        console.log(`User joined room: consultation_${consultationId}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
        const { consultation_id, sender_id, sender_role, message } = data;
        try {
            const result = await pool.query(
                `INSERT INTO messages (consultation_id, sender_id, sender_role, message)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [consultation_id, sender_id, sender_role, message]
            );
            io.to(`consultation_${consultation_id}`).emit('receive_message', result.rows[0]);
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    // Typing indicators
    socket.on('typing', ({ consultation_id, sender_id, name }) => {
        socket.to(`consultation_${consultation_id}`).emit('user_typing', { sender_id, name });
    });

    socket.on('stop_typing', ({ consultation_id }) => {
        socket.to(`consultation_${consultation_id}`).emit('user_stop_typing');
    });

    // Consultation ended
    socket.on('consultation_ended', (consultation_id) => {
        io.to(`consultation_${consultation_id}`).emit('consultation_ended', { consultation_id });
    });

    // Consultation started
    socket.on('consultation_started', (data) => {
        const consultation_id = data.consultation_id || data;
        io.to(`user_${patient_id}`).emit('payment_confirmed', {
    consultation_id
});

        // ✅ Also notify patient via their personal room
        if (data.patient_id) {
            io.to(`user_${data.patient_id}`).emit('consultation_started', {
                consultation_id,
                message: 'Your consultation has started! Join the room now.'
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