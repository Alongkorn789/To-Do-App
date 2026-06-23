/* ==========================================================================
   TaskFlow Storage Module - Integrated with MongoDB & FastAPI
   ========================================================================== */

// Helper: ตรวจ Content-Type ก่อนแปลง JSON
// ป้องกัน crash "Unexpected token '<'" เมื่อ server ส่ง HTML error page (503)
async function safeJSON(res) {
  const contentType = res.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    // Server ส่ง HTML หรือ text กลับมา (เช่น Render/Netlify error page)
    const text = await res.text().catch(() => '');
    throw new Error(`Server ไม่พร้อมให้บริการ (HTTP ${res.status}). กรุณาลองใหม่อีกครั้ง`);
  }
  return res.json();
}

// Helper function to handle fetch calls with credentials and status checks
async function request(url, options = {}) {
  options.credentials = 'include';
  
  if (options.body && !options.headers) {
    options.headers = {
      'Content-Type': 'application/json'
    };
  }

  const res = await fetch(url, options);

  // 401 interceptor — redirect ไป login แต่ห้ามวนซ้ำถ้าอยู่ที่ login อยู่แล้ว
  if (res.status === 401) {
    const path = window.location.pathname;
    const isOnLogin = path.endsWith('/login.html') || path === '/login';
    if (!isOnLogin) {
      window.location.replace('/login.html');
    }
    throw new Error('Unauthorized');
  }

  return res;
}

export const storage = {
  // Initial handshake with API (ไม่ใช้แล้ว — auth check ทำใน app.js แทน)
  async init() {
    try {
      const res = await request('/api/auth/me');
      if (!res.ok) throw new Error(`Server returned status: ${res.status}`);
      const user = await safeJSON(res);
      console.log('Backend connected. Authenticated as:', user.username);
      return user;
    } catch (err) {
      console.error('Cannot connect to backend server or not authenticated.', err);
    }
  },

  // AUTH API
  async login(username, password) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      // ใช้ safeJSON เพื่อป้องกัน crash กรณี server ส่ง HTML error (503)
      try {
        const errData = await safeJSON(res);
        throw new Error(errData.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      } catch (parseErr) {
        // ถ้า parse ไม่ได้ → ใช้ข้อความ error จาก safeJSON
        throw parseErr;
      }
    }
    return await safeJSON(res);
  },

  async register(username, email, password) {
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    if (!res.ok) {
      try {
        const errData = await safeJSON(res);
        throw new Error(errData.detail || 'ลงทะเบียนไม่สำเร็จ');
      } catch (parseErr) {
        throw parseErr;
      }
    }
    return await safeJSON(res);
  },

  async logout() {
    try {
      const res = await request('/api/auth/logout', { method: 'POST' });
      return res.ok;
    } catch (err) {
      console.error("Error in logout:", err);
      return false;
    }
  },

  async checkSession() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return await safeJSON(res);
    } catch (err) {
      return null;
    }
  },

  // TASKS API
  async getTasks() {
    try {
      const res = await request('/tasks');
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return await safeJSON(res);
    } catch (err) {
      console.error("Error in getTasks:", err);
      return [];
    }
  },

  async saveTask(taskData) {
    try {
      let res;
      if (taskData.id) {
        res = await request(`/tasks/${taskData.id}`, {
          method: 'PUT',
          body: JSON.stringify(taskData)
        });
      } else {
        res = await request('/tasks', {
          method: 'POST',
          body: JSON.stringify(taskData)
        });
      }
      if (!res.ok) throw new Error("Failed to save task");
      return await safeJSON(res);
    } catch (err) {
      console.error("Error in saveTask:", err);
      alert('ไม่สามารถบันทึกงานได้ เนื่องจากข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      throw err;
    }
  },

  // AI SMART ADD API
  async smartAddRequest(text) {
    try {
      const res = await request('/api/smart-add', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error("Failed to process smart add via AI");
      return await safeJSON(res);
    } catch (err) {
      console.error("Error in smartAddRequest:", err);
      throw err;
    }
  },

  async deleteTask(id) {
    try {
      const res = await request(`/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete task");
      return await safeJSON(res);
    } catch (err) {
      console.error("Error in deleteTask:", err);
      alert('ไม่สามารถลบงานได้ เนื่องจากข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      throw err;
    }
  },

  async toggleTaskCompletion(id) {
    try {
      const tasks = await this.getTasks();
      const task = tasks.find(t => t.id === id);
      if (task) {
        const updatedTask = {
          ...task,
          completed: !task.completed,
          completedAt: !task.completed ? new Date().toISOString() : null
        };
        return await this.saveTask(updatedTask);
      }
    } catch (err) {
      console.error("Error in toggleTaskCompletion:", err);
      throw err;
    }
  },

  // CATEGORIES API
  async getCategories() {
    try {
      const res = await request('/categories');
      if (!res.ok) throw new Error("Failed to fetch categories");
      return await safeJSON(res);
    } catch (err) {
      console.error("Error in getCategories:", err);
      return [];
    }
  },

  async saveCategory(categoryData) {
    try {
      const res = await request('/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData)
      });
      if (!res.ok) throw new Error("Failed to save category");
      return await safeJSON(res);
    } catch (err) {
      console.error("Error in saveCategory:", err);
      alert('ไม่สามารถเพิ่มหมวดหมู่ได้ เนื่องจากข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      throw err;
    }
  },

  async deleteCategory(id) {
    try {
      const res = await request(`/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete category");
      return await safeJSON(res);
    } catch (err) {
      console.error("Error in deleteCategory:", err);
      alert('ไม่สามารถลบหมวดหมู่ได้ เนื่องจากข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      throw err;
    }
  },

  // THEME API
  async getTheme() {
    try {
      const res = await request('/theme');
      if (!res.ok) throw new Error("Failed to fetch theme");
      const data = await safeJSON(res);
      return data.theme;
    } catch (err) {
      console.error("Error in getTheme:", err);
      return 'dark'; // fallback to dark theme
    }
  },

  async setTheme(theme) {
    try {
      const res = await request('/theme', {
        method: 'PUT',
        body: JSON.stringify({ theme })
      });
      if (!res.ok) throw new Error("Failed to save theme");
      return await safeJSON(res);
    } catch (err) {
      console.error("Error in setTheme:", err);
    }
  }
};

