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
const server = http.createServer(app);

// ✅ COMPLETE CORS FIX - Allow all methods and origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// ✅ Handle preflight requests explicitly
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.sendStatus(204);
});

// ✅ Additional CORS middleware for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(express.json());

// ✅ Socket.io with proper CORS
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true
    }
});
global.io = io;
setIO(io);
app.set('io', io);

// ✅ Test endpoint to verify CORS
app.get('/api/test', (req, res) => {
    res.json({ message: 'CORS is working!', timestamp: new Date().toISOString() });
});

// Routes
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

// Socket.io events
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

    // Consultation started - FIXED (patient_id was undefined)
    socket.on('consultation_started', (data) => {
        const consultation_id = data.consultation_id || data;
        
        // ✅ Fixed: patient_id was undefined
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
    console.log(`CORS enabled for all origins`);
    console.log(`✅ PUT and DELETE methods are allowed`);
});