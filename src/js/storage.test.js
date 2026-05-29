import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from './storage.js';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

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
        json: async () => mockTasks
      });

      const result = await storage.getTasks();

      expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/tasks');
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array and catch error when server returns error status', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await storage.getTasks();

      expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/tasks');
      expect(result).toEqual([]);
    });
  });

  describe('saveTask', () => {
    it('should issue a POST request when saving a new task (no id)', async () => {
      const taskData = { title: 'New Task Title', priority: 'medium' };
      const expectedResponse = { id: 'task-new', ...taskData, completed: false };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResponse
      });

      const result = await storage.saveTask(taskData);

      expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should issue a PUT request when saving an existing task (has id)', async () => {
      const taskData = { id: 'task-existing', title: 'Updated Title', priority: 'high' };
      const expectedResponse = { ...taskData, completed: false };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResponse
      });

      const result = await storage.saveTask(taskData);

      expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/tasks/task-existing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
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
        json: async () => expectedResponse
      });

      const result = await storage.deleteTask(taskId);

      expect(fetchMock).toHaveBeenCalledWith(`http://127.0.0.1:8000/tasks/${taskId}`, {
        method: 'DELETE'
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
        json: async () => expectedResponse
      });

      const result = await storage.smartAddRequest(inputText);

      expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/api/smart-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: inputText })
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
});
