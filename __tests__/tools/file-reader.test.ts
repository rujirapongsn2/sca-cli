import { FileReader } from '../../src/tools/file-reader.js';
import * as fs from 'fs';
import * as path from 'path';

describe('FileReader', () => {
  let reader: FileReader;
  const testDir = path.join(process.cwd(), '.sca_test_files');
  const testFilePath = path.join(testDir, 'test-file.txt');

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(testFilePath, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
  });

  afterAll(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(testDir) && fs.readdirSync(testDir).length === 0) {
      fs.rmdirSync(testDir);
    }
  });

  beforeEach(() => {
    reader = new FileReader();
  });

  describe('read', () => {
    it('should read entire file content', () => {
      const result = reader.read({ path: testFilePath });
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should return file metadata', () => {
      const result = reader.read({ path: testFilePath });
      expect(result.path).toBe(testFilePath);
      expect(result.size).toBeGreaterThan(0);
      expect(result.lines.total).toBe(5);
    });

    it('should throw error for non-existent file', () => {
      expect(() => reader.read({ path: '/non/existent/path.txt' })).toThrow();
    });

    it('should support offset and limit options', () => {
      const result = reader.read({ path: testFilePath, offset: 1, limit: 2 });
      expect(result.lines.start).toBe(2);
      expect(result.lines.total).toBe(5);
    });
  });

  describe('readSafe', () => {
    it('should read file safely without throwing', () => {
      const result = reader.readSafe(testFilePath);
      expect(result.content).toBeDefined();
      expect(result.lines.total).toBe(5);
    });

    it('should throw error for non-existent file', () => {
      expect(() => reader.readSafe('/non/existent/file.txt')).toThrow();
    });
  });

  describe('canRead', () => {
    it('should return true for existing file', () => {
      expect(reader.canRead(testFilePath)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(reader.canRead('/non/existent/file.txt')).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    it('should return file information', () => {
      const info = reader.getFileInfo(testFilePath);
      expect(info.exists).toBe(true);
      expect(info.size).toBeGreaterThan(0);
      expect(info.lines).toBe(5);
    });

    it('should return exists=false for non-existent file', () => {
      const info = reader.getFileInfo('/non/existent.txt');
      expect(info.exists).toBe(false);
    });
  });
});
