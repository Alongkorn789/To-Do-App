/* ==========================================================================
   TaskFlow LocalStorage State Management
   ========================================================================== */

const STORAGE_KEYS = {
  TASKS: 'taskflow_tasks',
  CATEGORIES: 'taskflow_categories',
  THEME: 'taskflow_theme'
};

// Default categories
const DEFAULT_CATEGORIES = [
  { id: 'cat-work', name: 'งาน (Work)', icon: 'work', color: 'violet' },
  { id: 'cat-personal', name: 'ส่วนตัว (Personal)', icon: 'person', color: 'blue' },
  { id: 'cat-shopping', name: 'ช้อปปิ้ง (Shopping)', icon: 'shopping_cart', color: 'emerald' },
  { id: 'cat-health', name: 'สุขภาพ (Health)', icon: 'favorite', color: 'rose' }
];

// Helper to get date strings relative to today
const getRelativeDateString = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
};

// Default initial tasks
const DEFAULT_TASKS = [
  {
    id: 'task-1',
    title: 'ออกแบบ UI แดชบอร์ดสำหรับโปรเจกต์ TaskFlow',
    description: 'พัฒนาหน้าตาแดชบอร์ดตามโครงร่างด้วยสไตล์ Glassmorphism และตั้งค่าระบบสี Dark/Light mode ให้ดูทันสมัยพรีเมียม',
    dueDate: getRelativeDateString(1), // Tomorrow
    categoryId: 'cat-work',
    priority: 'high',
    completed: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
  },
  {
    id: 'task-2',
    title: 'ซื้อผักผลไม้สดและนมกล่องที่ซูเปอร์มาร์เก็ต',
    description: 'แวะซื้อกล้วยหอม อะโวคาโด นมจืด และไข่ไก่สำหรับตุนไว้ช่วงสัปดาห์นี้',
    dueDate: getRelativeDateString(0), // Today
    categoryId: 'cat-shopping',
    priority: 'medium',
    completed: false,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString() // 5 hours ago
  },
  {
    id: 'task-3',
    title: 'วิ่งออกกำลังกายจ็อกกิ้งรอบสวนสาธารณะ 5 กม.',
    description: 'คาร์ดิโอช่วงเย็นเพื่อรักษาสุขภาพ ยืดกล้ามเนื้อก่อนและหลังวิ่งให้ดี',
    dueDate: getRelativeDateString(0), // Today
    categoryId: 'cat-health',
    priority: 'low',
    completed: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString() // Yesterday
  },
  {
    id: 'task-4',
    title: 'เคลียร์กล่องข้อความและตอบกลับอีเมลลูกค้า',
    description: 'ตอบกลับข้อสอบถามเกี่ยวกับบริการใหม่และอัปเดตไฟล์สไลด์นำเสนอส่งให้ฝ่ายขาย',
    dueDate: getRelativeDateString(3), // 3 days from now
    categoryId: 'cat-work',
    priority: 'medium',
    completed: false,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString() // 2 days ago
  }
];

export const storage = {
  // Initial setup for the app
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(DEFAULT_TASKS));
    }
  },

  // TASKS
  getTasks() {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [];
  },

  saveTask(taskData) {
    const tasks = this.getTasks();
    if (taskData.id) {
      // Edit existing task
      const index = tasks.findIndex(t => t.id === taskData.id);
      if (index !== -1) {
        tasks[index] = {
          ...tasks[index],
          ...taskData,
          updatedAt: new Date().toISOString()
        };
      }
    } else {
      // Add new task
      const newTask = {
        ...taskData,
        id: `task-${Date.now()}`,
        completed: false,
        createdAt: new Date().toISOString()
      };
      tasks.push(newTask);
    }
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return tasks;
  },

  deleteTask(id) {
    const tasks = this.getTasks();
    const filteredTasks = tasks.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filteredTasks));
    return filteredTasks;
  },

  toggleTaskCompletion(id) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index].completed = !tasks[index].completed;
      tasks[index].completedAt = tasks[index].completed ? new Date().toISOString() : null;
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    }
    return tasks;
  },

  // CATEGORIES
  getCategories() {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
  },

  saveCategory(categoryData) {
    const categories = this.getCategories();
    const newCategory = {
      ...categoryData,
      id: `cat-${Date.now()}`
    };
    categories.push(newCategory);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    return newCategory;
  },

  deleteCategory(id) {
    const categories = this.getCategories();
    const filteredCategories = categories.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filteredCategories));

    // Also update tasks belonging to this category to have no category
    const tasks = this.getTasks();
    const updatedTasks = tasks.map(t => {
      if (t.categoryId === id) {
        return { ...t, categoryId: '' };
      }
      return t;
    });
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updatedTasks));

    return filteredCategories;
  },

  // THEME
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  },

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }
};
