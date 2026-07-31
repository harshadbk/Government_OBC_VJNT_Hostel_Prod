import express from 'express';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';

const router = express.Router();
const ROOM_COUNT = 20;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

const normalizeRoomNumber = (roomNumber) => {
  const cleanRoomNum = String(roomNumber || '').trim();
  const numericRoom = Number(cleanRoomNum);
  if (!Number.isInteger(numericRoom) || numericRoom < 1 || numericRoom > ROOM_COUNT) {
    return null;
  }
  return String(numericRoom);
};

const normalizeDate = (date) => {
  const targetDate = date || getFormattedDate();
  return DATE_PATTERN.test(targetDate) ? targetDate : null;
};

const isAttendanceWindowOpen = (dateObj = new Date()) => {
  const hour = dateObj.getHours();
  return hour >= 20 && hour < 24;
};

const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    dates.push(getFormattedDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const isRecordLocked = (firstSavedAt) => {
  if (!firstSavedAt) return false;
  return !isAttendanceWindowOpen();
};


router.get('/summary', adminAuth, async (req, res) => {
  try {
    const targetDate = normalizeDate(req.query.date);
    if (!targetDate) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format.' });
    }

    const [allUsers, dailyDoc] = await Promise.all([
      User.find().select('_id username fullName roomNumber').lean(),
      Attendance.findOne({ date: targetDate }).lean()
    ]);

    const totalStudents = allUsers.length;
    const studentEntries = Array.isArray(dailyDoc?.students) ? dailyDoc.students : [];
    const entriesByRoom = new Map();

    studentEntries.forEach((entry) => {
      const roomNumStr = String(entry.roomNumber || '').trim();
      if (!entriesByRoom.has(roomNumStr)) entriesByRoom.set(roomNumStr, []);
      entriesByRoom.get(roomNumStr).push(entry);
    });

    let totalPresent = 0;
    let totalAbsent = 0;

    const roomOverview = [];
    let completedRooms = 0;
    let pendingRooms = 0;

    for (let r = 1; r <= 20; r++) {
      const roomNumStr = String(r);
      const roomUsers = allUsers.filter(u => String(u.roomNumber || '').trim() === roomNumStr);
      const roomEntries = entriesByRoom.get(roomNumStr) || [];

      const capacity = roomUsers.length;
      const presentCount = roomEntries.filter(item => item.status === 'Present').length;
      const absentCount = roomEntries.filter(item => item.status === 'Absent').length;
      const markedCount = roomEntries.length;

      totalPresent += presentCount;
      totalAbsent += absentCount;

      const isCompleted = capacity > 0 ? markedCount >= capacity : markedCount > 0;
      if (isCompleted) completedRooms++;
      else pendingRooms++;

      const firstSavedAt = dailyDoc ? dailyDoc.firstSavedAt : null;
      const locked = isRecordLocked(firstSavedAt);

      roomOverview.push({
        roomNumber: roomNumStr,
        capacity,
        presentCount,
        absentCount,
        markedCount,
        status: isCompleted ? 'Completed' : 'Pending',
        isLocked: locked,
        firstSavedAt
      });
    }

    const overallPercentage = totalStudents > 0
      ? Number(((totalPresent / totalStudents) * 100).toFixed(1))
      : 0;
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

router.get('/visuals', adminAuth, async (req, res) => {
  try {
    const selectedYear = Number(req.query.year) || new Date().getFullYear();
    const selectedMonth = Number(req.query.month) || (new Date().getMonth() + 1);

    if (!Number.isInteger(selectedYear) || selectedYear < 2000 || selectedYear > 2100) {
      return res.status(400).json({ message: 'Year must be between 2000 and 2100.' });
    }
    if (!Number.isInteger(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) {
      return res.status(400).json({ message: 'Month must be between 1 and 12.' });
    }

    const monthStr = String(selectedMonth).padStart(2, '0');
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const monthDates = Array.from({ length: daysInMonth }, (_, index) => (
      `${selectedYear}-${monthStr}-${String(index + 1).padStart(2, '0')}`
    ));

    const attendanceDocs = await Attendance.find({
      date: { $gte: monthDates[0], $lte: monthDates[monthDates.length - 1] }
    }).lean();

    const presentMap = new Map();
    attendanceDocs.forEach((doc) => {
      const presentCount = Array.isArray(doc.students)
        ? doc.students.filter(item => item.status === 'Present').length
        : 0;

      if (presentCount > 0 || doc.date) {
        presentMap.set(doc.date, (presentMap.get(doc.date) || 0) + presentCount);
      }
    });

    const dailyPresent = monthDates.map(date => ({
      date,
      day: Number(date.slice(8, 10)),
      presentCount: presentMap.get(date) || 0
    }));

    res.json({
      year: selectedYear,
      month: selectedMonth,
      dailyPresent,
      totalPresentMarks: dailyPresent.reduce((sum, item) => sum + item.presentCount, 0)
    });
  } catch (error) {
    console.error('Error fetching attendance visuals:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/range-report', adminAuth, async (req, res) => {
  try {
    const startDate = normalizeDate(req.body.startDate);
    const endDate = normalizeDate(req.body.endDate);
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date must be in YYYY-MM-DD format.' });
    }
    if (startDate > endDate) {
      return res.status(400).json({ message: 'Start date cannot be after end date.' });
    }

    const reportDates = getDatesInRange(startDate, endDate);
    if (reportDates.length > 366) {
      return res.status(400).json({ message: 'Date range cannot exceed 366 days.' });
    }

    const [students, records] = await Promise.all([
      User.find({ roomNumber: { $ne: '' } })
        .select('_id username fullName email roomNumber college_name')
        .sort({ roomNumber: 1, fullName: 1, username: 1 })
        .lean(),
      Attendance.find({ date: { $gte: startDate, $lte: endDate } })
        .select('date students')
        .lean()
    ]);

    const studentsByUsername = new Map(
      students.map(student => [String(student.username || '').trim().toLowerCase(), student])
    );

    const attendanceByStudent = new Map();
    records.forEach((record) => {
      const studentStatuses = Array.isArray(record.students) ? record.students : [];
      studentStatuses.forEach((entry) => {
        const username = String(entry.username || '').trim().toLowerCase();
        const student = studentsByUsername.get(username);
        if (!student) return;

        const studentId = student._id.toString();
        if (!attendanceByStudent.has(studentId)) {
          attendanceByStudent.set(studentId, { presentDays: 0, absentDays: 0, markedDays: 0 });
        }
        const stats = attendanceByStudent.get(studentId);
        stats.markedDays += 1;
        if (entry.status === 'Present') stats.presentDays += 1;
        if (entry.status === 'Absent') stats.absentDays += 1;
      });
    });

    const rooms = Array.from({ length: ROOM_COUNT }, (_, index) => {
      const roomNumber = String(index + 1);
      const roomStudents = students
        .filter(student => String(student.roomNumber || '').trim() === roomNumber)
        .map((student) => {
          const stats = attendanceByStudent.get(student._id.toString()) || { presentDays: 0, absentDays: 0, markedDays: 0 };
          return {
            studentId: student._id,
            username: student.username,
            fullName: student.fullName,
            email: student.email,
            college_name: student.college_name,
            roomNumber,
            presentDays: stats.presentDays,
            absentDays: stats.absentDays,
            markedDays: stats.markedDays,
            totalDays: reportDates.length,
            attendancePercentage: reportDates.length > 0
              ? Number(((stats.presentDays / reportDates.length) * 100).toFixed(1))
              : 0
          };
        });

      return {
        roomNumber,
        students: roomStudents,
        totals: {
          students: roomStudents.length,
          presentDays: roomStudents.reduce((sum, student) => sum + student.presentDays, 0),
          totalPossibleDays: roomStudents.length * reportDates.length
        }
      };
    });

    res.json({
      startDate,
      endDate,
      totalDays: reportDates.length,
      rooms
    });
  } catch (error) {
    console.error('Error generating attendance range report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/room/:roomNumber', adminAuth, async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const cleanRoomNum = normalizeRoomNumber(roomNumber);
    const targetDate = normalizeDate(req.query.date);
    if (!cleanRoomNum) {
      return res.status(400).json({ message: 'Room number must be between 1 and 20.' });
    }
    if (!targetDate) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format.' });
    }

    const roomUsers = await User.find({ roomNumber: cleanRoomNum })
      .select('_id username fullName email college_name mobileNumber phone fathersMobileNumber photoUrl')
      .lean();

    const attendanceDoc = await Attendance.findOne({
      date: targetDate
    }).lean();

    const studentStatuses = Array.isArray(attendanceDoc?.students) ? attendanceDoc.students : [];
    const roomEntries = studentStatuses.filter((entry) => String(entry.roomNumber || '').trim() === cleanRoomNum);
    const statusByUsername = new Map(
      roomEntries.map(entry => [String(entry.username || '').trim().toLowerCase(), entry.status])
    );

    const firstSavedAt = attendanceDoc ? attendanceDoc.firstSavedAt : null;
    const locked = isRecordLocked(firstSavedAt);

    const students = roomUsers.map(user => {
      const username = String(user.username || '').trim().toLowerCase();
      const status = statusByUsername.get(username) || 'Absent';
      return {
        ...user,
        status,
        isMarked: statusByUsername.has(username),
        attendanceId: attendanceDoc ? attendanceDoc._id : null
      };
    });

    res.json({
      roomNumber: cleanRoomNum,
      date: targetDate,
      firstSavedAt,
      isLocked: locked,
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
    const { date, presentUserIds = [] } = req.body;
    const targetDate = normalizeDate(date);
    const cleanRoomNum = normalizeRoomNumber(roomNumber);
    if (!cleanRoomNum) {
      return res.status(400).json({ message: 'Room number must be between 1 and 20.' });
    }
    if (!targetDate) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format.' });
    }
    if (targetDate !== getFormattedDate()) {
      return res.status(403).json({ message: 'Attendance can be marked only for today. Use reports to view/download older attendance.' });
    }
    if (!isAttendanceWindowOpen()) {
      return res.status(403).json({ message: 'Attendance can be marked or edited only between 8:00 PM and 12:00 AM.' });
    }

    // Check existing attendance for lock state
    const existingDoc = await Attendance.findOne({
      date: targetDate
    }).lean();

    if (existingDoc) {
      const firstSavedAt = existingDoc.firstSavedAt;
      const locked = isRecordLocked(firstSavedAt);

      if (locked) {
        return res.status(403).json({
          message: 'Attendance for this room is locked outside the 8:00 PM to 12:00 AM attendance window.',
          isLocked: true
        });
      }
    }

    // Get all students in this room
    const roomUsers = await User.find({ roomNumber: cleanRoomNum }).select('_id username').lean();
    if (roomUsers.length === 0) {
      return res.status(404).json({ message: `No students assigned to Room ${cleanRoomNum}.` });
    }

    const firstSavedAtTime = existingDoc && existingDoc.firstSavedAt
      ? existingDoc.firstSavedAt
      : new Date();

    const presentSet = new Set((presentUserIds || []).map(id => id.toString()));
    const roomUserIdSet = new Set(roomUsers.map(user => user._id.toString()));
    const invalidPresentIds = [...presentSet].filter(id => !roomUserIdSet.has(id));
    if (invalidPresentIds.length > 0) {
      return res.status(400).json({ message: 'Present student list contains students outside this room.' });
    }

    const newRoomEntries = roomUsers.map(user => ({
      username: user.username,
      roomNumber: cleanRoomNum,
      status: presentSet.has(user._id.toString()) ? 'Present' : 'Absent'
    }));

    const existingStudents = Array.isArray(existingDoc?.students) ? existingDoc.students : [];
    const filteredStudents = existingStudents.filter((entry) => String(entry.roomNumber || '').trim() !== cleanRoomNum);
    const mergedStudents = [...filteredStudents, ...newRoomEntries];

    await Attendance.findOneAndUpdate(
      { date: targetDate },
      {
        $set: {
          date: targetDate,
          students: mergedStudents,
          markedBy: req.user.username || 'admin'
        },
        $setOnInsert: {
          firstSavedAt: firstSavedAtTime
        }
      },
      { upsert: true, new: true }
    );

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

    const allAttendanceDocs = await Attendance.find({})
      .select('date roomNumber students markedBy firstSavedAt')
      .sort({ date: -1 })
      .lean();

    const matchingRecords = allAttendanceDocs
      .map((doc) => {
        const studentEntry = (doc.students || []).find((entry) => {
          return String(entry.username || '').trim().toLowerCase() === String(user.username).trim().toLowerCase();
        });

        if (!studentEntry) return null;

        return {
          date: doc.date,
          roomNumber: doc.roomNumber,
          status: studentEntry.status,
          markedBy: doc.markedBy,
          firstSavedAt: doc.firstSavedAt
        };
      })
      .filter(Boolean);

    matchingRecords.sort((a, b) => b.date.localeCompare(a.date));

    const attendanceMap = new Map();
    matchingRecords.forEach((record) => attendanceMap.set(record.date, record));

    // Today's Status
    const todayRecord = attendanceMap.get(todayStr);
    const todayStatus = todayRecord ? todayRecord.status : 'Not Marked';

    // Monthly Percentage (Current Month)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${currentYear}-${currentMonthStr}`;

    const monthRecords = matchingRecords.filter((record) => record.date.startsWith(monthPrefix));
    const monthPresentCount = monthRecords.filter((record) => record.status === 'Present').length;
    const monthlyPercentage = monthRecords.length > 0
      ? Number(((monthPresentCount / monthRecords.length) * 100).toFixed(1))
      : 0;

    // Yearly Percentage (Selected Year)
    const yearPrefix = `${selectedYear}-`;
    const yearRecords = matchingRecords.filter((record) => record.date.startsWith(yearPrefix));
    const yearPresentCount = yearRecords.filter((record) => record.status === 'Present').length;
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
      history: matchingRecords.slice(0, 30) // Recent 30 records
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

    const attendanceDocs = await Attendance.find(query)
      .sort({ date: 1, roomNumber: 1 })
      .lean();

    const userProfiles = await User.find({})
      .select('username fullName email college_name mobileNumber phone fathersMobileNumber roomNumber')
      .lean();

    const userProfilesByUsername = new Map(
      userProfiles.map((user) => [String(user.username || '').trim().toLowerCase(), user])
    );

    const records = attendanceDocs.flatMap((doc) => {
      const studentEntries = Array.isArray(doc.students) ? doc.students : [];
      return studentEntries.map((entry) => {
        const username = String(entry.username || '').trim().toLowerCase();
        const student = userProfilesByUsername.get(username) || {
          username: entry.username || '-',
          fullName: '-',
          email: '-',
          college_name: '-',
          mobileNumber: '-',
          phone: '-',
          fathersMobileNumber: '-'
        };

        const resolvedRoomNumber = String(entry.roomNumber || student.roomNumber || doc.roomNumber || '').trim();

        return {
          date: doc.date,
          roomNumber: resolvedRoomNumber,
          status: entry.status,
          markedBy: doc.markedBy || 'admin',
          userId: student
        };
      });
    });

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

    const headers = ['Date', 'Room No', 'Email', 'Username', 'Full Name', 'College Name', 'Status', 'Marked By'];

    const styleHeaderRow = (row) => {
      row.height = 24;
      row.eachCell((cell) => {
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
    };

    const styleSectionRow = (row, color = 'FF334155') => {
      row.height = 24;
      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      });
    };

    const writeHeader = (rowNumber) => {
      const row = worksheet.getRow(rowNumber);
      row.values = headers;
      styleHeaderRow(row);
    };

    const writeRecord = (rowNumber, rec) => {
      const student = rec.userId || {};
      const row = worksheet.getRow(rowNumber);
      const statusColor = rec.status === 'Present' ? 'FF16A34A' : 'FFDC2626';

      row.values = [
        rec.date,
        rec.roomNumber ? `Room ${rec.roomNumber}` : 'Unassigned',
        student.email || '-',
        student.username || '-',
        student.fullName || '-',
        student.college_name || '-',
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
    };

    const writeMergedSection = (rowNumber, label, color) => {
      worksheet.mergeCells(`A${rowNumber}:H${rowNumber}`);
      const row = worksheet.getRow(rowNumber);
      row.getCell(1).value = label;
      styleSectionRow(row, color);
    };

    let rowNumber = 3;

    if (type === 'daily') {
      writeHeader(rowNumber);
      records.forEach((rec) => {
        rowNumber += 1;
        writeRecord(rowNumber, rec);
      });
    } else if (type === 'monthly') {
      const recordsByDate = records.reduce((groups, rec) => {
        if (!groups[rec.date]) groups[rec.date] = [];
        groups[rec.date].push(rec);
        return groups;
      }, {});

      Object.keys(recordsByDate).sort().forEach((recordDate) => {
        writeMergedSection(rowNumber, `Date: ${recordDate}`, 'FF1E40AF');
        rowNumber += 1;
        writeHeader(rowNumber);
        recordsByDate[recordDate].forEach((rec) => {
          rowNumber += 1;
          writeRecord(rowNumber, rec);
        });
        rowNumber += 1;
      });
    } else if (type === 'yearly') {
      const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });
      const recordsByMonth = records.reduce((groups, rec) => {
        const monthKey = rec.date.slice(0, 7);
        if (!groups[monthKey]) groups[monthKey] = {};
        if (!groups[monthKey][rec.date]) groups[monthKey][rec.date] = [];
        groups[monthKey][rec.date].push(rec);
        return groups;
      }, {});

      Object.keys(recordsByMonth).sort().forEach((monthKey) => {
        const monthLabel = monthFormatter.format(new Date(`${monthKey}-01T00:00:00`));
        writeMergedSection(rowNumber, `Month: ${monthLabel}`, 'FF0F766E');
        rowNumber += 1;

        Object.keys(recordsByMonth[monthKey]).sort().forEach((recordDate) => {
          writeMergedSection(rowNumber, `Date: ${recordDate}`, 'FF1E40AF');
          rowNumber += 1;
          writeHeader(rowNumber);
          recordsByMonth[monthKey][recordDate].forEach((rec) => {
            rowNumber += 1;
            writeRecord(rowNumber, rec);
          });
          rowNumber += 1;
        });
      });
    }

    if (records.length === 0) {
      worksheet.getRow(rowNumber).values = ['No attendance records found for this report.'];
    }

    // Set Column Widths
    worksheet.columns = [
      { width: 14 },
      { width: 14 },
      { width: 28 },
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
