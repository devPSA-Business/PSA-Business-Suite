import { IAppointmentRepository } from '../../domain/repositories/IAppointmentRepository';
import { Appointment, db } from '../../shared/api/db';

export class AppointmentRepositoryImpl implements IAppointmentRepository {
  async save(appointment: Appointment): Promise<void> {
    try {
      await db.appointments.add(appointment);
    } catch (error) {
      throw new Error('Gagal menyimpan data janji temu ke penyimpanan lokal. Pastikan memori perangkat tidak penuh. Detail: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}
