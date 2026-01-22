import { Request, Response } from 'express';

export const showServiceBookingHome = (req: Request, res: Response) => {
  res.render('service-booking/index');
};

