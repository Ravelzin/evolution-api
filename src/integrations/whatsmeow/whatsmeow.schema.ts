import Joi from 'joi';

export const createInstanceSchema = Joi.object({
  instanceId: Joi.string().required().min(1).max(50).pattern(/^[a-zA-Z0-9_-]+$/).messages({
    'string.pattern.base': 'Instance ID can only contain letters, numbers, underscores and hyphens',
    'string.min': 'Instance ID must be at least 1 character long',
    'string.max': 'Instance ID must be no more than 50 characters long',
  }),
});

export const sendMessageSchema = Joi.object({
  number: Joi.string().required().pattern(/^[0-9]{10,15}$/).messages({
    'string.pattern.base': 'Number must be between 10 and 15 digits',
  }),
  message: Joi.string().required().min(1).max(4096).messages({
    'string.min': 'Message cannot be empty',
    'string.max': 'Message must be no more than 4096 characters',
  }),
});

export const instanceIdSchema = Joi.object({
  instanceId: Joi.string().required().min(1).max(50).pattern(/^[a-zA-Z0-9_-]+$/),
});

// Validation middleware
export const validateCreateInstance = (req: any, res: any, next: any) => {
  const { error } = createInstanceSchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }
  next();
};

export const validateSendMessage = (req: any, res: any, next: any) => {
  const { error } = sendMessageSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }
  next();
};

export const validateInstanceId = (req: any, res: any, next: any) => {
  const { error } = instanceIdSchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }
  next();
};