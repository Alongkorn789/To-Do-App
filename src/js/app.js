/* ==========================================================================
   TaskFlow Core App Logic & DOM Manipulation
   ========================================================================== */

import { storage } from './storage.js';

// State Management
const state = {
  currentFilter: 'all',      // 'all' | 'today' | 'upcoming' | 'completed' | 'category'
  activeCategoryId: null,    // selected category ID if filter is 'category'
  searchQuery: '',
  sortBy: 'createdAt-desc'  // 'createdAt-desc' | 'dueDate-asc' | 'dueDate-desc' | 'priority-desc' | 'priority-asc' | 'title-asc'
};

// DOM Elements Cache
const elements = {
  body: document.body,
  taskList: document.getElementById('taskList'),
  categoriesList: document.getElementById('categories-list'),
  pageTitle: document.getElementById('pageTitle'),
  pageSubtitle: document.getElementById('pageSubtitle'),
  searchInput: document.getElementById('searchInput'),
  sortBySelect: document.getElementById('sortBySelect'),
  tasksCountText: document.getElementById('tasksCountText'),
  emptyState: document.getElementById('emptyState'),
  emptyStateAddTaskBtn: document.getElementById('emptyStateAddTaskBtn'),
  openAddTaskModalBtn: document.getElementById('openAddTaskModalBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  menuToggleBtn: document.getElementById('menuToggleBtn'),
  sidebar: document.getElementById('sidebar'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),

  // Topbar Stats
  topbarProgressBar: document.getElementById('topbarProgressBar'),
  topbarProgressText: document.getElementById('topbarProgressText'),
  activeTasksCount: document.getElementById('activeTasksCount'),

  // Dashboard Cards Stats
  statTotalTasks: document.getElementById('stat-total-tasks'),
  statPendingTasks: document.getElementById('stat-pending-tasks'),
  statCompletedTasks: document.getElementById('stat-completed-tasks'),
  statProgressRing: document.getElementById('stat-progress-ring'),
  statProgressPercent: document.getElementById('stat-progress-percent'),

  // Modals
  taskModal: document.getElementById('taskModal'),
  taskForm: document.getElementById('taskForm'),
  taskModalTitle: document.getElementById('taskModalTitle'),
  taskIdInput: document.getElementById('taskId'),
  taskTitleInput: document.getElementById('taskTitle'),
  taskDescInput: document.getElementById('taskDesc'),
  taskDueDateInput: document.getElementById('taskDueDate'),
  taskCategorySelect: document.getElementById('taskCategory'),
  closeTaskModalBtn: document.getElementById('closeTaskModalBtn'),
  cancelTaskModalBtn: document.getElementById('cancelTaskModalBtn'),

  categoryModal: document.getElementById('categoryModal'),
  categoryForm: document.getElementById('categoryForm'),
  openAddCategoryModalBtn: document.getElementById('openAddCategoryModalBtn'),
  closeCategoryModalBtn: document.getElementById('closeCategoryModalBtn'),
  cancelCategoryModalBtn: document.getElementById('cancelCategoryModalBtn'),
  categoryNameInput: document.getElementById('categoryName')
};

// Backdrop element for Mobile Sidebar
let sidebarBackdrop = null;

// Helper to escape HTML characters
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Helper to format date relative to local timezone YYYY-MM-DD
const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format Date for Display
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
};

// Priority map for labels
const PRIORITY_LABELS = {
  low: 'ต่ำ',
  medium: 'กลาง',
  high: 'สูง'
};

// Priority numeric weight for sorting
const PRIORITY_WEIGHTS = {
  low: 1,
  medium: 2,
  high: 3
};

/* ==========================================================================
   State & Render Operations
   ========================================================================== */

// Apply and setup Theme
const initTheme = () => {
  const savedTheme = storage.getTheme();
  if (savedTheme === 'light') {
    elements.body.classList.add('light-mode');
  } else {
    elements.body.classList.remove('light-mode');
  }
};

// Toggle Theme
const toggleTheme = () => {
  const isLight = elements.body.classList.toggle('light-mode');
  storage.setTheme(isLight ? 'light' : 'dark');
};

// Setup mobile sidebar backdrop
const initMobileSidebar = () => {
  sidebarBackdrop = document.createElement('div');
  sidebarBackdrop.className = 'sidebar-backdrop';
  document.body.appendChild(sidebarBackdrop);

  elements.menuToggleBtn.addEventListener('click', () => {
    elements.sidebar.classList.add('active');
    sidebarBackdrop.classList.add('active');
  });

  const closeSidebar = () => {
    elements.sidebar.classList.remove('active');
    sidebarBackdrop.classList.remove('active');
  };

  elements.closeSidebarBtn.addEventListener('click', closeSidebar);
  sidebarBackdrop.addEventListener('click', closeSidebar);
};

// Populate the task category select dropdown inside modal
const populateCategoryDropdown = () => {
  const categories = storage.getCategories();
  let html = `<option value="">ไม่มีหมวดหมู่</option>`;
  categories.forEach(cat => {
    html += `<option value="${cat.id}">${cat.name}</option>`;
  });
  elements.taskCategorySelect.innerHTML = html;
};

// Update Sidebar Categories list
const renderCategories = () => {
  const categories = storage.getCategories();
  const tasks = storage.getTasks();
  
  let html = '';
  categories.forEach(cat => {
    // Count active (uncompleted) tasks in this category
    const count = tasks.filter(t => t.categoryId === cat.id && !t.completed).length;
    const isActive = state.currentFilter === 'category' && state.activeCategoryId === cat.id;

    // Use inline styling variable for hover custom colors
    html += `
      <li class="nav-item ${isActive ? 'active' : ''}" data-category-id="${cat.id}">
        <a href="#">
          <span class="category-dot" style="background-color: var(--color-${cat.color})"></span>
          <span class="material-symbols-outlined" style="color: var(--color-${cat.color})">${cat.icon}</span>
          <span class="nav-text">${escapeHTML(cat.name)}</span>
          <span class="badge">${count}</span>
        </a>
      </li>
    `;
  });
  
  elements.categoriesList.innerHTML = html;

  // Add click events to categories
  const catItems = elements.categoriesList.querySelectorAll('.nav-item');
  catItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      
      state.currentFilter = 'category';
      state.activeCategoryId = item.dataset.categoryId;
      
      const category = categories.find(c => c.id === state.activeCategoryId);
      elements.pageTitle.textContent = category ? category.name : 'หมวดหมู่';
      elements.pageSubtitle.textContent = `รายการงานในหมวดหมู่ ${category ? category.name : ''}`;
      
      renderTasks();
      
      // Close mobile sidebar if open
      elements.sidebar.classList.remove('active');
      if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
    });
  });
};

// Update all sidebar filter count badges and stats circles
const updateBadgesAndStats = () => {
  const tasks = storage.getTasks();
  const todayStr = getLocalDateString();

  // Sidebar badges (active/uncompleted counts)
  const allActiveCount = tasks.filter(t => !t.completed).length;
  const todayActiveCount = tasks.filter(t => !t.completed && t.dueDate === todayStr).length;
  const upcomingActiveCount = tasks.filter(t => !t.completed && t.dueDate && t.dueDate > todayStr).length;
  const completedCount = tasks.filter(t => t.completed).length;

  document.getElementById('badge-all').textContent = allActiveCount;
  document.getElementById('badge-today').textContent = todayActiveCount;
  document.getElementById('badge-upcoming').textContent = upcomingActiveCount;
  document.getElementById('badge-completed').textContent = completedCount;

  // Topbar progress
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  elements.topbarProgressBar.style.width = `${progressPercent}%`;
  elements.topbarProgressText.textContent = `${progressPercent}%`;
  elements.activeTasksCount.textContent = `${allActiveCount} งานรอดำเนินการ`;

  // Dashboard Stats card
  elements.statTotalTasks.textContent = totalCount;
  elements.statPendingTasks.textContent = allActiveCount;
  elements.statCompletedTasks.textContent = completedCount;
  elements.statProgressPercent.textContent = `${progressPercent}%`;

  // Update SVG Progress Ring
  const ring = elements.statProgressRing;
  if (ring) {
    const radius = ring.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (progressPercent / 100) * circumference;
    ring.style.strokeDashoffset = offset;
  }
};

// Render Tasks List with Filters and Sorters applied
const renderTasks = () => {
  const tasks = storage.getTasks();
  const categories = storage.getCategories();
  const todayStr = getLocalDateString();
  
  // 1. Filter Tasks
  let filteredTasks = tasks.filter(task => {
    // Search query filter
    const matchesSearch = state.searchQuery === '' || 
      task.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(state.searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Nav Category/Filters
    if (state.currentFilter === 'all') {
      return true;
    } else if (state.currentFilter === 'today') {
      return task.dueDate === todayStr;
    } else if (state.currentFilter === 'upcoming') {
      return task.dueDate && task.dueDate > todayStr;
    } else if (state.currentFilter === 'completed') {
      return task.completed;
    } else if (state.currentFilter === 'category') {
      return task.categoryId === state.activeCategoryId;
    }
    return true;
  });

  // 2. Sort Tasks
  filteredTasks.sort((a, b) => {
    const [field, direction] = state.sortBy.split('-');
    const multiplier = direction === 'desc' ? -1 : 1;

    if (field === 'createdAt') {
      return (new Date(a.createdAt) - new Date(b.createdAt)) * multiplier;
    } else if (field === 'dueDate') {
      if (!a.dueDate) return 1; // Put tasks without due dates at the end
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate) * multiplier;
    } else if (field === 'priority') {
      return (PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority]) * multiplier;
    } else if (field === 'title') {
      return a.title.localeCompare(b.title) * multiplier;
    }
    return 0;
  });

  // 3. Render HTML
  elements.tasksCountText.textContent = `พบ ${filteredTasks.length} งาน`;

  if (filteredTasks.length === 0) {
    elements.taskList.style.display = 'none';
    elements.emptyState.style.display = 'flex';
  } else {
    elements.taskList.style.display = 'flex';
    elements.emptyState.style.display = 'none';

    let html = '';
    filteredTasks.forEach(task => {
      const category = categories.find(c => c.id === task.categoryId);
      
      // Category Badge template
      const categoryBadge = category ? `
        <span class="meta-badge category-badge">
          <span class="category-dot" style="background-color: var(--color-${category.color}); margin-right: 6px; width: 6px; height: 6px;"></span>
          <span>${escapeHTML(category.name)}</span>
        </span>
      ` : '';

      // Due date class badge decoration
      let dueClass = '';
      if (task.dueDate && !task.completed) {
        if (task.dueDate < todayStr) {
          dueClass = 'overdue';
        } else if (task.dueDate === todayStr) {
          dueClass = 'today';
        }
      }

      const dueBadge = task.dueDate ? `
        <span class="meta-badge due-badge ${dueClass}">
          <span class="material-symbols-outlined">calendar_today</span>
          <span>${dueClass === 'overdue' ? 'เลยกำหนด: ' : ''}${formatDisplayDate(task.dueDate)}</span>
        </span>
      ` : '';

      html += `
        <div class="task-card ${task.completed ? 'completed' : ''} priority-${task.priority}" data-id="${task.id}">
          <div class="task-card-left">
            <label class="checkbox-wrapper" onclick="event.stopPropagation()">
              <input type="checkbox" class="task-complete-checkbox" ${task.completed ? 'checked' : ''}>
              <span class="checkmark">
                <span class="material-symbols-outlined">check</span>
              </span>
            </label>
            <div class="task-details">
              <h3 class="task-title">${escapeHTML(task.title)}</h3>
              ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
              <div class="task-card-meta">
                ${categoryBadge}
                ${dueBadge}
              </div>
            </div>
          </div>
          <div class="task-card-right" onclick="event.stopPropagation()">
            <span class="priority-tag ${task.priority}">${PRIORITY_LABELS[task.priority]}</span>
            <button class="btn-icon btn-edit-task" title="แก้ไขงาน" aria-label="แก้ไขงาน">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon btn-delete-task" title="ลบงาน" aria-label="ลบงาน">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      `;
    });
    elements.taskList.innerHTML = html;
    setupTaskCardEvents();
  }

  // Sync category counts and statistics widgets
  renderCategories();
  updateBadgesAndStats();
};

/* ==========================================================================
   Modals & Form Submissions
   ========================================================================== */

// Open Task Modal (handles both Add and Edit)
const openTaskModal = (task = null) => {
  populateCategoryDropdown();
  
  if (task) {
    elements.taskModalTitle.textContent = 'แก้ไขภารกิจ';
    elements.taskIdInput.value = task.id;
    elements.taskTitleInput.value = task.title;
    elements.taskDescInput.value = task.description || '';
    elements.taskDueDateInput.value = task.dueDate || '';
    elements.taskCategorySelect.value = task.categoryId || '';
    
    // Set checked radio button for priority
    const priorityRadios = elements.taskForm.querySelectorAll('input[name="taskPriority"]');
    priorityRadios.forEach(radio => {
      radio.checked = radio.value === task.priority;
    });
  } else {
    elements.taskModalTitle.textContent = 'สร้างงานใหม่';
    elements.taskForm.reset();
    elements.taskIdInput.value = '';
    
    // Set default category to active category in sidebar if applicable
    if (state.currentFilter === 'category' && state.activeCategoryId) {
      elements.taskCategorySelect.value = state.activeCategoryId;
    }
  }
  
  elements.taskModal.classList.add('active');
};

const closeTaskModal = () => {
  elements.taskModal.classList.remove('active');
  elements.taskForm.reset();
};

// Open Category Modal
const openCategoryModal = () => {
  elements.categoryForm.reset();
  elements.categoryModal.classList.add('active');
};

const closeCategoryModal = () => {
  elements.categoryModal.classList.remove('active');
  elements.categoryForm.reset();
};

// Bind dynamic actions to rendered task cards
const setupTaskCardEvents = () => {
  const cards = elements.taskList.querySelectorAll('.task-card');
  
  cards.forEach(card => {
    const id = card.dataset.id;
    const task = storage.getTasks().find(t => t.id === id);

    if (!task) return;

    // Card click opens Edit modal
    card.addEventListener('click', () => {
      openTaskModal(task);
    });

    // Checkbox toggles completed state
    const checkbox = card.querySelector('.task-complete-checkbox');
    checkbox.addEventListener('change', () => {
      storage.toggleTaskCompletion(id);
      renderTasks();
    });

    // Edit button click
    const editBtn = card.querySelector('.btn-edit-task');
    editBtn.addEventListener('click', () => {
      openTaskModal(task);
    });

    // Delete button click
    const deleteBtn = card.querySelector('.btn-delete-task');
    deleteBtn.addEventListener('click', () => {
      if (confirm('คุณต้องการลบภารกิจนี้ใช่หรือไม่?')) {
        storage.deleteTask(id);
        renderTasks();
      }
    });
  });
};

/* ==========================================================================
   Event Registration & Initializers
   ========================================================================== */

const registerEvents = () => {
  // Theme Toggle click
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Quick Filter nav links click
  const quickFilters = document.querySelectorAll('.sidebar-nav .nav-section:first-child .nav-item');
  quickFilters.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      
      state.currentFilter = item.dataset.filter;
      state.activeCategoryId = null;

      const titles = {
        all: { t: 'งานทั้งหมด', s: 'จัดการสิ่งที่คุณต้องทำทั้งหมดอย่างเป็นระเบียบ' },
        today: { t: 'วันนี้', s: 'งานสำคัญและกิจกรรมที่ต้องทำให้เสร็จสิ้นในวันนี้' },
        upcoming: { t: 'เร็วๆ นี้', s: 'งานและเดดไลน์ในอนาคตอันใกล้ที่จะมาถึง' },
        completed: { t: 'เสร็จสิ้นแล้ว', s: 'ประวัติภารกิจและการทำงานที่คุณทำสำเร็จแล้ว' }
      };

      elements.pageTitle.textContent = titles[state.currentFilter].t;
      elements.pageSubtitle.textContent = titles[state.currentFilter].s;
      
      renderTasks();
      
      // Close mobile sidebar if open
      elements.sidebar.classList.remove('active');
      if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
    });
  });

  // Search input typing
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTasks();
  });

  // Sort select change
  elements.sortBySelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderTasks();
  });

  // Open modals
  elements.openAddTaskModalBtn.addEventListener('click', () => openTaskModal(null));
  elements.emptyStateAddTaskBtn.addEventListener('click', () => openTaskModal(null));
  elements.openAddCategoryModalBtn.addEventListener('click', openCategoryModal);

  // Close modals
  elements.closeTaskModalBtn.addEventListener('click', closeTaskModal);
  elements.cancelTaskModalBtn.addEventListener('click', closeTaskModal);
  elements.closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
  elements.cancelCategoryModalBtn.addEventListener('click', closeCategoryModal);

  // Submit Task Form
  elements.taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = elements.taskIdInput.value;
    const title = elements.taskTitleInput.value.trim();
    const description = elements.taskDescInput.value.trim();
    const dueDate = elements.taskDueDateInput.value;
    const categoryId = elements.taskCategorySelect.value;
    
    const priorityRadio = elements.taskForm.querySelector('input[name="taskPriority"]:checked');
    const priority = priorityRadio ? priorityRadio.value : 'low';

    if (!title) return;

    storage.saveTask({
      id: id || undefined,
      title,
      description,
      dueDate,
      categoryId,
      priority
    });

    closeTaskModal();
    renderTasks();
  });

  // Submit Category Form
  elements.categoryForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = elements.categoryNameInput.value.trim();
    const iconRadio = elements.categoryForm.querySelector('input[name="categoryIcon"]:checked');
    const icon = iconRadio ? iconRadio.value : 'work';
    
    const colorRadio = elements.categoryForm.querySelector('input[name="categoryColor"]:checked');
    const color = colorRadio ? colorRadio.value : 'violet';

    if (!name) return;

    storage.saveCategory({
      name,
      icon,
      color
    });

    closeCategoryModal();
    renderTasks();
  });
};

// Boot App
const initApp = () => {
  storage.init();
  initTheme();
  initMobileSidebar();
  registerEvents();
  renderTasks();
};

document.addEventListener('DOMContentLoaded', initApp);
