import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Define global.window before importing storage.js
if (typeof global.window === 'undefined') {
  global.window = {
    location: {
      pathname: '/index.html',
      replace: vi.fn(),
      href: ''
    }
  };
}

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Import storage module under test
import { storage } from './storage.js';

beforeEach(() => {
  global.window.location.replace = vi.fn();
  global.window.location.pathname = '/index.html';
});

describe('storage.js (Frontend Storage APIs)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    // Prevent console.error from cluttering test logs
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getTasks', () => {
    it('should call GET /tasks and return parsed tasks array on success', async () => {
      const mockTasks = [
        { id: 'task-1', title: 'Test Task 1', completed: false },
        { id: 'task-2', title: 'Test Task 2', completed: true }
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTasks
      });

      const result = await storage.getTasks();

      expect(fetchMock).toHaveBeenCalledWith('/tasks', {
        credentials: 'include'
      });
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array and catch error when server returns error status', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await storage.getTasks();

      expect(fetchMock).toHaveBeenCalledWith('/tasks', {
        credentials: 'include'
      });
      expect(result).toEqual([]);
    });

    it('should redirect to login.html on 401 response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const result = await storage.getTasks();
      expect(result).toEqual([]);
      expect(window.location.replace).toHaveBeenCalledWith('/login.html');
    });
  });

  describe('saveTask', () => {
    it('should issue a POST request when saving a new task (no id)', async () => {
      const taskData = { title: 'New Task Title', priority: 'medium' };
      const expectedResponse = { id: 'task-new', ...taskData, completed: false };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => expectedResponse
      });

      const result = await storage.saveTask(taskData);

      expect(fetchMock).toHaveBeenCalledWith('/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData),
        credentials: 'include'
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should issue a PUT request when saving an existing task (has id)', async () => {
      const taskData = { id: 'task-existing', title: 'Updated Title', priority: 'high' };
      const expectedResponse = { ...taskData, completed: false };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => expectedResponse
      });

      const result = await storage.saveTask(taskData);

      expect(fetchMock).toHaveBeenCalledWith('/tasks/task-existing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData),
        credentials: 'include'
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('deleteTask', () => {
    it('should issue a DELETE request to delete task by id', async () => {
      const taskId = 'task-to-delete';
      const expectedResponse = { status: 'success', message: 'Task deleted' };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => expectedResponse
      });

      const result = await storage.deleteTask(taskId);

      expect(fetchMock).toHaveBeenCalledWith(`/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('smartAddRequest', () => {
    it('should call POST /api/smart-add with the input text and return parsed JSON on success', async () => {
      const inputText = 'ส่งรายงานภาษีพรุ่งนี้';
      const expectedResponse = {
        title: 'ส่งรายงานภาษี',
        description: '',
        categoryId: 'cat-work',
        dueDate: '2026-05-30',
        priority: 'high'
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => expectedResponse
      });

      const result = await storage.smartAddRequest(inputText);

      expect(fetchMock).toHaveBeenCalledWith('/api/smart-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: inputText }),
        credentials: 'include'
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should throw an error when API call fails', async () => {
      const inputText = 'ล้มเหลว';
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(storage.smartAddRequest(inputText)).rejects.toThrow("Failed to process smart add via AI");
    });
  });

  describe('Authentication APIs', () => {
    it('should login user and return user data on success', async () => {
      const expectedResponse = { status: 'success', user: { username: 'test' } };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => expectedResponse
      });

      const result = await storage.login('test', 'pass');
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', password: 'pass' }),
        credentials: 'include'
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should register user on success', async () => {
      const expectedResponse = { status: 'success', userId: '123' };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => expectedResponse
      });

      const result = await storage.register('test', 'test@ex.com', 'pass');
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', email: 'test@ex.com', password: 'pass' }),
        credentials: 'include'
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should logout user on success', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const result = await storage.logout();
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      expect(result).toBe(true);
    });

    it('should checkSession successfully', async () => {
      const expectedResponse = { username: 'test' };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => expectedResponse
      });

      const result = await storage.checkSession();
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', {
        credentials: 'include'
      });
      expect(result).toEqual(expectedResponse);
    });
  });
});
