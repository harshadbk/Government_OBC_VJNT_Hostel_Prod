import express from 'express';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';

const router = express.Router();

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization header.' });
  }
  const token = authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ message: 'Invalid token.' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer')) {
    return res.status(401).json({ message: 'Missing authorization header.' });
  }
  const token = authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ message: 'Invalid token.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    const isAdmin =
      decoded?.role?.toString().toLowerCase() === 'admin' ||
      decoded?.username?.toString().toLowerCase() === 'admin' ||
      decoded?.userId === 'hardcoded-admin';

    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};


const getFormattedDate = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isRecordLocked = (firstSavedAt, isUnlockedByAdmin) => {
  if (!firstSavedAt) return false;
  if (isUnlockedByAdmin) return false;
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const elapsed = Date.now() - new Date(firstSavedAt).getTime();
  return elapsed > TWO_HOURS_MS;
};


router.get('/summary', adminAuth, async (req, res) => {
  try {
    const targetDate = req.query.date || getFormattedDate();

    const [allUsers, dateAttendance] = await Promise.all([
      User.find().select('_id username fullName roomNumber').lean(),
      Attendance.find({ date: targetDate }).lean()
    ]);

    const totalStudents = allUsers.length;
    const attendanceMap = new Map();
    dateAttendance.forEach(a => attendanceMap.set(a.userId.toString(), a));

    let totalPresent = 0;
    let totalAbsent = 0;

    dateAttendance.forEach(a => {
      if (a.status === 'Present') totalPresent++;
      if (a.status === 'Absent') totalAbsent++;
    });

    const overallPercentage = totalStudents > 0
      ? Number(((totalPresent / totalStudents) * 100).toFixed(1))
      : 0;

    const roomOverview = [];
    let completedRooms = 0;
    let pendingRooms = 0;

    for (let r = 1; r <= 20; r++) {
      const roomNumStr = String(r);
      const roomUsers = allUsers.filter(u => String(u.roomNumber || '').trim() === roomNumStr);
      const roomAttendance = dateAttendance.filter(a => String(a.roomNumber || '').trim() === roomNumStr);

      const capacity = roomUsers.length;
      const presentCount = roomAttendance.filter(a => a.status === 'Present').length;
      const absentCount = roomAttendance.filter(a => a.status === 'Absent').length;
      const markedCount = roomAttendance.length;

      const isCompleted = capacity > 0 ? markedCount >= capacity : markedCount > 0;
      if (isCompleted) completedRooms++;
      else pendingRooms++;

      const firstRecord = roomAttendance[0];
      const firstSavedAt = firstRecord ? firstRecord.firstSavedAt : null;
      const isUnlockedByAdmin = roomAttendance.some(a => a.isUnlockedByAdmin);
      const locked = isRecordLocked(firstSavedAt, isUnlockedByAdmin);

      roomOverview.push({
        roomNumber: roomNumStr,
        capacity,
        presentCount,
        absentCount,
        markedCount,
        status: isCompleted ? 'Completed' : 'Pending',
        isLocked: locked,
        firstSavedAt,
        isUnlockedByAdmin
      });
    }

    res.json({
      summary: {
        date: targetDate,
        totalStudents,
        totalPresent,
        totalAbsent,
        completedRooms,
        pendingRooms,
        overallPercentage
      },
      rooms: roomOverview
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/room/:roomNumber', adminAuth, async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const targetDate = req.query.date || getFormattedDate();

    const roomUsers = await User.find({ roomNumber: String(roomNumber).trim() })
      .select('_id username fullName rollNumber college_name stream mobileNumber phone fathersMobileNumber photoUrl')
      .lean();

    const attendanceRecords = await Attendance.find({
      roomNumber: String(roomNumber).trim(),
      date: targetDate
    }).lean();

    const attendanceMap = new Map();
    attendanceRecords.forEach(a => attendanceMap.set(a.userId.toString(), a));

    const firstRecord = attendanceRecords[0];
    const firstSavedAt = firstRecord ? firstRecord.firstSavedAt : null;
    const isUnlockedByAdmin = attendanceRecords.some(a => a.isUnlockedByAdmin);
    const locked = isRecordLocked(firstSavedAt, isUnlockedByAdmin);

    const students = roomUsers.map(user => {
      const record = attendanceMap.get(user._id.toString());
      return {
        ...user,
        status: record ? record.status : 'Absent', // default unchecked = Absent
        isMarked: Boolean(record),
        attendanceId: record ? record._id : null
      };
    });

    res.json({
      roomNumber: String(roomNumber).trim(),
      date: targetDate,
      firstSavedAt,
      isLocked: locked,
      isUnlockedByAdmin,
      totalStudents: roomUsers.length,
      students
    });
  } catch (error) {
    console.error('Error fetching room attendance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── POST /api/attendance/room/:roomNumber (Save Attendance) ──────────
router.post('/room/:roomNumber', adminAuth, async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const { date, presentUserIds = [], overrideLock = false } = req.body;
    const targetDate = date || getFormattedDate();
    const cleanRoomNum = String(roomNumber).trim();

    // Check existing attendance for lock state
    const existingRecords = await Attendance.find({
      roomNumber: cleanRoomNum,
      date: targetDate
    }).lean();

    if (existingRecords.length > 0) {
      const firstSavedAt = existingRecords[0].firstSavedAt;
      const isUnlockedByAdmin = existingRecords.some(a => a.isUnlockedByAdmin);
      const locked = isRecordLocked(firstSavedAt, isUnlockedByAdmin);

      if (locked && !overrideLock) {
        return res.status(403).json({
          message: 'Attendance for this room is locked (passed 2-hour window). Ask Super Admin to unlock.',
          isLocked: true
        });
      }
    }

    // Get all students in this room
    const roomUsers = await User.find({ roomNumber: cleanRoomNum }).select('_id username').lean();
    if (roomUsers.length === 0) {
      return res.status(404).json({ message: `No students assigned to Room ${cleanRoomNum}.` });
    }

    const firstSavedAtTime = existingRecords.length > 0 && existingRecords[0].firstSavedAt
      ? existingRecords[0].firstSavedAt
      : new Date();

    const presentSet = new Set((presentUserIds || []).map(id => id.toString()));

    const bulkOps = roomUsers.map(user => {
      const isPresent = presentSet.has(user._id.toString());
      const status = isPresent ? 'Present' : 'Absent';

      return {
        updateOne: {
          filter: { userId: user._id, date: targetDate },
          update: {
            $set: {
              roomNumber: cleanRoomNum,
              status,
              markedBy: req.user.username || 'admin',
              isUnlockedByAdmin: overrideLock ? true : (existingRecords[0]?.isUnlockedByAdmin || false)
            },
            $setOnInsert: {
              firstSavedAt: firstSavedAtTime
            }
          },
          upsert: true
        }
      };
    });

    await Attendance.bulkWrite(bulkOps);

    res.json({
      message: `Attendance saved successfully for Room ${cleanRoomNum}.`,
      date: targetDate,
      roomNumber: cleanRoomNum,
      totalMarked: roomUsers.length,
      presentCount: presentSet.size,
      absentCount: roomUsers.length - presentSet.size
    });
  } catch (error) {
    console.error('Error saving room attendance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── POST /api/attendance/unlock (Admin Override Unlock) ────────────────
router.post('/unlock', adminAuth, async (req, res) => {
  try {
    const { roomNumber, date } = req.body;
    const targetDate = date || getFormattedDate();
    const cleanRoomNum = String(roomNumber).trim();

    await Attendance.updateMany(
      { roomNumber: cleanRoomNum, date: targetDate },
      { $set: { isUnlockedByAdmin: true } }
    );

    res.json({ message: `Attendance for Room ${cleanRoomNum} unlocked successfully for ${targetDate}.` });
  } catch (error) {
    console.error('Error unlocking attendance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── GET /api/attendance/student/my-attendance (Student Profile View) ───
router.get('/student/my-attendance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const selectedYear = parseInt(req.query.year) || new Date().getFullYear();
    const todayStr = getFormattedDate();

    // Fetch user details
    const user = await User.findById(userId).select('_id username fullName roomNumber').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Fetch all attendance records for this student
    const allRecords = await Attendance.find({ userId: user._id }).sort({ date: -1 }).lean();

    const attendanceMap = new Map();
    allRecords.forEach(r => attendanceMap.set(r.date, r));

    // Today's Status
    const todayRecord = attendanceMap.get(todayStr);
    const todayStatus = todayRecord ? todayRecord.status : 'Not Marked';

    // Monthly Percentage (Current Month)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${currentYear}-${currentMonthStr}`;

    const monthRecords = allRecords.filter(r => r.date.startsWith(monthPrefix));
    const monthPresentCount = monthRecords.filter(r => r.status === 'Present').length;
    const monthlyPercentage = monthRecords.length > 0
      ? Number(((monthPresentCount / monthRecords.length) * 100).toFixed(1))
      : 0;

    // Yearly Percentage (Selected Year)
    const yearPrefix = `${selectedYear}-`;
    const yearRecords = allRecords.filter(r => r.date.startsWith(yearPrefix));
    const yearPresentCount = yearRecords.filter(r => r.status === 'Present').length;
    const yearlyPercentage = yearRecords.length > 0
      ? Number(((yearPresentCount / yearRecords.length) * 100).toFixed(1))
      : 0;

    // Build GitHub/LeetCode style Heatmap Data for entire selected year (Jan 1 to Dec 31)
    const heatmapData = [];
    const isLeapYear = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || (selectedYear % 400 === 0);
    const daysInYear = isLeapYear ? 366 : 365;

    const startDate = new Date(selectedYear, 0, 1);
    for (let i = 0; i < daysInYear; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = getFormattedDate(d);
      const rec = attendanceMap.get(dateStr);

      heatmapData.push({
        date: dateStr,
        dayOfWeek: d.getDay(), // 0 = Sun, 6 = Sat
        month: d.getMonth(),   // 0 = Jan, 11 = Dec
        status: rec ? rec.status : (dateStr > todayStr ? 'Future' : 'NotMarked')
      });
    }

    res.json({
      todayStatus,
      summary: {
        monthlyPercentage,
        yearlyPercentage,
        totalPresentDays: yearPresentCount,
        totalMarkedDays: yearRecords.length,
        selectedYear
      },
      heatmapData,
      history: allRecords.slice(0, 30) // Recent 30 records
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── GET /api/attendance/export (Export Excel Reports) ─────────────────
router.get('/export', adminAuth, async (req, res) => {
  try {
    const { type = 'daily', date, month, year } = req.query;
    const selectedDate = date || getFormattedDate();
    const selectedYear = parseInt(year) || new Date().getFullYear();
    const selectedMonth = parseInt(month) || (new Date().getMonth() + 1);

    let query = {};
    let reportTitle = '';

    if (type === 'daily') {
      query = { date: selectedDate };
      reportTitle = `Daily Attendance Report - ${selectedDate}`;
    } else if (type === 'monthly') {
      const monthStr = String(selectedMonth).padStart(2, '0');
      query = { date: new RegExp(`^${selectedYear}-${monthStr}-`) };
      reportTitle = `Monthly Attendance Report - ${selectedMonth}/${selectedYear}`;
    } else if (type === 'yearly') {
      query = { date: new RegExp(`^${selectedYear}-`) };
      reportTitle = `Yearly Attendance Report - ${selectedYear}`;
    }

    const records = await Attendance.find(query)
      .populate('userId', 'username fullName rollNumber college_name stream mobileNumber phone fathersMobileNumber')
      .sort({ date: -1, roomNumber: 1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Government OBC Boys Hostel Admin';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Attendance Report');

    // Title Row
    worksheet.mergeCells('A1', 'H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = reportTitle;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;

    // Table Headers
    const headers = ['Date', 'Room No', 'Roll No', 'Username', 'Full Name', 'College & Stream', 'Status', 'Marked By'];
    worksheet.getRow(3).values = headers;
    worksheet.getRow(3).height = 24;

    const headerRow = worksheet.getRow(3);
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B4C7E' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // Populate Data Rows
    records.forEach((rec, idx) => {
      const student = rec.userId || {};
      const rowNumber = idx + 4;
      const row = worksheet.getRow(rowNumber);

      const statusColor = rec.status === 'Present' ? 'FF16A34A' : 'FFDC2626';

      row.values = [
        rec.date,
        rec.roomNumber ? `Room ${rec.roomNumber}` : 'Unassigned',
        student.rollNumber || '-',
        student.username || '-',
        student.fullName || '-',
        `${student.college_name || '-'} (${student.stream || '-'})`,
        rec.status,
        rec.markedBy || 'admin'
      ];

      row.height = 20;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: colNum === 7 ? 'center' : 'left' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        if (colNum === 7) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: statusColor } };
        }
      });
    });

    // Set Column Widths
    worksheet.columns = [
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 16 },
      { width: 24 },
      { width: 30 },
      { width: 14 },
      { width: 16 }
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Attendance_Report_${type}_${selectedDate}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting attendance Excel:', error);
    res.status(500).json({ message: 'Server error exporting Excel', error: error.message });
  }
});

export default router;
