let startDate = null;
let timer = null;

// Đặt ngày bắt đầu mặc định là 17/3/2023
const defaultDate = new Date('2023-03-17');

// Các ngày quan trọng
const importantDates = {
    birthdays: [
        { day: 28, month: 11, title: 'Sinh nhật Huy' },
        { day: 9, month: 11, title: 'Sinh nhật Thảo' }
    ],
    holidays: [
        { day: 14, month: 2, title: 'Valentine' },
        { day: 8, month: 3, title: 'Quốc tế Phụ nữ' },
        { day: 20, month: 10, title: 'Phụ nữ Việt Nam' },
        { day: 25, month: 12, title: 'Giáng sinh' }
    ]
};

// Thêm biến để lưu trữ ảnh kỷ niệm
let memories = JSON.parse(localStorage.getItem('memories')) || [];

// Thêm biến cho modal
let modal, modalImage, modalDate, modalTime, closeModal;

// Khởi tạo các biến khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', function() {
    modal = document.getElementById('imageModal');
    modalImage = document.getElementById('modalImage');
    modalDate = document.querySelector('.modal-date');
    modalTime = document.querySelector('.modal-time');
    closeModal = document.querySelector('.close-modal');

    // Thêm sự kiện đóng modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            console.log('Closing modal');
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        });
    }

    // Đóng modal khi click bên ngoài
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('Closing modal (clicked outside)');
                modal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Đóng modal bằng phím ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
            console.log('Closing modal (ESC key)');
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });
});

function getNextDate(day, month) {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Tạo ngày trong năm hiện tại
    let date = new Date(currentYear, month - 1, day);
    
    // Nếu ngày đã qua trong năm hiện tại, lấy ngày của năm sau
    if (date < now) {
        date = new Date(currentYear + 1, month - 1, day);
    }
    
    return date;
}

function showTab(tabName) {
    // Ẩn tất cả các tab
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Hiển thị tab được chọn
    document.getElementById(`${tabName}-tab`).style.display = 'block';
    
    // Cập nhật trạng thái active của các nút
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function calculateLoveDays() {
    const dateInput = document.getElementById('startDate');
    startDate = new Date(dateInput.value);
    
    if (isNaN(startDate.getTime())) {
        alert('Vui lòng chọn ngày bắt đầu!');
        return;
    }

    localStorage.setItem('loveStartDate', startDate.toISOString());
    updateCounter();
    if (timer) clearInterval(timer);
    timer = setInterval(updateCounter, 1000);
    updateImportantDates();
}

function updateCounter() {
    if (!startDate) return;

    const now = new Date();
    const diff = now - startDate;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('daysCount').textContent = days;
    document.getElementById('hoursCount').textContent = hours;
    document.getElementById('minutesCount').textContent = minutes;
    document.getElementById('secondsCount').textContent = seconds;

    const loveMessage = document.getElementById('loveMessage');
    if (days < 30) {
        loveMessage.textContent = 'Huy & Thảo mới bắt đầu hành trình yêu thương...';
    } else if (days < 100) {
        loveMessage.textContent = 'Tình yêu của Huy & Thảo đang phát triển từng ngày...';
    } else if (days < 365) {
        loveMessage.textContent = 'Một năm yêu thương đang đến gần...';
    } else {
        loveMessage.textContent = `Huy & Thảo đã yêu nhau được ${days} ngày rồi!`;
    }
}

function updateImportantDates() {
    if (!startDate) return;

    const now = new Date();
    const anniversaryDates = [];
    
    // Tính các ngày kỷ niệm (bội số 100)
    for (let i = 100; i <= 1000; i += 100) {
        const anniversaryDate = new Date(startDate);
        anniversaryDate.setDate(startDate.getDate() + i);
        if (anniversaryDate > now) {
            anniversaryDates.push({
                date: anniversaryDate,
                title: `Kỷ niệm ${i} ngày yêu nhau`
            });
        }
    }

    // Cập nhật hiển thị ngày kỷ niệm
    const anniversaryContainer = document.getElementById('anniversary-dates');
    anniversaryContainer.innerHTML = anniversaryDates.map(date => createDateItem(date)).join('');

    // Cập nhật hiển thị ngày lễ
    const holidayContainer = document.getElementById('holiday-dates');
    const holidayDates = importantDates.holidays.map(holiday => ({
        date: getNextDate(holiday.day, holiday.month),
        title: holiday.title
    }));
    holidayContainer.innerHTML = holidayDates.map(date => createDateItem(date)).join('');

    // Cập nhật hiển thị sinh nhật
    const birthdayContainer = document.getElementById('birthday-dates');
    const birthdayDates = importantDates.birthdays.map(birthday => ({
        date: getNextDate(birthday.day, birthday.month),
        title: birthday.title
    }));
    birthdayContainer.innerHTML = birthdayDates.map(date => createDateItem(date)).join('');
}

function createDateItem(dateObj) {
    const now = new Date();
    const daysUntil = Math.ceil((dateObj.date - now) / (1000 * 60 * 60 * 24));
    const formattedDate = dateObj.date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return `
        <div class="date-item">
            <div class="date">${formattedDate}</div>
            <div class="title">${dateObj.title}</div>
            <div class="days-until">Còn ${daysUntil} ngày nữa</div>
        </div>
    `;
}

function handleImageUpload(event) {
    const files = event.target.files;
    if (!files) return;

    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const memory = {
                    id: Date.now().toString(),
                    image: e.target.result,
                    date: new Date().toLocaleDateString('vi-VN'),
                    uploadDate: new Date().toISOString()
                };
                memories.push(memory);
                saveMemories();
                displayMemories();
            };
            reader.readAsDataURL(file);
        }
    }
}

function deleteMemory(id) {
    console.log('Deleting memory:', id);
    console.log('Before deletion:', memories);
    memories = memories.filter(memory => memory.id !== id);
    console.log('After deletion:', memories);
    saveMemories();
    displayMemories();
}

function saveMemories() {
    try {
        localStorage.setItem('memories', JSON.stringify(memories));
        console.log('Memories saved:', memories);
    } catch (error) {
        console.error('Error saving memories:', error);
    }
}

function getTimeElapsed(uploadDate) {
    const now = new Date();
    const upload = new Date(uploadDate);
    const diff = now - upload;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days} ngày trước`;
    } else if (hours > 0) {
        return `${hours} giờ trước`;
    } else if (minutes > 0) {
        return `${minutes} phút trước`;
    } else {
        return 'Vừa nãy';
    }
}

function displayMemories() {
    const grid = document.getElementById('memoriesGrid');
    if (!grid) return;

    // Xóa các event listener cũ nếu có
    const oldItems = document.querySelectorAll('.memory-item');
    oldItems.forEach(item => {
        item.replaceWith(item.cloneNode(true));
    });

    // Lấy dữ liệu mới nhất từ localStorage
    try {
        const savedMemories = JSON.parse(localStorage.getItem('memories')) || [];
        if (JSON.stringify(savedMemories) !== JSON.stringify(memories)) {
            memories = savedMemories;
        }
    } catch (error) {
        console.error('Error loading memories:', error);
    }

    grid.innerHTML = memories.map(memory => `
        <div class="memory-item" data-id="${memory.id}">
            <img src="${memory.image}" alt="Kỷ niệm">
            <button class="delete-btn" onclick="event.stopPropagation(); deleteMemory('${memory.id}')">×</button>
            <div class="time-elapsed">${getTimeElapsed(memory.uploadDate)}</div>
            <div class="date">${memory.date}</div>
        </div>
    `).join('');

    // Thêm sự kiện click cho mỗi memory-item
    const memoryItems = document.querySelectorAll('.memory-item');
    console.log('Found memory items:', memoryItems.length);
    console.log('Current memories:', memories);
    
    memoryItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const memoryId = this.getAttribute('data-id');
            console.log('Clicked memory item:', memoryId);
            openImageModal(memoryId);
        });
    });
}

function openImageModal(memoryId) {
    console.log('Opening modal for memory:', memoryId);
    console.log('Available memories:', memories);
    const memory = memories.find(m => m.id === memoryId);
    if (!memory) {
        console.log('Memory not found:', memoryId);
        return;
    }

    if (!modal || !modalImage || !modalDate || !modalTime) {
        console.log('Modal elements not found');
        return;
    }

    modalImage.src = memory.image;
    modalImage.classList.add('loading');
    modalDate.textContent = memory.date;
    modalTime.textContent = getTimeElapsed(memory.uploadDate);
    
    modalImage.onload = () => {
        modalImage.classList.remove('loading');
    };

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    console.log('Modal should be visible now');
}

// Cập nhật hàm window.onload
window.onload = function() {
    const savedDate = localStorage.getItem('loveStartDate');
    if (savedDate) {
        startDate = new Date(savedDate);
        document.getElementById('startDate').value = savedDate.split('T')[0];
    } else {
        startDate = defaultDate;
        document.getElementById('startDate').value = defaultDate.toISOString().split('T')[0];
    }
    updateCounter();
    timer = setInterval(updateCounter, 1000);
    updateImportantDates();
    displayMemories();
}; 