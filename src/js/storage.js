/* ==========================================================================
   TaskFlow Storage Module - Integrated with MongoDB & FastAPI
   ========================================================================== */

const API_URL = 'http://127.0.0.1:8000';

export const storage = {
  // Initial handshake with API
  async init() {
    try {
      const res = await fetch(`${API_URL}/`);
      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }
      const data = await res.json();
      console.log('Backend connected:', data.message);
    } catch (err) {
      console.error('Cannot connect to backend server. Please make sure Uvicorn is running.', err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Backend ได้! โปรดตรวจสอบว่ารันระบบหลังบ้านอยู่');
    }
  },

  // TASKS API
  async getTasks() {
    try {
      const res = await fetch(`${API_URL}/tasks`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return await res.json();
    } catch (err) {
      console.error("Error in getTasks:", err);
      return [];
    }
  },

  async saveTask(taskData) {
    try {
      let res;
      if (taskData.id) {
        // Edit existing task
        res = await fetch(`${API_URL}/tasks/${taskData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(taskData)
        });
      } else {
        // Create new task
        res = await fetch(`${API_URL}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(taskData)
        });
      }

      if (!res.ok) throw new Error("Failed to save task");
      return await res.json();
    } catch (err) {
      console.error("Error in saveTask:", err);
      alert('ไม่สามารถบันทึกงานได้ เนื่องจากข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      throw err;
    }
  },

  async deleteTask(id) {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Failed to delete task");
      return await res.json();
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
      const res = await fetch(`${API_URL}/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return await res.json();
    } catch (err) {
      console.error("Error in getCategories:", err);
      return [];
    }
  },

  async saveCategory(categoryData) {
    try {
      const res = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });
      if (!res.ok) throw new Error("Failed to save category");
      return await res.json();
    } catch (err) {
      console.error("Error in saveCategory:", err);
      alert('ไม่สามารถเพิ่มหมวดหมู่ได้ เนื่องจากข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      throw err;
    }
  },

  async deleteCategory(id) {
    try {
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Failed to delete category");
      return await res.json();
    } catch (err) {
      console.error("Error in deleteCategory:", err);
      alert('ไม่สามารถลบหมวดหมู่ได้ เนื่องจากข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      throw err;
    }
  },

  // THEME API
  async getTheme() {
    try {
      const res = await fetch(`${API_URL}/theme`);
      if (!res.ok) throw new Error("Failed to fetch theme");
      const data = await res.json();
      return data.theme;
    } catch (err) {
      console.error("Error in getTheme:", err);
      return 'dark';
    }
  },

  async setTheme(theme) {
    try {
      const res = await fetch(`${API_URL}/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme })
      });
      if (!res.ok) throw new Error("Failed to save theme");
      return await res.json();
    } catch (err) {
      console.error("Error in setTheme:", err);
    }
  }
};
