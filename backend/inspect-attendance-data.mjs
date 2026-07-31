import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Attendance from './models/Attendance.js';

await mongoose.connect(process.env.MONGODB_URI);

const users = await User.find({ roomNumber: { $ne: '' } }).limit(10).lean();
console.log(JSON.stringify({ users: users.map((u) => ({ username: u.username, roomNumber: u.roomNumber })) }, null, 2));

const docs = await Attendance.find({}).sort({ date: -1 }).limit(5).lean();
console.log(JSON.stringify({ attendanceDocs: docs.map((d) => ({ date: d.date, students: d.students?.slice(0, 3) })) }, null, 2));

await mongoose.disconnect();
