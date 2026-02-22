import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: `Invalid ${paramName}`,
        statusCode: 400,
      });
      return;
    }
    next();
  };
};

/**
 * Validate request body has required fields
 */
export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];
    
    fields.forEach((field) => {
      if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim().length === 0)) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
        statusCode: 400,
      });
      return;
    }

    next();
  };
};

/**
 * Validate pagination query parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  if (req.query.page) {
    const page = parseInt(req.query.page as string);
    if (isNaN(page) || page < 1) {
      res.status(400).json({
        error: 'Invalid page parameter. Must be a positive integer',
        statusCode: 400,
      });
      return;
    }
  }

  if (req.query.limit) {
    const limit = parseInt(req.query.limit as string);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        error: 'Invalid limit parameter. Must be between 1 and 100',
        statusCode: 400,
      });
      return;
    }
  }

  next();
};
