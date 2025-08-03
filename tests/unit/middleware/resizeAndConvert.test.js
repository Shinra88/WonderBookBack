// tests/unit/middleware/resizeAndConvert.test.js
const resizeAndConvert = require('../../../middleware/resizeAndConvert');
const sharp = require('sharp');

// Mock sharp
jest.mock('sharp');

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('resizeAndConvert middleware', () => {
  let req, res, next, mockSharp;

  beforeEach(() => {
    req = {};

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    next = jest.fn();

    // Mock de la chaîne sharp
    mockSharp = {
      resize: jest.fn().mockReturnThis(),
      toFormat: jest.fn().mockReturnThis(),
      toBuffer: jest.fn()
    };

    sharp.mockReturnValue(mockSharp);

    jest.clearAllMocks();
  });

  test('should call next when no file is provided', async () => {
    await resizeAndConvert(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(sharp).not.toHaveBeenCalled();
  });

  test('should process image file successfully', async () => {
    const originalBuffer = Buffer.from('fake-image-data');
    req.file = {
      buffer: originalBuffer,
      originalname: 'test-image.jpg',
      mimetype: 'image/jpeg'
    };

    const processedBuffer = Buffer.from('processed-webp-data');
    mockSharp.toBuffer.mockResolvedValue(processedBuffer);

    await resizeAndConvert(req, res, next);

    expect(sharp).toHaveBeenCalledWith(originalBuffer);
    expect(mockSharp.resize).toHaveBeenCalledWith(400, 540, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    });
    expect(mockSharp.toFormat).toHaveBeenCalledWith('webp', { quality: 80 });
    expect(mockSharp.toBuffer).toHaveBeenCalled();

    expect(req.file.buffer).toBe(processedBuffer);
    expect(req.file.originalname).toBe('test-image.webp');
    expect(req.file.mimetype).toBe('image/webp');
    expect(next).toHaveBeenCalled();
  });

  test('should handle file without extension', async () => {
    req.file = {
      buffer: Buffer.from('fake-image-data'),
      originalname: 'testimage',
      mimetype: 'image/jpeg'
    };

    const processedBuffer = Buffer.from('processed-webp-data');
    mockSharp.toBuffer.mockResolvedValue(processedBuffer);

    await resizeAndConvert(req, res, next);

    expect(req.file.originalname).toBe('testimage.webp');
    expect(next).toHaveBeenCalled();
  });

  test('should handle file with no originalname', async () => {
    req.file = {
      buffer: Buffer.from('fake-image-data'),
      mimetype: 'image/jpeg'
    };

    const processedBuffer = Buffer.from('processed-webp-data');
    mockSharp.toBuffer.mockResolvedValue(processedBuffer);

    await resizeAndConvert(req, res, next);

    expect(req.file.originalname).toBe('image.webp');
    expect(next).toHaveBeenCalled();
  });

  test('should return 500 when sharp processing fails', async () => {
    req.file = {
      buffer: Buffer.from('fake-image-data'),
      originalname: 'test-image.jpg',
      mimetype: 'image/jpeg'
    };

    mockSharp.toBuffer.mockRejectedValue(new Error('Sharp processing error'));

    await resizeAndConvert(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erreur traitement image.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle complex filename with multiple dots', async () => {
    req.file = {
      buffer: Buffer.from('fake-image-data'),
      originalname: 'my.complex.file.name.jpg',
      mimetype: 'image/jpeg'
    };

    const processedBuffer = Buffer.from('processed-webp-data');
    mockSharp.toBuffer.mockResolvedValue(processedBuffer);

    await resizeAndConvert(req, res, next);

    expect(req.file.originalname).toBe('my.webp');
    expect(next).toHaveBeenCalled();
  });
});
