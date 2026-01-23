import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

function buildStoredImagePath(file?: Express.Multer.File): string | null {
  if (!file) return null;
  // If S3 enabled, upload middleware sets filename to s3Key.
  if (config.s3.enabled && (file as any).s3Key) {
    const s3Key = (file as any).s3Key as string;
    if (config.s3.publicAccess && (file as any).s3Url) {
      return (file as any).s3Url as string;
    }
    // Store in a recognizable format for later proxy/presign.
    return `s3://${config.s3.bucket}/${s3Key}`;
  }
  return file.filename ? `/uploads/${file.filename}` : null;
}

export const listServices = async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    res.render('service-booking/list', { services });
  } catch (error) {
    console.error('Error listing services:', error);
    res.status(500).render('service-booking/list', { services: [], error: 'Failed to load services.' });
  }
};

export const showServiceDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service || !service.isActive) {
      return res.status(404).render('service-booking/detail', { service: null, timeSlots: [], error: 'Service not found.' });
    }

    const timeSlots: string[] = service.timeSlotsJson ? JSON.parse(service.timeSlotsJson) : [];
    res.render('service-booking/detail', { service, timeSlots, error: null });
  } catch (error) {
    console.error('Error loading service detail:', error);
    res.status(500).render('service-booking/detail', { service: null, timeSlots: [], error: 'Failed to load service.' });
  }
};

export const createServiceBooking = async (req: any, res: Response) => {
  try {
    const { serviceId, customerName, phone, preferredTime, optionalNote } = req.body;

    if (!serviceId || !customerName || !phone || !preferredTime) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const referenceImagePath = buildStoredImagePath(req.file);

    const booking = await prisma.serviceBooking.create({
      data: {
        serviceId,
        customerName: String(customerName).trim(),
        phone: String(phone).trim(),
        preferredTime: String(preferredTime).trim(),
        optionalNote: optionalNote ? String(optionalNote).trim() : null,
        referenceImagePath,
        status: 'new',
      },
    });

    return res.json({ success: true, bookingId: booking.id });
  } catch (error: any) {
    console.error('Error creating service booking:', error);
    return res.status(500).json({ error: 'Failed to create booking.' });
  }
};

export const showBookingSuccess = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!booking) {
      return res.status(404).render('service-booking/success', { booking: null, error: 'Booking not found.' });
    }

    res.render('service-booking/success', { booking, error: null });
  } catch (error) {
    console.error('Error showing booking success:', error);
    res.status(500).render('service-booking/success', { booking: null, error: 'Failed to load booking.' });
  }
};

