const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth.routes');
const staffRoutes = require('./modules/staff.routes');
const { router: membersRoutes } = require('./modules/members.routes');
const trainersRoutes = require('./modules/trainers.routes');
const packagesRoutes = require('./modules/packages.routes');
const schedulesRoutes = require('./modules/schedules.routes');
const attendanceRoutes = require('./modules/attendance.routes');
const exercisesRoutes = require('./modules/exercises.routes');
const lessonPlansRoutes = require('./modules/lessonPlans.routes');
const progressRoutes = require('./modules/progress.routes');
const messagesRoutes = require('./modules/messages.routes');
const aiRoutes = require('./modules/ai.routes');
const reportsRoutes = require('./modules/reports.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'fitcore-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/trainers', trainersRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/lesson-plans', lessonPlansRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
