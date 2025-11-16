// Global variables
let currentUser = null;
let currentStream = null;
let currentLocation = null;
let pendingAttendance = null;

// PIN Configuration
const PINS = {
    owner: "123456",
    teacher: "111111", 
    student: "000000"
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Update register form based on user type
    document.getElementById('registerType').addEventListener('change', function() {
        const type = this.value;
        document.getElementById('classField').style.display = type === 'student' ? 'block' : 'none';
        document.getElementById('subjectField').style.display = type === 'teacher' ? 'block' : 'none';
    });
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
});

// Login Function
function login() {
    const userType = document.getElementById('userType').value;
    const pin = document.getElementById('pinInput').value.trim();
    
    if (!pin) {
        showAlert('الرجاء إدخال الرقم السري', 'error');
        return;
    }
    
    if (PINS[userType] === pin) {
        currentUser = { 
            type: userType, 
            name: userType,
            id: generateId()
        };
        
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('userInfo').style.display = 'block';
        
        showDashboard(userType);
        showAlert(`مرحبا بك ${getUserTitle(userType)}`, 'success');
    } else {
        showAlert('الرقم السري غير صحيح', 'error');
    }
}

// Show appropriate dashboard
function showDashboard(userType) {
    document.getElementById('ownerDashboard').style.display = 'none';
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('studentDashboard').style.display = 'none';
    
    if (userType === 'owner') {
        document.getElementById('ownerDashboard').style.display = 'block';
        loadAllData();
        loadStats();
    } else if (userType === 'teacher') {
        document.getElementById('teacherDashboard').style.display = 'block';
        loadTeacherProfile();
        loadStudentsAttendance();
    } else if (userType === 'student') {
        document.getElementById('studentDashboard').style.display = 'block';
        loadStudentProfile();
        loadStudentHistory();
    }
}

// Tab management
function openTab(tabName) {
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'reportsTab') {
        loadStats();
    }
}

function openTeacherTab(tabName) {
    document.querySelectorAll('#teacherDashboard .tab-pane').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('#teacherDashboard .tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Owner functions
function registerUser() {
    const type = document.getElementById('registerType').value;
    const name = document.getElementById('registerName').value.trim();
    const className = document.getElementById('registerClass').value.trim();
    const subject = document.getElementById('registerSubject').value.trim();
    
    if (!name) {
        showAlert('الرجاء إدخال الاسم الكامل', 'error');
        return;
    }
    
    if (type === 'student' && !className) {
        showAlert('الرجاء إدخال الصف الدراسي', 'error');
        return;
    }
    
    if (type === 'teacher' && !subject) {
        showAlert('الرجاء إدخال المادة الدراسية', 'error');
        return;
    }
    
    const userData = {
        name: name,
        type: type,
        class: type === 'student' ? className : null,
        subject: type === 'teacher' ? subject : null,
        registeredAt: new Date().toISOString(),
        pin: generatePin()
    };
    
    showLoading(true);
    
    const newUserRef = database.ref('users/' + type + 's').push();
    newUserRef.set(userData)
        .then(() => {
            showAlert(`تم تسجيل ${getUserTitle(type)} بنجاح! الرقم السري: ${userData.pin}`, 'success');
            clearRegisterForm();
            loadAllData();
            loadStats();
        })
        .catch(error => {
            showAlert('خطأ في التسجيل: ' + error.message, 'error');
        })
        .finally(() => {
            showLoading(false);
        });
}

function loadAllData() {
    // Load teachers
    database.ref('users/teachers').on('value', (snapshot) => {
        const teachersList = document.getElementById('teachersList');
        teachersList.innerHTML = '';
        
        if (!snapshot.exists()) {
            teachersList.innerHTML = '<p class="no-data">لا يوجد معلمون مسجلون بعد</p>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const teacher = childSnapshot.val();
            const div = document.createElement('div');
            div.className = 'data-item';
            div.innerHTML = `
                <div class="user-header">
                    <strong>${teacher.name}</strong>
                    <span class="user-pin">PIN: ${teacher.pin}</span>
                </div>
                <div class="user-details">
                    ${teacher.subject ? `<span>المادة: ${teacher.subject}</span>` : ''}
                    <small>مسجل في: ${new Date(teacher.registeredAt).toLocaleDateString('ar-EG')}</small>
                </div>
            `;
            teachersList.appendChild(div);
        });
    });
    
    // Load students
    database.ref('users/students').on('value', (snapshot) => {
        const studentsList = document.getElementById('studentsList');
        studentsList.innerHTML = '';
        
        if (!snapshot.exists()) {
            studentsList.innerHTML = '<p class="no-data">لا يوجد طلاب مسجلون بعد</p>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const student = childSnapshot.val();
            const div = document.createElement('div');
            div.className = 'data-item';
            div.innerHTML = `
                <div class="user-header">
                    <strong>${student.name}</strong>
                    <span class="user-pin">PIN: ${student.pin}</span>
                </div>
                <div class="user-details">
                    ${student.class ? `<span>الصف: ${student.class}</span>` : ''}
                    <small>مسجل في: ${new Date(student.registeredAt).toLocaleDateString('ar-EG')}</small>
                </div>
            `;
            studentsList.appendChild(div);
        });
    });
}

function loadStats() {
    // Count teachers
    database.ref('users/teachers').once('value').then(snapshot => {
        document.getElementById('teachersCount').textContent = snapshot.exists() ? snapshot.numChildren() : 0;
    });
    
    // Count students
    database.ref('users/students').once('value').then(snapshot => {
        document.getElementById('studentsCount').textContent = snapshot.exists() ? snapshot.numChildren() : 0;
    });
    
    // Count today's attendance
    const today = new Date().toISOString().split('T')[0];
    database.ref('attendance').once('value').then(snapshot => {
        let count = 0;
        snapshot.forEach(userTypeSnapshot => {
            userTypeSnapshot.forEach(attendanceSnapshot => {
                const attendance = attendanceSnapshot.val();
                if (attendance.date === today && attendance.status === 'hadir') {
                    count++;
                }
            });
        });
        document.getElementById('todayAttendance').textContent = count;
    });
}

// Teacher functions
function loadTeacherProfile() {
    // In a real app, this would load the actual teacher's data
    document.getElementById('teacherProfileInfo').innerHTML = `
        <div class="profile-card">
            <div class="profile-header">
                <i class="fas fa-chalkboard-teacher"></i>
                <h4>المعلم</h4>
            </div>
            <div class="profile-details">
                <p><strong>الدور:</strong> تسجيل الحضور ومتابعة الطلاب</p>
                <p><strong>الصلاحيات:</strong> عرض حضور جميع الطلاب</p>
                <p><strong>آخر دخول:</strong> ${new Date().toLocaleString('ar-EG')}</p>
            </div>
        </div>
    `;
}

function loadStudentsAttendance() {
    const selectedDate = document.getElementById('attendanceDate').value;
    
    database.ref('attendance/students').orderByChild('date').equalTo(selectedDate).on('value', (snapshot) => {
        const container = document.getElementById('studentsAttendance');
        container.innerHTML = '';
        
        if (!snapshot.exists()) {
            container.innerHTML = '<p class="no-data">لا يوجد حضور مسجل لهذا اليوم</p>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const attendance = childSnapshot.val();
            const div = document.createElement('div');
            div.className = `attendance-item ${attendance.status}`;
            
            let statusText = '';
            let statusIcon = '';
            
            switch(attendance.status) {
                case 'hadir':
                    statusText = 'حضور';
                    statusIcon = 'fas fa-check-circle';
                    break;
                case 'izin':
                    statusText = 'إذن';
                    statusIcon = 'fas fa-clock';
                    break;
                case 'sakit':
                    statusText = 'مرض';
                    statusIcon = 'fas fa-procedures';
                    break;
            }
            
            div.innerHTML = `
                <div class="attendance-header">
                    <strong>${attendance.userName}</strong>
                    <span class="status ${attendance.status}">
                        <i class="${statusIcon}"></i> ${statusText}
                    </span>
                </div>
                <div class="attendance-details">
                    <span>وقت التسجيل: ${attendance.timeIn}</span>
                    ${attendance.reason ? `<span>السبب: ${attendance.reason}</span>` : ''}
                    ${attendance.location ? `
                        <span class="location">
                            <i class="fas fa-map-marker-alt"></i> 
                            الموقع: ${attendance.location.latitude.toFixed(4)}, ${attendance.location.longitude.toFixed(4)}
                        </span>
                    ` : ''}
                    ${attendance.photo ? `
                        <span class="has-photo">
                            <i class="fas fa-camera"></i> موجودة صورة
                        </span>
                    ` : ''}
                </div>
            `;
            container.appendChild(div);
        });
    });
}

// Student functions
function loadStudentProfile() {
    document.getElementById('studentName').textContent = 'الطالب';
}

function loadStudentHistory() {
    database.ref('attendance/students').orderByChild('timestamp').limitToLast(5).on('value', (snapshot) => {
        const container = document.getElementById('studentAttendanceHistory');
        container.innerHTML = '';
        
        if (!snapshot.exists()) {
            container.innerHTML = '<p class="no-data">لا توجد سجلات حضور سابقة</p>';
            return;
        }
        
        const attendances = [];
        snapshot.forEach(childSnapshot => {
            attendances.push(childSnapshot.val());
        });
        
        // Reverse to show latest first
        attendances.reverse().forEach(attendance => {
            const div = document.createElement('div');
            div.className = `attendance-item ${attendance.status}`;
            
            let statusText = '';
            switch(attendance.status) {
                case 'hadir': statusText = 'حضور'; break;
                case 'izin': statusText = 'إذن'; break;
                case 'sakit': statusText = 'مرض'; break;
            }
            
            div.innerHTML = `
                <div class="attendance-header">
                    <strong>${attendance.date}</strong>
                    <span class="status ${attendance.status}">${statusText}</span>
                </div>
                <div class="attendance-details">
                    <span>الوقت: ${attendance.timeIn}</span>
                    ${attendance.reason ? `<span>السبب: ${attendance.reason}</span>` : ''}
                </div>
            `;
            container.appendChild(div);
        });
    });
}

// Attendance Process
function startAttendanceProcess(userType, status) {
    pendingAttendance = { userType, status, reason: '' };
    startCameraProcess();
}

function showReasonForm(userType, status) {
    pendingAttendance = { userType, status, reason: '' };
    
    const modal = document.getElementById('reasonModal');
    const title = document.getElementById('reasonModalTitle');
    const label = document.getElementById('reasonLabel');
    const input = document.getElementById('reasonInput');
    const example = document.getElementById('reasonExample');
    
    if (status === 'izin') {
        title.textContent = 'طلب إذن';
        label.textContent = 'سبب الإذن';
        input.placeholder = 'أدخل سبب طلب الإذن...';
        example.textContent = 'مثال: ظرف عائلي، زيارة طبيب، إلخ.';
    } else {
        title.textContent = 'إبلاغ عن مرض';
        label.textContent = 'نوع المرض';
        input.placeholder = 'أدخل نوع المرض أو الأعراض...';
        example.textContent = 'مثال: صداع، حمى، إنفلونزا، إلخ.';
    }
    
    modal.style.display = 'flex';
    input.focus();
}

function submitAttendanceWithReason() {
    const reason = document.getElementById('reasonInput').value.trim();
    
    if (!reason) {
        showAlert('الرجاء إدخال السبب', 'error');
        return;
    }
    
    pendingAttendance.reason = reason;
    closeReasonModal();
    startCameraProcess();
}

function closeReasonModal() {
    document.getElementById('reasonModal').style.display = 'none';
    document.getElementById('reasonInput').value = '';
}

// Camera and Location Process
async function startCameraProcess() {
    showLoading(true);
    
    try {
        await getLocation();
        await startCamera();
        
        showLoading(false);
        document.getElementById('cameraModal').style.display = 'flex';
    } catch (error) {
        showLoading(false);
        showAlert('خطأ في التحضير: ' + error.message, 'error');
    }
}

function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('GPS غير مدعوم في هذا المتصفح'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date().toISOString()
                };
                
                document.getElementById('locationInfo').innerHTML = `
                    <p><i class="fas fa-map-marker-alt"></i> تم تحديد موقعك:</p>
                    <p>خط العرض: ${currentLocation.latitude.toFixed(6)}</p>
                    <p>خط الطول: ${currentLocation.longitude.toFixed(6)}</p>
                    <p>الدقة: ±${Math.round(currentLocation.accuracy)} متر</p>
                `;
                resolve(currentLocation);
            },
            (error) => {
                console.error('Location error:', error);
                document.getElementById('locationInfo').innerHTML = 
                    '<p><i class="fas fa-exclamation-triangle"></i> تعذر تحديد الموقع الدقيق</p>';
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

async function startCamera() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        const video = document.getElementById('cameraVideo');
        video.srcObject = currentStream;
    } catch (error) {
        console.error('Camera error:', error);
        throw new Error('تعذر الوصول إلى الكاميرا. يرجى التأكد من السماح باستخدام الكاميرا.');
    }
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('photoCanvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    saveAttendance(photoData);
    
    closeCamera();
}

function closeCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    document.getElementById('cameraModal').style.display = 'none';
}

// Save attendance to Firebase
function saveAttendance(photoData = null) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    
    const attendanceData = {
        userType: pendingAttendance.userType,
        userName: currentUser.name,
        userId: currentUser.id,
        status: pendingAttendance.status,
        date: dateStr,
        timeIn: timeStr,
        timeOut: '',
        location: currentLocation,
        photo: photoData,
        reason: pendingAttendance.reason,
        timestamp: now.toISOString()
    };
    
    showLoading(true);
    
    const attendanceRef = database.ref('attendance/' + pendingAttendance.userType + 's').push();
    attendanceRef.set(attendanceData)
        .then(() => {
            showLoading(false);
            showAlert('تم تسجيل الحضور بنجاح!', 'success');
            
            // Refresh relevant data
            if (pendingAttendance.userType === 'teacher') {
                loadStudentsAttendance();
            } else if (pendingAttendance.userType === 'student') {
                loadStudentHistory();
            }
        })
        .catch(error => {
            showLoading(false);
            showAlert('خطأ في التسجيل: ' + error.message, 'error');
        });
}

// Utility functions
function generateId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

function generatePin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getUserTitle(type) {
    const titles = {
        owner: 'المالك',
        teacher: 'المعلم', 
        student: 'الطالب'
    };
    return titles[type] || type;
}

function clearRegisterForm() {
    document.getElementById('registerName').value = '';
    document.getElementById('registerClass').value = '';
    document.getElementById('registerSubject').value = '';
}

function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
}

function showAlert(message, type) {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(alert);
    
    // Remove after 3 seconds
    setTimeout(() => {
        alert.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 300);
    }, 3000);
}

// Add CSS for alerts
const alertStyles = document.createElement('style');
alertStyles.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
    .alert-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
`;
document.head.appendChild(alertStyles);

// Logout function
function logout() {
    currentUser = null;
    pendingAttendance = null;
    
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('ownerDashboard').style.display = 'none';
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('studentDashboard').style.display = 'none';
    document.getElementById('pinInput').value = '';
    
    // Close any open modals
    document.getElementById('reasonModal').style.display = 'none';
    document.getElementById('cameraModal').style.display = 'none';
    
    showAlert('تم تسجيل الخروج بنجاح', 'success');
}